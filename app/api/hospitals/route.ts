import { NextResponse } from "next/server";
import {
  addHospital,
  listHospitals,
  listStates,
  MAX_HOSPITAL_NAME,
  type HospitalFacilityType,
  type HospitalLevel,
  type HospitalPriorityZone,
} from "@/lib/hospitals";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { cached } from "@/lib/cache";
import { jsonWithEtag } from "@/lib/http";
import { readJson, bodyErrorResponse, BODY_LIMIT_TEXT } from "@/lib/body";

export const dynamic = "force-dynamic";

const LIST_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=60",
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const wantsStates = params.get("include") === "states";

  const zoneParam = params.get("zone");
  const zone =
    zoneParam === "P0" || zoneParam === "P1" || zoneParam === "P2" || zoneParam === "P3"
      ? (zoneParam as HospitalPriorityZone)
      : undefined;

  const state = params.get("state") ?? undefined;
  const search = params.get("q") ?? undefined;
  const limit = Number(params.get("limit") ?? "500");
  const key = `hospitals:${state ?? ""}:${zone ?? ""}:${search ?? ""}:${limit}:${wantsStates ? 1 : 0}`;

  const { hospitals, states } = await cached(key, 10_000, async () => {
    const [hospitals, states] = await Promise.all([
      listHospitals({ state, priorityZone: zone, search, limit }),
      wantsStates ? listStates() : Promise.resolve(null),
    ]);
    return { hospitals, states };
  });

  return jsonWithEtag(request, { hospitals, states }, LIST_CACHE_HEADERS);
}

export async function POST(request: Request) {
  const allowed = await checkRateLimit(`hospitals:${clientIp(request)}`, 6);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento." },
      { status: 429 },
    );
  }

  let body: {
    name?: string;
    facilityType?: HospitalFacilityType;
    state?: string;
    municipality?: string;
    address?: string;
    level?: HospitalLevel;
    priorityZone?: HospitalPriorityZone;
  };
  try {
    body = await readJson(request, BODY_LIMIT_TEXT);
  } catch (e) {
    return bodyErrorResponse(e);
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Indica el nombre del hospital." },
      { status: 400 },
    );
  }
  if (name.length > MAX_HOSPITAL_NAME) {
    return NextResponse.json(
      { error: `El nombre no puede superar ${MAX_HOSPITAL_NAME} caracteres.` },
      { status: 400 },
    );
  }
  const state = (body.state ?? "").trim();
  if (!state) {
    return NextResponse.json(
      { error: "Indica el estado del hospital." },
      { status: 400 },
    );
  }

  try {
    const hospital = await addHospital({
      name,
      facilityType: body.facilityType,
      state,
      municipality: body.municipality,
      address: body.address,
      level: body.level,
      priorityZone: body.priorityZone,
    });
    return NextResponse.json({ hospital }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo guardar el hospital: ${message}` },
      { status: 503 },
    );
  }
}
