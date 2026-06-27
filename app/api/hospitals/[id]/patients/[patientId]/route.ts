import { NextResponse } from "next/server";
import { deletePatient, getHospital } from "@/lib/hospitals";
import { isAdminRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/hospitals/{id}/patients/{patientId}:
 *   delete:
 *     tags: [hospitals]
 *     summary: Elimina un paciente de un hospital (solo admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID del hospital
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *         description: ID del paciente
 *     responses:
 *       200:
 *         description: Paciente eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Hospital o paciente no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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
