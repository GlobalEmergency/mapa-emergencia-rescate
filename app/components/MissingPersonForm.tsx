"use client";

import { useCallback, useRef, useState } from "react";
import { trackEvent } from "./openpanel";

export interface MissingPersonPayload {
  name: string;
  age: string;
  lastSeen: string;
  description: string;
  contact: string;
  photo: string | null;
}

interface Props {
  onCancel: () => void;
  onSubmit: (payload: MissingPersonPayload) => Promise<void>;
}

const MAX_DIM = 800;
const JPEG_QUALITY = 0.62;

/**
 * Redimensiona una imagen del usuario a un tamaño razonable y la convierte en
 * un data URL JPEG para reducir el peso antes de guardarla.
 */
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

export default function MissingPersonForm({ onCancel, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [lastSeen, setLastSeen] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Selecciona un archivo de imagen.");
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
          lastSeen: lastSeen.trim(),
          description: description.trim(),
          contact: contact.trim(),
          photo,
        });
        trackEvent("missing_person_created", {
          hasAge: Boolean(age.trim()),
          hasLastSeen: Boolean(lastSeen.trim()),
          hasDescription: Boolean(description.trim()),
          hasContact: Boolean(contact.trim()),
          hasPhoto: Boolean(photo),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar.");
        setSubmitting(false);
      }
    },
    [name, age, lastSeen, description, contact, photo, consent, onSubmit],
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">
            🧍 Reportar persona desaparecida
          </h3>
          <button
            type="button"
            onClick={onCancel}
            data-track="missing_form_close"
            aria-label="Cerrar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Comparte los datos para que un vecino o persona allegada pueda
          ayudar a ubicarla.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Nombre y apellido <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              placeholder="Ej: María Pérez"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Edad (aprox.)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={130}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Ej: 34"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Visto por última vez en
              </label>
              <input
                type="text"
                value={lastSeen}
                onChange={(e) => setLastSeen(e.target.value)}
                maxLength={200}
                placeholder="Ej: Chacao, cerca de…"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Descripción (vestimenta, señas, contexto)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={600}
              rows={3}
              placeholder="Estatura, contextura, ropa que vestía, características distintivas…"
              className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Contacto para dar información
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={120}
              placeholder="Ej: Familiar Juan · 0414-1234567"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Foto de la persona
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
            <div className="mt-1 flex items-center gap-3">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt="Vista previa"
                  className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-lg bg-slate-100 text-2xl text-slate-400">
                  🧍
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {processing
                  ? "Procesando…"
                  : photo
                    ? "Cambiar foto"
                    : "Subir foto"}
              </button>
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="text-sm text-slate-500 hover:text-red-600"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">⚠️ Antes de publicar</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>
                Estos datos serán públicos: pueden ser vistos por cualquier
                persona en internet.
              </li>
              <li>
                No publiques datos sensibles innecesarios (cédula, dirección
                exacta de vivienda).
              </li>
              <li>
                Si la persona aparece, avísanos para que retiremos el reporte.
              </li>
            </ul>
            <label className="mt-3 flex items-start gap-2">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-red-600"
              />
              <span>
                Confirmo que un familiar o allegado autoriza publicar estos
                datos para ayudar a localizar a la persona, y acepto la{" "}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  política de privacidad
                </a>
                .
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || processing}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? "Publicando…" : "Publicar reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
