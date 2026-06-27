import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/admin";
import { runGeocode } from "@/lib/sync/geocode";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Geocodifica un lote acotado de ubicaciones sin coordenadas (cron de Vercel,
 * ver vercel.json). Respeta el límite de Nominatim (~1 req/s); varias corridas
 * cubren todas las ubicaciones. Idempotente (la caché evita re-geocodificar).
 *
 *   GET /api/sync/geocode            -> lote por defecto
 *   GET /api/sync/geocode?max=30     -> tope de ubicaciones únicas
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (lo pone Vercel) o token admin.
 */
/**
 * @swagger
 * /api/sync/geocode:
 *   get:
 *     tags: [sync]
 *     summary: Geocodifica un lote de ubicaciones sin coordenadas (cron, requiere auth Bearer CRON_SECRET o token admin)
 *     parameters:
 *       - in: query
 *         name: max
 *         required: false
 *         description: Tope de ubicaciones únicas a geocodificar en la corrida.
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Resumen de la corrida de geocodificación.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *       401:
 *         description: No autorizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error al geocodificar.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const maxParam = Number(new URL(request.url).searchParams.get("max"));
  const maxLocations =
    Number.isFinite(maxParam) && maxParam > 0 ? maxParam : undefined;

  try {
    const result = await runGeocode({ maxLocations });
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al geocodificar." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
