import { NextResponse } from "next/server";
import { getHospital } from "@/lib/hospitals";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // El detalle puede ser un hotspot si se comparte en medios. El micro-caché
  // evita además que el fallback por slug (que carga 1000 hospitales) se
  // ejecute en cada request.
  const hospital = await cached(`hospital:${id}`, 30_000, () => getHospital(id));
  if (!hospital) {
    return NextResponse.json(
      { error: "Hospital no encontrado." },
      { status: 404, headers: CACHE_HEADERS },
    );
  }
  return NextResponse.json({ hospital }, { headers: CACHE_HEADERS });
}
