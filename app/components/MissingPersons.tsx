"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MissingPersonForm, {
  type MissingPersonPayload,
} from "./MissingPersonForm";
import MissingPersonDetail from "./MissingPersonDetail";
import { useLowBandwidthMode } from "./useLowBandwidthMode";
import { timeAgo } from "@/lib/format";

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
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 48;
const ADMIN_STORAGE_KEY = "emergency:adminToken";

function extractPhone(contact: string): string | null {
  const digits = contact.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 7 ? digits : null;
}

/** Ventana compacta de números de página alrededor de la página actual. */
function pageWindow(page: number, totalPages: number): number[] {
  const span = 2;
  const start = Math.max(1, Math.min(page - span, totalPages - span * 2));
  const end = Math.min(totalPages, Math.max(page + span, span * 2 + 1));
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

export default function MissingPersons() {
  const [people, setPeople] = useState<MissingPerson[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [persistent, setPersistent] = useState(true);
  const [selected, setSelected] = useState<MissingPerson | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );

  // Debounce de la búsqueda: al cambiar el término volvemos a la página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(
    async (manual = false) => {
      setAdminToken(sessionStorage.getItem(ADMIN_STORAGE_KEY));
      if (manual) setRefreshing(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
        // El refresco manual evita la caché del CDN; el polling la aprovecha.
        if (manual) params.set("_", String(Date.now()));
        const res = await fetch(`/api/missing?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        setPeople(data.people ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setPersistent(Boolean(data.persistent));
        setLastFetchAt(Date.now());
        // El servidor acota la página al rango válido (p. ej. tras borrados).
        if (typeof data.page === "number" && data.page !== page) {
          setPage(data.page);
        }
      } catch {
        // se reintenta en el siguiente ciclo
      } finally {
        if (manual) setRefreshing(false);
      }
    },
    [page, debouncedQuery],
  );

  // Re-render del indicador "actualizado hace X" cada 5 s sin pedir red.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  // Carga de la página actual + polling, pausado cuando la pestaña no es visible.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      load();
      interval = setInterval(() => load(), network.pollIntervalMs);
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
  }, [load, network.pollIntervalMs]);

  const handleSubmit = useCallback(async (payload: MissingPersonPayload) => {
    const res = await fetch("/api/missing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "No se pudo guardar el reporte.");
    }
    setShowForm(false);
    // El nuevo reporte es el más reciente: volvemos al inicio para verlo.
    setQuery("");
    setDebouncedQuery("");
    setPage(1);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!adminToken) return;
      setPeople((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setSelected((current) => (current?.id === id ? null : current));
      await fetch(`/api/missing/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": adminToken },
      }).catch(() => null);
      // Resincronizamos para rellenar la página y corregir totales.
      load();
    },
    [adminToken, load],
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
      // Quitamos de la lista pública y cerramos modal con feedback.
      setPeople((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setSelected(null);
      load();
    },
    [load],
  );

  const pages = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);
  const isSearching = debouncedQuery.trim().length > 0;

  return (
    <section id="desaparecidas" className="mx-auto w-full max-w-7xl px-4 pb-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                🧍 Personas desaparecidas
              </h2>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800"
                aria-label={`${total} personas reportadas`}
                title="Total de personas reportadas"
              >
                {total} reportada{total === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Lista de personas que se buscan tras el terremoto. Si reconoces a
              alguien o tienes información, contacta a la persona indicada.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>
                {lastFetchAt
                  ? `Actualizada ${timeAgo(lastFetchAt, now)}`
                  : "Actualizando…"}
              </span>
              <button
                type="button"
                onClick={() => load(true)}
                disabled={refreshing}
                className="rounded-md border border-slate-200 px-2 py-0.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {refreshing ? "🔄 Cargando…" : "🔄 Refrescar"}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            + Reportar desaparecida
          </button>
        </div>

        <div className="relative mt-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, zona o descripción…"
            aria-label="Buscar personas desaparecidas"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔎
          </span>
        </div>

        {isSearching && (
          <p className="mt-3 text-xs font-medium text-slate-500">
            {total} resultado{total === 1 ? "" : "s"} para “{debouncedQuery.trim()}”
          </p>
        )}

        {people.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            {isSearching
              ? `No se encontraron personas para “${debouncedQuery.trim()}”.`
              : "Aún no hay personas reportadas. Usa el botón para agregar la primera."}
          </p>
        ) : (
          <>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((person) => {
                const phone = extractPhone(person.contact);
                return (
                  <li
                    key={person.id}
                    className="relative overflow-hidden rounded-xl border border-slate-200 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(person)}
                      aria-label={`Ver detalle de ${person.name}`}
                      className="flex w-full gap-3 p-3 text-left transition active:bg-slate-50"
                    >
                      {person.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={person.photoUrl}
                          alt={`Foto de ${person.name}`}
                          loading="lazy"
                          className="h-24 w-24 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-slate-100 text-3xl text-slate-400">
                          🧍
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="pr-6 font-semibold text-slate-900">
                          {person.name}
                          {person.age !== null && (
                            <span className="font-normal text-slate-500">
                              {" "}
                              · {person.age} años
                            </span>
                          )}
                        </p>
                        {person.lastSeen && (
                          <p className="mt-0.5 text-xs text-slate-600">
                            📍 {person.lastSeen}
                          </p>
                        )}
                        {person.description && (
                          <p className="mt-1 line-clamp-3 text-xs text-slate-600">
                            {person.description}
                          </p>
                        )}
                        {person.contact &&
                          (phone ? (
                            <a
                              href={`tel:${phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 inline-block text-xs font-medium text-red-700 hover:underline"
                            >
                              📞 {person.contact}
                            </a>
                          ) : (
                            <p className="mt-1 text-xs font-medium text-slate-700">
                              {person.contact}
                            </p>
                          ))}
                        <p className="mt-1 text-[11px] text-slate-400">
                          Toca para ver más
                        </p>
                      </div>
                    </button>
                    {adminToken && (
                      <button
                        type="button"
                        onClick={() => handleDelete(person.id)}
                        aria-label="Eliminar reporte"
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md bg-white/80 text-slate-400 backdrop-blur hover:bg-red-50 hover:text-red-600"
                      >
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <nav
                className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
                aria-label="Paginación de personas desaparecidas"
              >
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                {pages[0] > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
                        ? "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
                        : "rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </nav>
            )}
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Página {page} de {totalPages}
            </p>
          </>
        )}

        {!persistent && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Modo demo: los reportes no se están guardando de forma permanente.
          </p>
        )}
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
          people={people}
          onNavigate={setSelected}
          onClose={() => setSelected(null)}
          onMarkFound={(payload) => handleMarkFound(selected.id, payload)}
        />
      )}
    </section>
  );
}
