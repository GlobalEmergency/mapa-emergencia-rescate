import { describe, it, expect } from "vitest";
import {
  clip,
  normalizeAge,
  toEpochMs,
  httpUrlOrNull,
} from "@/lib/sync/normalize";

describe("clip", () => {
  it("convierte null/undefined a cadena vacía (la columna es NOT NULL)", () => {
    expect(clip(null, 10)).toBe("");
    expect(clip(undefined, 10)).toBe("");
  });

  it("recorta espacios y trunca a `max`", () => {
    expect(clip("  hola  ", 10)).toBe("hola");
    expect(clip("abcdefghij", 5)).toBe("abcde");
  });

  it("coacciona valores no-string", () => {
    expect(clip(123, 10)).toBe("123");
  });
});

describe("normalizeAge", () => {
  it("devuelve null para vacío/nulo/no numérico", () => {
    expect(normalizeAge(null)).toBeNull();
    expect(normalizeAge(undefined)).toBeNull();
    expect(normalizeAge("")).toBeNull();
    expect(normalizeAge("abc")).toBeNull();
  });

  it("acepta edades válidas y trunca decimales", () => {
    expect(normalizeAge(30)).toBe(30);
    expect(normalizeAge("45")).toBe(45);
    expect(normalizeAge(30.9)).toBe(30);
    expect(normalizeAge(0)).toBe(0);
    expect(normalizeAge(130)).toBe(130);
  });

  it("rechaza fuera de rango [0,130]", () => {
    expect(normalizeAge(-1)).toBeNull();
    expect(normalizeAge(131)).toBeNull();
    expect(normalizeAge(9999)).toBeNull();
  });
});

describe("toEpochMs", () => {
  it("devuelve null para vacío/nulo", () => {
    expect(toEpochMs(null)).toBeNull();
    expect(toEpochMs(undefined)).toBeNull();
    expect(toEpochMs("")).toBeNull();
  });

  it("pasa números finitos tal cual (ya son ms)", () => {
    expect(toEpochMs(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it("parsea strings de fecha a epoch-ms", () => {
    expect(toEpochMs("2026-01-01T00:00:00.000Z")).toBe(
      Date.parse("2026-01-01T00:00:00.000Z"),
    );
  });

  it("devuelve null para fechas inválidas", () => {
    expect(toEpochMs("no-es-fecha")).toBeNull();
    expect(toEpochMs(Number.NaN)).toBeNull();
  });
});

describe("httpUrlOrNull", () => {
  it("acepta http/https y recorta a `max`", () => {
    expect(httpUrlOrNull("https://x.com/a")).toBe("https://x.com/a");
    expect(httpUrlOrNull("http://x.com")).toBe("http://x.com");
    expect(httpUrlOrNull("https://x.com/" + "a".repeat(700))!.length).toBe(600);
  });

  it("rechaza no-strings y esquemas no http", () => {
    expect(httpUrlOrNull(123)).toBeNull();
    expect(httpUrlOrNull(null)).toBeNull();
    expect(httpUrlOrNull("/relativa")).toBeNull();
    expect(httpUrlOrNull("ftp://x.com")).toBeNull();
  });
});
