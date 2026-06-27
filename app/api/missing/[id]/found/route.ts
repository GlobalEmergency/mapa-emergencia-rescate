import { NextResponse } from "next/server";
import {
  isValidPhotoDataUrl,
  markMissingFound,
  MAX_PHOTO_CHARS,
  MAX_RESOLUTION_NOTE,
} from "@/lib/missing";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { readJson, bodyErrorResponse, BODY_LIMIT_PHOTO } from "@/lib/body";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/missing/{id}/found:
 *   post:
 *     tags: [missing]
 *     summary: Marca un reporte de persona desaparecida como localizada con nota y foto de prueba
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID del reporte de persona desaparecida
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [note, photo]
 *             properties:
 *               note:
 *                 type: string
 *                 description: Explicación de cómo se confirmó el contacto
 *               photo:
 *                 type: string
 *                 description: Imagen (data URL JPG/PNG/WebP) como prueba del contacto
 *     responses:
 *       200:
 *         description: Persona marcada como localizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 person: { $ref: '#/components/schemas/MissingPerson' }
 *       400:
 *         description: Falta la nota o la foto, o son inválidas
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: El reporte no existe o ya fue resuelto
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       413:
 *         description: La imagen excede el tamaño permitido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Demasiadas solicitudes (rate limit)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: No se pudo actualizar, intentar de nuevo
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const allowed = await checkRateLimit(`found:${clientIp(request)}`, 2);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento." },
      { status: 429 },
    );
  }
  const { id } = await params;

  let body: { note?: string; photo?: string | null };
  try {
    body = await readJson(request, BODY_LIMIT_PHOTO);
  } catch (e) {
    return bodyErrorResponse(e);
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
  if (!photo) {
    return NextResponse.json(
      { error: "Adjunta una captura o foto como prueba del contacto." },
      { status: 400 },
    );
  }
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

  try {
    const person = await markMissingFound(id, note, photo);
    if (!person) {
      return NextResponse.json(
        { error: "El reporte no existe o ya fue resuelto." },
        { status: 404 },
      );
    }
    return NextResponse.json({ person });
  } catch {
    // No exponemos err.message al cliente (puede filtrar detalles internos).
    return NextResponse.json(
      { error: "No se pudo actualizar. Inténtalo de nuevo." },
      { status: 503 },
    );
  }
}
