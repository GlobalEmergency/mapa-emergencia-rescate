/**
 * Geocodificación de ubicaciones (`last_seen`) -> lat/lng, para que los
 * registros sincronizados aparezcan como marcadores en el mapa.
 *
 * Usa Nominatim (OpenStreetMap) con caché en `geocode_cache` para no repetir
 * llamadas. Respeta el límite de Nominatim (~1 req/s) y va ACOTADO por cantidad
 * y por tiempo, para correr dentro del presupuesto serverless desde un cron.
 *
 * Porta la lógica de scripts/geocode-missing-locations.mjs. Ver RFC §4.
 */

import { getSql, hasDbEnv } from "../db";

/** Centro aproximado de la zona afectada (La Guaira / Caracas) para sesgar. */
const BIAS = { lat: 10.48, lng: -66.9 };
const DEFAULT_DELAY_MS = 1100; // Nominatim: máx ~1 req/s
const DEFAULT_MAX_LOCATIONS = 20;
const DEFAULT_TIME_BUDGET_MS = 200_000;
const USER_AGENT = "MapaEmergenciaVenezuela/1.0 (geocode)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GeocodeResult {
  /** Ubicaciones únicas consideradas en esta corrida. */
  locations: number;
  /** Geocodificadas por primera vez (llamada a Nominatim). */
  geocodedNew: number;
  /** Resueltas desde la caché. */
  fromCache: number;
  /** Sin resultado en Nominatim. */
  failed: number;
  /** Personas a las que se les propagó lat/lng. */
  peopleUpdated: number;
}

let _geoSchemaReady: Promise<void> | null = null;
function ensureGeocodeSchema(): Promise<void> {
  if (!_geoSchemaReady) {
    const sql = getSql();
    _geoSchemaReady = (async () => {
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
    })();
  }
  return _geoSchemaReady;
}

interface Coords {
  lat: number;
  lng: number;
  label: string;
}

async function geocodeLocation(query: string): Promise<Coords | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", `${query}, Venezuela`);
  url.searchParams.set("countrycodes", "ve");
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "es");
  url.searchParams.set(
    "viewbox",
    `${BIAS.lng - 1},${BIAS.lat + 0.8},${BIAS.lng + 1},${BIAS.lat - 0.8}`,
  );
  url.searchParams.set("bounded", "0");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "es" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, label: data[0].display_name ?? query };
}

export interface GeocodeOptions {
  /** Máximo de ubicaciones únicas por corrida. */
  maxLocations?: number;
  /** Pausa entre llamadas a Nominatim (ms). */
  delayMs?: number;
  /** Presupuesto de tiempo (ms): se corta al excederlo. */
  timeBudgetMs?: number;
}

/**
 * Geocodifica las ubicaciones activas sin coordenadas (las más frecuentes
 * primero) y propaga lat/lng a todas las personas con esa misma ubicación.
 * Acotado: solo procesa hasta `maxLocations` o hasta agotar `timeBudgetMs`.
 */
export async function runGeocode(
  opts: GeocodeOptions = {},
): Promise<GeocodeResult> {
  if (!hasDbEnv()) {
    throw new Error("runGeocode requiere DATABASE_URL.");
  }
  const maxLocations = Math.min(
    Math.max(Math.trunc(opts.maxLocations ?? DEFAULT_MAX_LOCATIONS), 1),
    500,
  );
  const delayMs = Math.max(0, Math.trunc(opts.delayMs ?? DEFAULT_DELAY_MS));
  const timeBudgetMs = Math.max(1_000, Math.trunc(opts.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS));
  const startedAt = Date.now();

  await ensureGeocodeSchema();
  const sql = getSql();

  const locations = (await sql.query(
    `SELECT lower(trim(last_seen)) AS key, min(last_seen) AS sample
     FROM missing_persons
     WHERE status = 'active' AND trim(last_seen) <> '' AND lat IS NULL
     GROUP BY lower(trim(last_seen))
     ORDER BY count(*) DESC
     LIMIT $1`,
    [maxLocations],
  )) as { key: string; sample: string }[];

  const result: GeocodeResult = {
    locations: locations.length,
    geocodedNew: 0,
    fromCache: 0,
    failed: 0,
    peopleUpdated: 0,
  };

  for (const { key, sample } of locations) {
    if (!key) continue;
    if (Date.now() - startedAt >= timeBudgetMs) break;

    const cacheRows = (await sql`
      SELECT lat, lng, label FROM geocode_cache WHERE normalized_key = ${key}
    `) as { lat: number; lng: number; label: string }[];
    let coords: Coords | null = cacheRows[0] ?? null;

    if (coords) {
      result.fromCache++;
    } else {
      await sleep(delayMs);
      coords = await geocodeLocation(sample);
      if (!coords) {
        result.failed++;
        continue;
      }
      await sql`
        INSERT INTO geocode_cache (normalized_key, lat, lng, label, updated_at)
        VALUES (${key}, ${coords.lat}, ${coords.lng}, ${coords.label}, ${Date.now()})
        ON CONFLICT (normalized_key) DO UPDATE SET
          lat = EXCLUDED.lat, lng = EXCLUDED.lng,
          label = EXCLUDED.label, updated_at = EXCLUDED.updated_at
      `;
      result.geocodedNew++;
    }

    const updated = (await sql.query(
      `UPDATE missing_persons SET lat = $1, lng = $2
       WHERE status = 'active' AND lower(trim(last_seen)) = $3 AND lat IS NULL
       RETURNING id`,
      [coords.lat, coords.lng, key],
    )) as { id: string }[];
    result.peopleUpdated += updated.length;
  }

  return result;
}
