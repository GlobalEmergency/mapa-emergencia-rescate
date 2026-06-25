import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { restoreMissing } from "@/lib/missing";

export const dynamic = "force-dynamic";

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
