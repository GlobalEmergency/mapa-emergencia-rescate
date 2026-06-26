"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MissingFoundForm, {
  type MissingFoundPayload,
} from "./MissingFoundForm";
import ImageZoomLightbox from "./ImageZoomLightbox";

interface MissingPerson {
  id: string;
  name: string;
  age: number | null;
  description: string;
  lastSeen: string;
  contact: string;
  photoUrl: string | null;
  status?: "active" | "found";
  resolutionNote?: string | null;
  resolutionPhotoUrl?: string | null;
  resolvedAt?: number | null;
  createdAt: number;
}

function extractPhone(contact: string): string | null {
  const digits = contact.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 7 ? digits : null;
}

interface Props {
  person: MissingPerson;
  onClose: () => void;
  /** Lista para navegar entre fichas (anterior/siguiente). */
  people?: MissingPerson[];
  /** Actualiza la persona visible al usar flechas, teclado o gestos. */
  onNavigate?: (person: MissingPerson) => void;
  /** Llamado al confirmar el formulario "marcar como localizada". */
  onMarkFound?: (payload: MissingFoundPayload) => Promise<void>;
}

function shareUrl(_person: MissingPerson): string {
  if (typeof window === "undefined") return "https://terremotovenezuela.app/";
  return `${window.location.origin}/#desaparecidas`;
}

function shareText(person: MissingPerson): string {
  const parts = [
    `🚨 Buscamos a ${person.name}`,
    person.age !== null ? `${person.age} años.` : null,
    person.lastSeen ? `Visto por última vez en ${person.lastSeen}.` : null,
    "Si tienes información, ayuda a difundir 🙏",
  ].filter(Boolean);
  return parts.join(" ");
}

export default function MissingPersonDetail({
  person,
  onClose,
  people,
  onNavigate,
  onMarkFound,
}: Props) {
  const phone = extractPhone(person.contact);
  const [showFoundForm, setShowFoundForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const currentIndex =
    people?.findIndex((entry) => entry.id === person.id) ?? -1;
  const hasNav =
    Boolean(people && people.length > 1 && onNavigate && currentIndex >= 0);
  const hasPrev = hasNav && currentIndex > 0;
  const hasNext = hasNav && people != null && currentIndex < people.length - 1;

  const goPrev = useCallback(() => {
    if (!hasPrev || !people || !onNavigate) return;
    onNavigate(people[currentIndex - 1]);
  }, [currentIndex, hasPrev, onNavigate, people]);

  const goNext = useCallback(() => {
    if (!hasNext || !people || !onNavigate) return;
    onNavigate(people[currentIndex + 1]);
  }, [currentIndex, hasNext, onNavigate, people]);

  useEffect(() => {
    setShowFoundForm(false);
    setCopied(false);
    setShareError(null);
    setZoomOpen(false);
  }, [person.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showFoundForm) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [goNext, goPrev, onClose, showFoundForm]);

  const isFound = person.status === "found";

  const url = shareUrl(person);
  const text = shareText(person);

  const copyShare = useCallback(async () => {
    setShareError(null);
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError("No se pudo copiar al portapapeles.");
    }
  }, [text, url]);

  const nativeShare = useCallback(async () => {
    if (!navigator.share) {
      copyShare();
      return;
    }
    try {
      await navigator.share({ title: `Buscamos a ${person.name}`, text, url });
    } catch {
      /* el usuario canceló */
    }
  }, [copyShare, person.name, text, url]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || !hasNav) return;
      const endX = e.changedTouches[0]?.clientX;
      if (endX == null) return;
      const delta = endX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(delta) < 48) return;
      if (delta > 0) goPrev();
      else goNext();
    },
    [goNext, goPrev, hasNav],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="missing-detail-title"
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      {hasNav && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            disabled={!hasPrev}
            aria-label="Persona anterior"
            className="absolute left-2 top-1/2 z-[2001] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-lg text-slate-800 shadow-lg transition hover:bg-white disabled:opacity-30 sm:left-4 sm:h-12 sm:w-12 md:left-6"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            disabled={!hasNext}
            aria-label="Persona siguiente"
            className="absolute right-2 top-1/2 z-[2001] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-lg text-slate-800 shadow-lg transition hover:bg-white disabled:opacity-30 sm:right-4 sm:h-12 sm:w-12 md:right-6"
          >
            ›
          </button>
        </>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative z-[2001] max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        {hasNav && people && (
          <p
            className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
            aria-live="polite"
          >
            {currentIndex + 1} de {people.length}
          </p>
        )}
        <div className="relative">
          {person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photoUrl}
              alt={`Foto de ${person.name}`}
              className="max-h-[55vh] w-full cursor-zoom-in bg-slate-100 object-contain"
              onClick={() => setZoomOpen(true)}
            />
          ) : (
            <div className="grid h-64 w-full place-items-center bg-slate-100 text-6xl text-slate-300">
              🧍
            </div>
          )}
          {isFound && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
              ✓ Localizada
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-xl text-slate-700 shadow-sm hover:bg-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 p-5 sm:p-6">
          <div>
            <h3
              id="missing-detail-title"
              className="text-xl font-bold text-slate-900"
            >
              {person.name}
            </h3>
            {person.age !== null && (
              <p className="text-sm text-slate-500">{person.age} años</p>
            )}
          </div>

          {person.lastSeen && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Visto por última vez en
              </p>
              <p className="mt-0.5 text-sm text-slate-800">
                📍 {person.lastSeen}
              </p>
            </div>
          )}

          {person.description && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Descripción
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">
                {person.description}
              </p>
            </div>
          )}

          {person.contact && !isFound && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contacto para dar información
              </p>
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="mt-1 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                >
                  📞 Llamar a {person.contact}
                </a>
              ) : (
                <p className="mt-0.5 text-sm font-medium text-slate-800">
                  {person.contact}
                </p>
              )}
            </div>
          )}

          <p className="pt-2 text-[11px] text-slate-400">
            Reportada el {new Date(person.createdAt).toLocaleString("es-VE")}
          </p>

          {isFound ? (
            <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                ✓ Reportada como localizada
              </p>
              {person.resolvedAt && (
                <p className="text-xs text-emerald-800">
                  El {new Date(person.resolvedAt).toLocaleString("es-VE")}
                </p>
              )}
              {person.resolutionNote && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900">
                  {person.resolutionNote}
                </p>
              )}
              {person.resolutionPhotoUrl && (
                <a
                  href={person.resolutionPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={person.resolutionPhotoUrl}
                    alt="Prueba de contacto"
                    className="mt-2 max-h-48 w-full rounded-lg object-cover ring-1 ring-emerald-200"
                  />
                </a>
              )}
            </div>
          ) : (
            onMarkFound && (
              <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">
                  ¿Ya lograste comunicarte?
                </p>
                <p className="text-sm text-emerald-800">
                  Márcala como localizada y su familia podrá respirar tranquila.
                </p>
                <button
                  type="button"
                  onClick={() => setShowFoundForm(true)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  ✓ Marcar como localizada
                </button>
              </div>
            )
          )}

          {/* Compartir */}
          <div className="pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ayuda a difundir
            </p>
            {shareError && (
              <p className="mt-1 text-xs text-red-600">{shareError}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  text,
                )}&url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span
                  aria-hidden
                  className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white"
                >
                  𝕏
                </span>
                X
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  url,
                )}&quote=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span
                  aria-hidden
                  className="grid h-5 w-5 place-items-center rounded-full bg-[#1877F2] text-[11px] font-bold text-white"
                >
                  f
                </span>
                Facebook
              </a>
              <button
                type="button"
                onClick={nativeShare}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                title="Compartir en Instagram, WhatsApp u otras apps"
              >
                <span
                  aria-hidden
                  className="grid h-5 w-5 place-items-center rounded-full text-[12px]"
                  style={{
                    background:
                      "linear-gradient(45deg, #f09433, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888)",
                    color: "white",
                  }}
                >
                  ◎
                </span>
                Instagram
              </button>
              <button
                type="button"
                onClick={copyShare}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span aria-hidden>🔗</span> {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>

          {hasNav && (
            <div className="flex items-center gap-2 border-t border-slate-100 pt-4 sm:hidden">
              <button
                type="button"
                onClick={goPrev}
                disabled={!hasPrev}
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!hasNext}
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>

      {showFoundForm && onMarkFound && (
        <MissingFoundForm
          personName={person.name}
          onCancel={() => setShowFoundForm(false)}
          onSubmit={async (payload) => {
            await onMarkFound(payload);
            setShowFoundForm(false);
          }}
        />
      )}

      {person.photoUrl && (
        <ImageZoomLightbox
          src={person.photoUrl}
          alt={`Foto de ${person.name}`}
          isOpen={zoomOpen}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}
