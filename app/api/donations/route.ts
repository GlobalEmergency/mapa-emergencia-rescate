import { NextResponse } from "next/server";
import {
  PAYPAL_DONATION_URL,
  getDonationStats,
  listRecentDonations,
  recordDonation,
  validateDonationInput,
} from "@/lib/donations";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=5, stale-while-revalidate=30",
};

export async function GET() {
  try {
    const [stats, recent] = await Promise.all([
      getDonationStats(),
      listRecentDonations(30),
    ]);
    return NextResponse.json({ stats, recent }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      {
        stats: {
          count: 0,
          totalCents: 0,
          last24hCount: 0,
          last24hCents: 0,
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
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
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
