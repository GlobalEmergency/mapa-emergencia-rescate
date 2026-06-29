// Tests unitarios del módulo acopio: dominio, mapper, caso de uso y presenter (sin DB).
import { describe, it, expect } from "vitest";
import type { CollectionCenter } from "@/modules/acopio/domain/collection-center";
import {
  createCriteria,
  normalizeText,
  satisfiesCriteria,
} from "@/modules/acopio/domain/criteria";
import { computeFacets } from "@/modules/acopio/domain/facets";
import type { CollectionCenterProvider } from "@/modules/acopio/domain/collection-center-provider";
import { ListCollectionCenters } from "@/modules/acopio/application/list-collection-centers";
import {
  isCollectionPoint,
  toCollectionCenter,
} from "@/modules/acopio/infrastructure/responsegrid/responsegrid-collection-center-mapper";
import { toCollectionCenterListView } from "@/modules/acopio/interface/http/collection-center-view";

function center(overrides: Partial<CollectionCenter>): CollectionCenter {
  return {
    id: "1",
    name: "Centro",
    manager: null,
    location: { address: null, latitude: null, longitude: null },
    city: null,
    country: null,
    accepts: [],
    contact: null,
    schedule: null,
    status: "active",
    verificationLevel: "verified",
    disputed: false,
    description: null,
    ...overrides,
  };
}

describe("domain/criteria", () => {
  it("normalizeText quita acentos y baja a minúsculas", () => {
    expect(normalizeText("Maracaíbo")).toBe("maracaibo");
  });

  it("filtra por país exacto", () => {
    const c = center({ country: "Venezuela" });
    expect(satisfiesCriteria(c, createCriteria({ country: "Venezuela" }))).toBe(true);
    expect(satisfiesCriteria(c, createCriteria({ country: "Colombia" }))).toBe(false);
  });

  it("filtra por categoría aceptada", () => {
    const c = center({ accepts: ["food", "water"] });
    expect(satisfiesCriteria(c, createCriteria({ category: "water" }))).toBe(true);
    expect(satisfiesCriteria(c, createCriteria({ category: "medicines" }))).toBe(false);
  });

  it("busca texto acento-insensible en varios campos", () => {
    const c = center({ name: "Acopio Chacaí", city: "Caracas" });
    expect(satisfiesCriteria(c, createCriteria({ text: "chacai" }))).toBe(true);
    expect(satisfiesCriteria(c, createCriteria({ text: "caracas" }))).toBe(true);
    expect(satisfiesCriteria(c, createCriteria({ text: "mérida" }))).toBe(false);
  });

  it("criterio vacío no filtra nada", () => {
    const c = center({ country: "Venezuela" });
    expect(satisfiesCriteria(c, createCriteria({ country: "", category: "  " }))).toBe(true);
  });
});

describe("domain/facets", () => {
  it("cuenta por país y por categoría", () => {
    const facets = computeFacets([
      center({ country: "Venezuela", accepts: ["food", "water"] }),
      center({ country: "Venezuela", accepts: ["food"] }),
      center({ country: "Colombia", accepts: [] }),
    ]);
    expect(facets.byCountry).toEqual({ Venezuela: 2, Colombia: 1 });
    expect(facets.byCategory).toEqual({ food: 2, water: 1 });
  });
});

describe("infrastructure/mapper", () => {
  it("isCollectionPoint excluye venues/destinos", () => {
    expect(isCollectionPoint({ id: "1", type: "collection_point" })).toBe(true);
    expect(isCollectionPoint({ id: "2", type: "venue" })).toBe(false);
  });

  it("mapea crudo→dominio: trim, país canónico, location aplanada, fallbacks", () => {
    const c = toCollectionCenter({
      id: "7",
      type: "collection_point",
      name: "  AJE  ",
      location: { address: "  Av 1  ", latitude: 10.4, longitude: -66.8 },
      accepts: ["food", 3, "water"],
      publicStatus: "valor-desconocido",
      verificationLevel: "official",
      country: "venezuela",
      city: "Caracas",
      contact: "0424",
      disputed: true,
    });
    expect(c.name).toBe("AJE");
    expect(c.country).toBe("Venezuela");
    expect(c.location).toEqual({ address: "Av 1", latitude: 10.4, longitude: -66.8 });
    expect(c.accepts).toEqual(["food", "water"]); // descarta el no-string
    expect(c.status).toBe("active"); // fallback ante valor desconocido
    expect(c.verificationLevel).toBe("official");
    expect(c.disputed).toBe(true);
  });
});

describe("application/ListCollectionCenters", () => {
  it("devuelve filtrado + total + facetas del set COMPLETO", async () => {
    const all: CollectionCenter[] = [
      center({ id: "1", country: "Venezuela", accepts: ["water"] }),
      center({ id: "2", country: "Venezuela", accepts: ["food"] }),
      center({ id: "3", country: "Colombia", accepts: ["water"] }),
    ];
    const fakeProvider: CollectionCenterProvider = {
      sourceName: "fake",
      list: async () => all,
    };

    const useCase = new ListCollectionCenters(fakeProvider);
    const result = await useCase.execute(createCriteria({ category: "water" }));

    expect(result.items.map((c) => c.id)).toEqual(["1", "3"]);
    expect(result.total).toBe(2);
    // Facetas del set completo, no del filtrado (para poblar los chips).
    expect(result.facets.byCountry).toEqual({ Venezuela: 2, Colombia: 1 });
    expect(result.facets.byCategory).toEqual({ water: 2, food: 1 });
  });
});

describe("interface/presenter", () => {
  it("aplana location → address/lat/lng en el DTO público", () => {
    const view = toCollectionCenterListView({
      items: [
        center({
          id: "1",
          country: "Venezuela",
          location: { address: "Av", latitude: 1, longitude: 2 },
        }),
      ],
      total: 1,
      facets: { byCountry: { Venezuela: 1 }, byCategory: {} },
    });
    expect(view.items[0]).toMatchObject({
      id: "1",
      address: "Av",
      lat: 1,
      lng: 2,
      country: "Venezuela",
    });
    expect(view.total).toBe(1);
  });
});
