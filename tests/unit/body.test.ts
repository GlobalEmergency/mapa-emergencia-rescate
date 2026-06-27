import { describe, it, expect } from "vitest";
import {
  readJson,
  bodyErrorResponse,
  PayloadTooLargeError,
  BODY_LIMIT_PHOTO,
  BODY_LIMIT_TEXT,
  BODY_LIMIT_SMALL,
  BODY_LIMIT_PROXY,
} from "@/lib/body";

// `readJson` solo usa `request.headers.get` y `request.body`, así que basta un
// objeto mínimo. Esto evita las particularidades de undici al construir un
// Request con cuerpo de stream (duplex/content-length recalculado).
function reqWithContentLength(length: number): Request {
  return {
    headers: new Headers({ "content-length": String(length) }),
    body: null,
  } as unknown as Request;
}

function reqWithBody(text: string, headers: Record<string, string> = {}): Request {
  const bytes = new TextEncoder().encode(text);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return {
    headers: new Headers(headers),
    body: stream,
  } as unknown as Request;
}

function emptyBodyReq(): Request {
  return { headers: new Headers(), body: null } as unknown as Request;
}

describe("readJson", () => {
  it("rechaza por Content-Length declarado mayor al límite (rechazo barato)", async () => {
    await expect(readJson(reqWithContentLength(2_001), 2_000)).rejects.toBeInstanceOf(
      PayloadTooLargeError,
    );
  });

  it("rechaza un stream que supera el límite aunque no haya Content-Length", async () => {
    const big = "x".repeat(5_000);
    await expect(readJson(reqWithBody(big), 1_000)).rejects.toBeInstanceOf(
      PayloadTooLargeError,
    );
  });

  it("lanza SyntaxError cuando el body está vacío", async () => {
    await expect(readJson(emptyBodyReq(), 1_000)).rejects.toBeInstanceOf(SyntaxError);
  });

  it("parsea JSON válido dentro del límite", async () => {
    const payload = { name: "Demo Sintetico", age: 30 };
    const out = await readJson<typeof payload>(
      reqWithBody(JSON.stringify(payload)),
      1_000,
    );
    expect(out).toEqual(payload);
  });

  it("lanza SyntaxError con JSON inválido", async () => {
    await expect(readJson(reqWithBody("{not json"), 1_000)).rejects.toBeInstanceOf(
      SyntaxError,
    );
  });
});

describe("bodyErrorResponse", () => {
  it("devuelve 413 para PayloadTooLargeError", async () => {
    const res = bodyErrorResponse(new PayloadTooLargeError(2_000));
    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("devuelve 400 para cualquier otro error (JSON inválido)", async () => {
    const res = bodyErrorResponse(new SyntaxError("bad"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "JSON inválido" });
  });
});

describe("límites de tamaño", () => {
  it("son positivos y ordenados de menor a mayor según el tipo de endpoint", () => {
    expect(BODY_LIMIT_SMALL).toBeGreaterThan(0);
    expect(BODY_LIMIT_SMALL).toBeLessThan(BODY_LIMIT_TEXT);
    expect(BODY_LIMIT_TEXT).toBeLessThan(BODY_LIMIT_PROXY);
    expect(BODY_LIMIT_PROXY).toBeLessThan(BODY_LIMIT_PHOTO);
  });
});
