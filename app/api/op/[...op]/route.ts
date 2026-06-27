import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { readJson, bodyErrorResponse, BODY_LIMIT_PROXY } from "@/lib/body";

export const dynamic = "force-dynamic";

const DEFAULT_API_URL = "https://api.openpanel.dev";
const SCRIPT_URL = "https://openpanel.dev/op1.js";

function apiUrl(): string {
  return (process.env.OPENPANEL_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}

function requestOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function forwardHeaders(request: Request): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("openpanel-client-id", request.headers.get("openpanel-client-id") ?? "");
  if (process.env.OPENPANEL_CLIENT_SECRET) {
    headers.set("openpanel-client-secret", process.env.OPENPANEL_CLIENT_SECRET);
  }
  headers.set("origin", requestOrigin(request));
  headers.set("User-Agent", request.headers.get("user-agent") ?? "");

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-vercel-forwarded-for");
  if (ip) headers.set("openpanel-client-ip", ip);

  return headers;
}

/**
 * @swagger
 * /api/op/{op}:
 *   get:
 *     tags: [system]
 *     summary: Proxy del script de OpenPanel (solo /op1.js)
 *     parameters:
 *       - in: path
 *         name: op
 *         required: true
 *         schema: { type: string }
 *         description: Segmento de ruta; debe terminar en /op1.js
 *     responses:
 *       200:
 *         description: Script JavaScript de OpenPanel (bytes)
 *         content:
 *           text/javascript: {}
 *       404:
 *         description: Ruta no soportada (no termina en /op1.js)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Fallo al obtener el script upstream
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   post:
 *     tags: [system]
 *     summary: Proxy de eventos de tracking de OpenPanel (solo /track)
 *     parameters:
 *       - in: path
 *         name: op
 *         required: true
 *         schema: { type: string }
 *         description: Segmento de ruta; debe contener /track
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload de evento de OpenPanel (se reenvía tal cual)
 *     responses:
 *       200:
 *         description: Respuesta upstream de OpenPanel reenviada
 *       404:
 *         description: Ruta no soportada (no contiene /track)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       413:
 *         description: Payload demasiado grande
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Fallo al reenviar la petición a OpenPanel
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (!pathname.endsWith("/op1.js")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const script = await fetch(SCRIPT_URL, {
      next: { revalidate: 86_400 },
    }).then((res) => res.text());
    const etag = `"${createHash("md5").update(SCRIPT_URL + script).digest("hex")}"`;
    return new NextResponse(script, {
      headers: {
        "Content-Type": "text/javascript",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400",
        ETag: etag,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch OpenPanel script",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;
  const trackIndex = pathname.indexOf("/track");
  if (trackIndex === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await readJson(request, BODY_LIMIT_PROXY);
  } catch (e) {
    return bodyErrorResponse(e);
  }

  try {
    const upstream = await fetch(`${apiUrl()}${pathname.slice(trackIndex)}`, {
      method: "POST",
      headers: forwardHeaders(request),
      body: JSON.stringify(payload),
    });
    const contentType = upstream.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return NextResponse.json(await upstream.json(), { status: upstream.status });
    }
    return new NextResponse(await upstream.text(), { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to proxy OpenPanel request",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
