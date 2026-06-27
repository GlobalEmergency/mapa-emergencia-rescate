"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MissingPersonDetail from "./MissingPersonDetail";
import { useLowBandwidthMode } from "./useLowBandwidthMode";

interface MissingPerson {
  id: string;
  name: string;
  age: number | null;
  nationality?: string;
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

const POLL_INTERVAL_MS = 20_000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 48;

/** Ventana compacta de números de página alrededor de la página actual. */
function pageWindow(page: number, totalPages: number): number[] {
  const span = 2;
  const start = Math.max(1, Math.min(page - span, totalPages - span * 2));
  const end = Math.min(totalPages, Math.max(page + span, span * 2 + 1));
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FoundPersons() {
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );
  const requestIdRef = useRef(0);
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const initialPageRef = useRef(true);

  const fetchFound = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      const res = await fetch(
        `/api/missing?status=found&page=${page}&pageSize=${PAGE_SIZE}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      // Ignorar respuestas de solicitudes anteriores (carrera con polling).
      if (requestId !== requestIdRef.current) return;
      setPeople(data.people ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      // El servidor acota la página al rango válido.
      if (typeof data.page === "number" && data.page !== page) {
        setPage(data.page);
      }
    } catch {
      // se reintenta en el próximo ciclo
    }
  }, [page]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      fetchFound();
      interval = setInterval(fetchFound, network.pollIntervalMs);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchFound, network.pollIntervalMs]);

  // Al cambiar de página, hacemos scroll al inicio de la lista (no en la
  // carga inicial).
  useEffect(() => {
    if (initialPageRef.current) {
      initialPageRef.current = false;
      return;
    }
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  // El servidor ya ordena por fecha de localización (resolved_at) desc.
  if (total === 0) {
    return null;
  }

  const pages = pageWindow(page, totalPages);

  return (
    <div ref={listTopRef} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                <span aria-hidden>✨</span> Buenas noticias
              </span>
              <span
                className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white"
                aria-label={`${total} personas localizadas`}
              >
                {total} localizada{total === 1 ? "" : "s"}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
              💚 Personas localizadas a salvo
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Familias que volvieron a encontrarse gracias a la comunidad. Cada
              historia es un recordatorio de que vale la pena seguir buscando.
            </p>
          </div>
          <a
            href="#e-directory"
            className="shrink-0 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-end"
          >
            Ver personas en búsqueda →
          </a>
        </div>

        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => {
            const personMeta = [
              person.age !== null ? `${person.age} años` : null,
              person.nationality || null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
            <li
              key={person.id}
              className="relative overflow-hidden rounded-xl border border-emerald-200 transition hover:border-emerald-300 hover:shadow-sm"
            >
              <button
                type="button"
                onClick={() => setSelected(person)}
                aria-label={`Ver detalle de ${person.name}`}
                className="flex w-full gap-3 p-3 text-left transition active:bg-emerald-50/60"
              >
                {person.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={person.photoUrl}
                    alt={`Foto de ${person.name}`}
                    loading="lazy"
                    className="h-24 w-24 shrink-0 rounded-lg object-cover ring-1 ring-emerald-200"
                  />
                ) : (
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-emerald-50 text-3xl text-emerald-300">
                    💚
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    <span aria-hidden>✓</span> Localizada a salvo
                  </span>
                  <p className="mt-1 font-semibold text-slate-900">
                    {person.name}
                    {personMeta && (
                      <span className="font-normal text-slate-500">
                        {" "}
                        · {personMeta}
                      </span>
                    )}
                  </p>
                  {person.lastSeen && (
                    <p className="mt-0.5 text-xs text-slate-600">
                      📍 {person.lastSeen}
                    </p>
                  )}
                  {person.resolvedAt && (
                    <p className="mt-1 text-xs text-emerald-700">
                      <span aria-hidden>📅</span>{" "}
                      {formatDate(person.resolvedAt)}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">
                    Toca para ver más
                  </p>
                </div>
              </button>
            </li>
            );
          })}
        </ul>

        {totalPages > 1 && (
          <nav
            className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
            aria-label="Paginación de personas localizadas"
          >
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-40"
            >
              ← Anterior
            </button>
            {pages[0] > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  className="rounded-md border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  1
                </button>
                {pages[0] > 2 && (
                  <span className="px-1 text-slate-400">…</span>
                )}
              </>
            )}
            {pages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === page ? "page" : undefined}
                className={
                  p === page
                    ? "rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white"
                    : "rounded-md border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                }
              >
                {p}
              </button>
            ))}
            {pages[pages.length - 1] < totalPages && (
              <>
                {pages[pages.length - 1] < totalPages - 1 && (
                  <span className="px-1 text-slate-400">…</span>
                )}
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  className="rounded-md border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-40"
            >
              Siguiente →
            </button>
          </nav>
        )}
        <p className="mt-3 text-center text-[11px] text-slate-400">
          Página {page} de {totalPages}
        </p>
      </div>

      {selected && (
        <MissingPersonDetail
          person={selected}
          people={people}
          onNavigate={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
