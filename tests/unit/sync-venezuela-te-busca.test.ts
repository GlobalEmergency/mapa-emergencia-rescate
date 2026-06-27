import { describe, it, expect, vi, afterEach } from "vitest";
import { decode } from "turbo-stream";
import {
  mapPerson,
  extractLoaderData,
  type ApiPerson,
  type LoaderData,
} from "@/lib/sync/sources/venezuela-te-busca";

/**
 * Payload turbo-stream **v2** sintético (datos DEMO, sin PII) capturado con la
 * misma forma single-fetch que devuelve venezuelatebusca.com (React Router).
 * Regenerar con scripts internos si cambia el contrato de la fuente.
 *
 * Sirve de test de CONTRATO de wire-format: si turbo-stream se sube a v3 (cuyo
 * formato NO es retrocompatible), `decode` deja de reconstruir el objeto y
 * devuelve un array plano; entonces no se extraen personas y este test falla,
 * atrapando el bug silencioso antes de que llegue a producción.
 */
const V2_WIRE =
  "[{\"_1\":2,\"_5\":6},\"root\",{\"_3\":4},\"ok\",true,\"routes/_index\",{\"_7\":8},\"data\",{\"_9\":10,\"_53\":54,\"_59\":60},\"persons\",[11,40],{\"_12\":13,\"_14\":15,\"_16\":17,\"_18\":19,\"_20\":21,\"_22\":23,\"_24\":25,\"_26\":27,\"_28\":29,\"_30\":31,\"_32\":33},\"id\",\"demo-1\",\"firstName\",\"Ana\",\"lastName\",\"Demo\",\"age\",30,\"status\",\"missing\",\"lastSeen\",\"Caracas (demo)\",\"description\",\"registro de prueba\",\"photoUrl\",\"/uploads/demo1.jpg\",\"createdAt\",\"2026-01-01T00:00:00.000Z\",\"updatedAt\",\"2026-01-02T00:00:00.000Z\",\"reporter\",{\"_34\":35,\"_36\":37,\"_38\":39},\"name\",\"Reportante Demo\",\"phone\",\"555-0100\",\"email\",\"demo@example.com\",{\"_12\":41,\"_14\":42,\"_16\":17,\"_18\":-5,\"_20\":43,\"_44\":45,\"_26\":46,\"_28\":47,\"_30\":48,\"_32\":49},\"demo-2\",\"Beto\",\"found\",\"foundNote\",\"ubicado (demo)\",\"https://cdn.example.com/demo2.jpg\",\"2026-01-03T00:00:00.000Z\",\"2026-01-04T00:00:00.000Z\",{\"_34\":50,\"_36\":51,\"_38\":52},\"Reportante Demo 2\",\"555-0200\",\"demo2@example.com\",\"pagination\",{\"_55\":56,\"_57\":58},\"page\",1,\"hasMore\",false,\"totalCount\",2]\n";

function streamFromString(str: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(str);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function decodeWire(wire: string): Promise<unknown> {
  const decoded = (await decode(streamFromString(wire))) as {
    value: unknown;
    done?: Promise<unknown>;
  };
  await decoded.done?.catch(() => {});
  return decoded.value;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("turbo-stream wire-format (contrato con la fuente)", () => {
  it("decodifica el formato v2 de la fuente y reconstruye el objeto", async () => {
    const root = await decodeWire(V2_WIRE);
    // Si decode devolviera un array plano (p. ej. con turbo-stream v3) esto
    // fallaría: es justo la regresión que queremos detectar.
    expect(Array.isArray(root)).toBe(false);
    expect(typeof root).toBe("object");
    expect(Object.keys(root as object)).toEqual(["root", "routes/_index"]);
  });

  it("extractLoaderData saca la ruta single-fetch con `persons`", async () => {
    const root = (await decodeWire(V2_WIRE)) as Record<
      string,
      { data?: LoaderData }
    >;
    const data = extractLoaderData(root);
    expect(data.persons).toHaveLength(2);
    expect(data.pagination?.hasMore).toBe(false);
    expect(data.totalCount).toBe(2);
  });

  it("end-to-end: decode -> extract -> mapPerson produce registros válidos", async () => {
    const root = (await decodeWire(V2_WIRE)) as Record<
      string,
      { data?: LoaderData }
    >;
    const persons = (extractLoaderData(root).persons ?? []).map(mapPerson);
    expect(persons).toHaveLength(2);
    expect(persons.every((p) => p !== null)).toBe(true);
  });
});

describe("extractLoaderData", () => {
  it("devuelve el root tal cual si ya trae `persons` arriba", () => {
    const data: LoaderData = { persons: [], totalCount: 0 };
    expect(extractLoaderData(data)).toBe(data);
  });

  it("ignora rutas sin `persons` y elige la que sí los tiene", () => {
    const root = {
      root: { data: { something: true } as unknown as LoaderData },
      "routes/_index": { data: { persons: [{ id: "x" }], totalCount: 1 } },
    };
    expect(extractLoaderData(root).persons).toHaveLength(1);
  });
});

describe("mapPerson", () => {
  const base: ApiPerson = {
    id: "demo-1",
    firstName: "Ana",
    lastName: "Demo",
    age: 30,
    status: "missing",
    lastSeen: "Caracas (demo)",
    description: "registro de prueba",
    photoUrl: "/uploads/demo1.jpg",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    reporter: { name: "Rep", phone: "555-0100", email: "demo@example.com" },
  };

  it("mapea un desaparecido y compone el nombre", () => {
    const p = mapPerson(base);
    expect(p).not.toBeNull();
    expect(p!.externalId).toBe("demo-1");
    expect(p!.name).toBe("Ana Demo");
    expect(p!.age).toBe(30);
    expect(p!.status).toBe("active");
    expect(p!.resolutionNote).toBeNull();
    expect(p!.resolvedAt).toBeNull();
  });

  it("absolutiza photoUrl relativa y conserva las absolutas", () => {
    expect(mapPerson(base)!.photoUrl).toBe(
      "https://venezuelatebusca.com/uploads/demo1.jpg",
    );
    expect(
      mapPerson({ ...base, photoUrl: "https://cdn.example.com/x.jpg" })!.photoUrl,
    ).toBe("https://cdn.example.com/x.jpg");
    expect(mapPerson({ ...base, photoUrl: "no-es-url" })!.photoUrl).toBeNull();
  });

  it("mapea un encontrado con nota y fecha de resolución", () => {
    const p = mapPerson({
      ...base,
      status: "found",
      foundNote: "ubicado (demo)",
    });
    expect(p!.status).toBe("found");
    expect(p!.resolutionNote).toBe("ubicado (demo)");
    expect(p!.resolvedAt).toBe(Date.parse("2026-01-02T00:00:00.000Z"));
  });

  it("NO importa el contacto (PII) por defecto", () => {
    expect(mapPerson(base)!.contact).toBeNull();
  });

  it("importa el teléfono del reportante solo con el flag activo", () => {
    vi.stubEnv("SOURCE_VENEZUELATEBUSCA_IMPORT_CONTACT", "true");
    expect(mapPerson(base)!.contact).toBe("555-0100");
  });

  it("descarta registros sin id o sin nombre", () => {
    expect(mapPerson({ ...base, id: undefined })).toBeNull();
    expect(mapPerson({ ...base, firstName: undefined, lastName: undefined })).toBeNull();
  });

  it("normaliza edad inválida a null", () => {
    expect(mapPerson({ ...base, age: 999 })!.age).toBeNull();
    expect(mapPerson({ ...base, age: null })!.age).toBeNull();
  });
});
