"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMarkFound,
  useMissingList,
  useMissingStats,
  type MissingPerson,
} from "@/hooks/missing";
import { qk } from "@/lib/query-keys";
import { useLowBandwidthMode } from "@/app/components/useLowBandwidthMode";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { MissingPersonCard } from "./MissingPersonCard";
import { ZoneFilters, type PersonStatusFilter } from "./ZoneFilters";
import { useHospitalGridColumns } from "./useHospitalGridColumns";
import DetailModal from "./DetailModal";

const POLL_INTERVAL_MS = 8000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 45_000;
const PERSON_PREVIEW_ROWS = 3;
const MIN_SEARCH_LEN = 3;
const SEARCH_DEBOUNCE_MS = 350;

export type PersonsTabHandle = {
  refresh: () => void;
};

/**
 * Pestaña de personas del directorio. DATOS vía TanStack:
 *  - lista paginada/polleada: useMissingList (dedup con la lista principal).
 *  - conteo "encontradas": useMissingStats (store COMPARTIDO; reemplaza el
 *    poller redundante /api/missing?status=found&pageSize=1 del original).
 *  - "marcar encontrada": useMarkFound (mutación + invalidateQueries).
 * Cero fetch/setInterval/setState-para-datos a mano. UI verbatim.
 */
export const PersonsTab = forwardRef<PersonsTabHandle>(function PersonsTab(
  _props,
  ref,
) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<PersonStatusFilter>("all");
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const skipScrollRef = useRef(true);

  const gridCols = useHospitalGridColumns();
  const pageSize = gridCols * PERSON_PREVIEW_ROWS;
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );

  // Debounce de búsqueda: al cambiar el término, vuelve a la página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const search = debouncedQuery.trim();
  const { data } = useMissingList(
    {
      status: filter,
      page,
      pageSize,
      q: search.length >= MIN_SEARCH_LEN ? search : undefined,
    },
    network.pollIntervalMs,
  );
  const stats = useMissingStats();

  const people = data?.people ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const foundTotal = stats.data?.found ?? 0;

  // Reset a página 1 al cambiar tamaño de grilla, búsqueda o filtro.
  useEffect(() => {
    setPage(1);
  }, [pageSize, debouncedQuery, filter]);

  // Clamp hacia abajo si la página supera el total real (p.ej. tras borrados).
  // NO seguir `data.page` a ciegas: con placeholderData el server aún refleja la
  // página ANTERIOR un instante y nos devolvería a ella, bloqueando el avance.
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  useImperativeHandle(
    ref,
    () => ({
      refresh() {
        setPage(1);
        // Invalida todo el dominio: la lista y las stats se refrescan solas.
        void qc.invalidateQueries({ queryKey: qk.missing.all });
      },
    }),
    [qc],
  );

  useEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      return;
    }
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [page]);

  const markFound = useMarkFound();
  const handleMarkFound = useCallback(
    async (
      id: string,
      payload: { note: string; photo: string | null; turnstileToken?: string },
    ) => {
      await markFound.mutateAsync({
        id,
        note: payload.note,
        photo: payload.photo,
        turnstileToken: payload.turnstileToken,
      });
      setSelected(null);
    },
    [markFound],
  );

  const isSearching = search.length >= MIN_SEARCH_LEN;
  const queryTooShort = search.length > 0 && search.length < MIN_SEARCH_LEN;

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
            {foundTotal.toLocaleString("es-VE")} encontradas
          </span>
        </div>

        <p className="mt-2 max-w-2xl text-sm text-[var(--etext2)]">
          Si reconoces a alguien, contacta a quien la reportó.
        </p>
      </div>

      <ZoneFilters filter={filter} onChange={setFilter} />

      <div className="e-person-search">
        <SearchInput
          id="personas-directory-search"
          label="Buscar personas"
          value={query}
          onChange={setQuery}
          placeholder="🔍 Buscar por nombre, zona o descripción…"
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

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        ariaLabel="Paginación del directorio de personas"
      />
      {totalPages > 1 && (
        <p className="mt-2 text-center text-[11px] text-[var(--etext3)]">
          Página {page.toLocaleString("es-VE")} de{" "}
          {totalPages.toLocaleString("es-VE")}
        </p>
      )}

      {selected && (
        <DetailModal
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
