/**
 * Sirve la spec OpenAPI generada en build (public/openapi.json).
 *
 * La leemos del filesystem en vez de importarla para no acoplar el bundle a un
 * JSON que se regenera; en `output: standalone` los assets de `public/` SÍ se
 * copian al contenedor (a diferencia de los fuentes de app/api).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
  try {
    const spec = await readFile(join(process.cwd(), "public", "openapi.json"), "utf8");
    return new Response(spec, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "openapi.json no generado. Corre `npm run build` (prebuild lo genera)." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}
