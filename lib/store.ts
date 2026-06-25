import { getSql, hasDbEnv } from "./db";
import {
  REPORT_TYPE_KEYS,
  type EmergencyReport,
  type NewReport,
  type ReportType,
} from "./types";

let _schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    const sql = getSql();
    _schemaReady = sql`
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
    `.then(() => undefined);
  }
  return _schemaReady;
}

const memoryStore = new Map<string, EmergencyReport>();

function createReport(input: NewReport): EmergencyReport {
  const type = REPORT_TYPE_KEYS.includes(input.type) ? input.type : "critical";
  return {
    id: crypto.randomUUID(),
    type,
    lat: Number(input.lat),
    lng: Number(input.lng),
    place: input.place.trim().slice(0, 200),
    affected: Math.max(0, Math.trunc(Number(input.affected) || 0)),
    needs: input.needs.trim().slice(0, 1000),
    createdAt: Date.now(),
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
    createdAt: Number(row.created_at),
  };
}

export async function listReports(): Promise<EmergencyReport[]> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT id, type, lat, lng, place, affected, needs, created_at
      FROM reports
      ORDER BY created_at DESC
      LIMIT 2000
    `) as ReportRow[];
    return rows.map(rowToReport);
  }
  return [...memoryStore.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function addReport(input: NewReport): Promise<EmergencyReport> {
  if (!hasDbEnv() && process.env.VERCEL) {
    throw new Error("DATABASE_URL no configurada: la persistencia es obligatoria.");
  }
  const report = createReport(input);
  if (hasDbEnv()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO reports (id, type, lat, lng, place, affected, needs, created_at)
      VALUES (
        ${report.id}, ${report.type}, ${report.lat}, ${report.lng},
        ${report.place}, ${report.affected}, ${report.needs}, ${report.createdAt}
      )
    `;
  } else {
    memoryStore.set(report.id, report);
  }
  return report;
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
