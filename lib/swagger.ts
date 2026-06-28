/**
 * Configuración central de OpenAPI/Swagger.
 *
 * Usa `next-swagger-doc` (el estándar para Next App Router): escanea `app/api`
 * y arma la spec a partir de los bloques JSDoc `@swagger` de cada route. Agregar
 * un endpoint nuevo lo auto-registra en cuanto lleve su comentario `@swagger`
 * (documentation-as-code).
 *
 * IMPORTANTE: la app corre con `output: standalone`, así que los fuentes de
 * `app/api/**` NO están en el contenedor en runtime. Por eso la spec se genera
 * en BUILD (scripts/gen-openapi.mts -> public/openapi.json) y se sirve estática.
 * Este helper es lo que ese script (y dev) usan para construirla.
 */
import { createSwaggerSpec } from "next-swagger-doc";

export function buildOpenApiSpec(): Record<string, unknown> {
  return createSwaggerSpec({
    apiFolder: "app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Mapa de Emergencia y Rescate — API",
        version: "1.0.0",
        description:
          "API pública/admin del mapa de emergencia. Documentación generada " +
          "automáticamente desde los bloques @swagger de cada route.",
      },
      tags: [
        { name: "reports", description: "Reportes de emergencia en el mapa" },
        { name: "missing", description: "Personas desaparecidas / localizadas" },
        { name: "hospitals", description: "Hospitales y pacientes" },
        { name: "donations", description: "Donaciones" },
        { name: "chat", description: "Chat ciudadano" },
        { name: "sync", description: "Sincronización de fuentes externas" },
        { name: "hub", description: "Federación con el hub central (otros sitios, READ-ONLY)" },
        { name: "system", description: "Salud y utilidades" },
      ],
      components: { schemas: SCHEMAS },
    },
  }) as Record<string, unknown>;
}

/**
 * Modelos (DTO) reutilizables, espejo de los tipos públicos que devuelven los
 * endpoints (lib/types.ts, lib/missing.ts, lib/hospitals-meta.ts,
 * lib/donation-shared.ts, lib/chat-types.ts). Los bloques @swagger de cada route
 * referencian estos con `$ref: '#/components/schemas/<Nombre>'`.
 */
const SCHEMAS = {
  Error: {
    type: "object",
    properties: { error: { type: "string" } },
  },
  EmergencyReport: {
    type: "object",
    properties: {
      id: { type: "string" },
      type: {
        type: "string",
        enum: ["critical", "supplies", "shelter", "nopower", "missing", "building"],
      },
      lat: { type: "number" },
      lng: { type: "number" },
      place: { type: "string" },
      affected: { type: "integer" },
      needs: { type: "string" },
      photoUrl: { type: "string", nullable: true },
      confirmations: { type: "integer" },
      createdAt: { type: "integer", description: "epoch-ms" },
    },
  },
  MissingPerson: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      age: { type: "integer", nullable: true },
      description: { type: "string" },
      lastSeen: { type: "string" },
      contact: { type: "string" },
      photoUrl: { type: "string", nullable: true },
      status: { type: "string", enum: ["active", "found"] },
      resolutionNote: { type: "string", nullable: true },
      resolutionPhotoUrl: { type: "string", nullable: true },
      resolvedAt: { type: "integer", nullable: true },
      createdAt: { type: "integer", description: "epoch-ms" },
    },
  },
  MissingMapMarker: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      age: { type: "integer", nullable: true },
      lastSeen: { type: "string" },
      photoUrl: { type: "string", nullable: true },
      lat: { type: "number" },
      lng: { type: "number" },
      createdAt: { type: "integer" },
    },
  },
  MissingStats: {
    type: "object",
    properties: {
      active: { type: "integer" },
      found: { type: "integer" },
      total: { type: "integer" },
      onMap: { type: "integer" },
    },
  },
  Hospital: {
    type: "object",
    properties: {
      id: { type: "string" },
      externalId: { type: "string", nullable: true },
      name: { type: "string" },
      facilityType: { type: "string" },
      state: { type: "string" },
      municipality: { type: "string" },
      address: { type: "string" },
      level: { type: "string", nullable: true },
      priorityZone: { type: "string", enum: ["P0", "P1", "P2", "P3"] },
      isPriority: { type: "boolean" },
      activePatients: { type: "integer" },
      totalPatients: { type: "integer" },
      createdAt: { type: "integer" },
    },
  },
  HospitalPatient: {
    type: "object",
    properties: {
      id: { type: "string" },
      hospitalId: { type: "string" },
      name: { type: "string" },
      age: { type: "integer", nullable: true },
      condition: { type: "string" },
      status: { type: "string" },
      notes: { type: "string" },
      contact: { type: "string" },
      admittedAt: { type: "integer" },
      updatedAt: { type: "integer" },
    },
  },
  Donation: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      amountCents: { type: "integer" },
      createdAt: { type: "integer" },
      status: { type: "string", enum: ["intent", "completed"] },
    },
  },
  DonationStats: {
    type: "object",
    properties: {
      count: { type: "integer" },
      totalCents: { type: "integer" },
      last24hCount: { type: "integer" },
      last24hCents: { type: "integer" },
    },
  },
  ChatMessage: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      role: { type: "string" },
      text: { type: "string" },
      createdAt: { type: "integer" },
      replyTo: { type: "string", nullable: true },
      replyPreview: { type: "string", nullable: true },
      threadRootId: { type: "string" },
      threadBumpedAt: { type: "integer" },
    },
  },
} as const;
