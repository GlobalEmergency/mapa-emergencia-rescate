/**
 * BullMQ queues + worker factory (boahaus-backend pattern).
 *
 * Two queues:
 *  - migrate-tables: one job per table (Neon -> Hetzner upsert). Low volume.
 *  - migrate-photos: one job per row id (base64/external image -> R2). High
 *    volume (~26k); rate-limited so we don't hammer the external image hosts.
 *
 * Producers and workers both import from here. The worker entrypoint
 * (worker/index.ts) calls createWorkers(); enqueue.ts calls the queue getters.
 */
import { Queue, Worker, type Processor, type JobsOptions } from "bullmq";
import { getRedis } from "./redis";
import { migrateTable } from "./jobs/migrateTable";
import { migratePhoto, type PhotoTable } from "./jobs/migratePhoto";
import { TABLES } from "./tables";

const PREFIX = process.env.QUEUE_PREFIX || "mapa";
export const TABLES_QUEUE = "migrate-tables";
export const PHOTOS_QUEUE = "migrate-photos";

const REMOVE_ON_COMPLETE = Number(process.env.QUEUE_REMOVE_ON_COMPLETE || 1000);
const REMOVE_ON_FAIL = Number(process.env.QUEUE_REMOVE_ON_FAIL || 5000);

// External hosts (reconexión S3 etc.) get hammered by the photo job — cap the
// global rate. Tune via env if we see 429s. Default: 20 jobs / second.
const PHOTO_RATE_MAX = Number(process.env.PHOTO_RATE_MAX || 20);
const PHOTO_RATE_DURATION = Number(process.env.PHOTO_RATE_DURATION_MS || 1000);

let _tablesQ: Queue | null = null;
let _photosQ: Queue | null = null;

// streams.events.maxLen caps the BullMQ event stream in Valkey so it doesn't
// grow unbounded over a 26k-job run (boahaus pattern).
const QUEUE_OPTS = {
  prefix: PREFIX,
  streams: { events: { maxLen: 1000 } },
} as const;

export function tablesQueue(): Queue {
  if (!_tablesQ)
    _tablesQ = new Queue(TABLES_QUEUE, { connection: getRedis(), ...QUEUE_OPTS });
  return _tablesQ;
}
export function photosQueue(): Queue {
  if (!_photosQ)
    _photosQ = new Queue(PHOTOS_QUEUE, { connection: getRedis(), ...QUEUE_OPTS });
  return _photosQ;
}

// ---- Producers (deterministic jobId = idempotent / resumable) --------------

export async function enqueueTable(name: string, opts?: JobsOptions) {
  return tablesQueue().add(
    name,
    { table: name },
    {
      jobId: `tbl-${name}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: REMOVE_ON_COMPLETE,
      removeOnFail: REMOVE_ON_FAIL,
      ...opts,
    },
  );
}

export async function enqueuePhoto(table: PhotoTable, id: string, opts?: JobsOptions) {
  return photosQueue().add(
    table,
    { table, id },
    {
      jobId: `img-${table}-${id}`, // dedupe: re-enqueue is a no-op (no ':' — BullMQ forbids it)
      attempts: 4,
      backoff: { type: "exponential", delay: 3_000 },
      removeOnComplete: REMOVE_ON_COMPLETE,
      removeOnFail: REMOVE_ON_FAIL,
      ...opts,
    },
  );
}

// ---- Workers ---------------------------------------------------------------

const tablesProcessor: Processor = async (job) => {
  const spec = TABLES.find((t) => t.name === job.data.table);
  if (!spec) throw new Error(`Unknown table: ${job.data.table}`);
  return migrateTable(spec);
};

const photosProcessor: Processor = async (job) =>
  migratePhoto(job.data.table as PhotoTable, job.data.id as string);

export function createWorkers(): Worker[] {
  const conn = getRedis();
  const tablesConcurrency = Number(process.env.TABLES_CONCURRENCY || 4);
  const photosConcurrency = Number(process.env.PHOTOS_CONCURRENCY || 8);

  const tablesWorker = new Worker(TABLES_QUEUE, tablesProcessor, {
    connection: conn,
    prefix: PREFIX,
    concurrency: tablesConcurrency,
  });
  const photosWorker = new Worker(PHOTOS_QUEUE, photosProcessor, {
    connection: conn,
    prefix: PREFIX,
    concurrency: photosConcurrency,
    limiter: { max: PHOTO_RATE_MAX, duration: PHOTO_RATE_DURATION },
  });

  for (const [label, w] of [
    ["tables", tablesWorker],
    ["photos", photosWorker],
  ] as const) {
    w.on("failed", (job, err) =>
      console.error(`[${label}] job ${job?.id} failed:`, err?.message || err),
    );
    w.on("error", (err) => console.error(`[${label}] worker error:`, err?.message || err));
  }
  tablesWorker.on("completed", (job, r) =>
    console.log(`[tables] ${job.id} ->`, JSON.stringify(r)),
  );
  photosWorker.on("completed", (job, r) => {
    if (r?.status && r.status !== "migrated") return; // keep logs quiet for skips
    console.log(`[photos] ${job.id} -> ${r?.status}`);
  });

  return [tablesWorker, photosWorker];
}
