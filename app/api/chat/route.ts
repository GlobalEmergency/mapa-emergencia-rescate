import { NextResponse } from "next/server";
import {
  addMessage,
  isValidChatRole,
  listMessages,
  MAX_TEXT,
  type ChatRole,
} from "@/lib/chat";
import { isPersistent } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { readJson, bodyErrorResponse, BODY_LIMIT_TEXT } from "@/lib/body";

export const dynamic = "force-dynamic";

const LIST_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=3, stale-while-revalidate=20",
};

/**
 * @swagger
 * /api/chat:
 *   get:
 *     tags: [chat]
 *     summary: Lista los mensajes del chat ciudadano, con filtro opcional por rol.
 *     parameters:
 *       - in: query
 *         name: role
 *         required: false
 *         description: Filtra los mensajes por rol del autor.
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de mensajes y si el almacenamiento es persistente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ChatMessage' }
 *                 persistent: { type: boolean }
 *   post:
 *     tags: [chat]
 *     summary: Crea un mensaje en el chat ciudadano (con rate-limit).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               name: { type: string }
 *               text: { type: string }
 *               role: { type: string }
 *               replyTo: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Mensaje creado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { $ref: '#/components/schemas/ChatMessage' }
 *       400:
 *         description: Texto vacío o demasiado largo.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Límite de envíos excedido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: No se pudo guardar el mensaje.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roleParam = searchParams.get("role");
  const roleFilter = isValidChatRole(roleParam ?? "")
    ? (roleParam as ChatRole)
    : undefined;

  const messages = await listMessages(roleFilter ? { role: roleFilter } : {});
  return NextResponse.json(
    { messages, persistent: isPersistent() },
    { headers: LIST_CACHE_HEADERS },
  );
}

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`chat:${clientIp(request)}`, 20);
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Vas muy rápido. Espera un momento antes de enviar más mensajes.",
      },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  let body: {
    name?: string;
    text?: string;
    role?: string;
    replyTo?: string | null;
  };
  try {
    body = await readJson(request, BODY_LIMIT_TEXT);
  } catch (e) {
    return bodyErrorResponse(e);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json(
      { error: "Escribe un mensaje." },
      { status: 400 },
    );
  }
  if (text.length > MAX_TEXT) {
    return NextResponse.json(
      { error: `El mensaje no puede superar ${MAX_TEXT} caracteres.` },
      { status: 400 },
    );
  }

  const role =
    typeof body.role === "string" && isValidChatRole(body.role)
      ? body.role
      : "citizen";

  const replyTo =
    typeof body.replyTo === "string" && body.replyTo.trim()
      ? body.replyTo.trim()
      : null;

  try {
    const message = await addMessage({
      name: body.name,
      text,
      role,
      replyTo,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo enviar el mensaje. Revisa tu conexión e inténtalo de nuevo.",
      },
      { status: 503 },
    );
  }
}
