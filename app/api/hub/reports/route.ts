import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, hasDbEnv, schema } from "@/lib/drizzle";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";

export const dynamic = "force-dynamic";

// Espejo READ-ONLY del hub (otros sitios socios). Cacheado unos segundos como
// el resto de lecturas calientes. Ver docs/rfcs/0002.
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=60",
};

// type del hub -> tabla Drizzle. Catálogo cerrado de 5.
const TABLE_BY_TYPE = {
  missing_person: schema.hubMissingPersons,
  checkin: schema.hubCheckins,
  help_request: schema.hubHelpRequests,
  help_offer: schema.hubHelpOffers,
  damaged_building: schema.hubDamagedBuildings,
} as const;
type HubType = keyof typeof TABLE_BY_TYPE;
const HUB_TYPES = Object.keys(TABLE_BY_TYPE) as HubType[];

const MAX_LIMIT = 200;

/** Resuelve la URL de imagen a servir: R2 si ya está, si no nada (no hotlink). */
function photo(row: Record<string, unknown>): string | null {
  if (row.photo_broken) return null;
  return (row.photoUrl as string) || null;
}

/**
 * @swagger
 * /api/hub/reports:
 *   get:
 *     tags: [hub]
 *     summary: Lee el espejo federado del hub central (otros sitios). READ-ONLY, sin PII.
 *     description: >
 *       Sirve los reportes ingeridos del hub "Venezuela Ayuda" (terremoto.hazlohoy.org),
 *       de OTROS sitios socios. Datos propios viven en los endpoints nativos. Las
 *       imágenes se sirven desde nuestro R2 (copiadas), nunca del storage del socio.
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [missing_person, checkin, help_request, help_offer, damaged_building]
 *         description: Tipo del catálogo del hub.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100, maximum: 200 }
 *     responses:
 *       200:
 *         description: Lista de reportes federados del tipo pedido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type: { type: string }
 *                 count: { type: integer }
 *                 reports:
 *                   type: array
 *                   items: { type: object }
 *       400:
 *         description: type inválido o ausente.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: Base de datos no configurada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  if (!type || !HUB_TYPES.includes(type as HubType)) {
    return NextResponse.json(
      { error: `type requerido y debe ser uno de: ${HUB_TYPES.join(", ")}` },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!hasDbEnv()) {
    return NextResponse.json(
      { error: "Base de datos no configurada." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get("limit")) || 100),
  );
  const t = type as HubType;

  const reports = await cached(`hub:${t}:${limit}`, 15_000, async () => {
    const table = TABLE_BY_TYPE[t];
    const rows = await getDb()
      .select()
      .from(table)
      .orderBy(desc(table.ingestedAt))
      .limit(limit);
    // Reescribe la imagen a la URL de R2 (o null) y quita columnas internas.
    return rows.map((r) => {
      const row = r as Record<string, unknown>;
      const out: Record<string, unknown> = {
        hub_id: row.hubId,
        source: row.source,
        city: row.city,
        lat: row.lat,
        lng: row.lng,
        created_at: row.hubCreatedAt,
      };
      // campos por tipo (lo que exista en la fila)
      for (const k of [
        "name",
        "status",
        "message",
        "place_name",
        "category",
        "description",
        "urgency",
        "availability",
        "available",
        "severity",
      ]) {
        const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        if (row[camel] !== undefined && row[camel] !== null) out[k] = row[camel];
      }
      if ("photoUrl" in row || "photoExternalUrl" in row) {
        out.photo_url = photo(row);
        out.photo_broken = Boolean(row.photoBroken);
      }
      return out;
    });
  });

  return jsonWithEtag(request, { type: t, count: reports.length, reports }, CACHE_HEADERS);
}
