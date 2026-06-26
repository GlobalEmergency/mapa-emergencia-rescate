import { getSql, hasDbEnv } from "./db";
import type { ExternalPerson } from "./sync/types";

export type MissingStatus = "active" | "found";

/** Registro de persona desaparecida tal como se expone al cliente (sin la foto embebida). */
export interface MissingPerson {
  id: string;
  name: string;
  age: number | null;
  description: string;
  lastSeen: string;
  contact: string;
  /** URL del endpoint que sirve la foto, o null si no hay foto. */
  photoUrl: string | null;
  status: MissingStatus;
  /** Texto que comparte quien marca a la persona como localizada. */
  resolutionNote: string | null;
  /** URL del endpoint que sirve la foto-prueba de la resolución, si hay. */
  resolutionPhotoUrl: string | null;
  resolvedAt: number | null;
  createdAt: number;
}

/** Marcador ligero para el mapa (sin cargar toda la ficha). */
export interface MissingMapMarker {
  id: string;
  name: string;
  age: number | null;
  lastSeen: string;
  photoUrl: string | null;
  lat: number;
  lng: number;
  createdAt: number;
}

export interface MissingStats {
  active: number;
  found: number;
  total: number;
  onMap: number;
}

export interface NewMissingPerson {
  name: string;
  age?: number | string | null;
  description?: string;
  lastSeen?: string;
  contact?: string;
  /** Data URL de la foto (data:image/...;base64,...). Opcional. */
  photo?: string | null;
}

export const MAX_NAME = 120;
export const MAX_DESCRIPTION = 600;
export const MAX_LAST_SEEN = 200;
export const MAX_CONTACT = 120;
/** Límite del data URL de la foto (~1.4 MB en base64 ≈ 1 MB de imagen). */
export const MAX_PHOTO_CHARS = 1_400_000;

/** Tamaño de página por defecto y máximo permitido para el listado paginado. */
export const DEFAULT_PAGE_SIZE = 48;
export const MAX_PAGE_SIZE = 100;

/**
 * Mínimo de caracteres por término de búsqueda. El índice GIN de trigramas no
 * puede servir términos de <3 caracteres (haría un seq scan completo), así que
 * los ignoramos en cliente y servidor.
 */
export const MIN_SEARCH_LEN = 3;
/**
 * Tope del conteo de resultados de búsqueda. Contar las coincidencias exactas
 * cuesta ~50 ms por request; acotamos a este número (se muestra "500+") para que
 * el conteo pare temprano. El listado sin búsqueda sí usa el conteo exacto.
 */
export const SEARCH_COUNT_CAP = 500;

/**
 * Indica si la búsqueda acento-insensitiva (unaccent + pg_trgm) quedó lista.
 * Si las extensiones no están disponibles, se cae a ILIKE sobre las columnas
 * crudas (sensible a acentos) para no perder la funcionalidad.
 */
let accentSearchReady = false;

let _schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    const sql = getSql();
    _schemaReady = (async () => {
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
      // Columnas nuevas: ALTER ... IF NOT EXISTS para no romper datos previos.
      await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`;
      await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS resolution_note TEXT`;
      await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS resolution_photo TEXT`;
      await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS resolved_at BIGINT`;
      await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS external_id TEXT`;
      await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS source TEXT`;
      await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS source_url TEXT`;
      await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS photo_external_url TEXT`;
      await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION`;
      await sql`ALTER TABLE missing_persons ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION`;
      // Identidad de registros externos por (source, external_id): permite que
      // dos fuentes usen el mismo id crudo sin chocar. Migra desde el índice
      // antiguo de solo external_id (crea el nuevo y luego suelta el viejo, de
      // modo que la unicidad nunca queda sin proteger).
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS missing_persons_source_external_id_idx ON missing_persons (source, external_id) WHERE external_id IS NOT NULL`;
      await sql`DROP INDEX IF EXISTS missing_persons_external_id_idx`;

      // Índice del listado paginado: filtro por estado + orden + offset.
      await sql`
        CREATE INDEX IF NOT EXISTS idx_missing_status_created
        ON missing_persons (status, created_at DESC, id DESC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_missing_map_coords
        ON missing_persons (status, lat, lng)
        WHERE lat IS NOT NULL AND lng IS NOT NULL
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS geocode_cache (
          normalized_key TEXT PRIMARY KEY,
          lat DOUBLE PRECISION NOT NULL,
          lng DOUBLE PRECISION NOT NULL,
          label TEXT NOT NULL DEFAULT '',
          updated_at BIGINT NOT NULL
        )
      `;

      // Búsqueda acento-insensitiva (best-effort). Un fallo aquí (p. ej. sin
      // permiso para crear extensiones) no debe romper el listado.
      //
      // Si el índice ya existe (caso normal tras el primer arranque) saltamos el
      // DDL caro (CREATE EXTENSION/FUNCTION/INDEX): repetirlo en cada cold start
      // genera contención de locks de catálogo bajo un pico de tráfico.
      try {
        const existing = (await sql`
          SELECT to_regclass('public.idx_missing_search') AS oid
        `) as { oid: string | null }[];
        if (existing[0]?.oid) {
          accentSearchReady = true;
          return;
        }
        await sql`CREATE EXTENSION IF NOT EXISTS unaccent`;
        await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
        // El primer argumento debe ser un regdictionary explícito: así la
        // función es realmente IMMUTABLE y puede usarse en un índice (la forma
        // de 1 argumento es STABLE y la de 2 args sin cast no resuelve el
        // overload al inlinear en el índice).
        await sql`
          CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
          LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
          $func$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $func$
        `;
        await sql`
          CREATE INDEX IF NOT EXISTS idx_missing_search ON missing_persons
          USING gin (
            f_unaccent(name || ' ' || last_seen || ' ' || coalesce(description, ''))
            gin_trgm_ops
          )
        `;
        accentSearchReady = true;
      } catch {
        accentSearchReady = false;
      }
    })();
  }
  return _schemaReady;
}

interface MemoryRecord extends MissingPerson {
  photo: string | null;
  resolutionPhoto: string | null;
}
const memoryStore = new Map<string, MemoryRecord>();

type Row = {
  id: string;
  name: string;
  age: number | null;
  description: string;
  last_seen: string;
  contact: string;
  has_photo: boolean;
  photo_external_url: string | null;
  status: string | null;
  resolution_note: string | null;
  has_resolution_photo: boolean;
  resolved_at: string | number | null;
  created_at: string | number;
  lat?: number | null;
  lng?: number | null;
};

function rowToPerson(row: Row): MissingPerson {
  const photoUrl = row.has_photo
    ? `/api/missing/${row.id}/photo`
    : row.photo_external_url
      ? row.photo_external_url
      : null;
  return {
    id: row.id,
    name: row.name,
    age: row.age === null ? null : Number(row.age),
    description: row.description,
    lastSeen: row.last_seen,
    contact: row.contact,
    photoUrl,
    status: (row.status === "found" ? "found" : "active") as MissingStatus,
    resolutionNote: row.resolution_note ?? null,
    resolutionPhotoUrl: row.has_resolution_photo
      ? `/api/missing/${row.id}/resolution-photo`
      : null,
    resolvedAt: row.resolved_at !== null ? Number(row.resolved_at) : null,
    createdAt: Number(row.created_at),
  };
}

function normalizeAge(age: NewMissingPerson["age"]): number | null {
  if (age === null || age === undefined || age === "") return null;
  const n = Math.trunc(Number(age));
  if (!Number.isFinite(n) || n < 0 || n > 130) return null;
  return n;
}

/** Valida que la cadena sea un data URL de imagen soportada. */
export function isValidPhotoDataUrl(photo: string): boolean {
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo);
}

/** Columnas que alimentan `rowToPerson` (sin exponer las fotos embebidas). */
const SELECT_COLS = `id, name, age, description, last_seen, contact,
  (photo IS NOT NULL) AS has_photo,
  photo_external_url,
  status,
  resolution_note,
  (resolution_photo IS NOT NULL) AS has_resolution_photo,
  resolved_at, created_at`;

export interface ListMissingOptions {
  /** Si es true, incluye también las que ya fueron marcadas como localizadas. */
  includeFound?: boolean;
}

/**
 * Devuelve el conjunto completo (usado por el panel de admin para estadísticas).
 * El listado público usa `listMissingPage`.
 */
export async function listMissing(
  options: ListMissingOptions = {},
): Promise<MissingPerson[]> {
  const includeFound = Boolean(options.includeFound);
  if (hasDbEnv()) {
    await ensureSchema();
    const sql = getSql();
    const where = includeFound ? "" : "WHERE status = 'active'";
    const rows = (await sql.query(
      `SELECT ${SELECT_COLS} FROM missing_persons ${where} ORDER BY created_at DESC, id DESC`,
      [],
    )) as Row[];
    return rows.map(rowToPerson);
  }
  return [...memoryStore.values()]
    .filter((m) => includeFound || m.status !== "found")
    .map(({ photo: _photo, resolutionPhoto: _rp, ...rest }) => rest)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export type MissingStatusFilter = "active" | "found" | "all";

export interface ListMissingPageParams {
  status?: MissingStatusFilter;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface MissingPageResult {
  people: MissingPerson[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** true si `total` se truncó en SEARCH_COUNT_CAP (mostrar "500+"). */
  totalCapped: boolean;
}

function clampInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Palabras de búsqueda en minúsculas (sin patrones), máx. 8. Se descartan los
 * términos de menos de `MIN_SEARCH_LEN` caracteres (el trigram no los indexa).
 */
function searchTerms(search: string | undefined): string[] {
  return (search ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= MIN_SEARCH_LEN)
    .slice(0, 8);
}

/**
 * Listado paginado con búsqueda server-side. Paginación por offset (rápida en
 * este orden de magnitud) construyendo el WHERE dinámicamente: sin término de
 * búsqueda no se agrega predicado, de modo que `idx_missing_status_created`
 * sirve el orden + LIMIT sin ordenar toda la tabla; cada término es un ILIKE
 * explícito que el índice GIN de trigramas (`idx_missing_search`) puede usar.
 */
export async function listMissingPage(
  params: ListMissingPageParams = {},
): Promise<MissingPageResult> {
  const status = params.status ?? "active";
  const pageSize = clampInt(params.pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  const requestedPage = clampInt(params.page, 1, Number.MAX_SAFE_INTEGER, 1);
  const rawTerms = searchTerms(params.search);

  if (hasDbEnv()) {
    await ensureSchema();
    const sql = getSql();

    const conditions: string[] = [];
    const values: unknown[] = [];
    let n = 1;

    if (status !== "all") {
      conditions.push(`status = $${n++}`);
      values.push(status);
    }

    const fieldExpr = accentSearchReady
      ? "f_unaccent(name || ' ' || last_seen || ' ' || coalesce(description, ''))"
      : "lower(name || ' ' || last_seen || ' ' || coalesce(description, ''))";
    // Con acentos disponibles comparamos contra el texto sin acentos en ambos
    // lados; en el fallback respetamos el texto crudo (sensible a acentos).
    const terms = accentSearchReady ? rawTerms.map(stripAccents) : rawTerms;
    for (const term of terms) {
      conditions.push(`${fieldExpr} ILIKE $${n++}`);
      values.push(`%${term}%`);
    }

    const whereSql = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";
    const orderSql =
      status === "found"
        ? "COALESCE(resolved_at, created_at) DESC, id DESC"
        : "created_at DESC, id DESC";

    // Con búsqueda acotamos el conteo (para temprano en SEARCH_COUNT_CAP); sin
    // búsqueda usamos el conteo exacto (es el número que se muestra de titular).
    const hasSearch = terms.length > 0;
    const countSql = hasSearch
      ? `SELECT count(*)::int AS n FROM (SELECT 1 FROM missing_persons ${whereSql} LIMIT ${SEARCH_COUNT_CAP}) t`
      : `SELECT count(*)::int AS n FROM missing_persons ${whereSql}`;
    const countRows = (await sql.query(countSql, values)) as { n: number }[];
    const total = countRows[0]?.n ?? 0;
    const totalCapped = hasSearch && total >= SEARCH_COUNT_CAP;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    const rows = (await sql.query(
      `SELECT ${SELECT_COLS} FROM missing_persons ${whereSql} ORDER BY ${orderSql} LIMIT $${n} OFFSET $${n + 1}`,
      [...values, pageSize, offset],
    )) as Row[];

    return { people: rows.map(rowToPerson), total, page, pageSize, totalPages, totalCapped };
  }

  // Fallback en memoria (modo demo sin DB). Búsqueda acento-insensitiva.
  const statuses = status === "all" ? ["active", "found"] : [status];
  const terms = rawTerms.map(stripAccents);
  const filtered = [...memoryStore.values()]
    .filter((m) => statuses.includes(m.status))
    .filter((m) => {
      if (terms.length === 0) return true;
      const hay = stripAccents(`${m.name} ${m.lastSeen} ${m.description}`.toLowerCase());
      return terms.every((t) => hay.includes(t));
    })
    .sort((a, b) =>
      status === "found"
        ? (b.resolvedAt ?? b.createdAt) - (a.resolvedAt ?? a.createdAt)
        : b.createdAt - a.createdAt,
    )
    .map(({ photo: _photo, resolutionPhoto: _rp, ...rest }) => rest);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;
  return {
    people: filtered.slice(offset, offset + pageSize),
    total,
    page,
    pageSize,
    totalPages,
    totalCapped: false,
  };
}

export async function addMissing(
  input: NewMissingPerson,
): Promise<MissingPerson> {
  if (!hasDbEnv() && process.env.VERCEL) {
    throw new Error("DATABASE_URL no configurada: la persistencia es obligatoria.");
  }

  const id = crypto.randomUUID();
  const name = (input.name ?? "").trim().slice(0, MAX_NAME);
  const age = normalizeAge(input.age);
  const description = (input.description ?? "").trim().slice(0, MAX_DESCRIPTION);
  const lastSeen = (input.lastSeen ?? "").trim().slice(0, MAX_LAST_SEEN);
  const contact = (input.contact ?? "").trim().slice(0, MAX_CONTACT);
  const photo =
    typeof input.photo === "string" && input.photo ? input.photo : null;
  const createdAt = Date.now();

  if (hasDbEnv()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO missing_persons
        (id, name, age, description, last_seen, contact, photo, created_at)
      VALUES (
        ${id}, ${name}, ${age}, ${description}, ${lastSeen},
        ${contact}, ${photo}, ${createdAt}
      )
    `;
  } else {
    memoryStore.set(id, {
      id,
      name,
      age,
      description,
      lastSeen,
      contact,
      photo,
      photoUrl: photo ? `/api/missing/${id}/photo` : null,
      status: "active",
      resolutionNote: null,
      resolutionPhoto: null,
      resolutionPhotoUrl: null,
      resolvedAt: null,
      createdAt,
    });
  }

  return {
    id,
    name,
    age,
    description,
    lastSeen,
    contact,
    photoUrl: photo ? `/api/missing/${id}/photo` : null,
    status: "active",
    resolutionNote: null,
    resolutionPhotoUrl: null,
    resolvedAt: null,
    createdAt,
  };
}

export const MAX_RESOLUTION_NOTE = 600;

/**
 * Marca a una persona como localizada agregando una nota obligatoria y una
 * foto-prueba opcional. Devuelve el registro actualizado o null si no existía.
 */
export async function markMissingFound(
  id: string,
  note: string,
  resolutionPhoto: string | null,
): Promise<MissingPerson | null> {
  if (!hasDbEnv() && process.env.VERCEL) {
    throw new Error("DATABASE_URL no configurada: la persistencia es obligatoria.");
  }
  const cleanNote = note.trim().slice(0, MAX_RESOLUTION_NOTE);
  if (!cleanNote) throw new Error("Falta la descripción de cómo se comunicaron.");
  const photo =
    resolutionPhoto && isValidPhotoDataUrl(resolutionPhoto) ? resolutionPhoto : null;
  const resolvedAt = Date.now();

  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      UPDATE missing_persons
      SET status = 'found',
          resolution_note = ${cleanNote},
          resolution_photo = ${photo},
          resolved_at = ${resolvedAt}
      WHERE id = ${id} AND COALESCE(status, 'active') = 'active'
      RETURNING id, name, age, description, last_seen, contact,
                (photo IS NOT NULL) AS has_photo,
                COALESCE(status, 'active') AS status,
                resolution_note,
                (resolution_photo IS NOT NULL) AS has_resolution_photo,
                resolved_at,
                created_at
    `) as Row[];
    return rows.length > 0 ? rowToPerson(rows[0]) : null;
  }
  const record = memoryStore.get(id);
  if (!record || record.status === "found") return null;
  record.status = "found";
  record.resolutionNote = cleanNote;
  record.resolutionPhoto = photo;
  record.resolutionPhotoUrl = photo
    ? `/api/missing/${id}/resolution-photo`
    : null;
  record.resolvedAt = resolvedAt;
  const { photo: _p, resolutionPhoto: _rp, ...exposed } = record;
  return exposed;
}

export async function restoreMissing(id: string): Promise<boolean> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      UPDATE missing_persons
      SET status = 'active',
          resolution_note = NULL,
          resolution_photo = NULL,
          resolved_at = NULL
      WHERE id = ${id} AND COALESCE(status, 'active') = 'found'
      RETURNING id
    `) as { id: string }[];
    return rows.length > 0;
  }
  const record = memoryStore.get(id);
  if (!record || record.status !== "found") return false;
  record.status = "active";
  record.resolutionNote = null;
  record.resolutionPhoto = null;
  record.resolutionPhotoUrl = null;
  record.resolvedAt = null;
  return true;
}

export interface PhotoData {
  contentType: string;
  buffer: Buffer;
}

/** La foto está alojada externamente; el endpoint debe redirigir a esta URL. */
export interface RemotePhoto {
  redirectTo: string;
}

function dataUrlToPhoto(dataUrl: string | null): PhotoData | null {
  if (!dataUrl) return null;
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

/**
 * Devuelve la foto de una persona. Puede ser un data URL embebido (se sirven
 * los bytes) o una URL remota (importada de fuentes externas), en cuyo caso se
 * indica una redirección. Null si no existe.
 */
export async function getMissingPhoto(
  id: string,
): Promise<PhotoData | RemotePhoto | null> {
  let stored: string | null = null;
  let externalUrl: string | null = null;
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT photo, photo_external_url FROM missing_persons WHERE id = ${id}
    `) as { photo: string | null; photo_external_url: string | null }[];
    stored = rows[0]?.photo ?? null;
    externalUrl = rows[0]?.photo_external_url ?? null;
  } else {
    stored = memoryStore.get(id)?.photo ?? null;
  }
  if (stored) {
    if (/^https?:\/\//i.test(stored)) return { redirectTo: stored };
    return dataUrlToPhoto(stored);
  }
  if (externalUrl && /^https?:\/\//i.test(externalUrl)) {
    return { redirectTo: externalUrl };
  }
  return null;
}

/** Foto-prueba que se subió al marcar a la persona como localizada. */
export async function getMissingResolutionPhoto(
  id: string,
): Promise<PhotoData | null> {
  let dataUrl: string | null = null;
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT resolution_photo FROM missing_persons WHERE id = ${id}
    `) as { resolution_photo: string | null }[];
    dataUrl = rows[0]?.resolution_photo ?? null;
  } else {
    dataUrl = memoryStore.get(id)?.resolutionPhoto ?? null;
  }
  return dataUrlToPhoto(dataUrl);
}

export async function removeMissing(id: string): Promise<boolean> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      DELETE FROM missing_persons WHERE id = ${id} RETURNING id
    `) as { id: string }[];
    return rows.length > 0;
  }
  return memoryStore.delete(id);
}

/** Totales consolidados para el panel del mapa y el hero. */
export async function countMissingStats(): Promise<MissingStats> {
  if (!hasDbEnv()) {
    const all = [...memoryStore.values()];
    const active = all.filter((m) => m.status === "active").length;
    const found = all.filter((m) => m.status === "found").length;
    return { active, found, total: all.length, onMap: 0 };
  }
  await ensureSchema();
  const rows = (await getSql()`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'active')::int AS active,
      count(*) FILTER (WHERE status = 'found')::int AS found,
      count(*) FILTER (
        WHERE status = 'active' AND lat IS NOT NULL AND lng IS NOT NULL
      )::int AS on_map
    FROM missing_persons
  `) as { total: number; active: number; found: number; on_map: number }[];
  const row = rows[0] ?? { total: 0, active: 0, found: 0, on_map: 0 };
  return {
    total: row.total,
    active: row.active,
    found: row.found,
    onMap: row.on_map,
  };
}

export interface ListMissingMapParams {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  limit?: number;
}

type MapRow = {
  id: string;
  name: string;
  age: number | null;
  last_seen: string;
  has_photo: boolean;
  photo_external_url: string | null;
  lat: number;
  lng: number;
  created_at: string | number;
};

/** Marcadores de desaparecidos activos con coordenadas (viewport opcional). */
export async function listMissingMapMarkers(
  params: ListMissingMapParams = {},
): Promise<MissingMapMarker[]> {
  const limit = Math.min(Math.max(Math.trunc(params.limit ?? 500), 1), 2000);

  if (!hasDbEnv()) return [];

  await ensureSchema();
  const sql = getSql();
  const conditions = [
    "status = 'active'",
    "lat IS NOT NULL",
    "lng IS NOT NULL",
  ];
  const values: unknown[] = [];
  let n = 1;

  const { north, south, east, west } = params;
  if (
    north !== undefined &&
    south !== undefined &&
    east !== undefined &&
    west !== undefined &&
    Number.isFinite(north) &&
    Number.isFinite(south) &&
    Number.isFinite(east) &&
    Number.isFinite(west)
  ) {
    conditions.push(`lat BETWEEN $${n++} AND $${n++}`);
    values.push(Math.min(south, north), Math.max(south, north));
    conditions.push(`lng BETWEEN $${n++} AND $${n++}`);
    values.push(Math.min(west, east), Math.max(west, east));
  }

  const rows = (await sql.query(
    `SELECT id, name, age, last_seen,
            (photo IS NOT NULL) AS has_photo,
            photo_external_url,
            lat, lng, created_at
     FROM missing_persons
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${n}`,
    [...values, limit],
  )) as MapRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    age: row.age === null ? null : Number(row.age),
    lastSeen: row.last_seen,
    photoUrl: row.has_photo
      ? `/api/missing/${row.id}/photo`
      : row.photo_external_url,
    lat: Number(row.lat),
    lng: Number(row.lng),
    createdAt: Number(row.created_at),
  }));
}

// ---------------------------------------------------------------------------
// Sincronización de fuentes externas (ver docs/rfcs/0001-sincronizacion-fuentes.md)
// ---------------------------------------------------------------------------

function clipText(value: unknown, max: number): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  return s.length > max ? s.slice(0, max) : s;
}

export interface UpsertResult {
  /** true si fue INSERT (registro nuevo); false si fue UPDATE. */
  inserted: boolean;
}

export interface BatchUpsertResult {
  inserted: number;
  updated: number;
  /** Registros descartados por inválidos (sin source/externalId/name). */
  skipped: number;
  /** Registros en lotes que fallaron al escribir. */
  errors: number;
}

const DEFAULT_BATCH_SIZE = 1000;
const MAX_BATCH_SIZE = 4000;

/** Columnas del INSERT de registros externos (orden fijo, alineado con los valores). */
const EXTERNAL_COLS = [
  "id", "name", "age", "description", "last_seen", "contact",
  "photo_external_url", "external_id", "source", "source_url",
  "status", "resolution_note", "resolved_at", "created_at",
] as const;

/** Cláusula DO UPDATE: misma semántica que el upsert de una fila. */
const CONFLICT_UPDATE_SET = `
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
  resolved_at = COALESCE(EXCLUDED.resolved_at, missing_persons.resolved_at)`;

/**
 * Prepara los valores de una fila a partir de un registro externo. El
 * `external_id` se guarda CRUDO; la unicidad es por (source, external_id) — ver
 * índice compuesto en ensureSchema. Devuelve null si el registro es inválido
 * (sin source/externalId/name) para que el caller lo cuente como saltado.
 */
function buildExternalRow(
  input: ExternalPerson,
): { key: string; values: unknown[] } | null {
  const externalId = (input.externalId ?? "").trim();
  const source = clipText(input.source, 120);
  const name = clipText(input.name, MAX_NAME);
  if (!externalId || !source || !name) return null;

  const status: MissingStatus = input.status === "found" ? "found" : "active";
  // El contacto solo llega si el adaptador decidió importarlo (ver RFC §6).
  const values: unknown[] = [
    crypto.randomUUID(),
    name,
    normalizeAge(input.age),
    clipText(input.description, MAX_DESCRIPTION),
    clipText(input.lastSeen, MAX_LAST_SEEN),
    clipText(input.contact, MAX_CONTACT),
    typeof input.photoUrl === "string" && /^https?:\/\//i.test(input.photoUrl)
      ? input.photoUrl.slice(0, 600)
      : null,
    externalId,
    source,
    typeof input.sourceUrl === "string" ? input.sourceUrl.slice(0, 300) : null,
    status,
    status === "found" && input.resolutionNote
      ? clipText(input.resolutionNote, MAX_RESOLUTION_NOTE) || null
      : null,
    status === "found" ? (input.resolvedAt ?? Date.now()) : null,
    input.createdAt ?? Date.now(),
  ];
  return { key: JSON.stringify([source, externalId]), values };
}

/**
 * Camino ÚNICO de escritura para registros de fuentes externas. Inserta/actualiza
 * por lotes (INSERT multi-fila + ON CONFLICT (source, external_id)), idempotente:
 * re-correr no duplica, solo actualiza los campos que cambian.
 *
 * Deduplica por (source, external_id) quedándose con el último, porque Postgres
 * falla si una misma clave aparece dos veces en el mismo ON CONFLICT (el feed
 * vivo + paginación por offset produce solapes). Ver ADR 0002.
 */
export async function upsertExternalMissingBatch(
  people: ExternalPerson[],
  opts: { batchSize?: number } = {},
): Promise<BatchUpsertResult> {
  if (!hasDbEnv()) {
    throw new Error("upsertExternalMissingBatch requiere DATABASE_URL.");
  }
  const result: BatchUpsertResult = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const batchSize = Math.min(
    Math.max(Math.trunc(opts.batchSize ?? DEFAULT_BATCH_SIZE), 1),
    MAX_BATCH_SIZE,
  );

  const byKey = new Map<string, unknown[]>();
  for (const person of people) {
    const row = buildExternalRow(person);
    if (!row) {
      result.skipped++;
      continue;
    }
    byKey.set(row.key, row.values);
  }
  const rows = [...byKey.values()];
  if (rows.length === 0) return result;

  await ensureSchema();
  const sql = getSql();

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const tuples: string[] = [];
    const params: unknown[] = [];
    let n = 1;
    for (const values of chunk) {
      tuples.push(`(${values.map(() => `$${n++}`).join(",")})`);
      params.push(...values);
    }
    const text =
      `INSERT INTO missing_persons (${EXTERNAL_COLS.join(", ")}) VALUES ${tuples.join(",")}` +
      ` ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL DO UPDATE SET${CONFLICT_UPDATE_SET}` +
      ` RETURNING (xmax = 0) AS inserted`;
    try {
      const out = (await sql.query(text, params)) as { inserted: boolean }[];
      for (const r of out) {
        if (r.inserted) result.inserted++;
        else result.updated++;
      }
    } catch {
      result.errors += chunk.length;
    }
  }
  return result;
}

/**
 * Upsert de un solo registro externo. Delega en el batch para tener una sola
 * fuente de verdad del SQL. Lanza si el registro es inválido o si falla la
 * escritura (preserva el contrato previo de fallo ruidoso).
 */
export async function upsertExternalMissing(
  input: ExternalPerson,
): Promise<UpsertResult> {
  const r = await upsertExternalMissingBatch([input]);
  if (r.skipped > 0) {
    throw new Error("Registro externo inválido (falta source, externalId o name).");
  }
  if (r.errors > 0) throw new Error("Error al hacer upsert del registro externo.");
  return { inserted: r.inserted > 0 };
}
