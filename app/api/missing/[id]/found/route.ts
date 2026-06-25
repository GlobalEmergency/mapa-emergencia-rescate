import { NextResponse } from "next/server";
import {
  isValidPhotoDataUrl,
  markMissingFound,
  MAX_PHOTO_CHARS,
  MAX_RESOLUTION_NOTE,
} from "@/lib/missing";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const allowed = await checkRateLimit(`found:${clientIp(request)}`, 6);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento." },
      { status: 429 },
    );
  }
  const { id } = await params;

  let body: { note?: string; photo?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note : "";
  if (!note.trim()) {
    return NextResponse.json(
      { error: "Cuéntanos cómo te comunicaste o quién confirmó el contacto." },
      { status: 400 },
    );
  }
  if (note.length > MAX_RESOLUTION_NOTE) {
    return NextResponse.json(
      { error: "La explicación es demasiado larga." },
      { status: 400 },
    );
  }

  const photo = typeof body.photo === "string" ? body.photo : null;
  if (photo) {
    if (!isValidPhotoDataUrl(photo)) {
      return NextResponse.json(
        { error: "La prueba debe ser una imagen JPG, PNG o WebP válida." },
        { status: 400 },
      );
    }
    if (photo.length > MAX_PHOTO_CHARS) {
      return NextResponse.json(
        { error: "La imagen es demasiado grande. Usa una más liviana." },
        { status: 413 },
      );
    }
  }

  try {
    const person = await markMissingFound(id, note, photo);
    if (!person) {
      return NextResponse.json(
        { error: "El reporte no existe o ya fue resuelto." },
        { status: 404 },
      );
    }
    return NextResponse.json({ person });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al actualizar." },
      { status: 503 },
    );
  }
}
