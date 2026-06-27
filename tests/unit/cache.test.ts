import { describe, it, expect } from "vitest";
import { cached, invalidate } from "@/lib/cache";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// El caché es estado de módulo: cada prueba usa una clave única para no
// interferir con las demás.
let n = 0;
const uniqueKey = () => `test-key-${n++}`;

describe("cached", () => {
  it("sirve el valor cacheado y no recomputa mientras está fresco", async () => {
    const key = uniqueKey();
    let calls = 0;
    const fn = async () => {
      calls++;
      return "valor";
    };

    const a = await cached(key, 1_000, fn);
    const b = await cached(key, 1_000, fn);

    expect(a).toBe("valor");
    expect(b).toBe("valor");
    expect(calls).toBe(1);
  });

  it("single-flight: peticiones concurrentes colapsan en una sola recomputación", async () => {
    const key = uniqueKey();
    let calls = 0;
    let release!: (v: string) => void;
    const fn = () =>
      new Promise<string>((resolve) => {
        calls++;
        release = resolve;
      });

    const p1 = cached(key, 1_000, fn);
    const p2 = cached(key, 1_000, fn);

    // Ambas esperan, pero `fn` se invocó una sola vez.
    expect(calls).toBe(1);

    release("x");
    expect(await p1).toBe("x");
    expect(await p2).toBe("x");
    expect(calls).toBe(1);
  });

  it("stale-while-revalidate: tras expirar sirve el valor viejo y refresca en segundo plano", async () => {
    const key = uniqueKey();
    let calls = 0;
    const fn = async () => {
      calls++;
      return calls;
    };

    const v1 = await cached(key, 10, fn); // calls = 1
    expect(v1).toBe(1);

    await sleep(25); // la entrada expira

    // SWR: devuelve el valor viejo al instante y dispara el refresco de fondo.
    const v2 = await cached(key, 10, fn);
    expect(v2).toBe(1);

    await sleep(5); // deja terminar el refresco de fondo

    const v3 = await cached(key, 10, fn); // entrada nueva y fresca
    expect(v3).toBe(2);
    expect(calls).toBe(2);
  });

  it("invalidate(clave) fuerza una recomputación en la siguiente lectura", async () => {
    const key = uniqueKey();
    let calls = 0;
    const fn = async () => {
      calls++;
      return calls;
    };

    await cached(key, 10_000, fn); // calls = 1
    invalidate(key);
    const after = await cached(key, 10_000, fn); // recomputa

    expect(after).toBe(2);
    expect(calls).toBe(2);
  });

  it("invalidate() sin argumento limpia todo el caché", async () => {
    const key = uniqueKey();
    let calls = 0;
    const fn = async () => {
      calls++;
      return calls;
    };

    await cached(key, 10_000, fn); // calls = 1
    invalidate();
    await cached(key, 10_000, fn); // recomputa

    expect(calls).toBe(2);
  });
});
