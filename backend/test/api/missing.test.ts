/**
 * Integración HTTP de las rutas PÚBLICAS de personas desaparecidas
 * (/api/missing). Supertest contra el Postgres LOCAL, solo datos sintéticos.
 * Verifica contrato, paginación, el endpoint de mapa y —subiendo una foto
 * REAL— que la ficha pública exponga `photoUrl` pero nunca el base64 de la
 * columna `photo`. `contact` SÍ es público por diseño en esta ficha.
 */
import { beforeAll, describe, expect, it } from "vitest";
import "../helpers";
import { SYNTHETIC_PNG_DATA_URL, expectNoSensitiveFields } from "../helpers";
import request from "supertest";

let app: import("express").Express;

beforeAll(async () => {
  app = (await import("@/server")).app;
});

// Nombre único (>= MIN_SEARCH_LEN) → clave de cache fresca al buscarlo, sin
// chocar con el TTL del listado general. Persona sintética, sin datos reales.
function syntheticPerson() {
  const tag = `Zdemo${Math.trunc(performance.now())}`;
  return {
    name: `${tag} Persona Sintetica`,
    age: 30,
    nationality: "Venezolana",
    description: "Registro de prueba (demo)",
    lastSeen: "Plaza demo, Caracas",
    contact: "demo@test.local",
    reportType: "missing" as const,
    photo: SYNTHETIC_PNG_DATA_URL,
    _tag: tag,
  };
}

describe("POST /api/missing", () => {
  it("crea CON foto y devuelve photoUrl derivada, nunca el base64 crudo", async () => {
    const person = syntheticPerson();
    const res = await request(app).post("/api/missing").send(person);
    expect(res.status).toBe(201);
    expect(res.body.person).toMatchObject({ name: person.name, status: "active" });
    const id = res.body.person.id as string;
    expect(id).toBeTruthy();
    expect(res.body.person.photoUrl).toBe(`/api/missing/${id}/photo`);
    expect(res.body.person).not.toHaveProperty("photo");
    expect(JSON.stringify(res.body)).not.toContain("base64");
    // El walker veta `photo`/ip_hash/etc por NOMBRE de clave; el DTO público
    // expone `contact` (no una clave `email`), así que pasa sin excepciones.
    expectNoSensitiveFields(res.body);
  });

  it("rechaza un reporte sin nombre con 400 y mensaje visible", async () => {
    const res = await request(app).post("/api/missing").send({ name: "" });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });
});

describe("GET /api/missing", () => {
  it("devuelve DTOs (con photoUrl, sin base64) y encuentra al recién creado por búsqueda", async () => {
    const person = syntheticPerson();
    const created = await request(app).post("/api/missing").send(person);
    const id = created.body.person.id as string;

    const res = await request(app).get("/api/missing").query({ q: person._tag });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.people)).toBe(true);
    expect(res.body).toMatchObject({ page: 1, persistent: true });

    const found = res.body.people.find((p: { id: string }) => p.id === id);
    expect(found).toBeTruthy();
    expect(found.photoUrl).toBe(`/api/missing/${id}/photo`);
    expect(found).not.toHaveProperty("photo");
    expect(JSON.stringify(res.body)).not.toContain("base64");
    expectNoSensitiveFields(res.body);
  });

  it("sirve la foto subida como bytes por el endpoint dedicado (control positivo)", async () => {
    const created = await request(app).post("/api/missing").send(syntheticPerson());
    const id = created.body.person.id as string;

    const res = await request(app).get(`/api/missing/${id}/photo`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe("GET /api/missing/map", () => {
  it("devuelve marcadores ligeros sin foto cruda ni contacto", async () => {
    const res = await request(app).get("/api/missing/map");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.markers)).toBe(true);
    for (const m of res.body.markers) {
      expect(m).not.toHaveProperty("photo");
      expect(m).not.toHaveProperty("contact"); // el marcador del mapa ni siquiera lo trae
    }
    expect(JSON.stringify(res.body)).not.toContain("base64");
    expectNoSensitiveFields(res.body);
  });
});
