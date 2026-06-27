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
import { readJson, bodyErrorResponse, BODY_LIMIT_TEXT } from "@/lib/body";

export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/hospitals/{id}/patients:
 *   get:
 *     tags: [hospitals]
 *     summary: Lista los pacientes de un hospital
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Pacientes y datos del hospital
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patients:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/HospitalPatient' }
 *                 hospital: { $ref: '#/components/schemas/Hospital' }
 *       404:
 *         description: Hospital no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   post:
 *     tags: [hospitals]
 *     summary: Registra un paciente en un hospital (rate-limited)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               age: { type: integer, nullable: true }
 *               condition: { type: string }
 *               status: { type: string }
 *               notes: { type: string }
 *               contact: { type: string }
 *     responses:
 *       201:
 *         description: Paciente creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 patient: { $ref: '#/components/schemas/HospitalPatient' }
 *       400:
 *         description: Datos inválidos (nombre faltante o demasiado largo)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Hospital no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Demasiadas peticiones
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: No se pudo guardar el paciente
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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
  const allowed = await checkRateLimit(`patients:${ip}`, 5);
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
    body = await readJson(request, BODY_LIMIT_TEXT);
  } catch (e) {
    return bodyErrorResponse(e);
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
