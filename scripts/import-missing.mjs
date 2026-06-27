#!/usr/bin/env node
/**
 * Importa personas desaparecidas desde un JSON estilo scraping
 * (con campos externalId, source, nombre, edad, ubicacion, descripcion,
 *  contacto, fotoUrl, estado, localizado*) hacia la tabla
 * `missing_persons` de Neon.
 *
 * Es idempotente: usa externalId como llave única (índice parcial) y
 * actualiza solo los campos que cambian al re-importar.
 *
 * Uso:
 *   node scripts/import-missing.mjs --file ../scraping\\ desaparecido/data/personas.json
 *   node scripts/import-missing.mjs --file path/to/personas.json --limit 50
 *   node scripts/import-missing.mjs --file path/to/personas.json --dry-run
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const args = parseArgs(process.argv.slice(2));
if (!args.file) {
  console.error(
    "Falta --file PATH. Ejemplo: --file '/ruta/personas.json'",
  );
  process.exit(1);
}

await loadEnvLocal();

const DATABASE_URL =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
if (!DATABASE_URL) {
  console.error("DATABASE_URL no configurada (verifica .env.local).");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const MAX_NAME = 120;
const MAX_DESCRIPTION = 600;
const MAX_LAST_SEEN = 200;
const MAX_CONTACT = 120;
const MAX_RESOLUTION_NOTE = 600;

console.log(`📂 Leyendo ${args.file}`);
const raw = await readFile(resolve(args.file), "utf8");
const data = JSON.parse(raw);
if (!Array.isArray(data)) {
  console.error("El archivo no contiene un array de personas.");
  process.exit(1);
}
console.log(`📦 ${data.length} registros en el archivo`);

if (args.dryRun) {
  console.log("🔍 Modo dry-run: solo se muestran estadísticas, no se escribe.");
} else {
  await ensureSchema();
}

const slice = args.limit ? data.slice(0, args.limit) : data;
console.log(`➡️  Procesando ${slice.length} registros`);

let inserted = 0;
let updated = 0;
let skipped = 0;
let errors = 0;
const startedAt = Date.now();

for (let i = 0; i < slice.length; i++) {
  const r = slice[i];
  const externalId = String(r.externalId || "").trim();
  if (!externalId) {
    skipped++;
    continue;
  }

  const name = clip(r.nombre, MAX_NAME);
  if (!name) {
    skipped++;
    continue;
  }
  const age = normalizeAge(r.edad);
  const description = clip(r.descripcion, MAX_DESCRIPTION);
  const lastSeen = clip(r.ubicacion, MAX_LAST_SEEN);
  const contact = clip(r.contacto, MAX_CONTACT);
  const photoExternal =
    typeof r.fotoUrl === "string" && /^https?:\/\//.test(r.fotoUrl)
      ? r.fotoUrl.slice(0, 600)
      : null;
  const source = typeof r.source === "string" ? r.source.slice(0, 120) : null;
  const sourceUrl =
    typeof r.sourceUrl === "string" ? r.sourceUrl.slice(0, 300) : null;

  // Mapeo de estado
  let status = "active";
  let resolutionNote = null;
  let resolvedAt = null;
  if (r.estado === "localizado") {
    status = "found";
    const parts = [
      r.localizadoNota && r.localizadoNota.trim(),
      r.localizadoPor
        ? `Reportado por: ${r.localizadoPor}${
            r.localizadoRelacion ? ` (${r.localizadoRelacion})` : ""
          }${r.localizadoContacto ? ` · ${r.localizadoContacto}` : ""}`
        : null,
    ].filter(Boolean);
    resolutionNote = clip(parts.join("\n"), MAX_RESOLUTION_NOTE) || null;
    resolvedAt = tsFrom(r.updatedAt) ?? Date.now();
  }

  const createdAt = tsFrom(r.createdAt) ?? Date.now();

  if (args.dryRun) {
    if (i < 5) {
      console.log(`  • ${name} [${status}] foto=${Boolean(photoExternal)}`);
    }
    inserted++;
    continue;
  }

  try {
    const result = await sql`
      INSERT INTO missing_persons (
        id, name, age, description, last_seen, contact,
        photo_external_url, external_id, source, source_url,
        status, resolution_note, resolved_at, created_at
      ) VALUES (
        ${randomUUID()}, ${name}, ${age}, ${description}, ${lastSeen}, ${contact},
        ${photoExternal}, ${externalId}, ${source}, ${sourceUrl},
        ${status}, ${resolutionNote}, ${resolvedAt}, ${createdAt}
      )
      ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
        name = EXCLUDED.name,
        age = EXCLUDED.age,
        description = EXCLUDED.description,
        last_seen = EXCLUDED.last_seen,
        contact = EXCLUDED.contact,
        photo_external_url = COALESCE(missing_persons.photo_external_url, EXCLUDED.photo_external_url),
        source = COALESCE(missing_persons.source, EXCLUDED.source),
        source_url = COALESCE(missing_persons.source_url, EXCLUDED.source_url),
        status = EXCLUDED.status,
        resolution_note = COALESCE(EXCLUDED.resolution_note, missing_persons.resolution_note),
        resolved_at = COALESCE(EXCLUDED.resolved_at, missing_persons.resolved_at)
      RETURNING (xmax = 0) AS inserted
    `;
    if (result?.[0]?.inserted) inserted++;
    else updated++;
  } catch (err) {
    errors++;
    if (errors < 5) {
      console.error(`  ❌ Falló ${externalId} (${name}):`, err.message ?? err);
    }
  }

  if ((i + 1) % 100 === 0) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    process.stdout.write(
      `\r⏳ ${i + 1}/${slice.length}  (+${inserted} ins / ${updated} upd / ${errors} err) · ${elapsed}s `,
    );
  }
}

process.stdout.write("\n");

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log("\n✅ Listo");
console.log(`   Insertadas: ${inserted}`);
console.log(`   Actualizadas: ${updated}`);
console.log(`   Saltadas: ${skipped}`);
console.log(`   Errores: ${errors}`);
console.log(`   Tiempo total: ${elapsed}s`);

if (!args.dryRun) {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM missing_persons`;
  const [{ active }] = await sql`SELECT COUNT(*)::int AS active FROM missing_persons WHERE COALESCE(status, 'active') = 'active'`;
  const [{ found }] = await sql`SELECT COUNT(*)::int AS found FROM missing_persons WHERE status = 'found'`;
  console.log(
    `\n📊 Estado en DB: total=${count}  active=${active}  found=${found}`,
  );
}

process.exit(0);

// -------- helpers --------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") out.file = argv[++i];
    else if (a === "--limit") out.limit = Number(argv[++i]);
    else if (a === "--dry-run") out.dryRun = true;
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
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* sin .env.local, se usan envs ya definidos */
  }
}

function clip(value, max) {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeAge(age) {
  if (age === null || age === undefined || age === "") return null;
  const n = Math.trunc(Number(age));
  if (!Number.isFinite(n) || n < 0 || n > 130) return null;
  return n;
}

function tsFrom(value) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS missing_persons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER,
      description TEXT NOT NULL DEFAULT '',
      last_seen TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '',
      photo TEXT,
      created_at BIGINT NOT NULL
    )
  `;
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`;
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS nationality TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS resolution_note TEXT`;
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS resolution_photo TEXT`;
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS resolved_at BIGINT`;
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS external_id TEXT`;
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS source TEXT`;
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS source_url TEXT`;
  await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS photo_external_url TEXT`;
  // Unicidad por (source, external_id): dos fuentes pueden usar el mismo id
  // crudo sin chocar. Migra desde el índice antiguo de solo external_id.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS missing_persons_source_external_id_idx ON missing_persons (source, external_id) WHERE external_id IS NOT NULL`;
  await sql`DROP INDEX IF EXISTS missing_persons_external_id_idx`;
}
