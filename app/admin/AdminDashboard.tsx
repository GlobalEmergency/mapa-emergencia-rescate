"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  REPORT_TYPES,
  REPORT_TYPE_KEYS,
  type ReportType,
} from "@/lib/types";
import AdminLogin from "../components/AdminLogin";

const ADMIN_STORAGE_KEY = "emergency:adminToken";
const POLL_INTERVAL_MS = 7000;

interface Report {
  id: string;
  type: ReportType;
  lat: number;
  lng: number;
  place: string;
  affected: number;
  needs: string;
  photoUrl: string | null;
  confirmations: number;
  createdAt: number;
}
interface Message {
  id: string;
  name: string;
  text: string;
  createdAt: number;
}
interface Person {
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
interface SyncRun {
  source: string;
  trigger: string | null;
  ok: boolean;
  fetched: number;
  inserted: number;
  updated: number;
  errors: number;
  fromPage: number | null;
  toPage: number | null;
  cycleCompleted: boolean | null;
  error: string | null;
  durationMs: number;
  startedAt: number;
}
interface SyncStateRow {
  source: string;
  nextPage: number;
  totalPages: number | null;
  lastRunAt: number | null;
  lastCycleCompletedAt: number | null;
}
interface DuplicateGroup {
  name: string;
  count: number;
  distinctAges: number;
  distinctLocations: number;
  classification: "same-person" | "homonyms";
}
interface DuplicateReport {
  totalRows: number;
  duplicateGroups: number;
  collapsibleRows: number;
  samePersonGroups: number;
  samePersonCollapsible: number;
  homonymGroups: number;
  topGroups: DuplicateGroup[];
  generatedAt: number;
}
interface AdminData {
  generatedAt: number;
  persistent: boolean;
  sync?: { runs: SyncRun[]; state: SyncStateRow[] };
  stats: {
    reports: {
      total: number;
      byType: Record<ReportType, number>;
      totalAffected: number;
      lastHour: number;
      last24h: number;
      withPhoto: number;
    };
    chat: { total: number; lastHour: number };
    missing: {
      total: number;
      active?: number;
      found?: number;
      withPhoto: number;
    };
  };
  reports: Report[];
  messages: Message[];
  people: Person[];
}

type Tab = "reports" | "chat" | "missing";

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

function fmt(ts: number): string {
  return new Date(ts).toLocaleString("es-VE");
}

function extractPhone(contact: string): string | null {
  const digits = contact.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 7 ? digits : null;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className="mt-1 text-3xl font-bold"
        style={{ color: accent ?? "#0f172a" }}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>("reports");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [dupReport, setDupReport] = useState<DuplicateReport | null>(null);
  const [loadingDup, setLoadingDup] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);

  useEffect(() => {
    setToken(sessionStorage.getItem(ADMIN_STORAGE_KEY));
    setReady(true);
  }, []);

  const login = useCallback((t: string) => {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setToken(null);
    setData(null);
  }, []);

  const fetchData = useCallback(async () => {
    const current = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    if (!current) return;
    try {
      const res = await fetch("/api/admin/data", {
        headers: { "x-admin-token": current },
        cache: "no-store",
      });
      if (res.status === 401) {
        logout();
        setError("Tu sesión expiró. Vuelve a iniciar sesión.");
        return;
      }
      if (!res.ok) return;
      setData(await res.json());
      setError(null);
    } catch {
      // se reintenta en el siguiente ciclo
    }
  }, [logout]);

  useEffect(() => {
    if (!token) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      fetchData();
      interval = setInterval(fetchData, POLL_INTERVAL_MS);
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
  }, [token, fetchData]);

  const remove = useCallback(
    async (kind: Tab, id: string) => {
      if (!token) return;
      const endpoint =
        kind === "reports"
          ? `/api/reports/${id}`
          : kind === "chat"
            ? `/api/chat/${id}`
            : `/api/missing/${id}`;
      setData((prev) => {
        if (!prev) return prev;
        if (kind === "reports")
          return { ...prev, reports: prev.reports.filter((r) => r.id !== id) };
        if (kind === "chat")
          return { ...prev, messages: prev.messages.filter((m) => m.id !== id) };
        return { ...prev, people: prev.people.filter((p) => p.id !== id) };
      });
      await fetch(endpoint, {
        method: "DELETE",
        headers: { "x-admin-token": token },
      }).catch(() => {});
    },
    [token],
  );

  const runSyncNow = useCallback(async () => {
    const current = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    if (!current || syncing) return;
    setSyncing(true);
    try {
      await fetch("/api/sync/run?mode=chunk", {
        method: "POST",
        headers: { "x-admin-token": current },
      });
      await fetchData();
    } catch {
      // se refleja en el próximo poll
    } finally {
      setSyncing(false);
    }
  }, [syncing, fetchData]);

  const resetCursor = useCallback(async () => {
    const current = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    if (!current) return;
    if (!window.confirm("¿Reiniciar el cursor a la página 1? El próximo barrido empezará desde el inicio.")) {
      return;
    }
    try {
      await fetch("/api/sync/reset", {
        method: "POST",
        headers: { "x-admin-token": current },
      });
      await fetchData();
    } catch {
      // se refleja en el próximo poll
    }
  }, [fetchData]);

  const loadDuplicates = useCallback(async () => {
    const current = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    if (!current || loadingDup) return;
    setLoadingDup(true);
    try {
      const res = await fetch("/api/sync/duplicates?limit=50", {
        headers: { "x-admin-token": current },
        cache: "no-store",
      });
      if (res.ok) {
        setDupReport(await res.json());
        setDupOpen(true);
      }
    } catch {
      // se puede reintentar
    } finally {
      setLoadingDup(false);
    }
  }, [loadingDup]);

  const filteredReports = useMemo(() => {
    if (!data) return [];
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return data.reports.filter((r) => {
      if (terms.length === 0) return true;
      const hay = normalize(`${r.place} ${r.needs} ${REPORT_TYPES[r.type].label}`);
      return terms.every((t) => hay.includes(t));
    });
  }, [data, query]);

  const filteredMessages = useMemo(() => {
    if (!data) return [];
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return data.messages.filter((m) => {
      if (terms.length === 0) return true;
      const hay = normalize(`${m.name} ${m.text}`);
      return terms.every((t) => hay.includes(t));
    });
  }, [data, query]);

  const filteredPeople = useMemo(() => {
    if (!data) return [];
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return data.people.filter((p) => {
      if (terms.length === 0) return true;
      const hay = normalize(`${p.name} ${p.lastSeen} ${p.description} ${p.contact}`);
      return terms.every((t) => hay.includes(t));
    });
  }, [data, query]);

  if (!ready) return null;

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
        <AdminLogin
          onCancel={() => {
            window.location.href = "/";
          }}
          onSuccess={login}
        />
      </main>
    );
  }

  const stats = data?.stats;

  return (
    <main className="min-h-screen bg-slate-100 pb-16">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              📊 Panel de administración
            </h1>
            <p className="text-xs text-slate-500">
              {data
                ? `Actualizado ${timeAgo(data.generatedAt)}`
                : "Cargando datos…"}
              {data && !data.persistent && " · ⚠️ Modo demo (sin persistencia)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ver sitio
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard
            label="Reportes"
            value={stats?.reports.total ?? "—"}
            sub={
              stats ? `${stats.reports.lastHour} en la última hora` : undefined
            }
            accent="#dc2626"
          />
          <MetricCard
            label="Personas afectadas"
            value={stats?.reports.totalAffected ?? "—"}
            sub="Suma reportada"
          />
          <MetricCard
            label="Desaparecidas"
            value={stats?.missing.active ?? stats?.missing.total ?? "—"}
            sub={
              stats
                ? `${stats.missing.found ?? 0} localizadas · ${stats.missing.withPhoto} con foto`
                : undefined
            }
            accent="#9333ea"
          />
          <MetricCard
            label="Mensajes (chat)"
            value={stats?.chat.total ?? "—"}
            sub={stats ? `${stats.chat.lastHour} en la última hora` : undefined}
          />
          <MetricCard
            label="Reportes 24 h"
            value={stats?.reports.last24h ?? "—"}
            sub="Últimas 24 horas"
            accent="#0ea5e9"
          />
        </div>

        {stats && (
          <div className="mt-3 flex flex-wrap gap-2">
            {REPORT_TYPE_KEYS.map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm"
              >
                <span>{REPORT_TYPES[type].emoji}</span>
                <span className="text-slate-500">{REPORT_TYPES[type].label}:</span>
                <span className="font-semibold text-slate-900">
                  {stats.reports.byType[type] ?? 0}
                </span>
              </span>
            ))}
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              🔄 Sincronización de fuentes
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetCursor}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reiniciar cursor
              </button>
              <button
                type="button"
                onClick={runSyncNow}
                disabled={syncing}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {syncing ? "Sincronizando…" : "Sincronizar ahora"}
              </button>
            </div>
          </div>

          {data?.sync?.state && data.sync.state.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.sync.state.map((s) => (
                <span
                  key={s.source}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                >
                  <span className="font-medium text-slate-800">{s.source}</span>
                  <span>
                    · pág {s.nextPage}
                    {s.totalPages ? `/${s.totalPages}` : ""}
                  </span>
                  {s.lastRunAt && (
                    <span className="text-slate-400">· {timeAgo(s.lastRunAt)}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {data?.sync?.runs && data.sync.runs.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100 text-xs">
              {data.sync.runs.map((r, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5"
                >
                  <span className={r.ok ? "text-emerald-600" : "text-red-600"}>
                    {r.ok ? "✓" : "✕"}
                  </span>
                  <span className="text-slate-400">{timeAgo(r.startedAt)}</span>
                  <span className="rounded bg-slate-100 px-1.5 text-slate-600">
                    {r.trigger ?? "?"}
                  </span>
                  <span className="text-slate-700">
                    pág {r.fromPage ?? "?"}–{r.toPage ?? "?"} · +{r.inserted} nuevos
                    {" / "}
                    {r.updated} act.
                    {r.errors > 0 && ` · ${r.errors} err`}
                    {r.cycleCompleted && " · ciclo ✓"}
                  </span>
                  {r.error && <span className="text-red-600">{r.error}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Aún no hay corridas registradas.
            </p>
          )}

          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                🔎 Reporte de posibles duplicados
              </h3>
              <div className="flex items-center gap-2">
                {dupReport && (
                  <button
                    type="button"
                    onClick={() => setDupOpen((v) => !v)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {dupOpen ? "▲ Ocultar" : "▼ Mostrar"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={loadDuplicates}
                  disabled={loadingDup}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {loadingDup ? "Analizando…" : dupReport ? "Regenerar" : "Generar reporte"}
                </button>
              </div>
            </div>

            {dupReport && dupOpen && (
              <div className="mt-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MetricCard
                    label="Grupos con duplicados"
                    value={dupReport.duplicateGroups}
                    sub={`de ${dupReport.totalRows} registros`}
                  />
                  <MetricCard
                    label="Probable misma persona"
                    value={dupReport.samePersonGroups}
                    sub={`~${dupReport.samePersonCollapsible} filas colapsables`}
                    accent="#16a34a"
                  />
                  <MetricCard
                    label="Posibles homónimos"
                    value={dupReport.homonymGroups}
                    sub="revisar a mano (no agrupar)"
                    accent="#dc2626"
                  />
                  <MetricCard
                    label="Filas colapsables (techo)"
                    value={dupReport.collapsibleRows}
                    sub="si se colapsara todo"
                  />
                </div>

                <ul className="mt-3 max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100 text-xs">
                  {dupReport.topGroups.map((g, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5"
                    >
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          g.classification === "same-person"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {g.classification === "same-person"
                          ? "misma persona"
                          : "homónimos"}
                      </span>
                      <span className="font-medium text-slate-900">{g.name}</span>
                      <span className="text-slate-500">
                        {g.count} registros · {g.distinctAges} edad(es) ·{" "}
                        {g.distinctLocations} ubicación(es)
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-slate-400">
                  Solo detección — no se modifica ni agrupa nada todavía.
                  &quot;misma persona&quot; = edad consistente; &quot;homónimos&quot;
                  = varias edades (probablemente personas distintas).
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-200">
          {(
            [
              ["reports", `Reportes (${data?.reports.length ?? 0})`],
              ["missing", `Desaparecidas (${data?.people.length ?? 0})`],
              ["chat", `Chat (${data?.messages.length ?? 0})`],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative mt-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en esta sección…"
            className="w-full max-w-md rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔎
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {tab === "reports" && (
            <ul className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <li className="p-6 text-center text-sm text-slate-500">
                  Sin reportes.
                </li>
              ) : (
                filteredReports.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 p-3">
                    {r.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.photoUrl}
                        alt={r.place}
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div
                        className="grid h-16 w-16 shrink-0 place-items-center rounded-lg text-2xl text-white"
                        style={{ background: REPORT_TYPES[r.type].color }}
                        aria-hidden
                      >
                        {REPORT_TYPES[r.type].icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {r.place}
                      </p>
                      <p className="text-xs text-slate-500">
                        {REPORT_TYPES[r.type].label}
                        {r.affected > 0 && ` · ${r.affected} afectada(s)`} ·{" "}
                        {fmt(r.createdAt)}
                      </p>
                      {r.needs && (
                        <p className="mt-0.5 text-xs text-slate-600">{r.needs}</p>
                      )}
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=17/${r.lat}/${r.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-block text-xs text-sky-700 hover:underline"
                      >
                        Ver ubicación ↗
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove("reports", r.id)}
                      className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          {tab === "missing" && (
            <ul className="divide-y divide-slate-100">
              {filteredPeople.length === 0 ? (
                <li className="p-6 text-center text-sm text-slate-500">
                  Sin personas reportadas.
                </li>
              ) : (
                filteredPeople.map((p) => {
                  const phone = extractPhone(p.contact);
                  return (
                    <li key={p.id} className="flex items-start gap-3 p-3">
                      {p.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.photoUrl}
                          alt={p.name}
                          loading="lazy"
                          className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-slate-100 text-2xl text-slate-400">
                          🧍
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {p.name}
                          {p.age !== null && (
                            <span className="font-normal text-slate-500">
                              {" "}
                              · {p.age} años
                            </span>
                          )}
                        </p>
                        {p.lastSeen && (
                          <p className="text-xs text-slate-600">📍 {p.lastSeen}</p>
                        )}
                        {p.description && (
                          <p className="mt-0.5 text-xs text-slate-600">
                            {p.description}
                          </p>
                        )}
                        {p.contact &&
                          (phone ? (
                            <a
                              href={`tel:${phone}`}
                              className="text-xs font-medium text-red-700 hover:underline"
                            >
                              📞 {p.contact}
                            </a>
                          ) : (
                            <p className="text-xs text-slate-700">{p.contact}</p>
                          ))}
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {fmt(p.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {p.status === "found" && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            ✓ Localizada
                          </span>
                        )}
                        {p.status === "found" && token && (
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/missing/${p.id}/restore`, {
                                method: "POST",
                                headers: { "x-admin-token": token },
                              }).catch(() => null);
                              fetchData();
                            }}
                            className="rounded-md border border-amber-200 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                          >
                            Restaurar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => remove("missing", p.id)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          )}

          {tab === "chat" && (
            <ul className="divide-y divide-slate-100">
              {filteredMessages.length === 0 ? (
                <li className="p-6 text-center text-sm text-slate-500">
                  Sin mensajes.
                </li>
              ) : (
                filteredMessages
                  .slice()
                  .reverse()
                  .map((m) => (
                    <li key={m.id} className="flex items-start gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold text-slate-900">
                            {m.name}
                          </span>{" "}
                          <span className="text-[11px] text-slate-400">
                            {fmt(m.createdAt)}
                          </span>
                        </p>
                        <p className="text-sm text-slate-700">{m.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove("chat", m.id)}
                        className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </li>
                  ))
              )}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
