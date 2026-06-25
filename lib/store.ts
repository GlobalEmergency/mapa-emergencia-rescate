import { Redis } from "@upstash/redis";
import type { EmergencyReport, NewReport, ReportType } from "./types";

const REDIS_KEY = "emergency:reports";

function hasRedisEnv(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

const memoryStore = new Map<string, EmergencyReport>();

const VALID_TYPES: ReportType[] = ["critical", "supplies", "shelter"];

function createReport(input: NewReport): EmergencyReport {
  const type = VALID_TYPES.includes(input.type) ? input.type : "critical";
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

export async function listReports(): Promise<EmergencyReport[]> {
  if (hasRedisEnv()) {
    const map = await getRedis().hgetall<Record<string, EmergencyReport>>(
      REDIS_KEY,
    );
    const reports = map ? Object.values(map) : [];
    return reports.sort((a, b) => b.createdAt - a.createdAt);
  }
  return [...memoryStore.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function addReport(input: NewReport): Promise<EmergencyReport> {
  const report = createReport(input);
  if (hasRedisEnv()) {
    await getRedis().hset(REDIS_KEY, { [report.id]: report });
  } else {
    memoryStore.set(report.id, report);
  }
  return report;
}

export async function removeReport(id: string): Promise<boolean> {
  if (hasRedisEnv()) {
    const removed = await getRedis().hdel(REDIS_KEY, id);
    return removed > 0;
  }
  return memoryStore.delete(id);
}

export function isPersistent(): boolean {
  return hasRedisEnv();
}
