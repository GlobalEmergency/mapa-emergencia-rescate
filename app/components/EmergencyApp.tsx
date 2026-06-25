"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { REPORT_TYPES, type EmergencyReport, type ReportType } from "@/lib/types";
import ReportForm from "./ReportForm";
import AdminLogin from "./AdminLogin";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
      Cargando mapa…
    </div>
  ),
});

const CARACAS: [number, number] = [10.4806, -66.9036];
const POLL_INTERVAL_MS = 5000;
const ADMIN_STORAGE_KEY = "emergency:adminToken";

export default function EmergencyApp() {
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [persistent, setPersistent] = useState(true);
  const [filter, setFilter] = useState<ReportType | "all">("all");
  const [query, setQuery] = useState("");
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const isAdmin = Boolean(adminToken);

  useEffect(() => {
    setAdminToken(sessionStorage.getItem(ADMIN_STORAGE_KEY));
  }, []);

  const loginAdmin = useCallback((token: string) => {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, token);
    setAdminToken(token);
    setShowAdminLogin(false);
  }, []);

  const logoutAdmin = useCallback(() => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdminToken(null);
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setReports(data.reports ?? []);
      setPersistent(Boolean(data.persistent));
    } catch {
      // se reintenta en el siguiente ciclo de polling
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      fetchReports();
      interval = setInterval(fetchReports, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      // Se pausa el polling cuando la pestaña no está visible para reducir
      // carga del servidor con muchos usuarios simultáneos.
      if (document.visibilityState === "visible") start();
      else stop();
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchReports]);

  const handlePick = useCallback((lat: number, lng: number) => {
    setDraft({ lat, lng });
  }, []);

  const handleSubmit = useCallback(
    async (payload: {
      type: ReportType;
      place: string;
      affected: number;
      needs: string;
    }) => {
      if (!draft) return;
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, lat: draft.lat, lng: draft.lng }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo publicar la alerta.");
      }
      const data = await res.json().catch(() => ({}));
      setDraft(null);
      // Update optimista: el reporte propio se ve al instante aunque el CDN
      // sirva una versión cacheada de la lista durante unos segundos.
      if (data.report) {
        setReports((prev) =>
          prev.some((r) => r.id === data.report.id)
            ? prev
            : [data.report, ...prev],
        );
      }
    },
    [draft],
  );

  const handleResolve = useCallback(
    async (id: string) => {
      if (!adminToken) {
        setShowAdminLogin(true);
        return;
      }
      const previous = reports;
      setReports((prev) => prev.filter((r) => r.id !== id));
      const res = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
        headers: { "x-admin-token": adminToken },
      }).catch(() => null);
      if (res && res.status === 401) {
        logoutAdmin();
        setReports(previous);
        setShowAdminLogin(true);
      }
    },
    [adminToken, reports, logoutAdmin],
  );

  const counts = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        acc[report.type] += 1;
        return acc;
      },
      { critical: 0, supplies: 0, shelter: 0 } as Record<ReportType, number>,
    );
  }, [reports]);

  const visibleReports = useMemo(() => {
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const terms = normalize(query)
      .split(/\s+/)
      .filter(Boolean);

    return reports.filter((report) => {
      if (filter !== "all" && report.type !== filter) return false;
      if (terms.length === 0) return true;
      const haystack = normalize(`${report.place} ${report.needs}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [reports, filter, query]);

  return (
    <section id="mapa" className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="relative h-[520px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm lg:h-[640px]">
          <MapView
            reports={reports}
            draft={draft}
            onPick={handlePick}
            onResolve={handleResolve}
            isAdmin={isAdmin}
            center={CARACAS}
            zoom={12}
          />
          <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-1.5 text-center text-xs font-medium text-white shadow">
            Toca un punto del mapa para reportar
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Reportes activos: {reports.length}
              </h3>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={logoutAdmin}
                  className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                  title="Cerrar sesión de administrador"
                >
                  Admin ✓ · Salir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(true)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  🔒 Admin
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              {(Object.keys(REPORT_TYPES) as ReportType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilter(filter === type ? "all" : type)}
                  className={`rounded-lg border p-2 transition ${
                    filter === type
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-base">
                    {REPORT_TYPES[type].emoji}
                  </span>
                  <span className="block text-lg font-bold">{counts[type]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, sector, zona o necesidad…"
              aria-label="Buscar reportes"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-slate-900"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            )}
          </div>

          <div className="max-h-[55vh] flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:max-h-full">
            {visibleReports.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">
                {query.trim()
                  ? `No se encontraron reportes para “${query.trim()}”.`
                  : `Aún no hay reportes${filter !== "all" ? " de este tipo" : ""}. Toca el mapa para crear el primero.`}
              </p>
            ) : (
              <>
                {(query.trim() || filter !== "all") && (
                  <p className="px-3 py-2 text-xs font-medium text-slate-500">
                    {visibleReports.length} resultado(s)
                  </p>
                )}
                <ul className="divide-y divide-slate-100">
                {visibleReports.map((report) => (
                  <li key={report.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {REPORT_TYPES[report.type].emoji} {report.place}
                        </p>
                        {report.affected > 0 && (
                          <p className="text-xs text-slate-600">
                            {report.affected} persona(s) afectada(s)
                          </p>
                        )}
                        {report.needs && (
                          <p className="text-xs text-slate-600">{report.needs}</p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-400">
                          {new Date(report.createdAt).toLocaleString("es-VE")}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleResolve(report.id)}
                          className="shrink-0 rounded-md border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Atendido
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>

      {!persistent && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Modo demo: los reportes no se están guardando de forma permanente.
          Conecta la base de datos (Neon) en Vercel para compartirlos entre
          todos los usuarios.
        </p>
      )}

      {draft && (
        <ReportForm
          coords={draft}
          onCancel={() => setDraft(null)}
          onSubmit={handleSubmit}
        />
      )}

      {showAdminLogin && (
        <AdminLogin
          onCancel={() => setShowAdminLogin(false)}
          onSuccess={loginAdmin}
        />
      )}
    </section>
  );
}
