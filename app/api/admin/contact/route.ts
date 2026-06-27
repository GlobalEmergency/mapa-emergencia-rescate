import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import {
  getContactStats,
  listContactMessages,
  markContactMessageRead,
} from "@/lib/contact-inbox";

export const dynamic = "force-dynamic";

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
