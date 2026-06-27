import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { runAllSources, runAllSourcesChunked } from "@/lib/sync/engine";

export const dynamic = "force-dynamic";
// Traer fuentes grandes + upsert puede tardar; ampliamos el límite de función.
export const maxDuration = 300;

/**
 * Disparo manual de la sincronización (panel admin).
 *
 *   POST /api/sync/run?dryRun=1            -> simula, no escribe
 *   POST /api/sync/run?source=<id>         -> solo esa fuente
 *   POST /api/sync/run?limit=50            -> tope de registros por fuente
 *   POST /api/sync/run?mode=chunk          -> por chunks (cursor en sync_state)
 *   POST /api/sync/run?mode=chunk&pages=20 -> tope de páginas por corrida
 *
 * Autenticación: header `x-admin-token` (ver lib/admin.ts).
 */
/**
 * @swagger
 * /api/sync/run:
 *   post:
 *     tags: [sync]
 *     summary: Dispara manualmente la sincronización de fuentes externas (requiere x-admin-token)
 *     parameters:
 *       - in: query
 *         name: dryRun
 *         required: false
 *         schema: { type: string, enum: ['1', 'true'] }
 *         description: Si es 1/true simula la corrida sin escribir.
 *       - in: query
 *         name: source
 *         required: false
 *         schema: { type: string }
 *         description: Limita la corrida a una sola fuente por su id.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema: { type: integer, minimum: 1 }
 *         description: Tope de registros por fuente.
 *       - in: query
 *         name: mode
 *         required: false
 *         schema: { type: string, enum: [chunk] }
 *         description: Si es chunk procesa por páginas usando el cursor en sync_state.
 *       - in: query
 *         name: pages
 *         required: false
 *         schema: { type: integer, minimum: 1 }
 *         description: Tope de páginas por corrida (solo con mode=chunk).
 *     responses:
 *       200:
 *         description: Resumen de la corrida con totales y resultado por fuente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 dryRun: { type: boolean }
 *                 totals:
 *                   type: object
 *                   properties:
 *                     fetched: { type: integer }
 *                     inserted: { type: integer }
 *                     updated: { type: integer }
 *                     skipped: { type: integer }
 *                     errors: { type: integer }
 *                 results:
 *                   type: array
 *                   items: { type: object }
 *       401:
 *         description: No autorizado (falta o es inválido x-admin-token).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error al sincronizar.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const params = new URL(request.url).searchParams;
  const dryRun = params.get("dryRun") === "1" || params.get("dryRun") === "true";
  const source = params.get("source");
  const limitParam = Number(params.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;
  const chunk = params.get("mode") === "chunk";
  const pagesParam = Number(params.get("pages"));
  const pagesPerRun =
    Number.isFinite(pagesParam) && pagesParam > 0 ? pagesParam : undefined;

  try {
    const results = chunk
      ? await runAllSourcesChunked({
          pagesPerRun,
          sourceIds: source ? [source] : undefined,
        })
      : await runAllSources({
          dryRun,
          limit,
          sourceIds: source ? [source] : undefined,
        });

    const totals = results.reduce(
      (acc, r) => ({
        fetched: acc.fetched + r.fetched,
        inserted: acc.inserted + r.inserted,
        updated: acc.updated + r.updated,
        skipped: acc.skipped + r.skipped,
        errors: acc.errors + r.errors,
      }),
      { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
    );

    return NextResponse.json(
      { ok: results.every((r) => r.ok), dryRun, totals, results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al sincronizar." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
