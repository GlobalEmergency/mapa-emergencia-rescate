import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import {
  getDonationStats,
  listAllDonations,
} from "@/lib/donations";

export const dynamic = "force-dynamic";

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
