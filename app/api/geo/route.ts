import { headers } from "next/headers";
import { NextResponse } from "next/server";

const COUNTRY_HEADER_NAMES = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
  "x-geo-country",
  "cloudfront-viewer-country",
];

export async function GET() {
  const requestHeaders = await headers();

  const countryCode = COUNTRY_HEADER_NAMES.map((name) =>
    requestHeaders.get(name)?.trim().toUpperCase(),
  ).find((value) => value && /^[A-Z]{2}$/.test(value));

  return NextResponse.json(
    { countryCode: countryCode ?? null },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
