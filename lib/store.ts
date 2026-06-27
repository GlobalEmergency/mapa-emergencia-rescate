import { desc, eq, sql } from "drizzle-orm";
import { getDb, hasDbEnv, schema } from "./drizzle";
import { isR2Configured, uploadPhotoDataUrl } from "./r2";
import {
  REPORT_TYPE_KEYS,
  type EmergencyReport,
  type NewReport,
  type ReportType,
} from "./types";

const { reports } = schema;

/** Límite del data URL de la foto (~1.4 MB en base64 ≈ 1 MB de imagen). */
export const MAX_REPORT_PHOTO_CHARS = 1_400_000;

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

// Fila del listado: seleccionamos un booleano `hasPhoto` en vez de exponer la
// columna `photo` completa.
type ReportListRow = {
  id: string;
  type: string;
  lat: number;
  lng: number;
  place: string;
  affected: number;
  needs: string;
  hasPhoto: boolean;
  confirmations: number;
  createdAt: number;
};

function rowToReport(row: ReportListRow): EmergencyReport {
  return {
    id: row.id,
    type: row.type as ReportType,
    lat: Number(row.lat),
    lng: Number(row.lng),
    place: row.place,
    affected: Number(row.affected),
    needs: row.needs,
    photoUrl: row.hasPhoto ? `/api/reports/${row.id}/photo` : null,
    confirmations: Number(row.confirmations ?? 0),
    createdAt: Number(row.createdAt),
  };
}

export async function listReports(): Promise<EmergencyReport[]> {
  if (hasDbEnv()) {
    const rows = await getDb()
      .select({
        id: reports.id,
        type: reports.type,
        lat: reports.lat,
        lng: reports.lng,
        place: reports.place,
        affected: reports.affected,
        needs: reports.needs,
        hasPhoto: sql<boolean>`${reports.photo} IS NOT NULL`,
        confirmations: reports.confirmations,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(500);
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
  // Si R2 está configurado, la foto va al CDN y guardamos la URL (no base64).
  // Hard-fail: si la subida falla, el error sube y el endpoint no confirma.
  let stored = photo;
  let migratedAt: number | null = null;
  if (photo && isR2Configured()) {
    stored = await uploadPhotoDataUrl(photo, "reports", report.id);
    migratedAt = Date.now();
  }
  if (hasDbEnv()) {
    await getDb().insert(reports).values({
      id: report.id,
      type: report.type,
      lat: report.lat,
      lng: report.lng,
      place: report.place,
      affected: report.affected,
      needs: report.needs,
      photo: stored,
      photoMigratedAt: migratedAt,
      createdAt: report.createdAt,
    });
  } else {
    memoryStore.set(report.id, { ...report, photo: stored });
  }
  return report;
}

export interface PhotoData {
  contentType: string;
  buffer: Buffer;
}
/** Foto alojada en R2/CDN: el endpoint redirige en vez de servir bytes. */
export interface RemotePhoto {
  redirectTo: string;
}

export async function getReportPhoto(
  id: string,
): Promise<PhotoData | RemotePhoto | null> {
  let dataUrl: string | null = null;
  if (hasDbEnv()) {
    const rows = await getDb()
      .select({ photo: reports.photo })
      .from(reports)
      .where(eq(reports.id, id));
    dataUrl = rows[0]?.photo ?? null;
  } else {
    dataUrl = memoryStore.get(id)?.photo ?? null;
  }
  if (!dataUrl) return null;
  // Foto migrada a R2: `photo` es una URL del CDN → redirigir en vez de bytes.
  if (/^https?:\/\//i.test(dataUrl)) return { redirectTo: dataUrl };
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
    // Dedup (report_id, ip_hash) + incremento en UNA sola sentencia atómica:
    // si la IP ya había confirmado, el INSERT genera conflicto, el CTE `ins`
    // queda vacío, el UPDATE no afecta filas y devolvemos null. El CTE recursivo
    // no se expresa bien en el query builder, así que usamos el escape `sql`.
    const rows = (await getDb().execute(sql`
      WITH ins AS (
        INSERT INTO report_confirmations (report_id, ip_hash, created_at)
        VALUES (${id}, ${ipKey}, ${Date.now()})
        ON CONFLICT DO NOTHING
        RETURNING report_id
      )
      UPDATE reports r SET confirmations = confirmations + 1
      FROM ins WHERE r.id = ins.report_id
      RETURNING r.confirmations
    `)) as unknown as { confirmations: number }[];
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
    // `.returning()` tiene overloads incompatibles entre los dos drivers (la
    // unión neon-http | node-postgres), así que usamos el escape `sql`.
    const res = await getDb().execute(
      sql`DELETE FROM ${reports} WHERE ${reports.id} = ${id} RETURNING id`,
    );
    const rows = (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as unknown[];
    return rows.length > 0;
  }
  return memoryStore.delete(id);
}

export function isPersistent(): boolean {
  return hasDbEnv();
}
