import { NextResponse } from "next/server";
import {
  addPatient,
  getHospital,
  listPatients,
  MAX_PATIENT_NAME,
  type PatientCondition,
  type PatientStatus,
} from "@/lib/hospitals";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const hospital = await getHospital(id);
  if (!hospital) {
    return NextResponse.json({ error: "Hospital no encontrado." }, { status: 404 });
  }
  const patients = await listPatients(hospital.id);
  return NextResponse.json({ patients, hospital });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = clientIp(request);
  const allowed = await checkRateLimit(`patients:${ip}`, 10);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas peticiones." },
      { status: 429 },
    );
  }

  const { id } = await params;
  const hospital = await getHospital(id);
  if (!hospital) {
    return NextResponse.json({ error: "Hospital no encontrado." }, { status: 404 });
  }

  let body: {
    name?: string;
    age?: number | string | null;
    condition?: PatientCondition;
    status?: PatientStatus;
    notes?: string;
    contact?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Indica el nombre del paciente." },
      { status: 400 },
    );
  }
  if (name.length > MAX_PATIENT_NAME) {
    return NextResponse.json(
      { error: `El nombre no puede superar ${MAX_PATIENT_NAME} caracteres.` },
      { status: 400 },
    );
  }

  try {
    const patient = await addPatient(hospital.id, {
      name,
      age: body.age,
      condition: body.condition,
      status: body.status,
      notes: body.notes,
      contact: body.contact,
    });
    return NextResponse.json({ patient }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `No se pudo guardar el paciente: ${message}` },
      { status: 503 },
    );
  }
}
