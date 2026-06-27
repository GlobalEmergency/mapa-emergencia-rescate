import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import {
  getDonationStats,
  listAllDonations,
} from "@/lib/donations";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/admin/donations:
 *   get:
 *     tags: [admin]
 *     summary: Lista todas las donaciones con estadísticas (requiere admin)
 *     responses:
 *       200:
 *         description: Estadísticas y listado completo de donaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generatedAt:
 *                   type: integer
 *                   description: epoch-ms
 *                 stats:
 *                   $ref: '#/components/schemas/DonationStats'
 *                 donations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Donation'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: No se pudieron cargar las donaciones
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const [stats, donations] = await Promise.all([
      getDonationStats(),
      listAllDonations(),
    ]);

    return NextResponse.json(
      {
        generatedAt: Date.now(),
        stats,
        donations,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar las donaciones." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
