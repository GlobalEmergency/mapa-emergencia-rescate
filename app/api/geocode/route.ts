import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

// Tamaño aproximado de la "caja" alrededor del punto de sesgo (en grados).
// ~0.8° lat ≈ 88 km, ~1.0° lon ≈ 105 km a la latitud de Venezuela. Cubre una
// ciudad y sus alrededores sin descartar resultados fuera de la zona.
const BIAS_LAT_DELTA = 0.8;
const BIAS_LNG_DELTA = 1.0;

function parseCoord(value: string | null, min: number, max: number): number | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const allowed = await checkRateLimit(`geo:${clientIp(request)}`, 30);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas búsquedas. Espera un momento." },
      { status: 429 },
    );
  }

  // Sesgo opcional hacia la zona afectada: si el cliente envía un punto de
  // referencia, priorizamos los resultados cercanos a esa zona.
  const biasLat = parseCoord(searchParams.get("lat"), -90, 90);
  const biasLng = parseCoord(searchParams.get("lng"), -180, 180);
  const bias =
    biasLat !== null && biasLng !== null ? { lat: biasLat, lng: biasLng } : null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "ve");
  url.searchParams.set("limit", "8");
  url.searchParams.set("accept-language", "es");

  if (bias) {
    // viewbox = left,top,right,bottom (lon_min,lat_max,lon_max,lat_min).
    // bounded=0: prefiere resultados dentro de la caja sin descartar el resto.
    const left = bias.lng - BIAS_LNG_DELTA;
    const right = bias.lng + BIAS_LNG_DELTA;
    const top = bias.lat + BIAS_LAT_DELTA;
    const bottom = bias.lat - BIAS_LAT_DELTA;
    url.searchParams.set("viewbox", `${left},${top},${right},${bottom}`);
    url.searchParams.set("bounded", "0");
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "MapaEmergenciaVenezuela/1.0 (https://terremotovenezuela.app)",
        "Accept-Language": "es",
      },
      // Cachea en el edge de Vercel: las direcciones no cambian, así que
      // muchas búsquedas iguales no golpean Nominatim repetidamente.
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "No se pudo buscar la dirección." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as NominatimResult[];
    let results = data.map((item) => ({
      lat: Number(item.lat),
      lng: Number(item.lon),
      label: item.display_name,
    }));

    // Con sesgo activo, subimos los resultados dentro de la caja al principio
    // (conservando el orden de relevancia de Nominatim dentro de cada grupo).
    if (bias) {
      const inBox = (r: { lat: number; lng: number }) =>
        Math.abs(r.lat - bias.lat) <= BIAS_LAT_DELTA &&
        Math.abs(r.lng - bias.lng) <= BIAS_LNG_DELTA;
      results = results
        .map((r, i) => ({ r, i }))
        .sort((a, b) => {
          const ai = inBox(a.r) ? 0 : 1;
          const bi = inBox(b.r) ? 0 : 1;
          return ai - bi || a.i - b.i;
        })
        .map(({ r }) => r)
        .slice(0, 6);
    } else {
      results = results.slice(0, 6);
    }

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo buscar la dirección." },
      { status: 502 },
    );
  }
}
