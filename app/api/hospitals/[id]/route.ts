import { NextResponse } from "next/server";
import { getHospital } from "@/lib/hospitals";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
};

/**
 * @swagger
 * /api/hospitals/{id}:
 *   get:
 *     tags: [hospitals]
 *     summary: Obtiene el detalle de un hospital por id (o slug).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Id o slug del hospital.
 *     responses:
 *       200:
 *         description: Hospital encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hospital: { $ref: '#/components/schemas/Hospital' }
 *       404:
 *         description: Hospital no encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // El detalle puede ser un hotspot si se comparte en medios. El micro-caché
  // evita además que el fallback por slug (que carga 1000 hospitales) se
  // ejecute en cada request.
  const hospital = await cached(`hospital:${id}`, 30_000, () => getHospital(id));
  if (!hospital) {
    return NextResponse.json(
      { error: "Hospital no encontrado." },
      { status: 404, headers: CACHE_HEADERS },
    );
  }
  return NextResponse.json({ hospital }, { headers: CACHE_HEADERS });
}
