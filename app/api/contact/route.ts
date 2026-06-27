import { NextResponse } from "next/server";
import {
  createContactMessage,
  validateContactInput,
} from "@/lib/contact-inbox";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { readJson, bodyErrorResponse, BODY_LIMIT_TEXT } from "@/lib/body";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/contact:
 *   post:
 *     tags: [system]
 *     summary: Recibe un mensaje de contacto (rate-limited)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, message]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Mensaje recibido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 id: { type: string }
 *                 message: { type: string }
 *       400:
 *         description: Entrada inválida
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Demasiados mensajes (rate limit)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: No se pudo guardar el mensaje
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const allowed = await checkRateLimit(`contact:${ip}`, 3);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiados mensajes. Intenta de nuevo en un minuto." },
      { status: 429 },
    );
  }

  let body: {
    name?: unknown;
    email?: unknown;
    subject?: unknown;
    message?: unknown;
  };
  try {
    body = await readJson(request, BODY_LIMIT_TEXT);
  } catch (e) {
    return bodyErrorResponse(e);
  }

  const parsed = validateContactInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const message = await createContactMessage({
      ...parsed,
      ipHash: ip,
    });
    return NextResponse.json({
      ok: true,
      id: message.id,
      message: "Mensaje recibido. Te responderemos pronto.",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar el mensaje." },
      { status: 503 },
    );
  }
}
