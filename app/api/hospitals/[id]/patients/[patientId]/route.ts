import { NextResponse } from "next/server";
import { deletePatient, getHospital } from "@/lib/hospitals";
import { isAdminRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; patientId: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const { id, patientId } = await params;
  const hospital = await getHospital(id);
  if (!hospital) {
    return NextResponse.json(
      { error: "Hospital no encontrado." },
      { status: 404 },
    );
  }
  const ok = await deletePatient(hospital.id, patientId);
  if (!ok) {
    return NextResponse.json(
      { error: "Paciente no encontrado." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
