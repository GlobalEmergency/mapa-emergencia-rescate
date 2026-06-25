"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MissingPersonDetail from "./MissingPersonDetail";
import { useLowBandwidthMode } from "./useLowBandwidthMode";

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

const POLL_INTERVAL_MS = 20_000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 60_000;

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
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );

  const fetchFound = useCallback(async () => {
    try {
      const res = await fetch("/api/missing?status=found", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setPeople(data.people ?? []);
    } catch {
      // se reintenta en el próximo ciclo
    }
  }, []);

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

  const sorted = useMemo(() => {
    // Más recientes primero según cuándo fueron localizadas.
    return [...people].sort(
      (a, b) => (b.resolvedAt ?? b.createdAt) - (a.resolvedAt ?? a.createdAt),
    );
  }, [people]);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <section
      id="localizados"
      className="border-y border-emerald-200/60 bg-gradient-to-b from-emerald-50/60 via-white to-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                <span aria-hidden>✨</span> Buenas noticias
              </span>
              <span
                className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white"
                aria-label={`${sorted.length} personas localizadas`}
              >
                {sorted.length} localizada{sorted.length === 1 ? "" : "s"}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
              💚 Personas localizadas a salvo
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Familias que volvieron a encontrarse gracias a la comunidad.
              Cada historia es un recordatorio de que vale la pena seguir
              buscando.
            </p>
          </div>
          <a
            href="#desaparecidas"
            className="shrink-0 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-end"
          >
            Ver personas en búsqueda →
          </a>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => setSelected(person)}
                className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-emerald-50">
                  {person.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={person.photoUrl}
                      alt={`Foto de ${person.name}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl text-emerald-300">
                      💚
                    </div>
                  )}
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
                    <span aria-hidden>✓</span> Localizado a salvo
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <p
                    className="line-clamp-2 text-base font-semibold leading-snug text-slate-900"
                    title={person.name}
                  >
                    {person.name}
                  </p>
                  {person.age !== null && (
                    <p className="text-xs text-slate-500">{person.age} años</p>
                  )}
                  {person.lastSeen && (
                    <p
                      className="line-clamp-2 text-xs text-slate-600"
                      title={person.lastSeen}
                    >
                      <span aria-hidden>📍</span> {person.lastSeen}
                    </p>
                  )}
                  {person.resolvedAt && (
                    <p className="mt-auto text-xs text-emerald-700">
                      <span aria-hidden>📅</span>{" "}
                      {formatDate(person.resolvedAt)}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <MissingPersonDetail
          person={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
