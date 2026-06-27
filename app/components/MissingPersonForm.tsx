"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "./openpanel";

export type MissingReportType = "missing" | "found";
type FoundPlace = "hospital" | "street";
type PersonStatus = "safe" | "deceased";

export interface MissingPersonPayload {
  name: string;
  age: string;
  lastSeen: string;
  description: string;
  contact: string;
  photo: string | null;
  reportType: MissingReportType;
}

interface Props {
  onCancel: () => void;
  onSubmit: (payload: MissingPersonPayload) => Promise<void>;
}

const MAX_DIM = 800;
const JPEG_QUALITY = 0.62;

async function fileToResizedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width >= height && width > MAX_DIM) {
    height = Math.round((height * MAX_DIM) / width);
    width = MAX_DIM;
  } else if (height > MAX_DIM) {
    width = Math.round((width * MAX_DIM) / height);
    height = MAX_DIM;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function formatLastSeen(
  location: string,
  lastContactAt: string,
  reportType: MissingReportType,
  foundPlace?: FoundPlace,
): string {
  const loc = location.trim();
  let base = loc;
  if (reportType === "found" && foundPlace) {
    const prefix =
      foundPlace === "hospital" ? "En un hospital" : "En la calle";
    base = loc ? `${prefix}: ${loc}` : prefix;
  }
  if (!lastContactAt.trim()) return base;
  const d = new Date(lastContactAt);
  if (Number.isNaN(d.getTime())) return base;
  const when = d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const suffix =
    reportType === "found"
      ? `Encontrada el ${when}`
      : `Sin contacto desde ${when}`;
  return base ? `${base} · ${suffix}` : suffix;
}

function buildDescription(
  description: string,
  reportType: MissingReportType,
  personStatus?: PersonStatus,
): string {
  const text = description.trim();
  if (reportType !== "found" || !personStatus) return text;
  const statusLabel =
    personStatus === "safe" ? "Estado: A salvo." : "Estado: Fallecida.";
  return text ? `${statusLabel} ${text}` : statusLabel;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" />
      <path d="M4 20h16" strokeLinecap="round" />
    </svg>
  );
}

function HospitalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M3 21h18M5 21V7l7-4 7 4v14" strokeLinejoin="round" />
      <path d="M12 11v4M10 13h4" strokeLinecap="round" />
    </svg>
  );
}

function StreetIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M3 9l9-6 9 6v11H3V9z" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" strokeLinejoin="round" />
    </svg>
  );
}

export default function MissingPersonForm({ onCancel, onSubmit }: Props) {
  const [mounted, setMounted] = useState(false);
  const [reportType, setReportType] = useState<MissingReportType>("missing");
  const [foundPlace, setFoundPlace] = useState<FoundPlace | null>(null);
  const [personStatus, setPersonStatus] = useState<PersonStatus | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [lastContactAt, setLastContactAt] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMissing = reportType === "missing";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Selecciona un archivo JPG o PNG.");
        return;
      }
      setError(null);
      setProcessing(true);
      try {
        setPhoto(await fileToResizedDataUrl(file));
      } catch {
        setError("No se pudo procesar la imagen. Intenta con otra foto.");
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      if (!name.trim()) {
        setError("Indica el nombre de la persona.");
        return;
      }
      if (isMissing && !location.trim()) {
        setError("Indica la última ubicación vista.");
        return;
      }
      if (!isMissing) {
        if (!foundPlace) {
          setError("Indica dónde fue encontrada.");
          return;
        }
        if (!location.trim()) {
          setError("Indica el hospital o la zona donde la viste.");
          return;
        }
        if (!personStatus) {
          setError("Indica cuál es su estado actual.");
          return;
        }
      }
      if (!consent) {
        setError(
          "Debes confirmar que un familiar autoriza publicar estos datos.",
        );
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit({
          name: name.trim(),
          age: age.trim(),
          lastSeen: formatLastSeen(
            location,
            lastContactAt,
            reportType,
            foundPlace ?? undefined,
          ),
          description: buildDescription(
            description,
            reportType,
            personStatus ?? undefined,
          ),
          contact: contact.trim(),
          photo,
          reportType,
        });
        trackEvent("missing_person_created", {
          reportType,
          foundPlace: foundPlace ?? undefined,
          personStatus: personStatus ?? undefined,
          hasAge: Boolean(age.trim()),
          hasLastSeen: Boolean(location.trim()),
          hasLastContactAt: Boolean(lastContactAt.trim()),
          hasDescription: Boolean(description.trim()),
          hasContact: Boolean(contact.trim()),
          hasPhoto: Boolean(photo),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar.");
        setSubmitting(false);
      }
    },
    [
      name,
      age,
      location,
      lastContactAt,
      description,
      contact,
      photo,
      consent,
      reportType,
      isMissing,
      foundPlace,
      personStatus,
      onSubmit,
    ],
  );

  if (!mounted) return null;

  return createPortal(
    <div
      className="e-report-modal-backdrop fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-black/55 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="e-report-modal w-full max-w-[560px] max-h-[calc(100vh-3rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="e-report-modal__header flex items-start justify-between gap-4 border-b border-[var(--eborder)] px-6 pb-4 pt-5">
          <div>
            <h2
              id="report-modal-title"
              className="e-report-modal__title text-lg font-extrabold text-[var(--etext)]"
            >
              Reportar persona desaparecida o encontrada
            </h2>
            <p className="e-report-modal__subtitle mt-1.5 text-[13px] leading-snug text-[var(--etext2)]">
              Comparte los datos para que alguien pueda ayudar a ubicarla o
              reunirla con su familia.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            data-track="missing_form_close"
            aria-label="Cerrar"
            className="e-report-modal__close grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--eborder)] bg-[var(--esurf2)] text-[var(--etext2)] hover:bg-[var(--einput)]"
          >
            ×
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="e-report-modal__form flex flex-col gap-4 px-6 py-5"
        >
          <fieldset className="e-report-modal__type border-0 p-0">
            <legend className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
              ¿Qué quieres reportar? <span className="text-red-600">*</span>
            </legend>
            <div className="e-report-modal__type-grid grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setReportType("missing")}
                aria-pressed={isMissing}
                className={`e-report-modal__type-btn flex flex-col items-start gap-1 rounded-xl border-[1.5px] p-3.5 text-left transition ${
                  isMissing
                    ? "is-active border-[#c41a1a] bg-[#c41a1a] text-white"
                    : "border-[var(--eborder)] bg-white text-[var(--etext)] hover:border-[var(--etext3)]"
                }`}
              >
                <SearchIcon className="e-report-modal__type-icon h-5 w-5" />
                <span className="text-sm font-extrabold">
                  Persona desaparecida
                </span>
                <span
                  className={`text-xs ${isMissing ? "text-white/85" : "text-[var(--etext2)]"}`}
                >
                  No sé dónde está
                </span>
              </button>
              <button
                type="button"
                onClick={() => setReportType("found")}
                aria-pressed={!isMissing}
                className={`e-report-modal__type-btn flex flex-col items-start gap-1 rounded-xl border-[1.5px] p-3.5 text-left transition ${
                  !isMissing
                    ? "is-active is-found border-[#2b51f0] bg-[#2b51f0] text-white"
                    : "border-[var(--eborder)] bg-white text-[var(--etext)] hover:border-[var(--etext3)]"
                }`}
              >
                <PinIcon className="e-report-modal__type-icon h-5 w-5" />
                <span className="text-sm font-extrabold">
                  Persona encontrada
                </span>
                <span
                  className={`text-xs ${!isMissing ? "text-white/85" : "text-[var(--etext2)]"}`}
                >
                  Sé dónde está o la vi
                </span>
              </button>
            </div>
          </fieldset>

          <div>
            <span className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
              Foto de la persona
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="e-report-modal__upload flex w-full items-center gap-3.5 rounded-xl border-[1.5px] border-dashed border-[var(--eborder)] bg-[var(--esurf2)] p-4 text-left disabled:opacity-60"
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt="Vista previa"
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-[#c41a1a]">
                  <UploadIcon className="h-5 w-5" />
                </span>
              )}
              <span className="flex flex-col gap-0.5">
                <strong className="text-sm font-bold text-[var(--etext)]">
                  {processing
                    ? "Procesando…"
                    : photo
                      ? "Cambiar foto"
                      : "Cargar una foto"}
                </strong>
                <span className="text-xs text-[var(--etext2)]">
                  JPG o PNG · opcional pero muy útil
                </span>
              </span>
            </button>
          </div>

          <div className="e-report-modal__grid grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="report-name" className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
                Nombre y apellido <span className="text-red-600">*</span>
              </label>
              <input
                id="report-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                placeholder="Ej. María Fernanda Rangel"
                className="e-input"
              />
            </div>
            <div>
              <label htmlFor="report-age" className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
                Edad
              </label>
              <input
                id="report-age"
                type="number"
                inputMode="numeric"
                min={0}
                max={130}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Años"
                className="e-input"
              />
            </div>
          </div>

          {isMissing ? (
            <div className="e-report-modal__grid grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="report-location" className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
                  Última ubicación vista{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  id="report-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={200}
                  required
                  placeholder="Ej. Catia La Mar, La Guaira"
                  className="e-input"
                />
              </div>
              <div>
                <label htmlFor="report-when" className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
                  Desde cuándo sin contacto
                </label>
                <input
                  id="report-when"
                  type="datetime-local"
                  value={lastContactAt}
                  onChange={(e) => setLastContactAt(e.target.value)}
                  className="e-input"
                />
              </div>
            </div>
          ) : (
            <>
              <fieldset className="border-0 p-0">
                <legend className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
                  ¿Dónde fue encontrada?{" "}
                  <span className="text-red-600">*</span>
                </legend>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFoundPlace("hospital")}
                    aria-pressed={foundPlace === "hospital"}
                    className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-left text-sm font-semibold transition ${
                      foundPlace === "hospital"
                        ? "border-[#2b51f0] bg-[#eef3ff] text-[#2b51f0]"
                        : "border-[var(--eborder)] bg-white text-[var(--etext)]"
                    }`}
                  >
                    <HospitalIcon className="h-4 w-4 shrink-0" />
                    En un hospital
                  </button>
                  <button
                    type="button"
                    onClick={() => setFoundPlace("street")}
                    aria-pressed={foundPlace === "street"}
                    className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-left text-sm font-semibold transition ${
                      foundPlace === "street"
                        ? "border-[#2b51f0] bg-[#eef3ff] text-[#2b51f0]"
                        : "border-[var(--eborder)] bg-white text-[var(--etext)]"
                    }`}
                  >
                    <StreetIcon className="h-4 w-4 shrink-0" />
                    En la calle
                  </button>
                </div>
              </fieldset>

              <div>
                <label htmlFor="report-found-location" className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
                  {foundPlace === "hospital"
                    ? "Nombre del hospital o clínica"
                    : "Zona o referencia"}{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  id="report-found-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={200}
                  placeholder={
                    foundPlace === "hospital"
                      ? "Ej. Hospital JM de los Ríos"
                      : "Ej. Catia La Mar, cerca de…"
                  }
                  className="e-input"
                />
              </div>

              <div>
                <label htmlFor="report-found-when" className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
                  Cuándo fue encontrada
                </label>
                <input
                  id="report-found-when"
                  type="datetime-local"
                  value={lastContactAt}
                  onChange={(e) => setLastContactAt(e.target.value)}
                  className="e-input"
                />
              </div>

              <fieldset className="border-0 p-0">
                <legend className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
                  ¿Cuál es su estado actual?{" "}
                  <span className="text-red-600">*</span>
                </legend>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPersonStatus("safe")}
                    aria-pressed={personStatus === "safe"}
                    className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-left text-sm font-semibold transition ${
                      personStatus === "safe"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-[var(--eborder)] bg-white text-[var(--etext)]"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    A salvo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonStatus("deceased")}
                    aria-pressed={personStatus === "deceased"}
                    className={`flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-left text-sm font-semibold transition ${
                      personStatus === "deceased"
                        ? "border-red-300 bg-red-50 text-red-800"
                        : "border-[var(--eborder)] bg-white text-[var(--etext)]"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    Fallecida
                  </button>
                </div>
              </fieldset>
            </>
          )}

          <div>
            <label htmlFor="report-desc" className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
              Descripción y señas particulares
            </label>
            <textarea
              id="report-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={600}
              rows={4}
              placeholder="Estatura, contextura, ropa que vestía, cicatrices, lentes, condición médica…"
              className="e-input resize-none"
            />
          </div>

          <div className="e-report-modal__contact rounded-xl bg-[#eef2f7] p-4">
            <label htmlFor="report-contact" className="e-report-modal__label mb-1.5 block text-[13px] font-bold text-[var(--etext)]">
              ¿Cómo te contactan si alguien la reconoce?
            </label>
            <input
              id="report-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={120}
              placeholder="Tu nombre y un teléfono o correo"
              className="e-input bg-white"
            />
          </div>

          <div className="e-report-modal__warning rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
            <p className="e-report-modal__warning-title mb-3 flex items-center gap-1.5 font-extrabold text-amber-700">
              <span aria-hidden>⚠</span> Antes de publicar
            </p>
            <label className="e-report-modal__consent flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 accent-red-600"
              />
              <span>
                Confirmo que un familiar o allegado autoriza publicar estos
                datos para ayudar a localizar a la persona.
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <footer className="e-report-modal__footer flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="e-btn e-btn-secondary min-h-0 px-5 py-2.5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || processing || !consent}
              className="e-report-modal__submit inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-slate-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {submitting ? "Publicando…" : "Publicar reporte"}
              {!submitting && <span aria-hidden>→</span>}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
