import { eq, sql } from "drizzle-orm";
import { getDb, hasDbEnv, schema } from "./drizzle";
import hospitalsSeed from "./data/hospitals-seed.json";
import {
  HOSPITAL_FACILITY_TYPES,
  PATIENT_CONDITIONS,
  PATIENT_STATUSES,
  PRIORITY_ZONES,
  matchesHospitalSlug,
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

const { hospitals, hospitalPatients } = schema;

let _seedDone = false;

async function seedHospitalsIfNeeded(): Promise<void> {
  if (_seedDone) return;
  _seedDone = true;
  const rows = await getDb()
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(hospitals)
    .where(sql`${hospitals.externalId} IS NOT NULL`);
  const count = Number(rows[0]?.count ?? 0);
  if (count >= hospitalsSeed.length) return;

  for (const h of hospitalsSeed) {
    try {
      await getDb()
        .insert(hospitals)
        .values({
          id: crypto.randomUUID(),
          externalId: h.externalId,
          name: h.name,
          facilityType: h.facilityType,
          state: h.state,
          municipality: h.municipality,
          address: h.address,
          level: h.level,
          priorityZone: h.priorityZone,
          isPriority: h.isPriority,
          createdAt: Date.now(),
        })
        // ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
        // (target del índice único parcial).
        .onConflictDoNothing({
          target: hospitals.externalId,
          where: sql`${hospitals.externalId} IS NOT NULL`,
        });
    } catch {
      // un fallo puntual no detiene el resto
    }
  }
}

// Fila agregada que devuelven las consultas de hospitales (con conteo de
// pacientes calculado por el LEFT JOIN).
type HospitalRow = typeof hospitals.$inferSelect & {
  activePatients: number | string | null;
  totalPatients: number | string | null;
};

function rowToHospital(row: HospitalRow): Hospital {
  return {
    id: row.id,
    externalId: row.externalId,
    name: row.name,
    facilityType: normalizeFacilityType(row.facilityType),
    state: row.state,
    municipality: row.municipality,
    address: row.address,
    level: normalizeLevel(row.level),
    priorityZone: normalizePriority(row.priorityZone),
    isPriority: Boolean(row.isPriority),
    activePatients: Number(row.activePatients ?? 0),
    totalPatients: Number(row.totalPatients ?? 0),
    createdAt: Number(row.createdAt),
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
    await seedHospitalsIfNeeded();
    // Agregación con LEFT JOIN + GROUP BY y orden por CASE de prioridad:
    // se mantiene con el escape `sql` por fidelidad de semántica.
    const conditions = [sql`1=1`];
    if (state) conditions.push(sql`h.state = ${state}`);
    if (zone) conditions.push(sql`h.priority_zone = ${zone}`);
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      conditions.push(
        sql`(LOWER(h.name) LIKE ${like} OR LOWER(h.municipality) LIKE ${like} OR LOWER(h.state) LIKE ${like})`,
      );
    }
    const whereSql = sql.join(conditions, sql` AND `);

    const result = await getDb().execute(sql`
      SELECT
        h.id, h.external_id AS "externalId", h.name,
        h.facility_type AS "facilityType", h.state, h.municipality,
        h.address, h.level, h.priority_zone AS "priorityZone",
        h.is_priority AS "isPriority", h.created_at AS "createdAt",
        COALESCE(SUM(CASE WHEN p.status = 'hospitalized' THEN 1 ELSE 0 END), 0) AS "activePatients",
        COUNT(p.id) AS "totalPatients"
      FROM hospitals h
      LEFT JOIN hospital_patients p ON p.hospital_id = h.id
      WHERE ${whereSql}
      GROUP BY h.id
      ORDER BY
        "activePatients" DESC,
        CASE h.priority_zone WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
        h.state, h.name
      LIMIT ${limit}
    `);
    const rows = (Array.isArray(result) ? result : result.rows) as HospitalRow[];
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
    if (a.activePatients !== b.activePatients) {
      return b.activePatients - a.activePatients;
    }
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
    await seedHospitalsIfNeeded();
    const rows = await getDb()
      .selectDistinct({ state: hospitals.state })
      .from(hospitals)
      .where(sql`${hospitals.state} <> ''`)
      .orderBy(hospitals.state);
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
    await seedHospitalsIfNeeded();
    const result = await getDb().execute(sql`
      SELECT
        h.id, h.external_id AS "externalId", h.name,
        h.facility_type AS "facilityType", h.state, h.municipality,
        h.address, h.level, h.priority_zone AS "priorityZone",
        h.is_priority AS "isPriority", h.created_at AS "createdAt",
        COALESCE(SUM(CASE WHEN p.status = 'hospitalized' THEN 1 ELSE 0 END), 0) AS "activePatients",
        COUNT(p.id) AS "totalPatients"
      FROM hospitals h
      LEFT JOIN hospital_patients p ON p.hospital_id = h.id
      WHERE h.id = ${id}
      GROUP BY h.id
    `);
    const rows = (Array.isArray(result) ? result : result.rows) as HospitalRow[];
    if (rows[0]) return rowToHospital(rows[0]);

    const hospitalsList = await listHospitals({ limit: 1000 });
    return hospitalsList.find((h) => matchesHospitalSlug(h, id)) ?? null;
  }
  ensureMemorySeed();
  const h = memoryHospitals.get(id);
  if (!h) {
    const match = [...memoryHospitals.values()].find((hospital) =>
      matchesHospitalSlug(hospital, id),
    );
    if (!match) return null;
    return getHospital(match.id);
  }
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
    await getDb().insert(hospitals).values({
      id: hospital.id,
      externalId: null,
      name: hospital.name,
      facilityType: hospital.facilityType,
      state: hospital.state,
      municipality: hospital.municipality,
      address: hospital.address,
      level: hospital.level,
      priorityZone: hospital.priorityZone,
      isPriority: hospital.isPriority,
      createdAt: hospital.createdAt,
    });
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

// Fila de paciente con columnas del hospital adjuntas (búsqueda global).
type PatientWithHospitalRow = typeof hospitalPatients.$inferSelect & {
  hospitalName: string;
  hospitalState: string;
  hospitalMunicipality: string;
  hospitalAddress: string;
};

function rowToSearchResult(r: PatientWithHospitalRow): PatientSearchResult {
  return {
    patient: rowToPatient(r),
    hospital: {
      id: r.hospitalId,
      name: r.hospitalName,
      state: r.hospitalState,
      municipality: r.hospitalMunicipality,
      address: r.hospitalAddress,
    },
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
    await seedHospitalsIfNeeded();
    // REGEXP_REPLACE y los CASE de orden no se expresan con el query builder
    // sin perder fidelidad: se preserva el SQL exacto vía escape `sql`.
    const baseSelect = sql`
      SELECT
        p.id, p.hospital_id AS "hospitalId", p.name, p.age, p.condition,
        p.status, p.notes, p.contact, p.admitted_at AS "admittedAt",
        p.updated_at AS "updatedAt",
        h.name AS "hospitalName",
        h.state AS "hospitalState",
        h.municipality AS "hospitalMunicipality",
        h.address AS "hospitalAddress"
      FROM hospital_patients p
      INNER JOIN hospitals h ON h.id = p.hospital_id
    `;

    if (!q) {
      const result = await getDb().execute(sql`
        ${baseSelect}
        ORDER BY
          CASE p.status WHEN 'hospitalized' THEN 0 ELSE 1 END,
          p.admitted_at DESC
        LIMIT ${cleanLimit}
      `);
      const rows = (Array.isArray(result)
        ? result
        : result.rows) as PatientWithHospitalRow[];
      return rows.map(rowToSearchResult);
    }

    if (q.length < 2) return [];

    const like = `%${q.toLowerCase()}%`;
    // Para cédulas el usuario puede escribir con o sin puntos: comparo también
    // contra una versión "limpia" (sólo dígitos) de las notas.
    const digits = q.replace(/[^0-9]/g, "");
    const digitsLike = digits.length >= 4 ? `%${digits}%` : null;

    const result = await getDb().execute(sql`
      ${baseSelect}
      WHERE
        LOWER(p.name) LIKE ${like}
        OR LOWER(p.notes) LIKE ${like}
        OR LOWER(p.contact) LIKE ${like}
        OR (${digitsLike}::text IS NOT NULL
            AND REGEXP_REPLACE(p.notes, '[^0-9]', '', 'g') LIKE ${digitsLike})
      ORDER BY
        CASE WHEN LOWER(p.name) LIKE ${like} THEN 0 ELSE 1 END,
        p.admitted_at DESC
      LIMIT ${cleanLimit}
    `);
    const rows = (Array.isArray(result)
      ? result
      : result.rows) as PatientWithHospitalRow[];
    return rows.map(rowToSearchResult);
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
    const rows = await getDb()
      .select()
      .from(hospitalPatients)
      .where(eq(hospitalPatients.hospitalId, hospitalId))
      .orderBy(
        sql`CASE ${hospitalPatients.status} WHEN 'hospitalized' THEN 0 ELSE 1 END`,
        sql`${hospitalPatients.admittedAt} DESC`,
      )
      .limit(500);
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

type PatientRow = typeof hospitalPatients.$inferSelect;

function rowToPatient(row: PatientRow): HospitalPatient {
  return {
    id: row.id,
    hospitalId: row.hospitalId,
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
    admittedAt: Number(row.admittedAt),
    updatedAt: Number(row.updatedAt),
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
    await getDb().insert(hospitalPatients).values({
      id: patient.id,
      hospitalId,
      name: patient.name,
      age: patient.age,
      condition: patient.condition,
      status: patient.status,
      notes: patient.notes,
      contact: patient.contact,
      admittedAt: patient.admittedAt,
      updatedAt: patient.updatedAt,
    });
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
    // El builder de delete().returning() no resuelve sobre el tipo unión de
    // drivers (neon-http | node-postgres); usamos el escape `sql` preservando
    // la semántica exacta del DELETE ... RETURNING id.
    const result = await getDb().execute(
      sql`DELETE FROM ${hospitalPatients}
          WHERE ${hospitalPatients.id} = ${patientId}
            AND ${hospitalPatients.hospitalId} = ${hospitalId}
          RETURNING ${hospitalPatients.id}`,
    );
    const rows = (Array.isArray(result) ? result : result.rows) as unknown[];
    return rows.length > 0;
  }
  const existing = memoryPatients.get(patientId);
  if (!existing || existing.hospitalId !== hospitalId) return false;
  return memoryPatients.delete(patientId);
}
