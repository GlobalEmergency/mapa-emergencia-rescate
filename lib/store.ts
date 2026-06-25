import { getSql, hasDbEnv } from "./db";
import {
  REPORT_TYPE_KEYS,
  type EmergencyReport,
  type NewReport,
  type ReportType,
} from "./types";

/** Límite del data URL de la foto (~1.4 MB en base64 ≈ 1 MB de imagen). */
export const MAX_REPORT_PHOTO_CHARS = 1_400_000;

let _schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    const sql = getSql();
    _schemaReady = (async () => {
      // CREATE IF NOT EXISTS y ALTER IF NOT EXISTS aseguran compatibilidad
      // hacia atrás: si la tabla ya existe sin la columna `photo`, se agrega
      // sin tocar los datos existentes.
      await sql`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          lat DOUBLE PRECISION NOT NULL,
          lng DOUBLE PRECISION NOT NULL,
          place TEXT NOT NULL,
          affected INTEGER NOT NULL DEFAULT 0,
          needs TEXT NOT NULL DEFAULT '',
          created_at BIGINT NOT NULL
        )
      `;
      await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS photo TEXT`;
      await sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS confirmations INTEGER NOT NULL DEFAULT 0`;
    })();
  }
  return _schemaReady;
}

interface MemoryRecord extends EmergencyReport {
  photo: string | null;
}
const memoryStore = new Map<string, MemoryRecord>();
const memoryConfirmations = new Map<string, Set<string>>();

function isValidPhotoDataUrl(photo: string): boolean {
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo);
}

function createReport(input: NewReport): {
  report: EmergencyReport;
  photo: string | null;
} {
  const type = REPORT_TYPE_KEYS.includes(input.type) ? input.type : "critical";
  const id = crypto.randomUUID();
  const photo =
    typeof input.photo === "string" &&
    input.photo &&
    isValidPhotoDataUrl(input.photo) &&
    input.photo.length <= MAX_REPORT_PHOTO_CHARS
      ? input.photo
      : null;
  return {
    photo,
    report: {
      id,
      type,
      lat: Number(input.lat),
      lng: Number(input.lng),
      place: input.place.trim().slice(0, 200),
      affected: Math.max(0, Math.trunc(Number(input.affected) || 0)),
      needs: input.needs.trim().slice(0, 1000),
      photoUrl: photo ? `/api/reports/${id}/photo` : null,
      confirmations: 0,
      createdAt: Date.now(),
    },
  };
}

type ReportRow = {
  id: string;
  type: string;
  lat: number;
  lng: number;
  place: string;
  affected: number;
  needs: string;
  has_photo: boolean;
  confirmations: number;
  created_at: string | number;
};

function rowToReport(row: ReportRow): EmergencyReport {
  return {
    id: row.id,
    type: row.type as ReportType,
    lat: Number(row.lat),
    lng: Number(row.lng),
    place: row.place,
    affected: Number(row.affected),
    needs: row.needs,
    photoUrl: row.has_photo ? `/api/reports/${row.id}/photo` : null,
    confirmations: Number(row.confirmations ?? 0),
    createdAt: Number(row.created_at),
  };
}

export async function listReports(): Promise<EmergencyReport[]> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT id, type, lat, lng, place, affected, needs,
             (photo IS NOT NULL) AS has_photo, confirmations, created_at
      FROM reports
      ORDER BY created_at DESC
      LIMIT 2000
    `) as ReportRow[];
    return rows.map(rowToReport);
  }
  return [...memoryStore.values()]
    .map(({ photo: _photo, ...rest }) => rest)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function addReport(input: NewReport): Promise<EmergencyReport> {
  if (!hasDbEnv() && process.env.VERCEL) {
    throw new Error("DATABASE_URL no configurada: la persistencia es obligatoria.");
  }
  const { report, photo } = createReport(input);
  if (hasDbEnv()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO reports (id, type, lat, lng, place, affected, needs, photo, created_at)
      VALUES (
        ${report.id}, ${report.type}, ${report.lat}, ${report.lng},
        ${report.place}, ${report.affected}, ${report.needs}, ${photo}, ${report.createdAt}
      )
    `;
  } else {
    memoryStore.set(report.id, { ...report, photo });
  }
  return report;
}

export interface PhotoData {
  contentType: string;
  buffer: Buffer;
}

export async function getReportPhoto(id: string): Promise<PhotoData | null> {
  let dataUrl: string | null = null;
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT photo FROM reports WHERE id = ${id}
    `) as { photo: string | null }[];
    dataUrl = rows[0]?.photo ?? null;
  } else {
    dataUrl = memoryStore.get(id)?.photo ?? null;
  }
  if (!dataUrl) return null;
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

/** Devuelve el nuevo total de confirmaciones, o `null` si esa IP ya había
 * confirmado este reporte (dedup). */
export async function confirmReport(
  id: string,
  ipKey: string,
): Promise<number | null> {
  if (hasDbEnv()) {
    await ensureSchema();
    const sql = getSql();
    // Tabla de dedup ligera: (report_id, ip_hash) único; si el INSERT genera
    // conflicto, no incrementamos.
    await sql`
      CREATE TABLE IF NOT EXISTS report_confirmations (
        report_id TEXT NOT NULL,
        ip_hash TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (report_id, ip_hash)
      )
    `;
    const inserted = (await sql`
      INSERT INTO report_confirmations (report_id, ip_hash, created_at)
      VALUES (${id}, ${ipKey}, ${Date.now()})
      ON CONFLICT DO NOTHING
      RETURNING report_id
    `) as { report_id: string }[];
    if (inserted.length === 0) return null;
    const rows = (await sql`
      UPDATE reports SET confirmations = confirmations + 1
      WHERE id = ${id}
      RETURNING confirmations
    `) as { confirmations: number }[];
    return rows[0] ? Number(rows[0].confirmations) : null;
  }
  const set = memoryConfirmations.get(id) ?? new Set<string>();
  if (set.has(ipKey)) return null;
  set.add(ipKey);
  memoryConfirmations.set(id, set);
  const record = memoryStore.get(id);
  if (!record) return null;
  record.confirmations += 1;
  return record.confirmations;
}

export async function removeReport(id: string): Promise<boolean> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      DELETE FROM reports WHERE id = ${id} RETURNING id
    `) as { id: string }[];
    return rows.length > 0;
  }
  return memoryStore.delete(id);
}

export function isPersistent(): boolean {
  return hasDbEnv();
}
