import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import {
  getContactStats,
  listContactMessages,
  markContactMessageRead,
} from "@/lib/contact-inbox";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/admin/contact:
 *   get:
 *     tags: [admin]
 *     summary: Lista mensajes del buzón de contacto y sus estadísticas (requiere admin)
 *     responses:
 *       200:
 *         description: Mensajes de contacto y estadísticas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generatedAt:
 *                   type: integer
 *                   description: epoch-ms
 *                 stats:
 *                   type: object
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: No se pudieron cargar los mensajes
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   patch:
 *     tags: [admin]
 *     summary: Marca un mensaje de contacto como leído (requiere admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id]
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mensaje marcado como leído
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *       400:
 *         description: JSON inválido o falta id
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Mensaje no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const [stats, messages] = await Promise.all([
      getContactStats(),
      listContactMessages(),
    ]);
    return NextResponse.json(
      { generatedAt: Date.now(), stats, messages },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar los mensajes." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Falta id del mensaje." }, { status: 400 });
  }

  const ok = await markContactMessageRead(body.id);
  if (!ok) {
    return NextResponse.json({ error: "Mensaje no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
