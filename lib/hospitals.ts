import { getSql, hasDbEnv } from "./db";
import hospitalsSeed from "./data/hospitals-seed.json";
import {
  HOSPITAL_FACILITY_TYPES,
  PATIENT_CONDITIONS,
  PATIENT_STATUSES,
  PRIORITY_ZONES,
  type Hospital,
  type HospitalFacilityType,
  type HospitalLevel,
  type HospitalPatient,
  type HospitalPriorityZone,
  type NewHospital,
  type NewHospitalPatient,
  type PatientCondition,
  type PatientStatus,
} from "./hospitals-meta";

export * from "./hospitals-meta";

let _schemaReady: Promise<void> | null = null;
let _seedDone = false;

function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    const sql = getSql();
    _schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS hospitals (
          id TEXT PRIMARY KEY,
          external_id TEXT,
          name TEXT NOT NULL,
          facility_type TEXT NOT NULL DEFAULT 'hospital',
          state TEXT NOT NULL DEFAULT '',
          municipality TEXT NOT NULL DEFAULT '',
          address TEXT NOT NULL DEFAULT '',
          level TEXT,
          priority_zone TEXT NOT NULL DEFAULT 'P3',
          is_priority BOOLEAN NOT NULL DEFAULT false,
          created_at BIGINT NOT NULL
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS hospitals_external_id_idx
        ON hospitals (external_id) WHERE external_id IS NOT NULL
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_hospitals_state
        ON hospitals (state, priority_zone, name)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS hospital_patients (
          id TEXT PRIMARY KEY,
          hospital_id TEXT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          age INTEGER,
          condition TEXT NOT NULL DEFAULT 'unknown',
          status TEXT NOT NULL DEFAULT 'hospitalized',
          notes TEXT NOT NULL DEFAULT '',
          contact TEXT NOT NULL DEFAULT '',
          admitted_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_hospital_patients_hospital
        ON hospital_patients (hospital_id, status, admitted_at DESC)
      `;
    })();
  }
  return _schemaReady;
}

async function seedHospitalsIfNeeded(): Promise<void> {
  if (_seedDone) return;
  _seedDone = true;
  const sql = getSql();
  const [{ count }] = (await sql`
    SELECT COUNT(*)::int AS count FROM hospitals WHERE external_id IS NOT NULL
  `) as { count: number }[];
  if (count >= hospitalsSeed.length) return;

  for (const h of hospitalsSeed) {
    try {
      await sql`
        INSERT INTO hospitals (
          id, external_id, name, facility_type, state, municipality,
          address, level, priority_zone, is_priority, created_at
        ) VALUES (
          ${crypto.randomUUID()}, ${h.externalId}, ${h.name},
          ${h.facilityType}, ${h.state}, ${h.municipality},
          ${h.address}, ${h.level}, ${h.priorityZone},
          ${h.isPriority}, ${Date.now()}
        )
        ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
      `;
    } catch {
      // un fallo puntual no detiene el resto
    }
  }
}

interface HospitalRow {
  id: string;
  external_id: string | null;
  name: string;
  facility_type: string;
  state: string;
  municipality: string;
  address: string;
  level: string | null;
  priority_zone: string;
  is_priority: boolean;
  active_patients: number | string | null;
  total_patients: number | string | null;
  created_at: number | string;
}

function rowToHospital(row: HospitalRow): Hospital {
  return {
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    facilityType: normalizeFacilityType(row.facility_type),
    state: row.state,
    municipality: row.municipality,
    address: row.address,
    level: normalizeLevel(row.level),
    priorityZone: normalizePriority(row.priority_zone),
    isPriority: Boolean(row.is_priority),
    activePatients: Number(row.active_patients ?? 0),
    totalPatients: Number(row.total_patients ?? 0),
    createdAt: Number(row.created_at),
  };
}

function normalizeFacilityType(v: string | null | undefined): HospitalFacilityType {
  const t = (v ?? "").toLowerCase();
  return HOSPITAL_FACILITY_TYPES.has(t as HospitalFacilityType)
    ? (t as HospitalFacilityType)
    : "hospital";
}

function normalizePriority(v: string | null | undefined): HospitalPriorityZone {
  const t = (v ?? "P3").toUpperCase();
  return PRIORITY_ZONES.has(t as HospitalPriorityZone)
    ? (t as HospitalPriorityZone)
    : "P3";
}

function normalizeLevel(v: string | null | undefined): HospitalLevel {
  if (!v) return null;
  const t = v.toUpperCase();
  if (t === "I" || t === "II" || t === "III" || t === "IV") return t;
  if (t === "MILITAR") return "militar";
  return null;
}

function normalizeAge(v: NewHospitalPatient["age"]): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n) || n < 0 || n > 130) return null;
  return n;
}

const memoryHospitals = new Map<string, Hospital>();
const memoryPatients = new Map<string, HospitalPatient>();
let memorySeeded = false;

function ensureMemorySeed() {
  if (memorySeeded) return;
  memorySeeded = true;
  for (const h of hospitalsSeed) {
    const id = crypto.randomUUID();
    memoryHospitals.set(id, {
      id,
      externalId: h.externalId,
      name: h.name,
      facilityType: h.facilityType as HospitalFacilityType,
      state: h.state,
      municipality: h.municipality,
      address: h.address,
      level: h.level as HospitalLevel,
      priorityZone: h.priorityZone as HospitalPriorityZone,
      isPriority: h.isPriority,
      activePatients: 0,
      totalPatients: 0,
      createdAt: Date.now(),
    });
  }
}

export interface ListHospitalsOptions {
  state?: string;
  priorityZone?: HospitalPriorityZone | "all";
  search?: string;
  limit?: number;
}

export async function listHospitals(
  options: ListHospitalsOptions = {},
): Promise<Hospital[]> {
  const limit = Math.min(Math.max(options.limit ?? 500, 1), 1000);
  const search = options.search?.trim() ?? "";
  const state = options.state?.trim() ?? "";
  const zone =
    options.priorityZone && options.priorityZone !== "all"
      ? options.priorityZone
      : null;

  if (hasDbEnv()) {
    await ensureSchema();
    await seedHospitalsIfNeeded();
    const sql = getSql();
    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];
    if (state) {
      params.push(state);
      conditions.push(`h.state = $${params.length}`);
    }
    if (zone) {
      params.push(zone);
      conditions.push(`h.priority_zone = $${params.length}`);
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      const idx = params.length;
      conditions.push(
        `(LOWER(h.name) LIKE $${idx} OR LOWER(h.municipality) LIKE $${idx} OR LOWER(h.state) LIKE $${idx})`,
      );
    }
    params.push(limit);
    const limitIdx = params.length;

    const rows = (await sql.query(
      `
      SELECT
        h.id, h.external_id, h.name, h.facility_type, h.state, h.municipality,
        h.address, h.level, h.priority_zone, h.is_priority, h.created_at,
        COALESCE(SUM(CASE WHEN p.status = 'hospitalized' THEN 1 ELSE 0 END), 0) AS active_patients,
        COUNT(p.id) AS total_patients
      FROM hospitals h
      LEFT JOIN hospital_patients p ON p.hospital_id = h.id
      WHERE ${conditions.join(" AND ")}
      GROUP BY h.id
      ORDER BY
        CASE h.priority_zone WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
        h.state, h.name
      LIMIT $${limitIdx}
      `,
      params,
    )) as HospitalRow[];
    return rows.map(rowToHospital);
  }

  ensureMemorySeed();
  const list = [...memoryHospitals.values()]
    .filter((h) => {
      if (state && h.state !== state) return false;
      if (zone && h.priorityZone !== zone) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          h.name.toLowerCase().includes(q) ||
          h.municipality.toLowerCase().includes(q) ||
          h.state.toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    })
    .map((h) => {
      const patients = [...memoryPatients.values()].filter(
        (p) => p.hospitalId === h.id,
      );
      return {
        ...h,
        activePatients: patients.filter((p) => p.status === "hospitalized").length,
        totalPatients: patients.length,
      };
    });
  list.sort((a, b) => {
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 } as const;
    if (order[a.priorityZone] !== order[b.priorityZone]) {
      return order[a.priorityZone] - order[b.priorityZone];
    }
    if (a.state !== b.state) return a.state.localeCompare(b.state);
    return a.name.localeCompare(b.name);
  });
  return list.slice(0, limit);
}

export async function listStates(): Promise<string[]> {
  if (hasDbEnv()) {
    await ensureSchema();
    await seedHospitalsIfNeeded();
    const rows = (await getSql()`
      SELECT DISTINCT state FROM hospitals WHERE state <> '' ORDER BY state
    `) as { state: string }[];
    return rows.map((r) => r.state);
  }
  ensureMemorySeed();
  const set = new Set<string>();
  for (const h of memoryHospitals.values()) {
    if (h.state) set.add(h.state);
  }
  return [...set].sort();
}

export async function getHospital(id: string): Promise<Hospital | null> {
  if (hasDbEnv()) {
    await ensureSchema();
    await seedHospitalsIfNeeded();
    const rows = (await getSql()`
      SELECT
        h.id, h.external_id, h.name, h.facility_type, h.state, h.municipality,
        h.address, h.level, h.priority_zone, h.is_priority, h.created_at,
        COALESCE(SUM(CASE WHEN p.status = 'hospitalized' THEN 1 ELSE 0 END), 0) AS active_patients,
        COUNT(p.id) AS total_patients
      FROM hospitals h
      LEFT JOIN hospital_patients p ON p.hospital_id = h.id
      WHERE h.id = ${id}
      GROUP BY h.id
    `) as HospitalRow[];
    return rows[0] ? rowToHospital(rows[0]) : null;
  }
  ensureMemorySeed();
  const h = memoryHospitals.get(id);
  if (!h) return null;
  const patients = [...memoryPatients.values()].filter((p) => p.hospitalId === id);
  return {
    ...h,
    activePatients: patients.filter((p) => p.status === "hospitalized").length,
    totalPatients: patients.length,
  };
}

export async function addHospital(input: NewHospital): Promise<Hospital> {
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("El nombre es obligatorio.");

  const hospital: Hospital = {
    id: crypto.randomUUID(),
    externalId: null,
    name: name.slice(0, 200),
    facilityType: input.facilityType ?? "hospital",
    state: (input.state ?? "").trim().slice(0, 120),
    municipality: (input.municipality ?? "").trim().slice(0, 120),
    address: (input.address ?? "").trim().slice(0, 400),
    level: input.level ?? null,
    priorityZone: input.priorityZone ?? "P3",
    isPriority: input.priorityZone === "P0" || input.priorityZone === "P1",
    activePatients: 0,
    totalPatients: 0,
    createdAt: Date.now(),
  };

  if (hasDbEnv()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO hospitals (
        id, external_id, name, facility_type, state, municipality,
        address, level, priority_zone, is_priority, created_at
      ) VALUES (
        ${hospital.id}, NULL, ${hospital.name},
        ${hospital.facilityType}, ${hospital.state}, ${hospital.municipality},
        ${hospital.address}, ${hospital.level}, ${hospital.priorityZone},
        ${hospital.isPriority}, ${hospital.createdAt}
      )
    `;
    return hospital;
  }

  ensureMemorySeed();
  memoryHospitals.set(hospital.id, hospital);
  return hospital;
}

export interface PatientSearchResult {
  patient: HospitalPatient;
  hospital: {
    id: string;
    name: string;
    state: string;
    municipality: string;
    address: string;
  };
}

/**
 * Búsqueda global de pacientes por nombre, cédula (en notas) o contacto.
 * Devuelve cada resultado con su hospital para el enlace cruzado.
 */
export async function searchPatients(
  query: string,
  limit: number = 50,
): Promise<PatientSearchResult[]> {
  const q = (query ?? "").trim();
  const cleanLimit = Math.min(Math.max(limit, 1), 200);

  if (hasDbEnv()) {
    await ensureSchema();
    await seedHospitalsIfNeeded();
    const baseSelect = `
      SELECT
        p.id, p.hospital_id, p.name, p.age, p.condition, p.status,
        p.notes, p.contact, p.admitted_at, p.updated_at,
        h.name AS hospital_name,
        h.state AS hospital_state,
        h.municipality AS hospital_municipality,
        h.address AS hospital_address
      FROM hospital_patients p
      INNER JOIN hospitals h ON h.id = p.hospital_id
    `;

    if (!q) {
      const rows = (await getSql().query(
        `
        ${baseSelect}
        ORDER BY
          CASE p.status WHEN 'hospitalized' THEN 0 ELSE 1 END,
          p.admitted_at DESC
        LIMIT $1
        `,
        [cleanLimit],
      )) as (PatientRow & {
        hospital_name: string;
        hospital_state: string;
        hospital_municipality: string;
        hospital_address: string;
      })[];

      return rows.map((r) => ({
        patient: rowToPatient(r),
        hospital: {
          id: r.hospital_id,
          name: r.hospital_name,
          state: r.hospital_state,
          municipality: r.hospital_municipality,
          address: r.hospital_address,
        },
      }));
    }

    if (q.length < 2) return [];

    const like = `%${q.toLowerCase()}%`;
    // Para cédulas el usuario puede escribir con o sin puntos: comparo también
    // contra una versión "limpia" (sólo dígitos) de las notas.
    const digits = q.replace(/[^0-9]/g, "");
    const digitsLike = digits.length >= 4 ? `%${digits}%` : null;

    const rows = (await getSql().query(
      `
      ${baseSelect}
      WHERE
        LOWER(p.name) LIKE $1
        OR LOWER(p.notes) LIKE $1
        OR LOWER(p.contact) LIKE $1
        OR ($2::text IS NOT NULL
            AND REGEXP_REPLACE(p.notes, '[^0-9]', '', 'g') LIKE $2)
      ORDER BY
        CASE WHEN LOWER(p.name) LIKE $1 THEN 0 ELSE 1 END,
        p.admitted_at DESC
      LIMIT $3
      `,
      [like, digitsLike, cleanLimit],
    )) as (PatientRow & {
      hospital_name: string;
      hospital_state: string;
      hospital_municipality: string;
      hospital_address: string;
    })[];

    return rows.map((r) => ({
      patient: rowToPatient(r),
      hospital: {
        id: r.hospital_id,
        name: r.hospital_name,
        state: r.hospital_state,
        municipality: r.hospital_municipality,
        address: r.hospital_address,
      },
    }));
  }

  ensureMemorySeed();
  if (!q) {
    return [...memoryPatients.values()]
      .map((p) => {
        const h = memoryHospitals.get(p.hospitalId);
        if (!h) return null;
        return {
          patient: p,
          hospital: {
            id: h.id,
            name: h.name,
            state: h.state,
            municipality: h.municipality,
            address: h.address,
          },
        };
      })
      .filter((r): r is PatientSearchResult => r !== null)
      .sort((a, b) => b.patient.admittedAt - a.patient.admittedAt)
      .slice(0, cleanLimit);
  }
  if (q.length < 2) return [];

  const ql = q.toLowerCase();
  const digits = q.replace(/[^0-9]/g, "");
  const list: PatientSearchResult[] = [];
  for (const p of memoryPatients.values()) {
    const cleanNotes = p.notes.replace(/[^0-9]/g, "");
    const matches =
      p.name.toLowerCase().includes(ql) ||
      p.notes.toLowerCase().includes(ql) ||
      p.contact.toLowerCase().includes(ql) ||
      (digits.length >= 4 && cleanNotes.includes(digits));
    if (!matches) continue;
    const h = memoryHospitals.get(p.hospitalId);
    if (!h) continue;
    list.push({
      patient: p,
      hospital: {
        id: h.id,
        name: h.name,
        state: h.state,
        municipality: h.municipality,
        address: h.address,
      },
    });
  }
  list.sort((a, b) => b.patient.admittedAt - a.patient.admittedAt);
  return list.slice(0, cleanLimit);
}

export async function listPatients(hospitalId: string): Promise<HospitalPatient[]> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT id, hospital_id, name, age, condition, status, notes, contact,
             admitted_at, updated_at
      FROM hospital_patients
      WHERE hospital_id = ${hospitalId}
      ORDER BY
        CASE status WHEN 'hospitalized' THEN 0 ELSE 1 END,
        admitted_at DESC
      LIMIT 500
    `) as PatientRow[];
    return rows.map(rowToPatient);
  }
  return [...memoryPatients.values()]
    .filter((p) => p.hospitalId === hospitalId)
    .sort((a, b) => {
      if (a.status === "hospitalized" && b.status !== "hospitalized") return -1;
      if (a.status !== "hospitalized" && b.status === "hospitalized") return 1;
      return b.admittedAt - a.admittedAt;
    });
}

interface PatientRow {
  id: string;
  hospital_id: string;
  name: string;
  age: number | null;
  condition: string;
  status: string;
  notes: string;
  contact: string;
  admitted_at: number | string;
  updated_at: number | string;
}

function rowToPatient(row: PatientRow): HospitalPatient {
  return {
    id: row.id,
    hospitalId: row.hospital_id,
    name: row.name,
    age: row.age === null ? null : Number(row.age),
    condition: PATIENT_CONDITIONS.has(row.condition as PatientCondition)
      ? (row.condition as PatientCondition)
      : "unknown",
    status: PATIENT_STATUSES.has(row.status as PatientStatus)
      ? (row.status as PatientStatus)
      : "hospitalized",
    notes: row.notes,
    contact: row.contact,
    admittedAt: Number(row.admitted_at),
    updatedAt: Number(row.updated_at),
  };
}

export async function addPatient(
  hospitalId: string,
  input: NewHospitalPatient,
): Promise<HospitalPatient> {
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("El nombre del paciente es obligatorio.");

  const now = Date.now();
  const condition = PATIENT_CONDITIONS.has(input.condition as PatientCondition)
    ? (input.condition as PatientCondition)
    : "unknown";
  const status = PATIENT_STATUSES.has(input.status as PatientStatus)
    ? (input.status as PatientStatus)
    : "hospitalized";

  const patient: HospitalPatient = {
    id: crypto.randomUUID(),
    hospitalId,
    name: name.slice(0, 120),
    age: normalizeAge(input.age),
    condition,
    status,
    notes: (input.notes ?? "").trim().slice(0, 600),
    contact: (input.contact ?? "").trim().slice(0, 120),
    admittedAt: now,
    updatedAt: now,
  };

  if (hasDbEnv()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO hospital_patients (
        id, hospital_id, name, age, condition, status, notes, contact,
        admitted_at, updated_at
      ) VALUES (
        ${patient.id}, ${hospitalId}, ${patient.name}, ${patient.age},
        ${patient.condition}, ${patient.status}, ${patient.notes},
        ${patient.contact}, ${patient.admittedAt}, ${patient.updatedAt}
      )
    `;
    return patient;
  }

  ensureMemorySeed();
  memoryPatients.set(patient.id, patient);
  return patient;
}

export async function deletePatient(
  hospitalId: string,
  patientId: string,
): Promise<boolean> {
  if (hasDbEnv()) {
    await ensureSchema();
    const rows = (await getSql()`
      DELETE FROM hospital_patients
      WHERE id = ${patientId} AND hospital_id = ${hospitalId}
      RETURNING id
    `) as { id: string }[];
    return rows.length > 0;
  }
  const existing = memoryPatients.get(patientId);
  if (!existing || existing.hospitalId !== hospitalId) return false;
  return memoryPatients.delete(patientId);
}
