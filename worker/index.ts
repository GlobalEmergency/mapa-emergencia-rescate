/**
 * Worker entrypoint — runs the BullMQ workers (table-migration + photo-migration).
 * Deployed as its own k8s Deployment (separate from the app), scaled by replicas.
 * Graceful SIGTERM (boahaus pattern): drain in-flight jobs before exit so a
 * rolling restart never drops work.
 */
import { createWorkers, registerHubSchedulers } from "./queues";
import { closePools } from "./db";

const workers = createWorkers();
console.log(`[worker] started ${workers.length} workers`);

// Schedulers repetibles del hub (Celery-Beat-equivalente): incremental cada
// 5 min + reconcile cada 6 h. Idempotente (upsert). Se puede apagar con
// HUB_SCHEDULERS=0 (p. ej. para correr solo la migración sin federación).
if (process.env.HUB_SCHEDULERS !== "0") {
  registerHubSchedulers().catch((err) =>
    console.error("[hub] no se pudieron registrar schedulers:", err?.message || err),
  );
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] ${signal} — closing workers...`);
  await Promise.allSettled(workers.map((w) => w.close()));
  await closePools();
  console.log("[worker] closed. bye.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
