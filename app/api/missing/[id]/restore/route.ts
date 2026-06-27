import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { restoreMissing } from "@/lib/missing";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/missing/{id}/restore:
 *   post:
 *     tags: [missing]
 *     summary: Restaura (admin) una persona desaparecida previamente marcada como localizada
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Restauración exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No existe o no estaba marcada como localizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { id } = await params;
  const ok = await restoreMissing(id);
  if (!ok) {
    return NextResponse.json(
      { error: "No se pudo restaurar (no existe o no estaba marcada)." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
