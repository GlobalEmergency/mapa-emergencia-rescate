import { eq, sql } from "drizzle-orm";
import { getDb, hasDbEnv, schema } from "./drizzle";
import { isR2Configured, uploadPhotoDataUrl } from "./r2";
import type { ExternalPerson } from "./sync/types";

const { missingPersons } = schema;

/**
 * Normaliza el resultado de `getDb().execute()` a un arreglo de filas. El driver
 * neon-http devuelve el arreglo directo; node-postgres devuelve `{ rows }`.
 */
function execRows<T>(result: unknown): T[] {
  return (Array.isArray(result) ? result : (result as { rows: T[] }).rows) as T[];
}

export type MissingStatus = "active" | "found";

/** Registro de persona desaparecida tal como se expone al cliente (sin la foto embebida). */
export interface MissingPerson {
  id: string;
  name: string;
  age: number | null;
  nationality: string;
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
  nationality: string;
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

export type MissingReportType = "missing" | "found";

export interface NewMissingPerson {
  name: string;
  age?: number | string | null;
  nationality?: string | null;
  description?: string;
  lastSeen?: string;
  contact?: string;
  /** Data URL de la foto (data:image/...;base64,...). Opcional. */
  photo?: string | null;
  /** Reporte de persona desaparecida (activa) o encontrada (localizada). */
  reportType?: MissingReportType;
}

export const MAX_NAME = 120;
export const MAX_NATIONALITY = 80;
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
 * Indica si la búsqueda acento-insensitiva (unaccent + pg_trgm) está disponible.
 * El esquema/índices los gestiona drizzle-kit; aquí solo detectamos (una vez,
 * cacheado) si el índice `idx_missing_search` y la función `f_unaccent` existen.
 * Si no, se cae a ILIKE sobre las columnas crudas (sensible a acentos) para no
 * perder la funcionalidad.
 */
let _accentSearchReady: Promise<boolean> | null = null;
function accentSearchReady(): Promise<boolean> {
  if (!_accentSearchReady) {
    _accentSearchReady = (async () => {
      try {
        const res = await getDb().execute(
          sql`SELECT to_regclass('public.idx_missing_search') AS oid`,
        );
        const rows = execRows<{ oid: string | null }>(res);
        return Boolean(rows[0]?.oid);
      } catch {
        return false;
      }
    })();
  }
  return _accentSearchReady;
}

interface MemoryRecord extends MissingPerson {
  photo: string | null;
  resolutionPhoto: string | null;
}
const memoryStore = new Map<string, MemoryRecord>();

// Tipo de fila tal como sale del builder para las columnas que seleccionamos
// (has_photo / has_resolution_photo se derivan en SQL, no son columnas reales).
type Row = {
  id: string;
  name: string;
  age: number | null;
  nationality: string | null;
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
    nationality: row.nationality ?? "",
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

/**
 * Columnas que alimentan `rowToPerson` (sin exponer las fotos embebidas).
 * Se usa con getDb().select({...}) para mapear a la forma `Row`.
 */
const selectCols = {
  id: missingPersons.id,
  name: missingPersons.name,
  age: missingPersons.age,
  nationality: missingPersons.nationality,
  description: missingPersons.description,
  last_seen: missingPersons.lastSeen,
  contact: missingPersons.contact,
  has_photo: sql<boolean>`(${missingPersons.photo} IS NOT NULL)`,
  photo_external_url: missingPersons.photoExternalUrl,
  status: missingPersons.status,
  resolution_note: missingPersons.resolutionNote,
  has_resolution_photo: sql<boolean>`(${missingPersons.resolutionPhoto} IS NOT NULL)`,
  resolved_at: missingPersons.resolvedAt,
  created_at: missingPersons.createdAt,
} as const;

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
    const base = getDb().select(selectCols).from(missingPersons);
    const query = includeFound
      ? base
      : base.where(eq(missingPersons.status, "active"));
    const rows = (await query.orderBy(
      sql`${missingPersons.createdAt} DESC, ${missingPersons.id} DESC`,
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
 *
 * Se mantiene SQL crudo (getDb().execute) porque el WHERE/ORDER se arma de forma
 * dinámica y la expresión de búsqueda usa f_unaccent/ILIKE no expresables sin
 * fricción en el query builder; las condiciones se siguen pasando como params.
 */
export async function listMissingPage(
  params: ListMissingPageParams = {},
): Promise<MissingPageResult> {
  const status = params.status ?? "active";
  const pageSize = clampInt(params.pageSize, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  const requestedPage = clampInt(params.page, 1, Number.MAX_SAFE_INTEGER, 1);
  const rawTerms = searchTerms(params.search);

  if (hasDbEnv()) {
    const db = getDb();
    const useAccent = await accentSearchReady();

    const conditions: ReturnType<typeof sql>[] = [];

    if (status !== "all") {
      conditions.push(sql`status = ${status}`);
    }

    const fieldExpr = useAccent
      ? sql`f_unaccent(name || ' ' || last_seen || ' ' || coalesce(description, ''))`
      : sql`lower(name || ' ' || last_seen || ' ' || coalesce(description, ''))`;
    // Con acentos disponibles comparamos contra el texto sin acentos en ambos
    // lados; en el fallback respetamos el texto crudo (sensible a acentos).
    const terms = useAccent ? rawTerms.map(stripAccents) : rawTerms;
    for (const term of terms) {
      conditions.push(sql`${fieldExpr} ILIKE ${`%${term}%`}`);
    }

    const whereSql = conditions.length
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;
    const orderSql =
      status === "found"
        ? sql`COALESCE(resolved_at, created_at) DESC, id DESC`
        : sql`created_at DESC, id DESC`;

    // Con búsqueda acotamos el conteo (para temprano en SEARCH_COUNT_CAP); sin
    // búsqueda usamos el conteo exacto (es el número que se muestra de titular).
    const hasSearch = terms.length > 0;
    const countQuery = hasSearch
      ? sql`SELECT count(*)::int AS n FROM (SELECT 1 FROM missing_persons ${whereSql} LIMIT ${SEARCH_COUNT_CAP}) t`
      : sql`SELECT count(*)::int AS n FROM missing_persons ${whereSql}`;
    const countRes = await db.execute(countQuery);
    const total = execRows<{ n: number }>(countRes)[0]?.n ?? 0;
    const totalCapped = hasSearch && total >= SEARCH_COUNT_CAP;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    const listRes = await db.execute(
      sql`SELECT id, name, age, description, last_seen, contact,
                 (photo IS NOT NULL) AS has_photo,
                 photo_external_url,
                 status,
                 resolution_note,
                 (resolution_photo IS NOT NULL) AS has_resolution_photo,
                 resolved_at, created_at
          FROM missing_persons ${whereSql} ORDER BY ${orderSql} LIMIT ${pageSize} OFFSET ${offset}`,
    );
    const rows = execRows<Row>(listRes);

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
  const nationality = (input.nationality ?? "")
    .trim()
    .slice(0, MAX_NATIONALITY);
  const description = (input.description ?? "").trim().slice(0, MAX_DESCRIPTION);
  const lastSeen = (input.lastSeen ?? "").trim().slice(0, MAX_LAST_SEEN);
  const contact = (input.contact ?? "").trim().slice(0, MAX_CONTACT);
  const photo =
    typeof input.photo === "string" && input.photo ? input.photo : null;
  const createdAt = Date.now();
  const isFound = input.reportType === "found";
  const status: MissingStatus = isFound ? "found" : "active";
  const resolutionNote = isFound ? description : null;
  const resolvedAt = isFound ? createdAt : null;

  // Si R2 está configurado, la foto va al CDN y guardamos la URL (no base64).
  // Hard-fail: si la subida falla, el error sube y el endpoint no confirma.
  let stored = photo;
  let migratedAt: number | null = null;
  if (photo && isR2Configured()) {
    stored = await uploadPhotoDataUrl(photo, "missing_persons", id);
    migratedAt = Date.now();
  }

  if (hasDbEnv()) {
    await getDb().insert(missingPersons).values({
      id,
      name,
      age,
      nationality,
      description,
      lastSeen,
      contact,
      photo: stored,
      photoMigratedAt: migratedAt,
      createdAt,
      status,
      resolutionNote,
      resolvedAt,
    });
  } else {
    memoryStore.set(id, {
      id,
      name,
      age,
      nationality,
      description,
      lastSeen,
      contact,
      photo: stored,
      photoUrl: photo ? `/api/missing/${id}/photo` : null,
      status,
      resolutionNote,
      resolutionPhoto: null,
      resolutionPhotoUrl: null,
      resolvedAt,
      createdAt,
    });
  }

  return {
    id,
    name,
    age,
    nationality,
    description,
    lastSeen,
    contact,
    photoUrl: photo ? `/api/missing/${id}/photo` : null,
    status,
    resolutionNote,
    resolutionPhotoUrl: null,
    resolvedAt,
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
  const validPhoto =
    resolutionPhoto && isValidPhotoDataUrl(resolutionPhoto) ? resolutionPhoto : null;
  const resolvedAt = Date.now();
  // Foto-prueba a R2 cuando está configurado (hard-fail). `photo` será la URL.
  let photo = validPhoto;
  if (validPhoto && isR2Configured()) {
    photo = await uploadPhotoDataUrl(validPhoto, "resolution", id);
  }

  if (hasDbEnv()) {
    // El builder de update().set().where().returning() con alias `sql` no
    // resuelve sobre el tipo unión de drivers (neon-http | node-postgres);
    // usamos el escape `sql` preservando la semántica exacta del UPDATE.
    const result = await getDb().execute(
      sql`UPDATE missing_persons
          SET status = 'found',
              resolution_note = ${cleanNote},
              resolution_photo = ${photo},
              resolved_at = ${resolvedAt}
          WHERE id = ${id} AND COALESCE(status, 'active') = 'active'
          RETURNING id, name, age, nationality, description, last_seen, contact,
                    (photo IS NOT NULL) AS has_photo,
                    photo_external_url,
                    COALESCE(status, 'active') AS status,
                    resolution_note,
                    (resolution_photo IS NOT NULL) AS has_resolution_photo,
                    resolved_at,
                    created_at`,
    );
    const rows = execRows<Row>(result);
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
    // Escape `sql` por el tipo unión de drivers (ver markMissingFound). Misma
    // semántica que el UPDATE ... RETURNING id previo.
    const result = await getDb().execute(
      sql`UPDATE missing_persons
          SET status = 'active',
              resolution_note = NULL,
              resolution_photo = NULL,
              resolved_at = NULL
          WHERE id = ${id} AND COALESCE(status, 'active') = 'found'
          RETURNING id`,
    );
    return execRows<{ id: string }>(result).length > 0;
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
    const rows = await getDb()
      .select({
        photo: missingPersons.photo,
        photoExternalUrl: missingPersons.photoExternalUrl,
      })
      .from(missingPersons)
      .where(eq(missingPersons.id, id));
    stored = rows[0]?.photo ?? null;
    externalUrl = rows[0]?.photoExternalUrl ?? null;
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
): Promise<PhotoData | RemotePhoto | null> {
  let dataUrl: string | null = null;
  if (hasDbEnv()) {
    const rows = await getDb()
      .select({ resolutionPhoto: missingPersons.resolutionPhoto })
      .from(missingPersons)
      .where(eq(missingPersons.id, id));
    dataUrl = rows[0]?.resolutionPhoto ?? null;
  } else {
    dataUrl = memoryStore.get(id)?.resolutionPhoto ?? null;
  }
  // Foto-prueba migrada a R2: redirigir al CDN en vez de servir bytes.
  if (dataUrl && /^https?:\/\//i.test(dataUrl)) return { redirectTo: dataUrl };
  return dataUrlToPhoto(dataUrl);
}

export async function removeMissing(id: string): Promise<boolean> {
  if (hasDbEnv()) {
    // Escape `sql` por el tipo unión de drivers (ver chat.removeMessage). Misma
    // semántica que el DELETE ... RETURNING id previo.
    const result = await getDb().execute(
      sql`DELETE FROM missing_persons WHERE id = ${id} RETURNING id`,
    );
    return execRows<{ id: string }>(result).length > 0;
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
  const rows = await getDb()
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) FILTER (WHERE ${missingPersons.status} = 'active')::int`,
      found: sql<number>`count(*) FILTER (WHERE ${missingPersons.status} = 'found')::int`,
      on_map: sql<number>`count(*) FILTER (
        WHERE ${missingPersons.status} = 'active' AND ${missingPersons.lat} IS NOT NULL AND ${missingPersons.lng} IS NOT NULL
      )::int`,
    })
    .from(missingPersons);
  const row = rows[0] ?? { total: 0, active: 0, found: 0, on_map: 0 };
  return {
    total: Number(row.total),
    active: Number(row.active),
    found: Number(row.found),
    onMap: Number(row.on_map),
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
  nationality: string | null;
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

  const conditions: ReturnType<typeof sql>[] = [
    sql`status = 'active'`,
    sql`lat IS NOT NULL`,
    sql`lng IS NOT NULL`,
  ];

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
    conditions.push(
      sql`lat BETWEEN ${Math.min(south, north)} AND ${Math.max(south, north)}`,
    );
    conditions.push(
      sql`lng BETWEEN ${Math.min(west, east)} AND ${Math.max(west, east)}`,
    );
  }

  const res = await getDb().execute(
    sql`SELECT id, name, age, nationality, last_seen,
               (photo IS NOT NULL) AS has_photo,
               photo_external_url,
               lat, lng, created_at
        FROM missing_persons
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY created_at DESC
        LIMIT ${limit}`,
  );
  const rows = execRows<MapRow>(res);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    age: row.age === null ? null : Number(row.age),
    nationality: row.nationality ?? "",
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
 * índice compuesto en infra/db/schema.ts. Devuelve null si el registro es
 * inválido (sin source/externalId/name) para que el caller lo cuente como
 * saltado.
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
 *
 * Se mantiene SQL crudo (getDb().execute) porque arma un INSERT multi-fila
 * dinámico con ON CONFLICT sobre un índice parcial (WHERE external_id IS NOT
 * NULL) y RETURNING (xmax = 0); el query builder no expresa el predicado del
 * índice parcial ni el xmax de forma directa. Semántica idéntica a la previa.
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

  const db = getDb();

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const tuples = chunk.map(
      (values) => sql`(${sql.join(values.map((v) => sql`${v}`), sql`,`)})`,
    );
    const query = sql`INSERT INTO missing_persons (${sql.raw(EXTERNAL_COLS.join(", "))}) VALUES ${sql.join(tuples, sql`,`)} ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL DO UPDATE SET${sql.raw(CONFLICT_UPDATE_SET)} RETURNING (xmax = 0) AS inserted`;
    try {
      const out = await db.execute(query);
      for (const r of execRows<{ inserted: boolean }>(out)) {
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
