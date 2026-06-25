"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildHospitalSlug,
  PATIENT_CONDITION_META,
  PATIENT_STATUS_META,
  type Hospital,
  type HospitalPatient,
} from "@/lib/hospitals-meta";
import HospitalPatientForm, { type PatientPayload } from "./HospitalPatientForm";
import { timeAgo } from "@/lib/format";

const ADMIN_STORAGE_KEY = "emergency:adminToken";
const POLL_MS = 30_000;

interface Props {
  hospital: Hospital;
  initialPatients: HospitalPatient[];
}

export default function HospitalDetailView({
  hospital: initialHospital,
  initialPatients,
}: Props) {
  const [hospital, setHospital] = useState<Hospital>(initialHospital);
  const [patients, setPatients] = useState<HospitalPatient[]>(initialPatients);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<HospitalPatient | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());
  const hospitalIdRef = useRef(initialHospital.id);

  useEffect(() => {
    setAdminToken(
      typeof window !== "undefined"
        ? sessionStorage.getItem(ADMIN_STORAGE_KEY)
        : null,
    );
  }, []);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(
        `/api/hospitals/${hospitalIdRef.current}/patients`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("No se pudieron cargar los pacientes.");
      const data = await res.json();
      setPatients(data.patients ?? []);
      if (data.hospital) setHospital(data.hospital);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar.");
    } finally {
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      load();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function handleSubmit(payload: PatientPayload) {
    const res = await fetch(`/api/hospitals/${hospital.id}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "No se pudo guardar el paciente.");
    }
    setShowForm(false);
    await load(true);
  }

  async function handleDelete(id: string) {
    if (!adminToken) return;
    if (!confirm("¿Eliminar este paciente?")) return;
    const res = await fetch(
      `/api/hospitals/${hospital.id}/patients/${id}`,
      {
        method: "DELETE",
        headers: { "x-admin-token": adminToken },
      },
    );
    if (res.ok) await load(true);
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q) ||
          p.contact.toLowerCase().includes(q),
      )
    : patients;
  const active = patients.filter((p) => p.status === "hospitalized").length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">
            Pacientes registrados
          </h2>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            {active} hospitalizados
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {refreshing ? "Actualizando…" : "🔄 Actualizar"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            + Paciente
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 px-5 py-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar paciente por nombre, nota o contacto…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
        />
      </div>

      <div className="px-5 py-4">
        {error && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <p className="text-2xl" aria-hidden>🏥</p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              {patients.length === 0
                ? "Todavía no hay pacientes registrados en este hospital."
                : "Sin resultados para la búsqueda."}
            </p>
            {patients.length === 0 && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-3 inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                + Registrar paciente
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => {
              const condition = PATIENT_CONDITION_META[p.condition];
              const status = PATIENT_STATUS_META[p.status];
              return (
                <li
                  key={p.id}
                  id={`paciente-${p.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPatient(p)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedPatient(p);
                    }
                  }}
                  className="cursor-pointer scroll-mt-24 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition target:border-red-400 target:bg-red-50 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {p.name}
                        {p.age !== null && (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {p.age} años
                          </span>
                        )}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Pill bg={status.color}>{status.label}</Pill>
                        <Pill bg={condition.color}>{condition.label}</Pill>
                      </div>
                    </div>
                    {adminToken && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(p.id);
                        }}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  {p.notes && (
                    <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                      {p.notes}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span>📅 Ingreso {timeAgo(p.admittedAt, now)}</span>
                    {p.contact && (
                      <span className="truncate">📞 {p.contact}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showForm && (
        <HospitalPatientForm
          hospitalName={hospital.name}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}

      {selectedPatient && (
        <PatientDetailOverlay
          hospital={hospital}
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
}

function PatientDetailOverlay({
  hospital,
  patient,
  onClose,
}: {
  hospital: Hospital;
  patient: HospitalPatient;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const condition = PATIENT_CONDITION_META[patient.condition];
  const status = PATIENT_STATUS_META[patient.status];
  const hospitalLocation = [hospital.state, hospital.municipality]
    .filter(Boolean)
    .join(" · ");
  const directionsHref = getDirectionsHref(hospital);
  const patientPath = `/hospitales/${buildHospitalSlug(hospital)}#paciente-${patient.id}`;

  const copyPatientLink = useCallback(async () => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://terremotovenezuela.app";
    const url = `${origin}${patientPath}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copia el enlace del paciente", url);
    }
  }, [patientPath]);

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
      className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
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
          <Pill bg={status.color}>{status.label}</Pill>
          <Pill bg={condition.color}>{condition.label}</Pill>
        </div>

        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <DetailRow label="Hospital" value={hospital.name} />
          <DetailRow label="Ubicación" value={hospitalLocation} />
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

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                Dirección del hospital
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-900">
                {hospital.address || hospitalLocation || hospital.name}
              </p>
              {hospital.address && hospitalLocation && (
                <p className="mt-1 text-xs text-slate-600">{hospitalLocation}</p>
              )}
            </div>
            <a
              href={directionsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Cómo llegar
            </a>
          </div>
        </div>

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
            href={patientPath}
            prefetch={false}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Abrir hospital
          </Link>
          <button
            type="button"
            onClick={copyPatientLink}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            aria-label={copied ? "Enlace copiado" : "Copiar enlace del paciente"}
            title={copied ? "Enlace copiado" : "Copiar enlace del paciente"}
          >
            <span aria-hidden>🔗</span>
            {copied ? "Copiado" : "Copiar link"}
          </button>
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

function getDirectionsHref(
  hospital: Pick<Hospital, "name" | "address" | "municipality" | "state">,
) {
  const query = [
    hospital.name,
    hospital.address,
    hospital.municipality,
    hospital.state,
    "Venezuela",
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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

function Pill({
  bg,
  children,
}: {
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
      style={{ background: bg }}
    >
      {children}
    </span>
  );
}
