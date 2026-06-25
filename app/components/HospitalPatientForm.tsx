"use client";

import { useState } from "react";
import { trackEvent } from "./openpanel";
import {
  PATIENT_CONDITION_META,
  PATIENT_STATUS_META,
  type PatientCondition,
  type PatientStatus,
} from "@/lib/hospitals-meta";

export interface PatientPayload {
  name: string;
  age: string;
  condition: PatientCondition;
  status: PatientStatus;
  notes: string;
  contact: string;
}

interface Props {
  hospitalName: string;
  onCancel: () => void;
  onSubmit: (payload: PatientPayload) => Promise<void>;
}

export default function HospitalPatientForm({
  hospitalName,
  onCancel,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [condition, setCondition] = useState<PatientCondition>("unknown");
  const [status, setStatus] = useState<PatientStatus>("hospitalized");
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Indica el nombre del paciente.");
    if (!consent) {
      setError(
        "Debes confirmar que un familiar autoriza compartir esta información.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        age: age.trim(),
        condition,
        status,
        notes: notes.trim(),
        contact: contact.trim(),
      });
      trackEvent("hospital_patient_created", {
        condition,
        status,
        hasAge: Boolean(age.trim()),
        hasNotes: Boolean(notes.trim()),
        hasContact: Boolean(contact.trim()),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ➕ Registrar paciente
            </h2>
            <p className="text-xs text-slate-500">{hospitalName}</p>
          </div>
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
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Field label="Nombre completo" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Ej. María Rodríguez"
                required
                maxLength={120}
              />
            </Field>
            <Field label="Edad">
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="input"
                placeholder="0-130"
                min={0}
                max={130}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Estado actual">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PatientStatus)}
                className="input"
              >
                {(Object.keys(PATIENT_STATUS_META) as PatientStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {PATIENT_STATUS_META[k].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Condición clínica">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as PatientCondition)}
                className="input"
              >
                {(Object.keys(PATIENT_CONDITION_META) as PatientCondition[]).map((k) => (
                  <option key={k} value={k}>
                    {PATIENT_CONDITION_META[k].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Contacto del familiar">
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="input"
              placeholder="Tel., WhatsApp o correo"
              maxLength={120}
            />
          </Field>

          <Field label="Notas (opcional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[80px] resize-y"
              placeholder="Ej. Ingresada el 25/06 por fractura. Sala 12."
              maxLength={600}
            />
          </Field>

          <label className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Confirmo que un familiar autoriza publicar este dato y entiendo que
              será visible públicamente para ayudar a otros a localizar a la persona.
            </span>
          </label>

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
            {submitting ? "Guardando…" : "Registrar paciente"}
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
