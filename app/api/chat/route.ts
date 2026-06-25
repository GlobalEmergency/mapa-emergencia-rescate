import { NextResponse } from "next/server";
import { addMessage, listMessages, MAX_TEXT } from "@/lib/chat";
import { isPersistent } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const LIST_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=3, stale-while-revalidate=20",
};

export async function GET() {
  const messages = await listMessages();
  return NextResponse.json(
    { messages, persistent: isPersistent() },
    { headers: LIST_CACHE_HEADERS },
  );
}

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`chat:${clientIp(request)}`, 20);
  if (!allowed) {
    return NextResponse.json(
      { error: "Vas muy rápido. Espera un momento antes de enviar más mensajes." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  let body: { name?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
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

  try {
    const message = await addMessage({ name: body.name, text });
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
