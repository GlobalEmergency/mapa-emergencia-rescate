import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, hasDbEnv } from "@/lib/drizzle";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
};

// type del hub -> tabla física. Catálogo cerrado de 5. Ver docs/rfcs/0002.
const TABLES: { type: string; table: string; hasPhoto: boolean }[] = [
  { type: "missing_person", table: "hub_missing_persons", hasPhoto: true },
  { type: "checkin", table: "hub_checkins", hasPhoto: true },
  { type: "help_request", table: "hub_help_requests", hasPhoto: false },
  { type: "help_offer", table: "hub_help_offers", hasPhoto: false },
  { type: "damaged_building", table: "hub_damaged_buildings", hasPhoto: true },
];

interface HubTypeStat {
  type: string;
  count: number;
  photos?: number; // copiadas a R2
  broken?: number; // fuente muerta (404)
  lastIngestedAt: number | null;
}

/**
 * @swagger
 * /api/hub/stats:
 *   get:
 *     tags: [hub]
 *     summary: Conteos del espejo federado del hub (por tipo + total). Para el panel admin.
 *     responses:
 *       200:
 *         description: Totales de la federación.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer }
 *                 byType:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type: { type: string }
 *                       count: { type: integer }
 *                       photos: { type: integer }
 *                       broken: { type: integer }
 *                       lastIngestedAt: { type: integer, nullable: true }
 *       503:
 *         description: Base de datos no configurada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(request: Request) {
  if (!hasDbEnv()) {
    return NextResponse.json(
      { error: "Base de datos no configurada." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await cached("hub:stats", 30_000, async () => {
    const db = getDb();
    const byType: HubTypeStat[] = [];
    for (const { type, table, hasPhoto } of TABLES) {
      // sql.raw para el nombre de tabla (validado: viene de la lista cerrada de arriba).
      const photoCols = hasPhoto
        ? sql`, count(*) FILTER (WHERE photo_url IS NOT NULL)::int AS photos,
               count(*) FILTER (WHERE photo_broken)::int AS broken`
        : sql``;
      const res = await db.execute(
        sql`SELECT count(*)::int AS count,
                   max(ingested_at) AS last_ingested${photoCols}
            FROM ${sql.raw(`"${table}"`)}`,
      );
      const rows = (res as unknown as { rows?: Record<string, unknown>[] }).rows ??
        (res as unknown as Record<string, unknown>[]);
      const r = (Array.isArray(rows) ? rows[0] : undefined) ?? {};
      byType.push({
        type,
        count: Number(r.count ?? 0),
        ...(hasPhoto
          ? { photos: Number(r.photos ?? 0), broken: Number(r.broken ?? 0) }
          : {}),
        lastIngestedAt: r.last_ingested != null ? Number(r.last_ingested) : null,
      });
    }
    const total = byType.reduce((a, b) => a + b.count, 0);
    return { total, byType };
  });

  return jsonWithEtag(request, result, CACHE_HEADERS);
}
