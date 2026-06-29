/**
 * Punto de montaje de la superficie `api/public/*` (integraciones + admin).
 *
 * Cada recurso es un router CRUD generado por la fábrica a partir de su config.
 * `mountPublicApi(app)` los cuelga bajo `/api/public/*`. El router de auth
 * (login/invite/me) se monta aparte porque no es un CRUD de modelo.
 *
 * Para añadir un modelo: crea `resources/<modelo>.resource.ts` con su CONFIG y
 * regístralo en RESOURCES abajo (config) — el router y la doc OpenAPI se derivan
 * solos de esa config. Nada más.
 */
import type { Express } from "express";
import { createCrudRouter, type CrudResource } from "@/public-api/crud-factory";
import { authRouter } from "@/routes/auth";
import { reportsResource } from "@/public-api/resources/reports.resource";
import { missingResource } from "@/public-api/resources/missing.resource";
import { hospitalsResource } from "@/public-api/resources/hospitals.resource";
import { patientsResource } from "@/public-api/resources/patients.resource";
import { donationsResource } from "@/public-api/resources/donations.resource";
import { chatResource } from "@/public-api/resources/chat.resource";
import { contactResource } from "@/public-api/resources/contact.resource";

/**
 * Registro path → CONFIG del recurso. Fuente de verdad ÚNICA: de aquí salen
 * tanto los routers (createCrudRouter) como la doc OpenAPI (buildCrudOpenApiPaths).
 */
// Los recursos tienen parámetros de tipo distintos (algunos sin update -> never),
// así que el registro los guarda con los genéricos en `unknown` (la fábrica solo
// necesita la forma, no los tipos exactos, para montar y documentar).
type AnyResource = CrudResource<unknown, unknown, unknown, unknown>;
export const PUBLIC_RESOURCES: Record<string, AnyResource> = {
  reports: reportsResource as AnyResource,
  missing: missingResource as AnyResource,
  hospitals: hospitalsResource as AnyResource,
  patients: patientsResource as AnyResource,
  donations: donationsResource as AnyResource,
  chat: chatResource as AnyResource,
  contact: contactResource as AnyResource,
};

export function mountPublicApi(app: Express): void {
  // Auth (no CRUD de modelo): login, invite, accept, me, logout, reset.
  app.use("/api/public/auth", authRouter);
  // Recursos CRUD — un router generado por recurso desde su config.
  for (const [path, resource] of Object.entries(PUBLIC_RESOURCES)) {
    app.use(`/api/public/${path}`, createCrudRouter(resource));
  }
}
