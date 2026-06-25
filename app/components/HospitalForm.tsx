"use client";

import { useState } from "react";
import { trackEvent } from "./openpanel";
import {
  FACILITY_TYPE_META,
  PRIORITY_ZONE_META,
  type HospitalFacilityType,
  type HospitalLevel,
  type HospitalPriorityZone,
} from "@/lib/hospitals-meta";

export interface HospitalPayload {
  name: string;
  facilityType: HospitalFacilityType;
  state: string;
  municipality: string;
  address: string;
  level: HospitalLevel;
  priorityZone: HospitalPriorityZone;
}

interface Props {
  onCancel: () => void;
  onSubmit: (payload: HospitalPayload) => Promise<void>;
  initialState?: string;
}

const LEVELS: { value: Exclude<HospitalLevel, null>; label: string }[] = [
  { value: "I", label: "Nivel I (básico)" },
  { value: "II", label: "Nivel II" },
  { value: "III", label: "Nivel III" },
  { value: "IV", label: "Nivel IV (referencia)" },
  { value: "militar", label: "Militar" },
];

export default function HospitalForm({ onCancel, onSubmit, initialState }: Props) {
  const [name, setName] = useState("");
  const [facilityType, setFacilityType] = useState<HospitalFacilityType>("hospital");
  const [state, setState] = useState(initialState ?? "");
  const [municipality, setMunicipality] = useState("");
  const [address, setAddress] = useState("");
  const [level, setLevel] = useState<HospitalLevel>(null);
  const [priorityZone, setPriorityZone] = useState<HospitalPriorityZone>("P3");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Indica el nombre del hospital.");
    if (!state.trim()) return setError("Indica el estado.");
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        facilityType,
        state: state.trim(),
        municipality: municipality.trim(),
        address: address.trim(),
        level,
        priorityZone,
      });
      trackEvent("hospital_created", {
        facilityType,
        state: state.trim(),
        hasMunicipality: Boolean(municipality.trim()),
        hasAddress: Boolean(address.trim()),
        level: level ?? "unknown",
        priorityZone,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-bold text-slate-900">
            🏥 Añadir hospital o centro de salud
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <Field label="Nombre" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hospital Dr. ..."
              className="input"
              required
              maxLength={200}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Estado" required>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Distrito Capital"
                className="input"
                required
                maxLength={120}
              />
            </Field>
            <Field label="Municipio">
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="Bolivariano Libertador"
                className="input"
                maxLength={120}
              />
            </Field>
          </div>

          <Field label="Dirección o referencia">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Av. ... Sector ..."
              className="input min-h-[64px] resize-y"
              maxLength={400}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo">
              <select
                value={facilityType}
                onChange={(e) => setFacilityType(e.target.value as HospitalFacilityType)}
                className="input"
              >
                {(Object.keys(FACILITY_TYPE_META) as HospitalFacilityType[]).map((k) => (
                  <option key={k} value={k}>
                    {FACILITY_TYPE_META[k].emoji} {FACILITY_TYPE_META[k].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nivel">
              <select
                value={level ?? ""}
                onChange={(e) => setLevel((e.target.value || null) as HospitalLevel)}
                className="input"
              >
                <option value="">Sin especificar</option>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Zona de prioridad">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(PRIORITY_ZONE_META) as HospitalPriorityZone[]).map((zone) => {
                const meta = PRIORITY_ZONE_META[zone];
                const active = priorityZone === zone;
                return (
                  <button
                    type="button"
                    key={zone}
                    onClick={() => setPriorityZone(zone)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: meta.color }}
                      aria-hidden
                    />
                    {zone} · {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? "Guardando…" : "Guardar hospital"}
          </button>
        </footer>
      </form>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(226 232 240);
          background-color: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: 2px solid transparent;
          outline-offset: 2px;
        }
        .input:focus {
          border-color: rgb(220 38 38);
          outline-color: rgba(220, 38, 38, 0.35);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}
