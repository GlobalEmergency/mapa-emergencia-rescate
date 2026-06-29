"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  useCollectionCenters,
  type CollectionCenter,
} from "@/hooks/acopio";

// Etiquetas en español para las categorías que devuelve ResponseGrid (`accepts`).
const CATEGORY_LABELS: Record<string, string> = {
  food: "Alimentos",
  water: "Agua",
  medicines: "Medicinas",
  medical_supplies: "Insumos médicos",
  clothing: "Ropa",
  shelter: "Refugio",
  hygiene: "Higiene",
};

function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key;
}

// Estados públicos del punto (publicStatus). `active` es la norma → sin badge.
const STATUS_META: Record<string, { label: string; cls: string }> = {
  saturated: { label: "Saturado", cls: "bg-amber-100 text-amber-800" },
  paused: { label: "En pausa", cls: "bg-slate-200 text-slate-700" },
  closed: { label: "Cerrado", cls: "bg-rose-100 text-rose-800" },
};

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_COUNTRY = "Venezuela";

function locationLabel(center: CollectionCenter): string {
  return [center.city, center.country].filter(Boolean).join(" · ");
}

/** Convierte URLs y correos del texto de contacto en enlaces; el resto, texto. */
function linkifyContact(text: string): ReactNode[] {
  return text.split(/(\s+)/).map((token, i) => {
    if (/^https?:\/\//i.test(token)) {
      return (
        <a
          key={i}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
        >
          {token}
        </a>
      );
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token)) {
      return (
        <a
          key={i}
          href={`mailto:${token}`}
          className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
        >
          {token}
        </a>
      );
    }
    return <span key={i}>{token}</span>;
  });
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function CollectionCenters() {
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [category, setCategory] = useState<string>("");
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);

  // Debounce del término de búsqueda (la búsqueda real ocurre en el servidor).
  // Al confirmar un término nuevo, volvemos a la primera "página" del ver-más.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(rawQuery.trim());
      setShown(PAGE_SIZE);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // Cambiar un filtro reinicia el ver-más (setState en handler, no en efecto).
  function selectCountry(value: string) {
    setCountry(value);
    setShown(PAGE_SIZE);
  }
  function selectCategory(value: string) {
    setCategory(value);
    setShown(PAGE_SIZE);
  }

  const filters = useMemo(
    () => ({
      country: country || undefined,
      category: category || undefined,
      q: query || undefined,
    }),
    [country, category, query],
  );

  const { data, isLoading, isError, isFetching, refetch } =
    useCollectionCenters(filters);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const facets = data?.facets ?? { byCountry: {}, byCategory: {} };

  const countryChips = useMemo(
    () =>
      Object.entries(facets.byCountry).sort((a, b) => b[1] - a[1]),
    [facets.byCountry],
  );
  const categoryChips = useMemo(
    () =>
      Object.entries(facets.byCategory).sort((a, b) => b[1] - a[1]),
    [facets.byCategory],
  );

  const visible = items.slice(0, shown);

  function clearFilters() {
    setCountry("");
    setCategory("");
    setRawQuery("");
    setQuery("");
    setShown(PAGE_SIZE);
  }

  return (
    <section
      id="centros-acopio"
      className="border-y border-emerald-200/70 bg-gradient-to-b from-emerald-50/70 via-white to-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
        <header>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
            🟢 Centros de acopio
            {!isLoading && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                {total} {total === 1 ? "punto" : "puntos"}
              </span>
            )}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Lugares verificados donde puedes llevar donaciones físicas para
            quienes fueron afectados por el terremoto. Revisa qué reciben antes
            de ir.
          </p>
        </header>

        {/* Búsqueda */}
        <div className="relative mt-5">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            🔎
          </span>
          <input
            type="search"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Busca por organización, ciudad o dirección…"
            aria-label="Buscar centro de acopio"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Filtros por país */}
        {countryChips.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              País
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={!country} onClick={() => selectCountry("")}>
                Todos
              </FilterChip>
              {countryChips.map(([name, count]) => (
                <FilterChip
                  key={name}
                  active={country === name}
                  onClick={() => selectCountry(name)}
                >
                  {name} ({count})
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        {/* Filtros por categoría */}
        {categoryChips.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reciben
            </p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={!category} onClick={() => selectCategory("")}>
                Todas
              </FilterChip>
              {categoryChips.map(([key, count]) => (
                <FilterChip
                  key={key}
                  active={category === key}
                  onClick={() => selectCategory(key)}
                >
                  {categoryLabel(key)} ({count})
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        {/* Contenido */}
        <div className="mt-6">
          {isLoading ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <li
                  key={i}
                  className="h-44 animate-pulse rounded-xl border border-emerald-100 bg-emerald-50/40"
                />
              ))}
            </ul>
          ) : isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-rose-800">
                No pudimos cargar los centros de acopio en este momento.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-4 py-1.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
              >
                🔄 Reintentar
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              No encontramos centros con esos filtros.{" "}
              <button
                type="button"
                onClick={clearFilters}
                className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
              >
                Limpiar filtros
              </button>
            </p>
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((center) => {
                  const status = STATUS_META[center.status];
                  return (
                    <li
                      key={center.id}
                      className="flex flex-col rounded-xl border border-emerald-100 bg-emerald-50/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          {locationLabel(center) || "Ubicación no indicada"}
                        </p>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              center.verificationLevel === "official"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {center.verificationLevel === "official"
                              ? "✓ Oficial"
                              : "✓ Verificado"}
                          </span>
                          {status && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}
                            >
                              {status.label}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="mt-1 text-sm font-bold text-slate-900">
                        {center.name}
                      </h3>
                      {center.manager && (
                        <p className="text-xs text-slate-500">
                          {center.manager}
                        </p>
                      )}

                      {center.address && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                          📍 {center.address}
                        </p>
                      )}

                      {center.schedule && (
                        <p className="mt-2 text-sm text-slate-600">
                          🕐 {center.schedule}
                        </p>
                      )}

                      {center.accepts.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Reciben
                          </p>
                          <ul className="mt-1.5 flex flex-wrap gap-1.5">
                            {center.accepts.map((item) => (
                              <li
                                key={item}
                                className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-emerald-900 ring-1 ring-emerald-200"
                              >
                                {categoryLabel(item)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {center.contact && (
                        <p className="mt-3 break-words text-xs text-slate-600">
                          📞 {linkifyContact(center.contact)}
                        </p>
                      )}

                      {center.disputed && (
                        <p className="mt-2 text-[11px] font-medium text-amber-700">
                          ⚠️ Información en revisión.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              {items.length > shown && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setShown((s) => s + PAGE_SIZE)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
                  >
                    Ver más ({items.length - shown} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Notas */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            💚 Si conoces otro punto de acopio activo, repórtalo en el mapa con
            el marcador{" "}
            <strong className="font-semibold">Centro de Acopio</strong> para que
            más personas puedan donar.
          </p>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            ⚠️ Verifica horarios y disponibilidad antes de desplazarte. La
            información proviene de convocatorias ciudadanas y puede cambiar.
          </p>
        </div>

        <p className="mt-6 text-[11px] text-slate-400">
          Datos:{" "}
          <a
            href="https://responsegrid.app/e/terremoto-venezuela-2026"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            ResponseGrid
          </a>{" "}
          / Global Emergency ·{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            CC BY-SA 4.0
          </a>
          {isFetching && !isLoading ? " · actualizando…" : ""}
        </p>
      </div>
    </section>
  );
}
