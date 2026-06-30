# Documentar endpoints (OpenAPI / Swagger)

La API del backend (Express) se documenta sola en **Swagger UI** a partir de
bloques JSDoc `@swagger` en cada route. Esta guía explica cómo registrar un
endpoint nuevo y cómo funciona por dentro.

## Dónde se ve

- **Swagger UI:** `/api/docs` (interactivo).
- **Spec JSON:** `/api/openapi.json` (OpenAPI 3.0.3).

Ambos los sirve el backend (`backend/src/server.ts`, vía `swagger-ui-express`).

## Cómo funciona (runtime, al arrancar el servidor)

```
backend/src/routes/*.ts             --(@swagger JSDoc)--┐
backend/src/modules/**/interface/http/*  --(@swagger)--┤
backend/src/public-api/resources/*  --(config zod)-----┤--> buildOpenApiSpec()
                                                       └--> /api/openapi.json + /api/docs
```

- La spec se construye **una vez al arrancar** (`buildOpenApiSpec()` en
  `backend/src/lib/swagger.ts`), uniendo dos orígenes:
  1. los bloques `@swagger` escaneados por **`swagger-jsdoc`** en TRES globs:
     `routes/**` (routes a mano: `auth`, `sync`, `admin`, etc.),
     `public-api/**` y `modules/**` (los módulos DDD, cuyo `@swagger` vive en su
     capa `interface/http`);
  2. los paths CRUD derivados de la config de cada recurso de
     `backend/src/public-api/*` — la **misma** definición zod que valida la
     request (single source of truth), generados por `crud-factory.ts`.
- `swagger-jsdoc` escanea los `.ts` en dev (tsx) y los `.js` compilados en prod
  (`dist/`), así que el glob cubre ambas extensiones — no hay paso de build
  aparte ni `public/openapi.json` que mantener.

> **Enforcement automático (ESLint, gate en CI).** Las reglas de endpoints viven
> en `backend/eslint-rules/` y corren en `npm run lint` + CI; romperlas falla el
> PR. Resumen (detalle en `AGENTS.md`, "Endpoints del backend"):
> - `require-rate-limit`: TODA ruta declara `rateLimit({ scope, limit })`.
> - `user-facing-mutation-needs-guard`: toda mutación de `src/routes/*` lleva
>   `requireHuman` (Turnstile) o un gate (`requireAdmin` / `requireCapability` /
>   `requireCron` / `requireSupplyWrite`); la excepción anónima se documenta con
>   `// eslint-disable-next-line local/user-facing-mutation-needs-guard -- razón`.
> - `no-turnstile-in-public-api`: `src/public-api/*` no usa Turnstile (no es
>   navegador; va por capacidades).

## Registrar un endpoint nuevo

### Caso A — route escrito a mano (`backend/src/routes/`)

1. Crea/edita el router como siempre: `Router()` + `asyncHandler` + `validate()`
   + middlewares (`rateLimit`, `requireHuman`/`requireAdmin`, …).
2. **Agrega un bloque `@swagger`** justo encima del primer handler del path.
   Documenta todos los métodos del archivo bajo su path.
3. Referencia modelos compartidos con `$ref`. Si devuelves un DTO nuevo,
   agrégalo a los `components.schemas` en `backend/src/lib/swagger.ts`.
4. Verifica local: `cd backend && npm run dev` y abre `/api/docs`; tu ruta debe
   aparecer.

### Caso B — recurso CRUD autenticado (`backend/src/public-api/`)

No escribas el router a mano: añade un `resources/<modelo>.resource.ts` (config +
esquema zod) y la **fábrica** (`crud-factory.ts`) monta router, validación,
auditoría y **doc OpenAPI** desde esa config. La doc se deriva sola del esquema
zod; no necesitas `@swagger`.

> Un endpoint de `src/routes/*` **sin** bloque `@swagger` NO aparece en la doc.
> La anotación es obligatoria (convención del repo, ver `AGENTS.md`).

## Ejemplo (route a mano, Express)

```ts
import { Router } from "express";
import { asyncHandler, rateLimit } from "@/middleware";
import { jsonWithEtag } from "@/lib/http";
import * as service from "@/services/reports";

export const reportsRouter = Router();

/**
 * @swagger
 * /api/reports:
 *   get:
 *     tags: [reports]
 *     summary: Lista de reportes de emergencia
 *     responses:
 *       200:
 *         description: Reportes y bandera de persistencia
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/EmergencyReport' }
 *                 persistent: { type: boolean }
 *   post:
 *     tags: [reports]
 *     summary: Crear un reporte de emergencia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lat, lng, place, type]
 *             properties:
 *               type: { type: string }
 *               lat: { type: number }
 *               lng: { type: number }
 *               place: { type: string }
 *               photo: { type: string, description: "data:image/...;base64 (opcional)" }
 *     responses:
 *       201:
 *         description: Reporte creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report: { $ref: '#/components/schemas/EmergencyReport' }
 *       400: { description: Datos inválidos, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       429: { description: Rate limit }
 */
reportsRouter.get("/", rateLimit({ scope: "reports:list", limit: 120 }),
  asyncHandler(async (req, res) => { /* ... */ }));
reportsRouter.post("/", /* ...middlewares... */
  asyncHandler(async (req, res) => { /* ... */ }));
```

### Path params, fotos, errores

- **Path params** (`/api/missing/{id}`): decláralos en `parameters` con
  `in: path, required: true, schema: { type: string }`.
- **Fotos / bytes / redirect**: documenta `200` con `content: { image/*: {} }`,
  `302` (redirección al CDN R2) y `404`.
- **Errores**: usa el modelo `Error` (`{ error: string }`) en respuestas 4xx/5xx.

## Modelos (`components.schemas`)

Los modelos compartidos se definen en `backend/src/lib/swagger.ts`
(`components.schemas` del bloque base) y se complementan con los esquemas que la
fábrica CRUD deriva de cada recurso de `backend/src/public-api/*`. Para un DTO
nuevo de un route a mano, agrégalo a `schemas` en `backend/src/lib/swagger.ts`
reflejando el tipo TS público que devuelve el endpoint, y referencialo con
`$ref`. La lista vigente es la que aparece en `/api/openapi.json`.
