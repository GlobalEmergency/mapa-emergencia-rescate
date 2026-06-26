#!/usr/bin/env node
/**
 * Geocodifica ubicaciones (`last_seen`) de personas desaparecidas y propaga
 * lat/lng a todos los registros con la misma ubicación normalizada.
 *
 * Usa caché en tabla `geocode_cache` para no repetir llamadas a Nominatim.
 *
 * Uso:
 *   node scripts/geocode-missing-locations.mjs --limit 100
 *   node scripts/geocode-missing-locations.mjs --dry-run --limit 5
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const args = parseArgs(process.argv.slice(2));
await loadEnvLocal();

const DATABASE_URL =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
if (!DATABASE_URL) {
  console.error("DATABASE_URL no configurada.");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Centro aproximado: zona afectada (La Guaira / Caracas).
const BIAS = { lat: 10.48, lng: -66.9 };
const DELAY_MS = 1100;

async function ensureSchema() {
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION`;
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION`;
  await sql`
    CREATE TABLE IF NOT EXISTS geocode_cache (
      normalized_key TEXT PRIMARY KEY,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      updated_at BIGINT NOT NULL
    )
  `;
}

async function geocodeLocation(query) {
  const q = `${query}, Venezuela`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", "ve");
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "es");
  url.searchParams.set(
    "viewbox",
    `${BIAS.lng - 1},${BIAS.lat + 0.8},${BIAS.lng + 1},${BIAS.lat - 0.8}`,
  );
  url.searchParams.set("bounded", "0");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "MapaEmergenciaVenezuela/1.0 (geocode-import)",
      "Accept-Language": "es",
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const item = data[0];
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: item.display_name ?? query };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

if (!args.dryRun) await ensureSchema();

const limitClause = args.limit ? `LIMIT ${Math.trunc(args.limit)}` : "";
const locations = await sql.query(
  `SELECT lower(trim(last_seen)) AS key, min(last_seen) AS sample
   FROM missing_persons
   WHERE status = 'active'
     AND trim(last_seen) <> ''
     AND lat IS NULL
   GROUP BY lower(trim(last_seen))
   ORDER BY count(*) DESC
   ${limitClause}`,
  [],
);

console.log(`📍 ${locations.length} ubicaciones únicas por geocodificar`);

let geocoded = 0;
let cached = 0;
let failed = 0;
let updatedPeople = 0;

for (let i = 0; i < locations.length; i++) {
  const { key, sample } = locations[i];
  if (!key) continue;

  const cacheRows = await sql`
    SELECT lat, lng, label FROM geocode_cache WHERE normalized_key = ${key}
  `;
  let coords = cacheRows[0] ?? null;

  if (coords) {
    cached++;
  } else if (args.dryRun) {
    console.log(`  [dry-run] geocodificaría: "${sample}"`);
    geocoded++;
    continue;
  } else {
    await sleep(DELAY_MS);
    const result = await geocodeLocation(sample);
    if (!result) {
      failed++;
      console.log(`  ❌ Sin resultado: "${sample}"`);
      continue;
    }
    coords = result;
    await sql`
      INSERT INTO geocode_cache (normalized_key, lat, lng, label, updated_at)
      VALUES (${key}, ${coords.lat}, ${coords.lng}, ${coords.label}, ${Date.now()})
      ON CONFLICT (normalized_key) DO UPDATE SET
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        label = EXCLUDED.label,
        updated_at = EXCLUDED.updated_at
    `;
    geocoded++;
  }

  if (!args.dryRun && coords) {
    const updated = await sql.query(
      `UPDATE missing_persons
       SET lat = $1, lng = $2
       WHERE status = 'active'
         AND lower(trim(last_seen)) = $3
         AND lat IS NULL
       RETURNING id`,
      [coords.lat, coords.lng, key],
    );
    updatedPeople += updated.length;
  }

  if ((i + 1) % 10 === 0) {
    process.stdout.write(`\r⏳ ${i + 1}/${locations.length}…`);
  }
}

process.stdout.write("\n");
console.log("\n✅ Geocodificación terminada");
console.log(`   Nuevas en caché: ${geocoded}`);
console.log(`   Desde caché: ${cached}`);
console.log(`   Fallidas: ${failed}`);
console.log(`   Personas actualizadas: ${updatedPeople}`);

if (!args.dryRun) {
  const [{ on_map }] = await sql`
    SELECT count(*)::int AS on_map
    FROM missing_persons
    WHERE status = 'active' AND lat IS NOT NULL AND lng IS NOT NULL
  `;
  console.log(`\n📊 Activos con coordenadas: ${on_map}`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") out.limit = Number(argv[++i]);
    else if (argv[i] === "--dry-run") out.dryRun = true;
  }
  return out;
}

async function loadEnvLocal() {
  try {
    const text = await readFile(resolve(".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2];
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* sin .env.local */
  }
}
