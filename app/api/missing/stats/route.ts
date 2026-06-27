import { countMissingStats } from "@/lib/missing";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=5, stale-while-revalidate=30",
};

/**
 * @swagger
 * /api/missing/stats:
 *   get:
 *     tags: [missing]
 *     summary: Obtiene estadísticas agregadas de personas desaparecidas
 *     responses:
 *       200:
 *         description: Conteos agregados (activas, encontradas, total, en mapa)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   $ref: '#/components/schemas/MissingStats'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  // Micro-caché en proceso (TTL = s-maxage): aunque no haya CDN delante, el
  // polling masivo se sirve desde memoria y la BD ve ~1 query cada 5 s.
  const stats = await cached("missing:stats", 5_000, () => countMissingStats());
  return jsonWithEtag(request, { stats }, CACHE_HEADERS);
}
