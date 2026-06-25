import { NextResponse } from "next/server";
import { confirmReport } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

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
