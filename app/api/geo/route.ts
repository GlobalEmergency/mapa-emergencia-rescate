import { headers } from "next/headers";
import { NextResponse } from "next/server";

const COUNTRY_HEADER_NAMES = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
  "x-geo-country",
  "cloudfront-viewer-country",
];

/**
 * @swagger
 * /api/geo:
 *   get:
 *     tags: [system]
 *     summary: Detecta el código de país (ISO 3166-1 alpha-2) desde headers de geo del edge/CDN
 *     responses:
 *       200:
 *         description: Código de país detectado, o null si no hay header válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 countryCode:
 *                   type: string
 *                   nullable: true
 *                   description: Código ISO 3166-1 alpha-2 en mayúsculas, o null
 */
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
