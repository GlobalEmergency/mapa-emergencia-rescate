"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FACILITY_TYPE_META,
  PATIENT_CONDITION_META,
  PATIENT_STATUS_META,
  PRIORITY_ZONE_META,
  type Hospital,
  type HospitalPatient,
  type HospitalPriorityZone,
} from "@/lib/hospitals-meta";
import HospitalForm, { type HospitalPayload } from "./HospitalForm";

type Tab = "hospitals" | "patients";
const PAGE_SIZE = 20;

interface PatientSearchResult {
  patient: HospitalPatient;
  hospital: {
    id: string;
    name: string;
    state: string;
    municipality: string;
  };
}

const ZONE_FILTERS: { value: HospitalPriorityZone | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "P0", label: "Zona cero" },
  { value: "P1", label: "Corredor" },
  { value: "P2", label: "Recuperación" },
  { value: "P3", label: "Base nacional" },
];

export default function Hospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [zoneFilter, setZoneFilter] = useState<HospitalPriorityZone | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [tab, setTab] = useState<Tab>("hospitals");
  const [patientQuery, setPatientQuery] = useState("");
  const [debouncedPatientQuery, setDebouncedPatientQuery] = useState("");
  const [patientLimit, setPatientLimit] = useState(PAGE_SIZE);
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
  const [patientHasMore, setPatientHasMore] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hospitals?include=states", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudo cargar la lista de hospitales.");
      const data = await res.json();
      setHospitals(data.hospitals ?? []);
      if (Array.isArray(data.states)) setStates(data.states);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPatientQuery(patientQuery), 300);
    return () => clearTimeout(t);
  }, [patientQuery]);

  useEffect(() => {
    const q = debouncedPatientQuery.trim();
    if (q.length === 1) {
      return;
    }
    let cancelled = false;
    const id = window.setTimeout(() => {
      setPatientLoading(true);
      setPatientError(null);
      fetch(
        `/api/patients/search?q=${encodeURIComponent(q)}&limit=${patientLimit}`,
      )
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Error"))))
        .then((data: { results?: PatientSearchResult[]; hasMore?: boolean }) => {
          if (!cancelled) {
            setPatientResults(data.results ?? []);
            setPatientHasMore(Boolean(data.hasMore));
          }
        })
        .catch(() => {
          if (!cancelled) setPatientError("No se pudo realizar la búsqueda.");
        })
        .finally(() => {
          if (!cancelled) setPatientLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [debouncedPatientQuery, patientLimit]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hospitals.filter((h) => {
      if (stateFilter && h.state !== stateFilter) return false;
      if (zoneFilter !== "all" && h.priorityZone !== zoneFilter) return false;
      if (q) {
        const hay =
          h.name.toLowerCase().includes(q) ||
          h.municipality.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [hospitals, search, stateFilter, zoneFilter]);

  const stats = useMemo(() => {
    const byZone = { P0: 0, P1: 0, P2: 0, P3: 0 } as Record<
      HospitalPriorityZone,
      number
    >;
    let activePatients = 0;
    let totalPatients = 0;
    for (const h of hospitals) {
      byZone[h.priorityZone]++;
      activePatients += h.activePatients;
      totalPatients += h.totalPatients;
    }
    return { byZone, activePatients, totalPatients };
  }, [hospitals]);

  async function handleAdd(payload: HospitalPayload) {
    const res = await fetch("/api/hospitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "No se pudo guardar el hospital.");
    }
    setShowAddForm(false);
    await load();
  }

  return (
    <section
      id="hospitales"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-10"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700">
            🏥 Hospitales
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Hospitales y centros de salud
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Lista priorizada de la red hospitalaria de Venezuela según la zona
            de afectación. Toca un hospital para ver los pacientes registrados o
            añadir uno nuevo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
        >
          + Añadir hospital
        </button>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard label="Total" value={hospitals.length} accent="#0f172a" />
        {(Object.keys(PRIORITY_ZONE_META) as HospitalPriorityZone[]).map((zone) => (
          <StatCard
            key={zone}
            label={`${PRIORITY_ZONE_META[zone].emoji} ${PRIORITY_ZONE_META[zone].label}`}
            value={stats.byZone[zone]}
            accent={PRIORITY_ZONE_META[zone].color}
          />
        ))}
        <StatCard
          label="Hospitalizados"
          value={stats.activePatients}
          accent="#1d4ed8"
        />
      </div>

      <div
        role="tablist"
        aria-label="Vistas de hospitales"
        className="mt-5 inline-flex rounded-full border border-slate-200 bg-slate-100 p-1"
      >
        <TabButton active={tab === "hospitals"} onClick={() => setTab("hospitals")}>
          🏥 Hospitales
        </TabButton>
        <TabButton active={tab === "patients"} onClick={() => setTab("patients")}>
          🔎 Buscar paciente
        </TabButton>
      </div>

      {tab === "patients" ? (
        <PatientsSearchView
          query={patientQuery}
          onQueryChange={(value) => {
            setPatientQuery(value);
            setPatientLimit(PAGE_SIZE);
          }}
          results={patientResults}
          hasMore={patientHasMore}
          loading={patientLoading}
          error={patientError}
          onLoadMore={() => setPatientLimit((limit) => limit + PAGE_SIZE)}
        />
      ) : (
        <HospitalsListView
          search={search}
          setSearch={setSearch}
          stateFilter={stateFilter}
          setStateFilter={setStateFilter}
          zoneFilter={zoneFilter}
          setZoneFilter={setZoneFilter}
          states={states}
          loading={loading}
          error={error}
          visible={visible}
        />
      )}

      {showAddForm && (
        <HospitalForm
          onCancel={() => setShowAddForm(false)}
          onSubmit={handleAdd}
        />
      )}
    </section>
  );
}

interface HospitalsListViewProps {
  search: string;
  setSearch: (v: string) => void;
  stateFilter: string;
  setStateFilter: (v: string) => void;
  zoneFilter: HospitalPriorityZone | "all";
  setZoneFilter: (v: HospitalPriorityZone | "all") => void;
  states: string[];
  loading: boolean;
  error: string | null;
  visible: Hospital[];
}

function HospitalsListView({
  search,
  setSearch,
  stateFilter,
  setStateFilter,
  zoneFilter,
  setZoneFilter,
  states,
  loading,
  error,
  visible,
}: HospitalsListViewProps) {
  return (
    <>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, municipio o dirección…"
          className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 lg:max-w-md"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
          >
            <option value="">Todos los estados</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
            {ZONE_FILTERS.map((f) => {
              const active = zoneFilter === f.value;
              const color =
                f.value !== "all" ? PRIORITY_ZONE_META[f.value].color : "#0f172a";
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setZoneFilter(f.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  style={active ? { background: color } : undefined}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <p className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
            Cargando hospitales…
          </p>
        ) : error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            No se encontraron hospitales con esos filtros.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((h) => (
              <li key={h.id}>
                <HospitalCard hospital={h} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

interface PatientsSearchViewProps {
  query: string;
  onQueryChange: (value: string) => void;
  results: PatientSearchResult[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
}

function PatientsSearchView({
  query,
  onQueryChange,
  results,
  hasMore,
  loading,
  error,
  onLoadMore,
}: PatientsSearchViewProps) {
  const [selected, setSelected] = useState<PatientSearchResult | null>(null);
  const trimmed = query.trim();
  const empty = trimmed.length === 0;
  const tooShort = trimmed.length === 1;

  return (
    <div className="mt-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor="patient-search"
          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          Buscar paciente por nombre o cédula
        </label>
        <input
          id="patient-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Ej. Antonella, Yose Palma, 5.199.693…"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-red-400"
          autoComplete="off"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Busca en todos los hospitales. Para cédulas puedes escribir con o sin
          puntos.
        </p>
      </div>

      <div className="mt-4">
        {tooShort ? (
          <p className="text-center text-xs text-slate-500">
            Escribe al menos 2 caracteres.
          </p>
        ) : error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : loading && results.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Buscando…</p>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              {empty
                ? "Todavía no hay pacientes registrados."
                : `No se encontró ningún paciente con “${trimmed}”.`}
            </p>
            {!empty && (
              <p className="mt-1 text-xs text-slate-500">
                Verifica el nombre o intenta con la cédula.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500">
              {empty
                ? `Últimos ${results.length} pacientes registrados`
                : `${results.length} resultado${results.length === 1 ? "" : "s"}`}
            </p>
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.patient.id}>
                  <PatientResultCard
                    result={r}
                    onOpen={() => setSelected(r)}
                  />
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loading}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Cargando…" : "Mostrar 20 más"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <PatientDetailOverlay
          result={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PatientResultCard({
  result,
  onOpen,
}: {
  result: PatientSearchResult;
  onOpen: () => void;
}) {
  const { patient, hospital } = result;
  const condition = PATIENT_CONDITION_META[patient.condition];
  const status = PATIENT_STATUS_META[patient.status];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {patient.name}
            {patient.age !== null && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                {patient.age} años
              </span>
            )}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
              style={{ background: status.color }}
            >
              {status.label}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
              style={{ background: condition.color }}
            >
              {condition.label}
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold text-red-600">Ver detalles</span>
      </div>
      <p className="mt-2 truncate text-xs text-slate-600">
        🏥 <span className="font-medium text-slate-800">{hospital.name}</span>
        {hospital.state && (
          <span className="text-slate-500"> · {hospital.state}</span>
        )}
      </p>
      {patient.notes && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{patient.notes}</p>
      )}
    </button>
  );
}

function PatientDetailOverlay({
  result,
  onClose,
}: {
  result: PatientSearchResult;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { patient, hospital } = result;
  const condition = PATIENT_CONDITION_META[patient.condition];
  const status = PATIENT_STATUS_META[patient.status];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de paciente ${patient.name}`}
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Paciente registrado
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              {patient.name}
            </h3>
            {patient.age !== null && (
              <p className="mt-0.5 text-sm text-slate-500">
                {patient.age} años
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xl leading-none text-slate-600 transition hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
            style={{ background: status.color }}
          >
            {status.label}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
            style={{ background: condition.color }}
          >
            {condition.label}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <DetailRow label="Hospital" value={hospital.name} />
          <DetailRow
            label="Ubicación"
            value={[hospital.state, hospital.municipality]
              .filter(Boolean)
              .join(" · ")}
          />
          <DetailRow
            label="Registrado"
            value={new Date(patient.admittedAt).toLocaleString("es-VE")}
          />
          <DetailRow
            label="Actualizado"
            value={new Date(patient.updatedAt).toLocaleString("es-VE")}
          />
          {patient.contact && <DetailRow label="Contacto" value={patient.contact} />}
        </dl>

        {patient.notes && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notas
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {patient.notes}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Link
            href={`/hospitales/${hospital.id}#paciente-${patient.id}`}
            prefetch={false}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Abrir hospital
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function HospitalCard({ hospital }: { hospital: Hospital }) {
  const zone = PRIORITY_ZONE_META[hospital.priorityZone];
  const facility = FACILITY_TYPE_META[hospital.facilityType];

  return (
    <Link
      href={`/hospitales/${hospital.id}`}
      prefetch={false}
      className="group flex h-full w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      style={{ borderLeft: `4px solid ${zone.color}` }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ background: zone.color }}
        >
          {hospital.priorityZone}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
          {facility.emoji} {facility.label}
        </span>
        {hospital.level && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
            Nivel {hospital.level}
          </span>
        )}
      </div>

      <div>
        <p className="line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-red-700">
          {hospital.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          {hospital.state}
          {hospital.municipality && ` · ${hospital.municipality}`}
        </p>
      </div>

      {hospital.address && (
        <p className="line-clamp-2 text-xs text-slate-500">📍 {hospital.address}</p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="text-base">🛏️</span>
            <strong className="text-slate-900">{hospital.activePatients}</strong>
            hospitalizados
          </span>
        </div>
        <span className="text-xs font-semibold text-red-600 transition group-hover:translate-x-0.5">
          Ver →
        </span>
      </div>
    </Link>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="text-lg font-bold" style={{ color: accent }}>
        {value.toLocaleString("es-VE")}
      </p>
    </div>
  );
}
