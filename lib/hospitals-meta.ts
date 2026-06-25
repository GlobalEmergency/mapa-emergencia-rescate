export type HospitalPriorityZone = "P0" | "P1" | "P2" | "P3";

export type HospitalFacilityType =
  | "hospital"
  | "hospital_ivss"
  | "hospital_militar"
  | "hospital_pediatrico"
  | "maternidad"
  | "cdi";

export type HospitalLevel = "I" | "II" | "III" | "IV" | "militar" | null;

export interface Hospital {
  id: string;
  externalId: string | null;
  name: string;
  facilityType: HospitalFacilityType;
  state: string;
  municipality: string;
  address: string;
  level: HospitalLevel;
  priorityZone: HospitalPriorityZone;
  isPriority: boolean;
  activePatients: number;
  totalPatients: number;
  createdAt: number;
}

export type PatientStatus = "hospitalized" | "discharged" | "transferred" | "deceased";

export type PatientCondition = "stable" | "serious" | "critical" | "recovering" | "unknown";

export interface HospitalPatient {
  id: string;
  hospitalId: string;
  name: string;
  age: number | null;
  condition: PatientCondition;
  status: PatientStatus;
  notes: string;
  contact: string;
  admittedAt: number;
  updatedAt: number;
}

export interface NewHospital {
  name: string;
  facilityType?: HospitalFacilityType;
  state: string;
  municipality?: string;
  address?: string;
  level?: HospitalLevel;
  priorityZone?: HospitalPriorityZone;
}

export interface NewHospitalPatient {
  name: string;
  age?: number | string | null;
  condition?: PatientCondition;
  status?: PatientStatus;
  notes?: string;
  contact?: string;
}

export const MAX_HOSPITAL_NAME = 200;
export const MAX_HOSPITAL_ADDRESS = 400;
export const MAX_HOSPITAL_FIELD = 120;

export const MAX_PATIENT_NAME = 120;
export const MAX_PATIENT_NOTES = 600;
export const MAX_PATIENT_CONTACT = 120;

export const HOSPITAL_FACILITY_TYPES: ReadonlySet<HospitalFacilityType> = new Set([
  "hospital",
  "hospital_ivss",
  "hospital_militar",
  "hospital_pediatrico",
  "maternidad",
  "cdi",
]);

export const PRIORITY_ZONES: ReadonlySet<HospitalPriorityZone> = new Set([
  "P0",
  "P1",
  "P2",
  "P3",
]);

export const PATIENT_STATUSES: ReadonlySet<PatientStatus> = new Set([
  "hospitalized",
  "discharged",
  "transferred",
  "deceased",
]);

export const PATIENT_CONDITIONS: ReadonlySet<PatientCondition> = new Set([
  "stable",
  "serious",
  "critical",
  "recovering",
  "unknown",
]);

export const PRIORITY_ZONE_META: Record<
  HospitalPriorityZone,
  { label: string; description: string; color: string; emoji: string }
> = {
  P0: {
    label: "Zona cero",
    description: "Afectación inmediata. Máxima prioridad de atención.",
    color: "#dc2626",
    emoji: "🔴",
  },
  P1: {
    label: "Corredor de afectación",
    description: "Zona cercana al epicentro con impacto directo.",
    color: "#ea580c",
    emoji: "🟠",
  },
  P2: {
    label: "Expansión / recuperación",
    description: "Hospitales de soporte para la recuperación regional.",
    color: "#eab308",
    emoji: "🟡",
  },
  P3: {
    label: "Base nacional",
    description: "Red nacional de respaldo.",
    color: "#0ea5e9",
    emoji: "🔵",
  },
};

export const FACILITY_TYPE_META: Record<
  HospitalFacilityType,
  { label: string; emoji: string }
> = {
  hospital: { label: "Hospital", emoji: "🏥" },
  hospital_ivss: { label: "Hospital IVSS", emoji: "🩺" },
  hospital_militar: { label: "Hospital militar", emoji: "🪖" },
  hospital_pediatrico: { label: "Hospital pediátrico", emoji: "🧒" },
  maternidad: { label: "Maternidad / materno-infantil", emoji: "👶" },
  cdi: { label: "CDI", emoji: "🏨" },
};

export const PATIENT_CONDITION_META: Record<
  PatientCondition,
  { label: string; color: string }
> = {
  stable: { label: "Estable", color: "#16a34a" },
  serious: { label: "Grave", color: "#ea580c" },
  critical: { label: "Crítico", color: "#dc2626" },
  recovering: { label: "En recuperación", color: "#0284c7" },
  unknown: { label: "Sin determinar", color: "#64748b" },
};

export const PATIENT_STATUS_META: Record<
  PatientStatus,
  { label: string; color: string }
> = {
  hospitalized: { label: "Hospitalizado", color: "#1d4ed8" },
  discharged: { label: "Dado de alta", color: "#16a34a" },
  transferred: { label: "Transferido", color: "#7c3aed" },
  deceased: { label: "Fallecido", color: "#334155" },
};

export function slugifyHospitalPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildHospitalSlug(
  hospital: Pick<Hospital, "name" | "municipality" | "state">,
): string {
  const parts = [
    hospital.name,
    hospital.municipality || hospital.state,
  ].filter(Boolean);

  return slugifyHospitalPart(parts.join(" ")) || "hospital";
}

export function matchesHospitalSlug(
  hospital: Pick<Hospital, "name" | "municipality" | "state">,
  slug: string,
): boolean {
  const normalized = slugifyHospitalPart(slug);
  if (!normalized) return false;

  return (
    normalized === buildHospitalSlug(hospital) ||
    normalized === slugifyHospitalPart(hospital.name) ||
    normalized ===
      slugifyHospitalPart(
        [hospital.name, hospital.municipality, hospital.state]
          .filter(Boolean)
          .join(" "),
      )
  );
}
