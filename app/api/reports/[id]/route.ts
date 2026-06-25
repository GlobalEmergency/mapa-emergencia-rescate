import { NextResponse } from "next/server";
import { removeReport } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { isAdminRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: "Solo los administradores pueden marcar reportes como atendidos." },
      { status: 401 },
    );
  }

  const allowed = await checkRateLimit(`del:${clientIp(request)}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  }
  const removed = await removeReport(id);
  if (!removed) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
