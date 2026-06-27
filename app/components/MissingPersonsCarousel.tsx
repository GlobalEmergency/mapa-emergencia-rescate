"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import MissingPersonForm, {
  type MissingPersonPayload,
} from "./MissingPersonForm";
import MissingPersonDetail from "./MissingPersonDetail";
import { useLowBandwidthMode } from "./useLowBandwidthMode";
import {
  type Hospital,
  type HospitalPriorityZone,
} from "@/lib/hospitals-meta";
import {
  filterHospitals,
  HospitalCard,
  HospitalStatsRow,
  HospitalZoneFilters,
} from "./HospitalDirectoryUI";
import { HospitalDetailOverlay } from "./Hospitals";
import { trackHospitalDetailViewed } from "./analytics";

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

type PersonasPreviewHandle = {
  refresh: () => void;
};

const POLL_INTERVAL_MS = 8000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 45_000;
const PERSON_PREVIEW_ROWS = 3;
const HOSPITAL_PREVIEW_ROWS = 4;
const MIN_SEARCH_LEN = 3;

function useHospitalGridColumns() {
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const mqSm = window.matchMedia("(min-width: 640px)");
    const mqLg = window.matchMedia("(min-width: 960px)");
    const update = () => {
      if (mqLg.matches) setCols(3);
      else if (mqSm.matches) setCols(2);
      else setCols(1);
    };
    update();
    mqSm.addEventListener("change", update);
    mqLg.addEventListener("change", update);
    return () => {
      mqSm.removeEventListener("change", update);
      mqLg.removeEventListener("change", update);
    };
  }, []);

  return cols;
}

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
    id === "e-directory" ||
    id === "localizados"
  ) {
    return "personas";
  }
  return null;
}

function hashForTab(tab: DirectoryTab): string {
  return tab === "hospitales" ? "#hospitales" : "#e-directory";
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
  const [showForm, setShowForm] = useState(false);
  const [formSessionKey, setFormSessionKey] = useState(0);
  const personasRef = useRef<PersonasPreviewHandle>(null);

  const selectTab = useCallback((tab: DirectoryTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", hashForTab(tab));
  }, []);

  const openReportForm = useCallback(() => {
    setFormSessionKey((k) => k + 1);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
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
      personasRef.current?.refresh();
    },
    [],
  );

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
        <div className="-mx-4 mb-7 flex flex-wrap items-end justify-between gap-3 border-b-2 border-[var(--eborder)] px-4 sm:mx-0 sm:px-0">
          <div
            role="tablist"
            aria-label="Directorio de personas y hospitales"
            className="flex min-w-0 flex-1"
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
          <button
            type="button"
            onClick={openReportForm}
            className="e-btn e-btn-primary mb-1 shrink-0 px-5 py-2.5"
          >
            <span aria-hidden>＋</span> Quiero reportar
          </button>
        </div>

        {activeTab === "personas" ? (
          <div
            role="tabpanel"
            id="panel-personas"
            aria-labelledby="tab-personas"
          >
            <PersonasPreview ref={personasRef} />
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

        {showForm && (
          <MissingPersonForm
            key={`${activeTab}-${formSessionKey}`}
            initialReportType={
              activeTab === "hospitales" ? "found" : "missing"
            }
            initialFoundPlace={
              activeTab === "hospitales" ? "hospital" : null
            }
            onCancel={() => setShowForm(false)}
            onSubmit={handleFormSubmit}
          />
        )}
      </div>
    </section>
  );
}

const PersonasPreview = forwardRef<PersonasPreviewHandle>(
  function PersonasPreview(_props, ref) {
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [foundTotal, setFoundTotal] = useState(0);
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "found">("all");
  const gridRef = useRef<HTMLDivElement>(null);
  const skipScrollRef = useRef(true);
  const gridCols = useHospitalGridColumns();
  const pageSize = gridCols * PERSON_PREVIEW_ROWS;
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
        status: filter,
        page: String(page),
        pageSize: String(pageSize),
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
  }, [debouncedQuery, page, pageSize, filter]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, debouncedQuery, filter]);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

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

  useImperativeHandle(
    ref,
    () => ({
      refresh() {
        setPage(1);
        fetchPeople();
        fetchFoundTotal();
      },
    }),
    [fetchFoundTotal, fetchPeople],
  );

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [page]);

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
      <div>
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
            {total.toLocaleString("es-VE")} desaparecidas
          </span>
          <span className="e-person-stats__item">
            <span
              className="e-person-stats__dot e-person-stats__dot--found"
              aria-hidden
            />
            {foundTotal.toLocaleString("es-VE")} localizadas
          </span>
        </div>

        <p className="mt-2 max-w-2xl text-sm text-[var(--etext2)]">
          Si reconoces a alguien, contacta a quien la reportó.
        </p>
      </div>

      <div className="my-3 flex flex-wrap items-center justify-end gap-2">
        <button 
          onClick={() => { setFilter("all"); setPage(1); }}
          className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${filter === "all" ? "border-slate-300 bg-slate-100 text-slate-800" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
        >
          Todas
        </button>
        <button 
          onClick={() => { setFilter("active"); setPage(1); }}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${filter === "active" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${filter === "active" ? "bg-amber-500" : "bg-amber-500/50"}`} aria-hidden />
          Desaparecidas
        </button>
        <button 
          onClick={() => { setFilter("found"); setPage(1); }}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${filter === "found" ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${filter === "found" ? "bg-blue-500" : "bg-blue-500/50"}`} aria-hidden />
          Localizadas
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

      <div
        ref={gridRef}
        className="e-person-grid"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          ...(gridCols === 3
            ? {
                gridTemplateRows: `repeat(${PERSON_PREVIEW_ROWS}, var(--e-person-card-height))`,
              }
            : {}),
        }}
        role="list"
      >
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
});

function MissingPersonCard({
  person,
  onOpen,
}: {
  person: MissingPerson;
  onOpen: () => void;
}) {
  const isFound = person.status === "found";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="e-person-card"
      role="listitem"
    >
      <div className="e-person-card__media">
        <span
          className={`e-person-card__badge${isFound ? " e-person-card__badge--found" : ""}`}
        >
          {isFound ? "LOCALIZADA" : "DESAPARECIDA"}
        </span>
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<HospitalPriorityZone | "all">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );
  const gridCols = useHospitalGridColumns();

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
        setHospitals(data.hospitals ?? []);
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

  const visible = useMemo(
    () => filterHospitals(hospitals, search, zoneFilter),
    [hospitals, search, zoneFilter],
  );

  const pageSize = gridCols * HOSPITAL_PREVIEW_ROWS;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const pages = useMemo(
    () => pageWindow(page, totalPages),
    [page, totalPages],
  );
  const paginatedHospitals = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, zoneFilter]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  return (
    <>
      <div>
        <h2 className="qi-h2">Hospitales y centros de salud</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--etext2)]">
          Lista priorizada de la red hospitalaria de Venezuela según la zona
          de afectación. Toca un hospital para ver los pacientes registrados.
        </p>
      </div>

      {!loading && hospitals.length > 0 && (
        <HospitalStatsRow hospitals={hospitals} />
      )}

      <div className="e-hospital-toolbar">
        <label className="sr-only" htmlFor="hospitales-directory-search">
          Buscar hospitales
        </label>
        <input
          id="hospitales-directory-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nombre, municipio o dirección…"
          className="e-input w-full lg:max-w-md"
        />
        <HospitalZoneFilters
          zoneFilter={zoneFilter}
          onZoneFilterChange={setZoneFilter}
        />
      </div>

      <div className="e-hospital-grid" role="list">
        {loading ? (
          <div
            className="e-card col-span-full flex items-center justify-center border-dashed p-8 text-sm text-[var(--etext2)]"
            role="listitem"
          >
            Cargando hospitales…
          </div>
        ) : visible.length === 0 ? (
          <div
            className="e-card col-span-full flex flex-col items-center justify-center gap-1 border-dashed p-8 text-center text-[var(--etext2)]"
            role="listitem"
          >
            <span className="text-2xl">🏥</span>
            <p className="text-sm font-medium">
              {hospitals.length === 0
                ? "Aún no hay hospitales"
                : "No se encontraron hospitales"}
            </p>
            <p className="text-xs">
              {hospitals.length === 0
                ? "La lista se actualizará cuando se registren centros de salud."
                : "Prueba con otro nombre, municipio o filtro de zona."}
            </p>
          </div>
        ) : (
          paginatedHospitals.map((hospital) => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
              onOpen={() => {
                trackHospitalDetailViewed({
                  priorityZone: hospital.priorityZone,
                  patientCount: hospital.activePatients,
                  source: "hospital_card_overlay",
                });
                setSelectedHospital(hospital);
              }}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <nav
          className="mt-5 flex flex-wrap items-center justify-center gap-1.5"
          aria-label="Paginación del directorio de hospitales"
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
          {totalPages.toLocaleString("es-VE")} ·{" "}
          {visible.length.toLocaleString("es-VE")} hospitales
        </p>
      )}

      {selectedHospital && (
        <HospitalDetailOverlay
          hospital={selectedHospital}
          onClose={() => setSelectedHospital(null)}
        />
      )}
    </>
  );
}
