import { NextResponse } from "next/server";
import {
  addMissing,
  DEFAULT_PAGE_SIZE,
  isValidPhotoDataUrl,
  listMissingPage,
  MAX_NAME,
  MAX_PHOTO_CHARS,
  MIN_SEARCH_LEN,
  type MissingStatusFilter,
} from "@/lib/missing";
import { isPersistent } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";
import { readJson, bodyErrorResponse, BODY_LIMIT_PHOTO } from "@/lib/body";

export const dynamic = "force-dynamic";

const LIST_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=2, stale-while-revalidate=15",
};
// Las búsquedas no necesitan frescura de 2 s y son el caso más caro (count por
// término). Un TTL largo colapsa los re-counts del polling y comparte las
// búsquedas populares entre usuarios.
const SEARCH_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // Por defecto se listan solo las personas activas (las localizadas se
  // ocultan para proteger su privacidad y mantener el foco). Con
  // ?status=found devolvemos solo las localizadas (caso "muro de
  // esperanza"); con ?status=all devolvemos ambas.
  const statusParam = params.get("status");
  const status: MissingStatusFilter =
    statusParam === "found" ? "found" : statusParam === "all" ? "all" : "active";

  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? String(DEFAULT_PAGE_SIZE));
  const search = params.get("q") ?? undefined;
  // Una búsqueda efectiva necesita al menos MIN_SEARCH_LEN caracteres; por
  // debajo de eso se trata como listado normal (TTL corto, conteo exacto).
  const hasSearch = (search ?? "").trim().length >= MIN_SEARCH_LEN;
  // Clave por params: la página 1 sin búsqueda (lo que ve el 95%) cachea
  // perfecto; las búsquedas/páginas profundas entran en el LRU acotado.
  const key = `missing:${status}:${page}:${pageSize}:${search ?? ""}`;
  const result = await cached(key, hasSearch ? 30_000 : 2_000, () =>
    listMissingPage({ status, page, pageSize, search }),
  );

  return jsonWithEtag(
    request,
    {
      people: result.people,
      total: result.total,
      totalCapped: result.totalCapped,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      persistent: isPersistent(),
    },
    hasSearch ? SEARCH_CACHE_HEADERS : LIST_CACHE_HEADERS,
  );
}

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`missing:${clientIp(request)}`, 10);
  if (!allowed) {
    return NextResponse.json(
      { error: "Vas muy rápido. Espera un momento antes de enviar más reportes." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  let body: {
    name?: string;
    age?: number | string | null;
    description?: string;
    lastSeen?: string;
    contact?: string;
    photo?: string | null;
    reportType?: "missing" | "found";
  };
  try {
    body = await readJson(request, BODY_LIMIT_PHOTO);
  } catch (e) {
    return bodyErrorResponse(e);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Indica el nombre de la persona desaparecida." },
      { status: 400 },
    );
  }
  if (name.length > MAX_NAME) {
    return NextResponse.json(
      { error: `El nombre no puede superar ${MAX_NAME} caracteres.` },
      { status: 400 },
    );
  }

  if (body.photo) {
    if (typeof body.photo !== "string" || !isValidPhotoDataUrl(body.photo)) {
      return NextResponse.json(
        { error: "La foto debe ser una imagen JPG, PNG o WebP válida." },
        { status: 400 },
      );
    }
    if (body.photo.length > MAX_PHOTO_CHARS) {
      return NextResponse.json(
        { error: "La foto es demasiado grande. Usa una imagen más liviana." },
        { status: 413 },
      );
    }
  }

  try {
    const reportType =
      body.reportType === "found" ? "found" : "missing";
    const person = await addMissing({
      name,
      age: body.age,
      description: body.description,
      lastSeen: body.lastSeen,
      contact: body.contact,
      photo: body.photo,
      reportType,
    });
    return NextResponse.json({ person }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo guardar el reporte. Revisa tu conexión e inténtalo de nuevo.",
      },
      { status: 503 },
    );
  }
}
