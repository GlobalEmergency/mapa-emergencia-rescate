import { NextResponse } from "next/server";
import {
  addReport,
  isPersistent,
  listReports,
  MAX_REPORT_PHOTO_CHARS,
} from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";
import { readJson, bodyErrorResponse, BODY_LIMIT_PHOTO } from "@/lib/body";
import { REPORT_TYPE_KEYS, type NewReport, type ReportType } from "@/lib/types";

export const dynamic = "force-dynamic";

// La respuesta se cachea unos segundos. Si hay un CDN delante (p. ej. Vercel),
// el polling se sirve desde el edge. Sin CDN, el micro-caché en proceso cumple
// la misma función: la BD ve ~1 query cada `s-maxage` por instancia.
const LIST_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=4, stale-while-revalidate=30",
};

/**
 * @swagger
 * /api/reports:
 *   get:
 *     tags: [reports]
 *     summary: Lista de reportes de emergencia
 *     responses:
 *       200:
 *         description: Reportes y bandera de persistencia
 *   post:
 *     tags: [reports]
 *     summary: Crear un reporte de emergencia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lat, lng, place, type]
 *             properties:
 *               type: { type: string }
 *               lat: { type: number }
 *               lng: { type: number }
 *               place: { type: string }
 *               affected: { type: integer }
 *               needs: { type: string }
 *               photo: { type: string, description: "data:image/...;base64 (opcional)" }
 *     responses:
 *       201: { description: Reporte creado }
 *       400: { description: Datos inválidos }
 *       429: { description: Rate limit }
 *       503: { description: No se pudo guardar }
 */
export async function GET(request: Request) {
  const reports = await cached("reports", 4_000, () => listReports());
  return jsonWithEtag(
    request,
    { reports, persistent: isPersistent() },
    LIST_CACHE_HEADERS,
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
    body = await readJson(request, BODY_LIMIT_PHOTO);
  } catch (e) {
    return bodyErrorResponse(e);
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
