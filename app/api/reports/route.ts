import { NextResponse } from "next/server";
import {
  addReport,
  isPersistent,
  listReports,
  MAX_REPORT_PHOTO_CHARS,
} from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { REPORT_TYPE_KEYS, type NewReport, type ReportType } from "@/lib/types";

export const dynamic = "force-dynamic";

// La respuesta se cachea en el CDN de Vercel durante unos segundos para que
// miles de usuarios haciendo polling se sirvan desde el edge y no golpeen la
// base de datos en cada petición.
const LIST_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=4, stale-while-revalidate=30",
};

export async function GET() {
  const reports = await listReports();
  return NextResponse.json(
    { reports, persistent: isPersistent() },
    { headers: LIST_CACHE_HEADERS },
  );
}

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`post:${clientIp(request)}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  let body: Partial<NewReport>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const place = typeof body.place === "string" ? body.place.trim() : "";
  const type = body.type as ReportType | undefined;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Ubicación inválida. Toca un punto en el mapa." },
      { status: 400 },
    );
  }
  if (!place) {
    return NextResponse.json(
      { error: "Indica el nombre o dirección del lugar." },
      { status: 400 },
    );
  }
  if (!type || !REPORT_TYPE_KEYS.includes(type)) {
    return NextResponse.json(
      { error: "Selecciona el tipo de marcador." },
      { status: 400 },
    );
  }

  const photo = typeof body.photo === "string" ? body.photo : null;
  if (photo) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo)) {
      return NextResponse.json(
        { error: "La foto debe ser una imagen JPG, PNG o WebP válida." },
        { status: 400 },
      );
    }
    if (photo.length > MAX_REPORT_PHOTO_CHARS) {
      return NextResponse.json(
        { error: "La foto es demasiado grande. Usa una imagen más liviana." },
        { status: 413 },
      );
    }
  }

  try {
    const report = await addReport({
      type,
      lat,
      lng,
      place,
      affected: Number(body.affected) || 0,
      needs: typeof body.needs === "string" ? body.needs : "",
      photo,
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch {
    // Falla visible: nunca confirmamos un reporte que no se guardó en la base.
    return NextResponse.json(
      {
        error:
          "No se pudo guardar el reporte. Revisa tu conexión e inténtalo de nuevo.",
      },
      { status: 503 },
    );
  }
}
