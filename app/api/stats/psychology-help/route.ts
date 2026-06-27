import { NextResponse } from "next/server";
import {
  getPsychologyHelpClickCount,
  incrementPsychologyHelpClick,
} from "@/lib/click-counters";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=5, stale-while-revalidate=30",
};

/**
 * @swagger
 * /api/stats/psychology-help:
 *   get:
 *     tags: [system]
 *     summary: Devuelve el contador de clics en "ayuda psicológica"
 *     responses:
 *       200:
 *         description: Contador actual de clics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *   post:
 *     tags: [system]
 *     summary: Registra un clic en "ayuda psicológica" (rate-limited por IP)
 *     responses:
 *       200:
 *         description: Clic registrado, devuelve el nuevo contador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *       429:
 *         description: Demasiadas peticiones
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: No se pudo registrar el clic
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET() {
  try {
    const count = await getPsychologyHelpClickCount();
    return NextResponse.json({ count }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ count: 0 }, { headers: CACHE_HEADERS });
  }
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const allowed = await checkRateLimit(`psychology-help:${ip}`, 20);
  if (!allowed) {
    return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });
  }

  try {
    const count = await incrementPsychologyHelpClick(ip);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json(
      { error: "No se pudo registrar el clic." },
      { status: 503 },
    );
  }
}
