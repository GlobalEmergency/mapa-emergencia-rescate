import { NextResponse } from "next/server";
import {
  PAYPAL_DONATION_URL,
  getDonationStats,
  getMonthlyDonationStats,
  listRecentDonations,
  recordDonation,
  validateDonationInput,
} from "@/lib/donations";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";
import { readJson, bodyErrorResponse, BODY_LIMIT_SMALL } from "@/lib/body";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=5, stale-while-revalidate=30",
};

/**
 * @swagger
 * /api/donations:
 *   get:
 *     tags: [donations]
 *     summary: Obtiene estadísticas de donaciones y donaciones recientes
 *     responses:
 *       200:
 *         description: Estadísticas globales, meta mensual y últimas donaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   $ref: '#/components/schemas/DonationStats'
 *                 monthly:
 *                   type: object
 *                   properties:
 *                     raisedCents: { type: integer }
 *                     goalCents: { type: integer }
 *                 recent:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Donation'
 *   post:
 *     tags: [donations]
 *     summary: Registra una intención de donación y devuelve la URL de PayPal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               amountCents: { type: integer }
 *     responses:
 *       200:
 *         description: Donación registrada con su id y URL de pago
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 paypalUrl: { type: string }
 *       400:
 *         description: Datos de donación inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Demasiadas peticiones (rate limit)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: No se pudo registrar la donación
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(request: Request) {
  try {
    const data = await cached("donations", 5_000, async () => {
      const [stats, monthly, recent] = await Promise.all([
        getDonationStats(),
        getMonthlyDonationStats(),
        listRecentDonations(30),
      ]);
      return { stats, monthly, recent };
    });
    return jsonWithEtag(request, data, CACHE_HEADERS);
  } catch {
    return NextResponse.json(
      {
        stats: {
          count: 0,
          totalCents: 0,
          last24hCount: 0,
          last24hCents: 0,
        },
        monthly: {
          raisedCents: 0,
          goalCents: 80_000,
        },
        recent: [],
      },
      { headers: CACHE_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const allowed = await checkRateLimit(`donations:${ip}`, 5);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Intenta de nuevo en un minuto." },
      { status: 429 },
    );
  }

  let body: { name?: unknown; amountCents?: unknown };
  try {
    body = await readJson(request, BODY_LIMIT_SMALL);
  } catch (e) {
    return bodyErrorResponse(e);
  }

  const parsed = validateDonationInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const donation = await recordDonation({
      name: parsed.name,
      amountCents: parsed.amountCents,
      ipHash: ip,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      id: donation.id,
      paypalUrl: PAYPAL_DONATION_URL,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo registrar la donación." },
      { status: 503 },
    );
  }
}
