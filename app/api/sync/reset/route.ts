import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { resetSyncCursor } from "@/lib/sync/state";

export const dynamic = "force-dynamic";

/**
 * Reinicia el cursor de sincronización a la página 1 (re-escaneo desde el
 * inicio). No destructivo. Admin only.
 *
 *   POST /api/sync/reset            -> todas las fuentes
 *   POST /api/sync/reset?source=<id>-> solo esa fuente
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const source = new URL(request.url).searchParams.get("source") ?? undefined;
  try {
    await resetSyncCursor(source);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al reiniciar el cursor." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
