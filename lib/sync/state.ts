/**
 * Estado de sincronización por fuente: el cursor de página para la ejecución
 * por chunks. Ver docs/rfcs/0001-sincronizacion-fuentes.md §2.5.
 */

import { getSql, hasDbEnv } from "../db";
import type { SyncResult } from "./types";

export interface SyncCursor {
  /** Próxima página a procesar (1-based). */
  nextPage: number;
  /** Último total de páginas conocido (null si aún no se sabe). */
  totalPages: number | null;
}

let _stateSchemaReady: Promise<void> | null = null;
function ensureStateSchema(): Promise<void> {
  if (!_stateSchemaReady) {
    const sql = getSql();
    _stateSchemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS sync_state (
          source TEXT PRIMARY KEY,
          next_page INTEGER NOT NULL DEFAULT 1,
          total_pages INTEGER,
          last_run_at BIGINT,
          last_cycle_completed_at BIGINT,
          updated_at BIGINT NOT NULL
        )
      `;
      // Bitácora de corridas (observabilidad).
      await sql`
        CREATE TABLE IF NOT EXISTS sync_runs (
          id BIGSERIAL PRIMARY KEY,
          source TEXT NOT NULL,
          trigger TEXT,
          ok BOOLEAN NOT NULL,
          fetched INTEGER NOT NULL DEFAULT 0,
          inserted INTEGER NOT NULL DEFAULT 0,
          updated INTEGER NOT NULL DEFAULT 0,
          skipped INTEGER NOT NULL DEFAULT 0,
          errors INTEGER NOT NULL DEFAULT 0,
          from_page INTEGER,
          to_page INTEGER,
          next_page INTEGER,
          cycle_completed BOOLEAN,
          error TEXT,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          started_at BIGINT NOT NULL,
          finished_at BIGINT NOT NULL
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON sync_runs (started_at DESC)`;
    })();
  }
  return _stateSchemaReady;
}

/** Lee el cursor de una fuente; si no existe, devuelve el inicial (página 1). */
export async function getSyncCursor(source: string): Promise<SyncCursor> {
  if (!hasDbEnv()) return { nextPage: 1, totalPages: null };
  await ensureStateSchema();
  const rows = (await getSql()`
    SELECT next_page, total_pages FROM sync_state WHERE source = ${source}
  `) as { next_page: number; total_pages: number | null }[];
  if (rows.length === 0) return { nextPage: 1, totalPages: null };
  return {
    nextPage: Math.max(1, Number(rows[0].next_page) || 1),
    totalPages: rows[0].total_pages === null ? null : Number(rows[0].total_pages),
  };
}

/** Persiste el cursor de una fuente (upsert). */
export async function setSyncCursor(
  source: string,
  cursor: SyncCursor,
  opts: { cycleCompleted?: boolean } = {},
): Promise<void> {
  if (!hasDbEnv()) return;
  await ensureStateSchema();
  const now = Date.now();
  const cycleAt = opts.cycleCompleted ? now : null;
  await getSql()`
    INSERT INTO sync_state
      (source, next_page, total_pages, last_run_at, last_cycle_completed_at, updated_at)
    VALUES (
      ${source}, ${cursor.nextPage}, ${cursor.totalPages}, ${now}, ${cycleAt}, ${now}
    )
    ON CONFLICT (source) DO UPDATE SET
      next_page = EXCLUDED.next_page,
      total_pages = EXCLUDED.total_pages,
      last_run_at = EXCLUDED.last_run_at,
      last_cycle_completed_at = COALESCE(EXCLUDED.last_cycle_completed_at, sync_state.last_cycle_completed_at),
      updated_at = EXCLUDED.updated_at
  `;
}

/**
 * Reinicia el cursor a la página 1 (re-escaneo desde el inicio). No destructivo:
 * solo cambia por dónde arranca el próximo scan. Si se pasa `source`, solo esa.
 */
export async function resetSyncCursor(source?: string): Promise<void> {
  if (!hasDbEnv()) return;
  await ensureStateSchema();
  const now = Date.now();
  if (source) {
    await getSql()`
      UPDATE sync_state SET next_page = 1, last_cycle_completed_at = NULL, updated_at = ${now}
      WHERE source = ${source}
    `;
  } else {
    await getSql()`
      UPDATE sync_state SET next_page = 1, last_cycle_completed_at = NULL, updated_at = ${now}
    `;
  }
}

export type SyncTrigger = "cron" | "manual";

/** Registra una corrida en la bitácora (best-effort: no rompe el sync si falla). */
export async function recordSyncRun(
  result: SyncResult,
  trigger: SyncTrigger,
): Promise<void> {
  if (!hasDbEnv()) return;
  try {
    await ensureStateSchema();
    await getSql()`
      INSERT INTO sync_runs (
        source, trigger, ok, fetched, inserted, updated, skipped, errors,
        from_page, to_page, next_page, cycle_completed, error,
        duration_ms, started_at, finished_at
      ) VALUES (
        ${result.source}, ${trigger}, ${result.ok}, ${result.fetched},
        ${result.inserted}, ${result.updated}, ${result.skipped}, ${result.errors},
        ${result.fromPage ?? null}, ${result.toPage ?? null}, ${result.nextPage ?? null},
        ${result.cycleCompleted ?? null}, ${result.error ?? null},
        ${result.durationMs}, ${result.startedAt}, ${result.finishedAt}
      )
    `;
  } catch {
    // la observabilidad no debe tumbar el sync
  }
}

export interface SyncRunRow {
  source: string;
  trigger: string | null;
  ok: boolean;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  fromPage: number | null;
  toPage: number | null;
  nextPage: number | null;
  cycleCompleted: boolean | null;
  error: string | null;
  durationMs: number;
  startedAt: number;
  finishedAt: number;
}

/** Últimas corridas (para el panel admin). */
export async function listSyncRuns(limit = 20): Promise<SyncRunRow[]> {
  if (!hasDbEnv()) return [];
  await ensureStateSchema();
  const n = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const rows = (await getSql()`
    SELECT source, trigger, ok, fetched, inserted, updated, skipped, errors,
           from_page, to_page, next_page, cycle_completed, error,
           duration_ms, started_at, finished_at
    FROM sync_runs ORDER BY started_at DESC LIMIT ${n}
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    source: String(r.source),
    trigger: (r.trigger as string) ?? null,
    ok: Boolean(r.ok),
    fetched: Number(r.fetched),
    inserted: Number(r.inserted),
    updated: Number(r.updated),
    skipped: Number(r.skipped),
    errors: Number(r.errors),
    fromPage: r.from_page === null ? null : Number(r.from_page),
    toPage: r.to_page === null ? null : Number(r.to_page),
    nextPage: r.next_page === null ? null : Number(r.next_page),
    cycleCompleted: r.cycle_completed === null ? null : Boolean(r.cycle_completed),
    error: (r.error as string) ?? null,
    durationMs: Number(r.duration_ms),
    startedAt: Number(r.started_at),
    finishedAt: Number(r.finished_at),
  }));
}

export interface SyncStateRow {
  source: string;
  nextPage: number;
  totalPages: number | null;
  lastRunAt: number | null;
  lastCycleCompletedAt: number | null;
}

/** Cursor actual de cada fuente (para el panel admin). */
export async function listSyncState(): Promise<SyncStateRow[]> {
  if (!hasDbEnv()) return [];
  await ensureStateSchema();
  const rows = (await getSql()`
    SELECT source, next_page, total_pages, last_run_at, last_cycle_completed_at
    FROM sync_state ORDER BY source
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    source: String(r.source),
    nextPage: Number(r.next_page),
    totalPages: r.total_pages === null ? null : Number(r.total_pages),
    lastRunAt: r.last_run_at === null ? null : Number(r.last_run_at),
    lastCycleCompletedAt:
      r.last_cycle_completed_at === null ? null : Number(r.last_cycle_completed_at),
  }));
}
