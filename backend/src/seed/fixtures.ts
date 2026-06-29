/**
 * Fixtures de DEMO para desarrollo local (NO producción).
 *
 * Reglas:
 *  - TODAS las filas llevan `id` con prefijo `DEMO-`. Esa marca es la que usa el
 *    runner (index.ts) para distinguir datos demo de un dump real y NO mezclar.
 *  - Self-contained: la imagen del backend NO copia `frontend/`, así que los
 *    hospitales se embeben aquí (no se lee `frontend/lib/data/hospitals-seed.json`).
 *  - Datos geográficamente realistas de Venezuela; timestamps relativos a `now`.
 */

export const DEMO_PREFIX = "DEMO-";

const pick = <T>(arr: readonly T[], i: number): T =>
  arr[((i % arr.length) + arr.length) % arr.length]!;

const MIN = 60_000;
const HOUR = 60 * MIN;

// Ciudades con coords reales; se les aplica un jitter determinista por índice.
const CITIES = [
  { name: "Caracas", lat: 10.4806, lng: -66.9036 },
  { name: "Maracaibo", lat: 10.6545, lng: -71.6406 },
  { name: "Valencia", lat: 10.162, lng: -68.0077 },
  { name: "Barquisimeto", lat: 10.0731, lng: -69.322 },
  { name: "Maracay", lat: 10.2469, lng: -67.5958 },
  { name: "Ciudad Guayana", lat: 8.3533, lng: -62.6528 },
  { name: "Maturín", lat: 9.7457, lng: -63.1832 },
  { name: "Mérida", lat: 8.5897, lng: -71.1561 },
  { name: "San Cristóbal", lat: 7.7669, lng: -72.225 },
  { name: "Barcelona", lat: 10.134, lng: -64.6963 },
  { name: "Cumaná", lat: 10.4537, lng: -64.1813 },
  { name: "Puerto La Cruz", lat: 10.213, lng: -64.616 },
] as const;

const jitterLat = (base: number, i: number) => base + ((i % 7) - 3) * 0.012;
const jitterLng = (base: number, i: number) => base + ((i % 5) - 2) * 0.012;

const REPORT_TYPES = [
  "critical",
  "supplies",
  "shelter",
  "nopower",
  "missing",
  "building",
  "starlink",
] as const;

const NEEDS_BY_TYPE: Record<(typeof REPORT_TYPES)[number], string> = {
  critical: "Personas atrapadas, se necesita rescate urgente y ambulancia.",
  supplies: "Falta agua potable, alimentos no perecederos y medicinas.",
  shelter: "Familias sin techo, se requiere refugio temporal y cobijas.",
  nopower: "Sin electricidad desde hace horas, equipos médicos en riesgo.",
  missing: "Familiar desaparecido tras el sismo, se busca información.",
  building: "Estructura con grietas graves, riesgo de colapso.",
  starlink: "Punto con internet Starlink disponible para coordinación.",
};

const FIRST_NAMES = [
  "María", "José", "Carmen", "Luis", "Ana", "Carlos", "Rosa", "Pedro",
  "Andrea", "Miguel", "Gabriela", "Jesús", "Daniela", "Rafael", "Valentina",
  "Francisco", "Isabel", "Antonio", "Sofía", "Manuel",
] as const;

const LAST_NAMES = [
  "González", "Rodríguez", "Pérez", "Hernández", "García", "Martínez",
  "López", "Sánchez", "Ramírez", "Torres", "Flores", "Rivas", "Mendoza",
  "Castillo", "Romero", "Suárez", "Blanco", "Guerrero",
] as const;

export interface DemoReport {
  id: string;
  type: string;
  lat: number;
  lng: number;
  place: string;
  affected: number;
  needs: string;
  confirmations: number;
  createdAt: number;
}

export interface DemoMissing {
  id: string;
  name: string;
  age: number | null;
  nationality: string;
  description: string;
  lastSeen: string;
  contact: string;
  status: string;
  lat: number | null;
  lng: number | null;
  resolvedAt: number | null;
  resolutionNote: string | null;
  createdAt: number;
}

export interface DemoHospital {
  id: string;
  externalId: string;
  name: string;
  facilityType: string;
  state: string;
  municipality: string;
  address: string;
  level: string | null;
  priorityZone: string;
  isPriority: boolean;
  createdAt: number;
}

export interface DemoPatient {
  id: string;
  hospitalId: string;
  name: string;
  age: number | null;
  condition: string;
  status: string;
  notes: string;
  contact: string;
  admittedAt: number;
  updatedAt: number;
}

export interface DemoSupplyStatus {
  id: string;
  hospitalId: string;
  category: string;
  status: string;
  publicNote: string;
  lastUpdatedAt: number;
  lastConfirmedAt: number;
  createdAt: number;
}

export interface DemoSupplyNeed {
  id: string;
  hospitalId: string;
  category: string;
  itemType: string;
  quantity: number | null;
  unit: string;
  urgency: string;
  status: string;
  publicNote: string;
  lastConfirmedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface DemoDonation {
  id: string;
  name: string;
  amountUsd: number;
  status: string;
  createdAt: number;
}

export interface DemoChat {
  id: string;
  name: string;
  role: string;
  text: string;
  threadBumpedAt: number;
  createdAt: number;
}

// Subset embebido de hospitales reales (mezcla de estados + algunos prioritarios).
const HOSPITAL_SEED: Array<Omit<DemoHospital, "id" | "externalId" | "createdAt">> = [
  { name: "Hospital Universitario de Caracas", facilityType: "hospital", state: "Distrito Capital", municipality: "Libertador", address: "Ciudad Universitaria, Los Chaguaramos, Caracas", level: "IV", priorityZone: "P0", isPriority: true },
  { name: "Hospital José María Vargas", facilityType: "hospital", state: "Distrito Capital", municipality: "Libertador", address: "San José, Caracas", level: "III", priorityZone: "P0", isPriority: true },
  { name: "Hospital de Niños J. M. de los Ríos", facilityType: "hospital_pediatrico", state: "Distrito Capital", municipality: "Libertador", address: "San Bernardino, Caracas", level: "IV", priorityZone: "P0", isPriority: true },
  { name: "Hospital Dr. Miguel Pérez Carreño", facilityType: "hospital_ivss", state: "Distrito Capital", municipality: "Libertador", address: "Av. Intercomunal, Caracas", level: "III", priorityZone: "P1", isPriority: true },
  { name: "Maternidad Concepción Palacios", facilityType: "maternidad", state: "Distrito Capital", municipality: "Libertador", address: "San Martín, Caracas", level: "III", priorityZone: "P1", isPriority: true },
  { name: "Hospital Dr. Domingo Luciani (El Llanito)", facilityType: "hospital_ivss", state: "Miranda", municipality: "Sucre", address: "El Llanito, Caracas", level: "III", priorityZone: "P1", isPriority: true },
  { name: "Hospital Universitario de Maracaibo", facilityType: "hospital", state: "Zulia", municipality: "Maracaibo", address: "Av. El Milagro, Maracaibo", level: "IV", priorityZone: "P1", isPriority: true },
  { name: "Hospital Central de Maracay", facilityType: "hospital", state: "Aragua", municipality: "Girardot", address: "Av. Bolívar, Maracay", level: "III", priorityZone: "P2", isPriority: false },
  { name: "Hospital Central de Valencia", facilityType: "hospital", state: "Carabobo", municipality: "Valencia", address: "Av. Cedeño, Valencia", level: "III", priorityZone: "P2", isPriority: false },
  { name: "Hospital Central Antonio María Pineda", facilityType: "hospital", state: "Lara", municipality: "Iribarren", address: "Av. Andrés Bello, Barquisimeto", level: "IV", priorityZone: "P2", isPriority: false },
  { name: "Hospital Universitario de Los Andes", facilityType: "hospital", state: "Mérida", municipality: "Libertador", address: "Av. 16 de Septiembre, Mérida", level: "IV", priorityZone: "P2", isPriority: false },
  { name: "Hospital Central San Cristóbal", facilityType: "hospital", state: "Táchira", municipality: "San Cristóbal", address: "Av. Lucio Oquendo, San Cristóbal", level: "III", priorityZone: "P2", isPriority: false },
  { name: "Hospital Dr. Luis Razetti (Barcelona)", facilityType: "hospital", state: "Anzoátegui", municipality: "Bolívar", address: "Av. Caracas, Barcelona", level: "III", priorityZone: "P2", isPriority: false },
  { name: "Hospital Universitario Dr. Manuel Núñez Tovar", facilityType: "hospital", state: "Monagas", municipality: "Maturín", address: "Av. Bolívar, Maturín", level: "III", priorityZone: "P3", isPriority: false },
  { name: "Hospital Ruiz y Páez", facilityType: "hospital", state: "Bolívar", municipality: "Heres", address: "Ciudad Bolívar", level: "III", priorityZone: "P3", isPriority: false },
  { name: "Hospital Uyapar", facilityType: "hospital", state: "Bolívar", municipality: "Caroní", address: "Puerto Ordaz, Ciudad Guayana", level: "III", priorityZone: "P3", isPriority: false },
  { name: "Hospital Antonio Patricio de Alcalá", facilityType: "hospital", state: "Sucre", municipality: "Sucre", address: "Cumaná", level: "II", priorityZone: "P3", isPriority: false },
  { name: "CDI Catia", facilityType: "cdi", state: "Distrito Capital", municipality: "Libertador", address: "Catia, Caracas", level: "I", priorityZone: "P2", isPriority: false },
  { name: "Hospital Militar Dr. Carlos Arvelo", facilityType: "hospital_militar", state: "Distrito Capital", municipality: "Libertador", address: "San Martín, Caracas", level: "militar", priorityZone: "P1", isPriority: true },
  { name: "Hospital Dr. Adolfo Prince Lara", facilityType: "hospital", state: "Carabobo", municipality: "Puerto Cabello", address: "Puerto Cabello", level: "II", priorityZone: "P3", isPriority: false },
];

const SUPPLY_CATEGORIES = [
  "medications", "iv_fluids", "medical_supplies", "water", "beds_capacity", "lab_diagnostics",
] as const;
const SUPPLY_STATUS = ["green", "yellow", "red"] as const;
const PATIENT_CONDITION = ["stable", "serious", "critical", "recovering"] as const;
const PATIENT_STATUS = ["hospitalized", "hospitalized", "recovering", "transferred"] as const;

export interface DemoData {
  reports: DemoReport[];
  missing: DemoMissing[];
  hospitals: DemoHospital[];
  patients: DemoPatient[];
  supplyStatuses: DemoSupplyStatus[];
  supplyNeeds: DemoSupplyNeed[];
  donations: DemoDonation[];
  chat: DemoChat[];
}

export function buildFixtures(now: number): DemoData {
  const reports: DemoReport[] = Array.from({ length: 200 }, (_, i) => {
    const city = pick(CITIES, i);
    const type = pick(REPORT_TYPES, i);
    return {
      id: `${DEMO_PREFIX}report-${i + 1}`,
      type,
      lat: jitterLat(city.lat, i),
      lng: jitterLng(city.lng, i + 2),
      place: `${city.name} — sector ${(i % 12) + 1}`,
      affected: (i % 9) * 3,
      needs: NEEDS_BY_TYPE[type],
      confirmations: i % 5,
      createdAt: now - i * 17 * MIN,
    };
  });

  const missing: DemoMissing[] = Array.from({ length: 120 }, (_, i) => {
    const city = pick(CITIES, i + 1);
    const found = i % 6 === 0;
    const hasCoords = i % 5 !== 0; // ~80% en el mapa
    return {
      id: `${DEMO_PREFIX}missing-${i + 1}`,
      name: `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i + 3)}`,
      age: i % 11 === 0 ? null : 5 + (i % 80),
      nationality: i % 4 === 0 ? "Colombiana" : "Venezolana",
      description: "Visto por última vez tras el sismo. Cualquier información es valiosa.",
      lastSeen: `${city.name}, cerca de la plaza central`,
      contact: `+58 4${(10 + (i % 89))}-${1000000 + i}`,
      status: found ? "found" : "active",
      lat: hasCoords ? jitterLat(city.lat, i + 1) : null,
      lng: hasCoords ? jitterLng(city.lng, i + 3) : null,
      resolvedAt: found ? now - i * HOUR : null,
      resolutionNote: found ? "Reportado a salvo por un familiar." : null,
      createdAt: now - i * 33 * MIN,
    };
  });

  const hospitals: DemoHospital[] = HOSPITAL_SEED.map((h, i) => ({
    id: `${DEMO_PREFIX}hosp-${i + 1}`,
    externalId: `${DEMO_PREFIX}HOSP-${String(i + 1).padStart(3, "0")}`,
    createdAt: now - i * 2 * HOUR,
    ...h,
  }));

  // Pacientes + suministros para los primeros 6 hospitales.
  const detailed = hospitals.slice(0, 6);
  const patients: DemoPatient[] = [];
  const supplyStatuses: DemoSupplyStatus[] = [];
  const supplyNeeds: DemoSupplyNeed[] = [];
  detailed.forEach((h, hi) => {
    const nPatients = 4 + (hi % 4);
    for (let p = 0; p < nPatients; p++) {
      const k = hi * 10 + p;
      patients.push({
        id: `${DEMO_PREFIX}patient-${k + 1}`,
        hospitalId: h.id,
        name: `${pick(FIRST_NAMES, k + 2)} ${pick(LAST_NAMES, k)}`,
        age: k % 9 === 0 ? null : 1 + (k % 90),
        condition: pick(PATIENT_CONDITION, k),
        status: pick(PATIENT_STATUS, k),
        notes: "Ingresado tras el sismo; en observación.",
        contact: k % 3 === 0 ? "" : `+58 412-${2000000 + k}`,
        admittedAt: now - (k + 1) * 5 * HOUR,
        updatedAt: now - (k + 1) * 2 * HOUR,
      });
    }
    // Una fila de status por categoría (índice único hospital+category).
    SUPPLY_CATEGORIES.forEach((category, ci) => {
      supplyStatuses.push({
        id: `${DEMO_PREFIX}supply-${hi}-${ci}`,
        hospitalId: h.id,
        category,
        status: pick(SUPPLY_STATUS, hi + ci),
        publicNote: "Estado reportado por el equipo operativo.",
        lastUpdatedAt: now - (ci + 1) * HOUR,
        lastConfirmedAt: now - (ci + 1) * HOUR,
        createdAt: now - 6 * HOUR,
      });
    });
    // Un par de necesidades por hospital.
    for (let nd = 0; nd < 2; nd++) {
      const ci = (hi + nd) % SUPPLY_CATEGORIES.length;
      supplyNeeds.push({
        id: `${DEMO_PREFIX}need-${hi}-${nd}`,
        hospitalId: h.id,
        category: pick(SUPPLY_CATEGORIES, ci),
        itemType: nd === 0 ? "Solución fisiológica 0.9%" : "Gasas estériles",
        quantity: 50 + nd * 100,
        unit: nd === 0 ? "litros" : "cajas",
        urgency: nd === 0 ? "red" : "yellow",
        status: "active",
        publicNote: "Se agradece cualquier donación verificable.",
        lastConfirmedAt: now - (nd + 1) * HOUR,
        createdAt: now - 5 * HOUR,
        updatedAt: now - (nd + 1) * HOUR,
      });
    }
  });

  const donations: DemoDonation[] = Array.from({ length: 30 }, (_, i) => ({
    id: `${DEMO_PREFIX}donation-${i + 1}`,
    name: i % 7 === 0 ? "Anónimo" : `${pick(FIRST_NAMES, i + 5)} ${pick(LAST_NAMES, i + 1)}`,
    amountUsd: ((i % 10) + 1) * 500, // céntimos (USD 5–50)
    status: "intent",
    createdAt: now - i * 90 * MIN,
  }));

  const chatTexts = [
    "Equipo en camino al sector afectado, confirmen punto de encuentro.",
    "Necesitamos voluntarios con vehículo para traslado de insumos.",
    "Hay un refugio operativo cerca de la plaza, capacidad para 40 personas.",
    "¿Alguien tiene contacto con bomberos de la zona?",
    "Llevamos agua y medicinas; indiquen dirección exacta.",
    "Reporte confirmado, ya pasó la cuadrilla de rescate.",
  ];
  const chat: DemoChat[] = Array.from({ length: 40 }, (_, i) => ({
    id: `${DEMO_PREFIX}chat-${i + 1}`,
    name: i % 5 === 0 ? "Anónimo" : `${pick(FIRST_NAMES, i + 7)}`,
    role: "ciudadano",
    text: pick(chatTexts, i),
    threadBumpedAt: now - i * 11 * MIN,
    createdAt: now - i * 11 * MIN,
  }));

  return { reports, missing, hospitals, patients, supplyStatuses, supplyNeeds, donations, chat };
}
