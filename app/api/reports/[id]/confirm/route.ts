import { NextResponse } from "next/server";
import { confirmReport } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/reports/{id}/confirm:
 *   post:
 *     tags: [reports]
 *     summary: Confirma un reporte de emergencia (una vez por IP)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Confirmación registrada; devuelve el total de confirmaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 confirmations: { type: integer }
 *       409:
 *         description: La IP ya confirmó este reporte
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 error: { type: string }
 *       429:
 *         description: Demasiadas confirmaciones desde el dispositivo
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: No se pudo confirmar
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(request);
  // Rate-limit por IP, generoso: confirmar es barato pero queremos evitar
  // bursts de bots.
  const allowed = await checkRateLimit(`confirm:${ip}`, 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas confirmaciones desde tu dispositivo." },
      { status: 429 },
    );
  }
  const { id } = await params;
  try {
    const result = await confirmReport(id, ip);
    if (result === null) {
      return NextResponse.json(
        { ok: false, error: "Ya confirmaste este reporte." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, confirmations: result });
  } catch {
    return NextResponse.json(
      { error: "No se pudo confirmar. Intenta de nuevo." },
      { status: 503 },
    );
  }
}
