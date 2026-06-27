import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/admin";
import { runAllSourcesChunked } from "@/lib/sync/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Endpoint que dispara el cron de Vercel (ver vercel.json). Procesa un chunk de
 * páginas por invocación (reanuda vía el cursor en sync_state); varias
 * invocaciones completan el ciclo. Idempotente.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (lo pone Vercel) o token admin.
 * Vercel invoca los crons con GET.
 */
/**
 * @swagger
 * /api/sync/cron:
 *   get:
 *     tags: [sync]
 *     summary: Dispara el cron de sincronización de fuentes externas (Auth Bearer CRON_SECRET o admin)
 *     responses:
 *       200:
 *         description: Resumen del chunk procesado en esta invocación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
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
 *                   items:
 *                     type: object
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error en el cron
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const results = await runAllSourcesChunked({ trigger: "cron" });
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
      { ok: results.every((r) => r.ok), totals, results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error en el cron." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
