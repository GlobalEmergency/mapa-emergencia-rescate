/**
 * Generador de la spec OpenAPI en BUILD.
 *
 * Escanea app/api (vía next-swagger-doc) y escribe public/openapi.json, que se
 * empaqueta con la app y se sirve estático en runtime (necesario porque
 * `output: standalone` no incluye los fuentes de app/api en el contenedor).
 *
 * Corre como `prebuild` (ver package.json), así cada build regenera la spec y
 * los endpoints nuevos (con su bloque @swagger) aparecen automáticamente.
 *
 *   npx tsx scripts/gen-openapi.mts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildOpenApiSpec } from "../lib/swagger";

const spec = buildOpenApiSpec();
const paths = spec.paths && typeof spec.paths === "object" ? Object.keys(spec.paths) : [];

const outDir = resolve("public");
mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, "openapi.json");
writeFileSync(out, JSON.stringify(spec, null, 2) + "\n");

console.log(`[openapi] ${paths.length} paths -> ${out}`);
if (paths.length === 0) {
  console.warn(
    "[openapi] 0 paths. ¿Los routes tienen bloques JSDoc `@swagger`? " +
      "Sin ellos next-swagger-doc no registra la ruta.",
  );
}
