"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import MissingPersonForm, {
  type MissingPersonPayload,
} from "./MissingPersonForm";
import MissingPersonDetail from "./MissingPersonDetail";
import { useLowBandwidthMode } from "./useLowBandwidthMode";
import {
  buildHospitalSlug,
  PRIORITY_ZONE_META,
  type Hospital,
} from "@/lib/hospitals-meta";

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

type DirectoryTab = "personas" | "hospitales";

const POLL_INTERVAL_MS = 8000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 45_000;
const MAX_PREVIEW = 24;
const GRID_PAGE_SIZE = 16;
const MIN_SEARCH_LEN = 3;

function pageWindow(page: number, totalPages: number): number[] {
  const span = 2;
  const start = Math.max(1, Math.min(page - span, totalPages - span * 2));
  const end = Math.min(totalPages, Math.max(page + span, span * 2 + 1));
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

function tabFromHash(hash: string): DirectoryTab | null {
  const id = hash.replace("#", "");
  if (id === "hospitales") return "hospitales";
  if (
    id === "personas" ||
    id === "desaparecidas" ||
    id === "desaparecidas-preview" ||
    id === "e-directory"
  ) {
    return "personas";
  }
  return null;
}

function hashForTab(tab: DirectoryTab): string {
  return tab === "hospitales" ? "#hospitales" : "#desaparecidas-preview";
}

function useHorizontalScroll(itemCount: number) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
  }, [updateArrows, itemCount]);

  const scrollBy = useCallback((direction: 1 | -1) => {
    const node = scrollerRef.current;
    if (!node) return;
    const amount = Math.round(node.clientWidth * 0.85) * direction;
    node.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  return { scrollerRef, canScrollLeft, canScrollRight, scrollBy };
}

function HorizontalScrollRow({
  itemCount,
  children,
}: {
  itemCount: number;
  children: ReactNode;
}) {
  const { scrollerRef, canScrollLeft, canScrollRight, scrollBy } =
    useHorizontalScroll(itemCount);

  return (
    <div className="relative mt-5">
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Desplazar a la izquierda"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-[var(--eborder)] bg-[var(--esurf)] p-2 text-[var(--etext)] shadow-md transition hover:bg-[var(--einput)] sm:block"
        >
          ◀
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          aria-label="Desplazar a la derecha"
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-[var(--eborder)] bg-[var(--esurf)] p-2 text-[var(--etext)] shadow-md transition hover:bg-[var(--einput)] sm:block"
        >
          ▶
        </button>
      )}

      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:gap-4 [scrollbar-width:thin]"
        role="list"
      >
        {children}
      </div>
    </div>
  );
}

export default function MissingPersonsCarousel() {
  const [activeTab, setActiveTab] = useState<DirectoryTab>("personas");

  const selectTab = useCallback((tab: DirectoryTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", hashForTab(tab));
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const next = tabFromHash(window.location.hash);
      if (next) setActiveTab(next);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <section
      id="e-directory"
      className="relative scroll-mt-20 border-b border-[var(--eborder)] bg-[var(--ebg)]"
    >
      <span
        id="hospitales"
        className="pointer-events-none absolute -top-24"
        aria-hidden
      />
      <span
        id="desaparecidas-preview"
        className="pointer-events-none absolute -top-24"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10">
        <div
          role="tablist"
          aria-label="Directorio de personas y hospitales"
          className="-mx-4 mb-7 flex border-b-2 border-[var(--eborder)] px-4 sm:mx-0 sm:px-0"
        >
          <button
            type="button"
            role="tab"
            id="tab-personas"
            aria-selected={activeTab === "personas"}
            aria-controls="panel-personas"
            data-active={activeTab === "personas"}
            onClick={() => selectTab("personas")}
            className="e-tab-label flex flex-1 items-center justify-center sm:flex-none"
          >
            Personas
          </button>
          <button
            type="button"
            role="tab"
            id="tab-hospitales"
            aria-selected={activeTab === "hospitales"}
            aria-controls="panel-hospitales"
            data-active={activeTab === "hospitales"}
            onClick={() => selectTab("hospitales")}
            className="e-tab-label flex flex-1 items-center justify-center sm:flex-none"
          >
            Hospitales
          </button>
        </div>

        {activeTab === "personas" ? (
          <div
            role="tabpanel"
            id="panel-personas"
            aria-labelledby="tab-personas"
          >
            <PersonasPreview />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="panel-hospitales"
            aria-labelledby="tab-hospitales"
          >
            <HospitalesPreview />
          </div>
        )}
      </div>
    </section>
  );
}

function PersonasPreview() {
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [foundTotal, setFoundTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const skipScrollRef = useRef(true);
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchPeople = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        status: "active",
        page: String(page),
        pageSize: String(GRID_PAGE_SIZE),
      });
      if (debouncedQuery.trim().length >= MIN_SEARCH_LEN) {
        params.set("q", debouncedQuery.trim());
      }
      const res = await fetch(`/api/missing?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPeople(data.people ?? []);
      setTotal(data.total ?? (data.people?.length ?? 0));
      setTotalPages(data.totalPages ?? 1);
      if (typeof data.page === "number" && data.page !== page) {
        setPage(data.page);
      }
    } catch {
      // se reintentará en el próximo ciclo
    }
  }, [debouncedQuery, page]);

  const fetchFoundTotal = useCallback(async () => {
    try {
      const res = await fetch("/api/missing?status=found&pageSize=1", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setFoundTotal(data.total ?? 0);
    } catch {
      // se reintenta en el próximo ciclo
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      fetchPeople();
      fetchFoundTotal();
      interval = setInterval(() => {
        fetchPeople();
        fetchFoundTotal();
      }, network.pollIntervalMs);
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
  }, [fetchFoundTotal, fetchPeople, network.pollIntervalMs]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [page]);

  const handleSubmit = useCallback(
    async (payload: MissingPersonPayload) => {
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
      setPage(1);
      if (data.person?.status === "found") {
        fetchPeople();
      } else if (data.person) {
        setPeople((prev) =>
          prev.some((p) => p.id === data.person.id)
            ? prev
            : [data.person, ...prev].slice(0, GRID_PAGE_SIZE),
        );
        setTotal((t) => t + 1);
      } else {
        fetchPeople();
      }
    },
    [fetchPeople],
  );

  const handleMarkFound = useCallback(
    async (id: string, payload: { note: string; photo: string | null }) => {
      const res = await fetch(`/api/missing/${id}/found`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo marcar como localizada.");
      }
      setPeople((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setFoundTotal((t) => t + 1);
      setSelected(null);
      fetchPeople();
    },
    [fetchPeople],
  );

  const isSearching = debouncedQuery.trim().length >= MIN_SEARCH_LEN;
  const queryTooShort =
    debouncedQuery.trim().length > 0 &&
    debouncedQuery.trim().length < MIN_SEARCH_LEN;
  const pages = useMemo(
    () => pageWindow(page, totalPages),
    [page, totalPages],
  );

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="qi-h2">Personas</h2>
            <span
              className="e-pill bg-red-50 text-red-700"
              aria-label={`${total} personas reportadas`}
            >
              {total.toLocaleString("es-VE")} reportadas
            </span>
          </div>

          <div className="e-person-stats">
            <span className="e-person-stats__item">
              <span
                className="e-person-stats__dot e-person-stats__dot--missing"
                aria-hidden
              />
              {total.toLocaleString("es-VE")} desaparecidos
            </span>
            <span className="e-person-stats__item">
              <span
                className="e-person-stats__dot e-person-stats__dot--found"
                aria-hidden
              />
              {foundTotal.toLocaleString("es-VE")} encontrados
            </span>
            <span className="e-person-stats__item">
              <span
                className="e-person-stats__dot e-person-stats__dot--safe"
                aria-hidden
              />
              {foundTotal.toLocaleString("es-VE")} a salvo
            </span>
          </div>

          <p className="mt-2 max-w-2xl text-sm text-[var(--etext2)]">
            Si reconoces a alguien, contacta a quien la reportó.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="e-btn e-btn-primary shrink-0 self-start px-5 py-2.5"
        >
          <span aria-hidden>＋</span> Quiero reportar
        </button>
      </div>

      <div className="e-person-search">
        <label className="sr-only" htmlFor="personas-directory-search">
          Buscar personas
        </label>
        <input
          id="personas-directory-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Buscar por nombre, zona o descripción…"
          className="e-input w-full"
        />
        {queryTooShort && (
          <p className="mt-1.5 text-xs text-[var(--etext2)]">
            Escribe al menos {MIN_SEARCH_LEN} letras para buscar.
          </p>
        )}
      </div>

      <div ref={gridRef} className="e-person-grid" role="list">
        {people.length === 0 ? (
          <div
            className="e-card col-span-full flex flex-col items-center justify-center gap-1 border-dashed p-8 text-center text-[var(--etext2)]"
            role="listitem"
          >
            <span className="text-2xl">🙏</span>
            <p className="text-sm font-medium">
              {isSearching
                ? "No encontramos coincidencias"
                : "Aún no hay reportes"}
            </p>
            <p className="text-xs">
              {isSearching
                ? "Prueba con otro nombre o zona."
                : "Sé el primero en compartir información para localizar a alguien."}
            </p>
          </div>
        ) : (
          people.map((person) => (
            <MissingPersonCard
              key={person.id}
              person={person}
              onOpen={() => setSelected(person)}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <nav
          className="mt-5 flex flex-wrap items-center justify-center gap-1.5"
          aria-label="Paginación del directorio de personas"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="e-btn e-btn-secondary min-h-0 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ← Anterior
          </button>
          {pages[0] > 1 && (
            <>
              <button
                type="button"
                onClick={() => setPage(1)}
                className="e-btn e-btn-secondary min-h-0 px-3 py-1.5 text-sm"
              >
                1
              </button>
              {pages[0] > 2 && (
                <span className="px-1 text-[var(--etext3)]">…</span>
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
                  ? "e-btn e-btn-primary min-h-0 px-3 py-1.5 text-sm"
                  : "e-btn e-btn-secondary min-h-0 px-3 py-1.5 text-sm"
              }
            >
              {p}
            </button>
          ))}
          {pages[pages.length - 1] < totalPages && (
            <>
              {pages[pages.length - 1] < totalPages - 1 && (
                <span className="px-1 text-[var(--etext3)]">…</span>
              )}
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                className="e-btn e-btn-secondary min-h-0 px-3 py-1.5 text-sm"
              >
                {totalPages.toLocaleString("es-VE")}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="e-btn e-btn-secondary min-h-0 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Siguiente →
          </button>
        </nav>
      )}
      {totalPages > 1 && (
        <p className="mt-2 text-center text-[11px] text-[var(--etext3)]">
          Página {page.toLocaleString("es-VE")} de{" "}
          {totalPages.toLocaleString("es-VE")}
        </p>
      )}

      {showForm && (
        <MissingPersonForm
          onCancel={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}

      {selected && (
        <MissingPersonDetail
          person={selected}
          people={people}
          onNavigate={setSelected}
          onClose={() => setSelected(null)}
          onMarkFound={(payload) => handleMarkFound(selected.id, payload)}
        />
      )}
    </>
  );
}

function MissingPersonCard({
  person,
  onOpen,
}: {
  person: MissingPerson;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="e-person-card"
      role="listitem"
    >
      <div className="e-person-card__media">
        <span className="e-person-card__badge">DESAPARECIDO</span>
        {person.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photoUrl}
            alt={`Foto de ${person.name}`}
            loading="lazy"
            className="e-person-card__photo"
          />
        ) : (
          <div
            className="e-person-card__photo e-person-card__photo--empty"
            aria-hidden
          >
            👤
          </div>
        )}
      </div>

      <div className="e-person-card__content">
        <div className="e-person-card__title-row">
          <span className="e-person-card__name" title={person.name}>
            {person.name}
          </span>
          {person.age !== null && (
            <span className="e-person-card__age">· {person.age} años</span>
          )}
        </div>

        {person.lastSeen && (
          <p className="e-person-card__row e-person-card__row--location">
            <span aria-hidden>📍</span>
            <span>{person.lastSeen}</span>
          </p>
        )}

        {person.contact && (
          <p className="e-person-card__row e-person-card__row--phone">
            <span aria-hidden>📞</span>
            <span>{person.contact}</span>
          </p>
        )}

        {person.description && (
          <p className="e-person-card__note">{person.description}</p>
        )}

        <p className="e-person-card__footer">Toca para ver más</p>
      </div>
    </button>
  );
}

function HospitalesPreview() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/hospitals?limit=1000", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const list: Hospital[] = data.hospitals ?? [];
        setTotal(list.length);
        setHospitals(list.slice(0, MAX_PREVIEW));
      } catch {
        // se reintenta al volver a la pestaña
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const preview = hospitals;
  const hasMore = total > preview.length;
  const itemCount = loading ? 1 : preview.length + (hasMore ? 1 : 0);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="qi-h2">Hospitales y centros de salud</h2>
            {!loading && (
              <span
                className="e-pill bg-sky-50 text-sky-800"
                aria-label={`${total} hospitales en la red`}
              >
                {total.toLocaleString("es-VE")} registrados
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-[var(--etext2)]">
            Red hospitalaria priorizada según la zona de afectación. Toca un
            hospital para ver pacientes y detalles.
          </p>
        </div>
        <Link href="/hospitales" className="e-btn e-btn-secondary px-4 py-2.5">
          Ver lista completa →
        </Link>
      </div>

      <HorizontalScrollRow itemCount={itemCount}>
        {loading ? (
          <div
            className="e-card flex w-[260px] shrink-0 snap-start items-center justify-center border-dashed p-6 text-sm text-[var(--etext2)]"
            role="listitem"
          >
            Cargando hospitales…
          </div>
        ) : preview.length === 0 ? (
          <div
            className="e-card flex w-[260px] shrink-0 snap-start flex-col items-center justify-center gap-1 border-dashed p-4 text-center text-[var(--etext2)]"
            role="listitem"
          >
            <span className="text-2xl">🏥</span>
            <p className="text-sm font-medium">Aún no hay hospitales</p>
            <p className="text-xs">
              La lista se actualizará cuando se registren centros de salud.
            </p>
          </div>
        ) : (
          preview.map((hospital) => {
            const zone = PRIORITY_ZONE_META[hospital.priorityZone];
            return (
              <Link
                key={hospital.id}
                href={`/hospitales/${buildHospitalSlug(hospital)}`}
                className="e-card e-card-hover group flex w-[200px] shrink-0 snap-start flex-col gap-2 p-4 sm:w-[220px]"
                role="listitem"
                style={{ borderLeft: `4px solid ${zone.color}` }}
              >
                <span
                  className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ background: zone.color }}
                >
                  {zone.emoji} {hospital.priorityZone}
                </span>
                <p
                  className="line-clamp-2 text-sm font-semibold text-[var(--etext)] group-hover:text-red-700"
                  title={hospital.name}
                >
                  {hospital.name}
                </p>
                <p className="line-clamp-1 text-[11px] text-[var(--etext2)]">
                  {hospital.state}
                  {hospital.municipality ? ` · ${hospital.municipality}` : ""}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-sky-800">
                  {hospital.activePatients > 0
                    ? `${hospital.activePatients} hospitalizados · `
                    : ""}
                  Ver detalles →
                </span>
              </Link>
            );
          })
        )}

        {!loading && hasMore && (
          <Link
            href="/hospitales"
            className="e-card e-card-hover flex w-[160px] shrink-0 snap-start flex-col items-center justify-center gap-2 p-4 text-center sm:w-[180px]"
            role="listitem"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-sky-100 text-2xl text-sky-700">
              →
            </span>
            <span className="text-sm font-semibold text-[var(--etext)]">
              Ver todos
            </span>
            <span className="text-[11px] text-[var(--etext2)]">
              Ir al directorio completo
            </span>
          </Link>
        )}
      </HorizontalScrollRow>
    </>
  );
}
