import { listMissingMapMarkers } from "@/lib/missing";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=3, stale-while-revalidate=15",
};

function parseCoord(value: string | null): number | undefined {
  if (value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * @swagger
 * /api/missing/map:
 *   get:
 *     tags: [missing]
 *     summary: Marcadores de personas desaparecidas para el mapa, opcionalmente acotados a un viewport
 *     parameters:
 *       - in: query
 *         name: north
 *         required: false
 *         schema: { type: number }
 *         description: Límite norte del viewport (latitud)
 *       - in: query
 *         name: south
 *         required: false
 *         schema: { type: number }
 *         description: Límite sur del viewport (latitud)
 *       - in: query
 *         name: east
 *         required: false
 *         schema: { type: number }
 *         description: Límite este del viewport (longitud)
 *       - in: query
 *         name: west
 *         required: false
 *         schema: { type: number }
 *         description: Límite oeste del viewport (longitud)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, default: 500 }
 *         description: Máximo de marcadores a devolver
 *     responses:
 *       200:
 *         description: Lista de marcadores de personas desaparecidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 markers:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/MissingMapMarker' }
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const north = parseCoord(params.get("north"));
  const south = parseCoord(params.get("south"));
  const east = parseCoord(params.get("east"));
  const west = parseCoord(params.get("west"));
  const limit = Number(params.get("limit") ?? "500");
  // Clave por viewport: el caso sin viewport (vista completa, el 95% del
  // tráfico) cachea perfecto; los viewports concretos entran en el LRU acotado.
  const key = `missing-map:${north ?? ""}:${south ?? ""}:${east ?? ""}:${west ?? ""}:${limit}`;
  const markers = await cached(key, 3_000, () =>
    listMissingMapMarkers({ north, south, east, west, limit }),
  );
  return jsonWithEtag(request, { markers }, CACHE_HEADERS);
}
