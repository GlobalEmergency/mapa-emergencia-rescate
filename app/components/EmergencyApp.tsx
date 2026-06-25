"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  REPORT_TYPES,
  REPORT_TYPE_KEYS,
  type EmergencyReport,
  type ReportType,
} from "@/lib/types";
import ReportForm from "./ReportForm";
import AdminLogin from "./AdminLogin";
import AddressSearch, { type GeocodeResult } from "./AddressSearch";
import { useLowBandwidthMode } from "./useLowBandwidthMode";
import { distanceMeters, freshnessClass, timeAgo } from "@/lib/format";
import type { MissingMapMarker, MissingStats } from "@/lib/missing";
import type { MapBounds } from "./MapView";
import {
  countPending,
  enqueueReport,
  listPending,
  removePending,
  type QueuedPayload,
} from "@/lib/offline-queue";

const DUPLICATE_RADIUS_M = 50;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

type TimeFilter = "all" | "1h" | "24h" | "7d";
const TIME_FILTER_WINDOWS: Record<TimeFilter, number | null> = {
  all: null,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};
const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  all: "Todos",
  "1h": "1 h",
  "24h": "24 h",
  "7d": "7 d",
};

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
      Cargando mapa…
    </div>
  ),
});

const CARACAS: [number, number] = [10.4806, -66.9036];
// Centro de la zona afectada por el terremoto. Las búsquedas de direcciones
// priorizan resultados cercanos a este punto. Ajustar si el foco se desplaza.
const AFFECTED_CENTER: { lat: number; lng: number } = {
  lat: CARACAS[0],
  lng: CARACAS[1],
};
const POLL_INTERVAL_MS = 5000;
const LOW_BANDWIDTH_POLL_INTERVAL_MS = 30_000;
const ADMIN_STORAGE_KEY = "emergency:adminToken";

/** Etiquetas cortas para el grid de contadores; el label completo va en
 * `REPORT_TYPES[type].label` y se expone via title/aria-label. */
const REPORT_TYPE_SHORT: Record<ReportType, string> = {
  critical: "Crítica",
  supplies: "Suministros",
  shelter: "Acopio",
  nopower: "Sin luz",
  missing: "Buscan",
  building: "Edificios",
};

type SubmitOutcome =
  | { status: "ok"; report?: EmergencyReport }
  // Fallo transitorio (sin conexión, 429 o 503): conviene encolar y reintentar.
  | { status: "queue" }
  // Fallo permanente (datos inválidos): no tiene sentido reintentar.
  | { status: "drop"; error: string };

/** Envía un reporte al servidor y clasifica el resultado para decidir si se
 * muestra, se encola para reintento, o se descarta. */
async function postReportToServer(
  payload: QueuedPayload,
): Promise<SubmitOutcome> {
  let res: Response;
  try {
    res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Red caída: no llegó al servidor.
    return { status: "queue" };
  }
  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    return { status: "ok", report: data.report };
  }
  // Servidor alcanzable pero con error transitorio: reintentamos más tarde.
  if (res.status === 429 || res.status === 503) return { status: "queue" };
  const data = await res.json().catch(() => ({}));
  return {
    status: "drop",
    error: data.error ?? "No se pudo publicar la alerta.",
  };
}

export default function EmergencyApp() {
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [persistent, setPersistent] = useState(true);
  const [filter, setFilter] = useState<ReportType | "all">("all");
  const [confirmed, setConfirmed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("emergency:confirmed");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [now, setNow] = useState<number>(() => Date.now());
  const [query, setQuery] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [queuedFlash, setQueuedFlash] = useState(false);
  const flushingRef = useRef(false);
  const [adminToken, setAdminToken] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : sessionStorage.getItem(ADMIN_STORAGE_KEY),
  );
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    ts: number;
    id?: string;
  } | null>(null);
  const [missingStats, setMissingStats] = useState<MissingStats | null>(null);
  const [missingMapMarkers, setMissingMapMarkers] = useState<MissingMapMarker[]>(
    [],
  );
  const mapBoundsRef = useRef<MapBounds | null>(null);

  const isAdmin = Boolean(adminToken);

  // Refresca el reloj cada 30 s para que las etiquetas "hace X min" se mantengan
  // al día sin tener que recargar los reportes desde el servidor.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
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

  const fetchMissingStats = useCallback(async () => {
    try {
      const res = await fetch("/api/missing/stats", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMissingStats(data.stats ?? null);
    } catch {
      // se reintenta en el siguiente ciclo
    }
  }, []);

  const fetchMissingMap = useCallback(async (bounds?: MapBounds | null) => {
    try {
      const b = bounds ?? mapBoundsRef.current;
      const qs = b
        ? `?north=${b.north}&south=${b.south}&east=${b.east}&west=${b.west}&limit=800`
        : "?limit=800";
      const res = await fetch(`/api/missing/map${qs}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMissingMapMarkers(data.markers ?? []);
    } catch {
      // se reintenta al mover el mapa
    }
  }, []);

  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      mapBoundsRef.current = bounds;
      fetchMissingMap(bounds);
    },
    [fetchMissingMap],
  );

  const handleConfirm = useCallback(
    async (id: string) => {
      setConfirmed((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(
            "emergency:confirmed",
            JSON.stringify([...next]),
          );
        } catch {
          /* localStorage puede no estar disponible */
        }
        return next;
      });
      setReports((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, confirmations: r.confirmations + 1 } : r,
        ),
      );
      const res = await fetch(`/api/reports/${id}/confirm`, {
        method: "POST",
      }).catch(() => null);
      if (res && (res.status === 409 || !res.ok)) {
        // El servidor rechazó (dedup u otro): refrescamos para reconciliar.
        fetchReports();
      }
    },
    [fetchReports],
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      fetchReports();
      fetchMissingStats();
      fetchMissingMap();
      interval = setInterval(() => {
        fetchReports();
        fetchMissingStats();
      }, network.pollIntervalMs);
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
  }, [fetchReports, fetchMissingStats, fetchMissingMap, network.pollIntervalMs]);

  // Intenta enviar los reportes encolados sin conexión. Se detiene en cuanto
  // la red vuelve a fallar y reintentará en el siguiente disparo.
  const flushPending = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      const pending = await listPending();
      for (const item of pending) {
        const outcome = await postReportToServer(item.payload);
        if (outcome.status === "ok") {
          await removePending(item.localId);
          if (outcome.report) {
            const created = outcome.report;
            setReports((prev) =>
              prev.some((r) => r.id === created.id) ? prev : [created, ...prev],
            );
          }
        } else if (outcome.status === "drop") {
          // El servidor rechazó los datos: lo descartamos para no reintentar
          // indefinidamente un reporte que nunca será aceptado.
          await removePending(item.localId);
        } else {
          // Sigue sin conexión: cortamos el barrido y reintentamos luego.
          break;
        }
      }
    } finally {
      flushingRef.current = false;
      try {
        setPendingCount(await countPending());
      } catch {
        /* IndexedDB no disponible: dejamos el contador como está */
      }
    }
  }, []);

  // Cuenta pendientes al cargar, intenta enviarlos y reintenta al recuperar la
  // conexión (el evento "online" del navegador).
  useEffect(() => {
    flushPending();
    const onOnline = () => flushPending();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flushPending]);

  // Mientras queden pendientes, reintenta periódicamente por si la conexión
  // volvió de forma intermitente sin disparar el evento "online".
  useEffect(() => {
    if (pendingCount === 0) return;
    const id = setInterval(() => flushPending(), 15_000);
    return () => clearInterval(id);
  }, [pendingCount, flushPending]);

  // Oculta el aviso de "reporte guardado" tras unos segundos.
  useEffect(() => {
    if (!queuedFlash) return;
    const id = setTimeout(() => setQueuedFlash(false), 5000);
    return () => clearTimeout(id);
  }, [queuedFlash]);

  const handlePick = useCallback((lat: number, lng: number) => {
    setDraft({ lat, lng });
  }, []);

  const handleAddressSelect = useCallback((result: GeocodeResult) => {
    setFocus({ lat: result.lat, lng: result.lng, ts: Date.now() });
    setDraft({ lat: result.lat, lng: result.lng });
  }, []);

  const handleFocusReport = useCallback((report: EmergencyReport) => {
    setFocus({
      lat: report.lat,
      lng: report.lng,
      id: report.id,
      ts: Date.now(),
    });
    // En móvil la lista está debajo del mapa: llevamos al usuario al mapa.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      document
        .getElementById("mapa")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleSubmit = useCallback(
    async (payload: {
      type: ReportType;
      place: string;
      affected: number;
      needs: string;
      photo: string | null;
    }) => {
      if (!draft) return;

      // Detección de duplicados: mismo tipo, < 50 m, en las últimas 24 h.
      const candidates = reports.filter(
        (r) =>
          r.type === payload.type &&
          Date.now() - r.createdAt < DUPLICATE_WINDOW_MS &&
          distanceMeters(draft, r) < DUPLICATE_RADIUS_M,
      );
      if (candidates.length > 0) {
        const near = candidates[0];
        const ok =
          typeof window === "undefined" ||
          window.confirm(
            `Ya existe un reporte similar muy cerca (${Math.round(
              distanceMeters(draft, near),
            )} m): "${near.place}".\n\n¿Aun así quieres publicar el tuyo?`,
          );
        if (!ok) {
          throw new Error("Publicación cancelada para evitar duplicado.");
        }
      }

      const full: QueuedPayload = { ...payload, lat: draft.lat, lng: draft.lng };
      const outcome = await postReportToServer(full);

      if (outcome.status === "drop") {
        // Datos rechazados por el servidor: el formulario muestra el error.
        throw new Error(outcome.error);
      }

      if (outcome.status === "queue") {
        // Sin conexión o servidor no disponible: guardamos el reporte en el
        // dispositivo y lo reintentamos automáticamente al recuperar la red.
        try {
          await enqueueReport(full);
        } catch {
          throw new Error(
            "No hay conexión y no se pudo guardar el reporte en este dispositivo. Inténtalo de nuevo.",
          );
        }
        setDraft(null);
        setPendingCount(await countPending());
        setQueuedFlash(true);
        return;
      }

      // outcome.status === "ok"
      setDraft(null);
      // Update optimista: el reporte propio se ve al instante aunque el CDN
      // sirva una versión cacheada de la lista durante unos segundos.
      if (outcome.report) {
        const created = outcome.report;
        setReports((prev) =>
          prev.some((r) => r.id === created.id) ? prev : [created, ...prev],
        );
      }
    },
    [draft, reports],
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
    const base = Object.fromEntries(
      REPORT_TYPE_KEYS.map((key) => [key, 0]),
    ) as Record<ReportType, number>;
    for (const report of reports) {
      if (base[report.type] !== undefined) base[report.type] += 1;
    }
    // Total consolidado de desaparecidos activos en la base de datos.
    if (missingStats) {
      base.missing = missingStats.active;
    }
    return base;
  }, [reports, missingStats]);

  const showMissingOnMap = filter === "all" || filter === "missing";

  const mapReports = useMemo(() => {
    if (filter === "all") return reports;
    return reports.filter((r) => r.type === filter);
  }, [reports, filter]);

  const visibleReports = useMemo(() => {
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const terms = normalize(query)
      .split(/\s+/)
      .filter(Boolean);
    const window = TIME_FILTER_WINDOWS[timeFilter];

    return reports.filter((report) => {
      if (filter !== "all" && report.type !== filter) return false;
      if (window !== null && now - report.createdAt > window) return false;
      if (terms.length === 0) return true;
      const haystack = normalize(`${report.place} ${report.needs}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [reports, filter, query, timeFilter, now]);

  return (
    <section id="mapa" className="mx-auto w-full max-w-7xl px-4 py-10">
      {pendingCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <span className="flex items-center gap-2">
            <span aria-hidden>📡</span>
            <span>
              {pendingCount === 1
                ? "1 reporte sin enviar"
                : `${pendingCount} reportes sin enviar`}
              {" · se enviarán automáticamente al recuperar la conexión."}
            </span>
          </span>
          <button
            type="button"
            onClick={() => flushPending()}
            className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Reintentar ahora
          </button>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          {network.isConstrained && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {network.isOnline
                ? `Conexión lenta: actualizando cada ${Math.round(
                    network.pollIntervalMs / 1000,
                  )} s para ahorrar datos.`
                : "Sin conexión: mostrando datos guardados cuando estén disponibles."}
            </div>
          )}
          <AddressSearch
            onSelect={handleAddressSelect}
            bias={focus ? { lat: focus.lat, lng: focus.lng } : AFFECTED_CENTER}
          />
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-3">
              <span
                aria-hidden
                className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-700 ring-1 ring-red-200"
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-25" />
                <span className="relative text-base font-black">!</span>
              </span>
              <span>
                <strong className="font-semibold text-slate-950">
                  Riesgo sísmico:
                </strong>{" "}
                priorización de inspección, no daño confirmado.
              </span>
            </span>
            <Link
              href="/riesgo-sismico"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Ver riesgo sísmico
            </Link>
          </div>
          <div className="relative h-[520px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm lg:h-[640px]">
            <MapView
              reports={mapReports}
              missingMarkers={missingMapMarkers}
              showMissingOnMap={showMissingOnMap}
              onBoundsChange={handleBoundsChange}
              draft={draft}
              onPick={handlePick}
              onResolve={handleResolve}
              onConfirm={handleConfirm}
              confirmed={confirmed}
              isAdmin={isAdmin}
              focus={focus}
              center={CARACAS}
              zoom={12}
            />
            <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-1.5 text-center text-xs font-medium text-white shadow">
              Toca un punto del mapa para reportar
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Desaparecidos activos:{" "}
                  {missingStats
                    ? missingStats.active.toLocaleString("es-VE")
                    : "…"}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Reportes en mapa: {reports.length}
                  {missingStats && missingStats.onMap > 0 && (
                    <>
                      {" "}
                      · {missingStats.onMap.toLocaleString("es-VE")} con punto
                      en el mapa
                    </>
                  )}
                </p>
              </div>
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
            <p className="mt-3 text-[11px] text-slate-500">
              Toca un tipo para filtrar la lista
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              {(Object.keys(REPORT_TYPES) as ReportType[]).map((type) => {
                const meta = REPORT_TYPES[type];
                const active = filter === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilter(active ? "all" : type)}
                    title={meta.label}
                    aria-label={`${meta.label}: ${counts[type]}`}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span
                      className="grid h-7 w-7 place-items-center rounded-full text-sm text-white shadow-sm"
                      style={{ background: meta.color }}
                      aria-hidden
                    >
                      {meta.icon}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {counts[type]}
                    </span>
                    <span
                      className={`text-[10px] font-medium leading-tight ${active ? "text-slate-200" : "text-slate-500"}`}
                    >
                      {REPORT_TYPE_SHORT[type]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs"
            role="group"
            aria-label="Filtrar por antigüedad"
          >
            {(Object.keys(TIME_FILTER_LABELS) as TimeFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTimeFilter(key)}
                aria-pressed={timeFilter === key}
                className={`flex-1 rounded-lg px-2 py-1.5 font-medium transition ${
                  timeFilter === key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {TIME_FILTER_LABELS[key]}
              </button>
            ))}
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

          <div className="max-h-[55vh] flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:max-h-[520px]">
            {filter === "missing" && missingStats && missingStats.active > 0 && (
              <div className="mb-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-900">
                Hay{" "}
                <strong>{missingStats.active.toLocaleString("es-VE")}</strong>{" "}
                personas desaparecidas en la base consolidada. En el mapa se
                muestran las que tienen ubicación geocodificada (
                {missingStats.onMap.toLocaleString("es-VE")}).{" "}
                <a href="#desaparecidas" className="font-semibold underline">
                  Ver lista completa →
                </a>
              </div>
            )}
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
                  <li key={report.id} className="p-1">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleFocusReport(report)}
                        aria-label={`Ver ${report.place} en el mapa`}
                        className="flex min-w-0 flex-1 items-start gap-2 rounded-lg p-2 text-left transition hover:bg-slate-50 active:bg-slate-100"
                      >
                        {report.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={report.photoUrl}
                            alt=""
                            loading="lazy"
                            className="h-12 w-12 shrink-0 rounded-md object-cover ring-1 ring-slate-200"
                          />
                        )}
                        <div className="min-w-0 flex-1">
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
                          <p
                            className={`mt-1 text-[11px] font-medium ${freshnessClass(report.createdAt, now)}`}
                            title={new Date(report.createdAt).toLocaleString(
                              "es-VE",
                            )}
                          >
                            🕒 {timeAgo(report.createdAt, now)}
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleConfirm(report.id)}
                          disabled={confirmed.has(report.id)}
                          aria-label={
                            confirmed.has(report.id)
                              ? "Ya confirmaste este reporte"
                              : "Confirmar que veo este reporte"
                          }
                          title={
                            confirmed.has(report.id)
                              ? "Ya confirmaste este reporte"
                              : "Yo también veo esto"
                          }
                          className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                            confirmed.has(report.id)
                              ? "border-slate-200 bg-slate-100 text-slate-500"
                              : "border-sky-200 text-sky-700 hover:bg-sky-50"
                          }`}
                        >
                          ✓ +{report.confirmations}
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleResolve(report.id)}
                            className="rounded-md border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            Atendido
                          </button>
                        )}
                      </div>
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
          onCoordsChange={(c) => setDraft(c)}
          onSubmit={handleSubmit}
        />
      )}

      {showAdminLogin && (
        <AdminLogin
          onCancel={() => setShowAdminLogin(false)}
          onSuccess={loginAdmin}
        />
      )}

      {queuedFlash && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-4 z-[2500] mx-auto w-fit max-w-[92%] rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white shadow-lg"
        >
          ✅ Reporte guardado. Se enviará automáticamente cuando vuelva la
          conexión.
        </div>
      )}
    </section>
  );
}
