import { NextResponse } from "next/server";
import { searchPatients } from "@/lib/hospitals";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=5, stale-while-revalidate=30",
};

/**
 * @swagger
 * /api/patients/search:
 *   get:
 *     tags: [hospitals]
 *     summary: Busca pacientes hospitalizados por nombre u otros datos
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema: { type: string }
 *         description: Texto de búsqueda
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 200, default: 50 }
 *         description: Máximo de resultados (se acota entre 1 y 200)
 *     responses:
 *       200:
 *         description: Resultados de la búsqueda de pacientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/HospitalPatient' }
 *                 query: { type: string }
 *                 hasMore: { type: boolean }
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const limit = Number(params.get("limit") ?? "50");
  const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? limit : 50, 1), 200);
  const rows = await searchPatients(q, safeLimit + 1);
  const hasMore = rows.length > safeLimit;
  const results = rows.slice(0, safeLimit);
  return NextResponse.json(
    { results, query: q, hasMore },
    { headers: CACHE_HEADERS },
  );
}
