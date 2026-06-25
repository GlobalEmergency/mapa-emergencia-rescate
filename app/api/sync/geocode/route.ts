import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/admin";
import { runGeocode } from "@/lib/sync/geocode";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Geocodifica un lote acotado de ubicaciones sin coordenadas (cron de Vercel,
 * ver vercel.json). Respeta el límite de Nominatim (~1 req/s); varias corridas
 * cubren todas las ubicaciones. Idempotente (la caché evita re-geocodificar).
 *
 *   GET /api/sync/geocode            -> lote por defecto
 *   GET /api/sync/geocode?max=30     -> tope de ubicaciones únicas
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (lo pone Vercel) o token admin.
 */
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const maxParam = Number(new URL(request.url).searchParams.get("max"));
  const maxLocations =
    Number.isFinite(maxParam) && maxParam > 0 ? maxParam : undefined;

  try {
    const result = await runGeocode({ maxLocations });
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al geocodificar." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
