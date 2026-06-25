import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

function hasRedisEnv(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

let _limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (!hasRedisEnv()) return null;
  if (!_limiter) {
    _limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(8, "60 s"),
      prefix: "ratelimit:emergency",
      analytics: false,
    });
  }
  return _limiter;
}

const memoryHits = new Map<string, number[]>();
const MEMORY_LIMIT = 8;
const MEMORY_WINDOW_MS = 60_000;

function memoryLimit(key: string): boolean {
  const now = Date.now();
  const hits = (memoryHits.get(key) ?? []).filter(
    (ts) => now - ts < MEMORY_WINDOW_MS,
  );
  if (hits.length >= MEMORY_LIMIT) {
    memoryHits.set(key, hits);
    return false;
  }
  hits.push(now);
  memoryHits.set(key, hits);
  return true;
}

/**
 * Comprueba el límite de peticiones para un identificador (normalmente la IP).
 * Devuelve true si la petición está permitida.
 */
export async function checkRateLimit(identifier: string): Promise<boolean> {
  const limiter = getLimiter();
  if (!limiter) return memoryLimit(identifier);
  const { success } = await limiter.limit(identifier);
  return success;
}

/**
 * Extrae la IP del cliente desde las cabeceras de la petición.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "anon";
}
