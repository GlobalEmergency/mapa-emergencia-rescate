import { createHash } from "crypto";
import { NextResponse } from "next/server";

/**
 * Responde JSON con un ETag derivado del contenido. Si el cliente manda
 * `If-None-Match` con ese mismo ETag, devuelve `304 Not Modified` sin cuerpo.
 *
 * Bajo polling masivo esto corta ancho de banda y CPU de parseo en el cliente:
 * mientras los datos no cambian, cada request se resuelve con un 304 vacío.
 * Encaja con el micro-caché en proceso: el JSON ya está calculado, solo lo
 * hasheamos.
 */
export function jsonWithEtag(
  request: Request,
  data: unknown,
  headers: Record<string, string> = {},
): NextResponse {
  const json = JSON.stringify(data);
  const etag = `"${createHash("sha1").update(json).digest("base64")}"`;
  const ifNoneMatch = request.headers.get("if-none-match");

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304, headers: { ...headers, ETag: etag } });
  }
  return new NextResponse(json, {
    status: 200,
    headers: { ...headers, ETag: etag, "Content-Type": "application/json" },
  });
}
