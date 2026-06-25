"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import MissingPersonForm, {
  type MissingPersonPayload,
} from "./MissingPersonForm";
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

const POLL_INTERVAL_MS = 8000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 45_000;
const MAX_PREVIEW = 24;

export default function MissingPersonsCarousel() {
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const fetchPeople = useCallback(async () => {
    try {
      const res = await fetch("/api/missing", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPeople(data.people ?? []);
    } catch {
      // se reintentará en el próximo ciclo
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      fetchPeople();
      interval = setInterval(fetchPeople, network.pollIntervalMs);
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
  }, [fetchPeople, network.pollIntervalMs]);

  const updateArrows = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const { scrollLeft, scrollWidth, clientWidth } = node;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useLayoutEffect(() => {
    updateArrows();
    const node = scrollerRef.current;
    if (!node) return;
    const onScroll = () => updateArrows();
    node.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      node.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, people.length]);

  const scrollBy = useCallback((direction: 1 | -1) => {
    const node = scrollerRef.current;
    if (!node) return;
    const amount = Math.round(node.clientWidth * 0.85) * direction;
    node.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  const handleSubmit = useCallback(async (payload: MissingPersonPayload) => {
    const res = await fetch("/api/missing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.error ?? "No se pudo guardar el reporte. Intenta de nuevo.",
      );
    }
    setShowForm(false);
    if (data.person) {
      setPeople((prev) =>
        prev.some((p) => p.id === data.person.id)
          ? prev
          : [data.person, ...prev],
      );
    } else {
      fetchPeople();
    }
  }, [fetchPeople]);

  const preview = people.slice(0, MAX_PREVIEW);

  return (
    <section
      id="desaparecidas-preview"
      className="border-b border-slate-200 bg-gradient-to-b from-purple-50/60 to-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                🧍 Personas desaparecidas
              </h2>
              <span
                className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800"
                aria-label={`${people.length} personas reportadas`}
              >
                {people.length} reportada{people.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Ayúdanos a localizarlas. Si reconoces a alguien o tienes
              información, contacta a la persona indicada en la tarjeta.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <span aria-hidden>＋</span> Reportar desaparecida
            </button>
            <a
              href="#desaparecidas"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Ver lista completa →
            </a>
          </div>
        </div>

        <div className="relative mt-5">
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Desplazar a la izquierda"
              onClick={() => scrollBy(-1)}
              className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-md transition hover:bg-slate-50 sm:block"
            >
              ◀
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              aria-label="Desplazar a la derecha"
              onClick={() => scrollBy(1)}
              className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-md transition hover:bg-slate-50 sm:block"
            >
              ▶
            </button>
          )}

          <div
            ref={scrollerRef}
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:gap-4 [scrollbar-width:thin]"
            role="list"
          >
            {preview.length === 0 ? (
              <div
                className="flex w-[260px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-slate-500"
                role="listitem"
              >
                <span className="text-2xl">🙏</span>
                <p className="text-sm font-medium">
                  Aún no hay reportes
                </p>
                <p className="text-xs">
                  Sé el primero en compartir información para localizar a
                  alguien.
                </p>
              </div>
            ) : (
              preview.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelected(person)}
                  className="group flex w-[160px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-purple-300 hover:shadow-md sm:w-[180px]"
                  role="listitem"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                    {person.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.photoUrl}
                        alt={`Foto de ${person.name}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">
                        🧍
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-purple-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Se busca
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p
                      className="line-clamp-1 text-sm font-semibold text-slate-900"
                      title={person.name}
                    >
                      {person.name}
                    </p>
                    {person.age !== null && (
                      <p className="text-[11px] text-slate-500">
                        {person.age} años
                      </p>
                    )}
                    {person.lastSeen && (
                      <p
                        className="line-clamp-2 text-[11px] text-slate-600"
                        title={person.lastSeen}
                      >
                        📍 {person.lastSeen}
                      </p>
                    )}
                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-purple-700">
                      Ver detalles →
                    </span>
                  </div>
                </button>
              ))
            )}

            {people.length > MAX_PREVIEW && (
              <a
                href="#desaparecidas"
                className="flex w-[160px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center text-slate-700 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 sm:w-[180px]"
                role="listitem"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-purple-100 text-2xl text-purple-700">
                  →
                </span>
                <span className="text-sm font-semibold">
                  Ver {people.length - MAX_PREVIEW} más
                </span>
                <span className="text-[11px] text-slate-500">
                  Ir a la lista completa
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <MissingPersonForm
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}

      {selected && (
        <MissingPersonDetail
          person={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
