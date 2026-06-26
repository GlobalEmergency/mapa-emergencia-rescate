import { NextResponse } from "next/server";

/**
 * Lectura segura del body JSON con tope de tamaño.
 *
 * `request.json()` bufferiza el body COMPLETO antes de que podamos validar su
 * tamaño, así que un POST de cientos de MB agota memoria del proceso (DoS).
 * `readJson` corta el stream apenas se supera `maxBytes`, cubriendo también el
 * caso sin `Content-Length` (transfer-encoding: chunked).
 */

export class PayloadTooLargeError extends Error {
  constructor(public readonly limit: number) {
    super("Payload demasiado grande");
    this.name = "PayloadTooLargeError";
  }
}

export async function readJson<T = unknown>(
  request: Request,
  maxBytes: number,
): Promise<T> {
  // 1) Rechazo barato por Content-Length declarado.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }

  // 2) Lectura acotada del stream: cancela en cuanto se pasa del límite, sin
  //    llegar a bufferizar un body gigante (el caso chunked sin Content-Length).
  const body = request.body;
  if (!body) throw new SyntaxError("Body vacío");

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new PayloadTooLargeError(maxBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const buf = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(buf)) as T;
}

/**
 * Respuesta de error estándar para `readJson`: 413 si el body es demasiado
 * grande, 400 si el JSON es inválido. Centraliza el manejo en los endpoints.
 */
export function bodyErrorResponse(e: unknown): NextResponse {
  if (e instanceof PayloadTooLargeError) {
    return NextResponse.json(
      { error: "El contenido enviado es demasiado grande." },
      { status: 413 },
    );
  }
  return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
}

/** Topes por tipo de endpoint (en bytes). */
export const BODY_LIMIT_PHOTO = 2_000_000; // acepta foto en base64 (~1.4 MB) + campos
export const BODY_LIMIT_TEXT = 16_000; // formularios de solo texto
export const BODY_LIMIT_SMALL = 4_000; // login, donaciones
export const BODY_LIMIT_PROXY = 32_000; // eventos de analítica (op proxy)
