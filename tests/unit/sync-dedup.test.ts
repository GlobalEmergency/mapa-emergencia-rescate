import { describe, it, expect } from "vitest";
import { classify } from "@/lib/sync/dedup";

// El discriminador es la CONCENTRACIÓN de edades (edades_distintas/registros),
// no su número. Umbral: ratio <= 0.34 => misma persona (mass-reportada).
describe("classify (same-person vs homónimos)", () => {
  it("0 o 1 edad distinta => misma persona", () => {
    expect(classify(33, 0)).toBe("same-person");
    expect(classify(10, 1)).toBe("same-person");
  });

  it("baja concentración de edades => misma persona (ej. 33 reg / 4 edades)", () => {
    expect(classify(33, 4)).toBe("same-person"); // 0.12
  });

  it("alta concentración => homónimos (ej. 15 reg / 10 edades)", () => {
    expect(classify(15, 10)).toBe("homonyms"); // 0.67
  });

  it("respeta el umbral 0.34 de forma inclusiva", () => {
    expect(classify(100, 34)).toBe("same-person"); // 0.34 <= 0.34
    expect(classify(100, 35)).toBe("homonyms"); // 0.35 > 0.34
  });
});
