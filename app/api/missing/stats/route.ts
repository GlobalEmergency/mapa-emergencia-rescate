import { countMissingStats } from "@/lib/missing";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=5, stale-while-revalidate=30",
};

export async function GET(request: Request) {
  // Micro-caché en proceso (TTL = s-maxage): aunque no haya CDN delante, el
  // polling masivo se sirve desde memoria y la BD ve ~1 query cada 5 s.
  const stats = await cached("missing:stats", 5_000, () => countMissingStats());
  return jsonWithEtag(request, { stats }, CACHE_HEADERS);
}
