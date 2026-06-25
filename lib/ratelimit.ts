const memoryHits = new Map<string, number[]>();
const LIMIT = 8;
const WINDOW_MS = 60_000;

/**
 * Límite de peticiones en memoria por identificador (normalmente la IP).
 * Devuelve true si la petición está permitida dentro de la ventana actual.
 *
 * Nota: en serverless el contador es por instancia de función. Para frenar
 * spam puntual es suficiente; la protección principal ante tráfico masivo es
 * la caché de CDN sobre el endpoint de lectura.
 */
export async function checkRateLimit(identifier: string): Promise<boolean> {
  const now = Date.now();
  const hits = (memoryHits.get(identifier) ?? []).filter(
    (ts) => now - ts < WINDOW_MS,
  );
  if (hits.length >= LIMIT) {
    memoryHits.set(identifier, hits);
    return false;
  }
  hits.push(now);
  memoryHits.set(identifier, hits);
  return true;
}

/**
 * Extrae la IP del cliente desde las cabeceras de la petición.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "anon";
}
