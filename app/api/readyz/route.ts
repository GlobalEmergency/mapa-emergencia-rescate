import { NextResponse } from "next/server";
import { getSql, hasDbEnv } from "@/lib/db";

// Readiness probe for the k8s rolling deploy (see infra/). This is the gate
// that makes the deploy zero-downtime: the new pod only starts receiving
// traffic once /api/readyz returns 200, and an old pod is only drained after
// its replacement is ready. So this must reflect "can actually serve a
// request", i.e. the DB is reachable — not just "the process is up".
//
// `force-dynamic` + no-store: never cache; the probe must hit the DB live.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * @swagger
 * /api/readyz:
 *   get:
 *     tags: [system]
 *     summary: Readiness probe; verifica que la DB esté accesible (gate de despliegue zero-downtime)
 *     responses:
 *       200:
 *         description: Listo para recibir tráfico. `db` indica el estado ("up" o "disabled" en modo demo)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 db: { type: string, enum: [up, disabled] }
 *       503:
 *         description: DB inaccesible; el pod no está listo y queda fuera de rotación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 db: { type: string, enum: [down] }
 */
export async function GET() {
  // No DB configured (demo/in-memory mode) -> the app can still serve, so
  // report ready. Matches the app's documented "modo demo" fallback.
  if (!hasDbEnv()) {
    return NextResponse.json({ ok: true, db: "disabled" }, { headers: NO_STORE });
  }

  try {
    const sql = getSql();
    await sql`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up" }, { headers: NO_STORE });
  } catch {
    // DB unreachable -> NOT ready. 503 keeps this pod out of the LB rotation
    // so traffic only flows to pods that can serve.
    return NextResponse.json(
      { ok: false, db: "down" },
      { status: 503, headers: NO_STORE },
    );
  }
}
