/**
 * Worker entrypoint — runs the BullMQ workers (table-migration + photo-migration).
 * Deployed as its own k8s Deployment (separate from the app), scaled by replicas.
 * Graceful SIGTERM (boahaus pattern): drain in-flight jobs before exit so a
 * rolling restart never drops work.
 */
import { createWorkers } from "./queues";
import { closePools } from "./db";

const workers = createWorkers();
console.log(`[worker] started ${workers.length} workers`);

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
