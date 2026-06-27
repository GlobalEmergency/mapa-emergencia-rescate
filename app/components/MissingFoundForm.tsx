"use client";

import { useCallback, useRef, useState } from "react";
import { trackEvent } from "./openpanel";

export interface MissingFoundPayload {
  note: string;
  photo: string | null;
}

interface Props {
  personName: string;
  onCancel: () => void;
  onSubmit: (payload: MissingFoundPayload) => Promise<void>;
}

const MAX_DIM = 960;
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

export default function MissingFoundForm({
  personName,
  onCancel,
  onSubmit,
}: Props) {
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("La prueba debe ser una imagen.");
        return;
      }
      setError(null);
      setProcessing(true);
      try {
        setPhoto(await fileToResizedDataUrl(file));
      } catch {
        setError("No se pudo procesar la imagen. Intenta con otra.");
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
      if (!note.trim()) {
        setError(
          "Cuéntanos cómo te comunicaste con la persona o quién lo confirmó.",
        );
        return;
      }
      if (!photo) {
        setError("Adjunta una captura o foto como prueba del contacto.");
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit({ note: note.trim(), photo });
        trackEvent("missing_person_marked_found", {
          hasPhoto: true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar.");
        setSubmitting(false);
      }
    },
    [note, photo, onSubmit],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="found-title"
      onClick={onCancel}
      className="fixed inset-0 z-[2100] flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id="found-title" className="text-lg font-bold text-slate-900">
            ✓ Marcar como localizada
          </h3>
          <button
            type="button"
            onClick={onCancel}
            data-track="missing_found_close"
            aria-label="Cerrar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Antes de quitar a <strong>{personName}</strong> del listado,
          ayúdanos a confirmar el contacto con una breve explicación. Esto
          previene cierres falsos.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="found-note"
              className="block text-sm font-medium text-slate-700"
            >
              ¿Cómo te comunicaste o quién lo confirmó?{" "}
              <span className="text-red-600">*</span>
            </label>
            <textarea
              id="found-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={600}
              required
              placeholder="Ej: Hablé por teléfono con su hermana, está en el refugio de Chacao. O: lo vi en persona en el centro médico."
              className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label htmlFor="found-photo" className="block text-sm font-medium text-slate-700">
              Prueba: captura de pantalla o foto{" "}
              <span className="text-red-600">*</span>
            </label>
            <input
              id="found-photo"
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
              required
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
                  📎
                </div>
              )}
              <div className="flex flex-col items-start gap-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={processing}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {processing
                    ? "Procesando…"
                    : photo
                      ? "Cambiar"
                      : "Adjuntar captura"}
                </button>
                {photo && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="text-xs text-slate-500 hover:text-red-600"
                  >
                    Quitar
                  </button>
                )}
                <p className="text-[11px] text-slate-500">
                  Ej: pantallazo de WhatsApp, foto con la persona, etc.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

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
              disabled={submitting || processing || !photo}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
