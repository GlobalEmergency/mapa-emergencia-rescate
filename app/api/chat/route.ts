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
