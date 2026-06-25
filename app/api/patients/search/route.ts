import { NextResponse } from "next/server";
import { searchPatients } from "@/lib/hospitals";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=5, stale-while-revalidate=30",
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const limit = Number(params.get("limit") ?? "50");
  const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? limit : 50, 1), 200);
  const rows = await searchPatients(q, safeLimit + 1);
  const hasMore = rows.length > safeLimit;
  const results = rows.slice(0, safeLimit);
  return NextResponse.json(
    { results, query: q, hasMore },
    { headers: CACHE_HEADERS },
  );
}
