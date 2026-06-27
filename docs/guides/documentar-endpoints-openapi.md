# Documentar endpoints (OpenAPI / Swagger)

Toda la API se documenta sola en **Swagger UI** a partir de bloques JSDoc
`@swagger` en cada route. Esta guía explica cómo registrar un endpoint nuevo y
cómo funciona por dentro.

## Dónde se ve

- **Swagger UI:** `/api/docs` (interactivo).
- **Spec JSON:** `/api/openapi` (OpenAPI 3.0).

## Cómo funciona (build-time, seguro para `output: standalone`)

```
app/api/**/route.ts  --(@swagger JSDoc)-->  next-swagger-doc
   scripts/gen-openapi.mts (prebuild)  -->  public/openapi.json
   /api/openapi  sirve el JSON   ·   /api/docs  carga Swagger UI apuntando a él
```

- La spec se genera en **build** (`prebuild` corre `scripts/gen-openapi.mts`),
  no en runtime, porque con `output: standalone` los fuentes de `app/api/**` no
  están en el contenedor. El resultado (`public/openapi.json`) sí se empaqueta.
- Config central: `lib/swagger.ts` (`buildOpenApiSpec` + los modelos en
  `components.schemas`).

## Registrar un endpoint nuevo

1. Crea tu route como siempre: `app/api/mi-endpoint/route.ts` con
   `export async function GET/POST/...`.
2. **Agrega un bloque `@swagger`** justo encima del primer handler exportado.
   Documenta todos los métodos del archivo bajo su path.
3. Referencia modelos compartidos con `$ref`. Si devuelves un DTO nuevo,
   agrégalo a `SCHEMAS` en `lib/swagger.ts`.
4. Verifica local:

   ```bash
   npm run openapi        # regenera public/openapi.json
   # revisa el conteo de paths que imprime; tu ruta debe aparecer
   ```

   En cada `npm run build` se regenera solo (paso `prebuild`).

> Un endpoint **sin** bloque `@swagger` NO aparece en la doc. La anotación es
> obligatoria (convención del repo, ver `AGENTS.md`).

## Ejemplo

```ts
import { NextResponse } from "next/server";
import { listReports, addReport } from "@/lib/store";

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
export async function GET() { /* ... */ }
export async function POST() { /* ... */ }
```

### Path params, fotos, errores

- **Path params** (`/api/missing/{id}`): decláralos en `parameters` con
  `in: path, required: true, schema: { type: string }`.
- **Fotos / bytes / redirect**: documenta `200` con `content: { image/*: {} }`,
  `302` (redirección al CDN R2) y `404`.
- **Errores**: usa el modelo `Error` (`{ error: string }`) en respuestas 4xx/5xx.

## Modelos disponibles (`components.schemas`)

Definidos en `lib/swagger.ts`, espejo de los DTO públicos del backend:

`EmergencyReport`, `MissingPerson`, `MissingMapMarker`, `MissingStats`,
`Hospital`, `HospitalPatient`, `Donation`, `DonationStats`, `ChatMessage`,
`Error`.

Para un DTO nuevo, agrégalo a `SCHEMAS` en `lib/swagger.ts` reflejando el tipo
TS público que devuelve el endpoint, y referencialo con `$ref`.
