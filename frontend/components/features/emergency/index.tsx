"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  REPORT_TYPES,
  REPORT_TYPE_KEYS,
  type EmergencyReport,
  type ReportType,
} from "@/lib/types";
import { distanceMeters } from "@/lib/format";
import { EDIFICIOS_COUNT } from "@/lib/edificios";
import { qk } from "@/lib/query-keys";
import {
  useReports,
  useMissingMap,
  useConfirmReport,
  useResolveReport,
  type ReportsResponse,
} from "@/hooks/emergency";
import { useLowBandwidthMode } from "@/hooks/useLowBandwidthMode";
import { useMissingStats } from "@/hooks/useMissingStats";
import type { MapBounds } from "@/components/features/map";
import type { GeocodeResult } from "@/components/features/emergency/AddressSearch";
import {
  countPending,
  enqueueReport,
  listPending,
  postReportToServer,
  removePending,
  type QueuedPayload,
} from "./offline-queue";
import MapPanel from "./MapPanel";
import ReportsLayer from "./ReportsLayer";
import ReportComposer, { type ReportComposerSubmit } from "./ReportComposer";
import AdminPanel from "./AdminPanel";

const DUPLICATE_RADIUS_M = 50;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const OPEN_EMERGENCY_REPORT_EVENT = "open-emergency-report";

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
const LIST_PAGE_SIZE = 30;
// Debounce de bounds del mapa: evita un request por cada frame de pan/zoom.
const MAP_BOUNDS_DEBOUNCE_MS = 350;
// Debounce del filtro de texto (filtrado en cliente, sin red).
const SEARCH_DEBOUNCE_MS = 350;

export default function EmergencyApp() {
  const qc = useQueryClient();
  const network = useLowBandwidthMode(
    POLL_INTERVAL_MS,
    LOW_BANDWIDTH_POLL_INTERVAL_MS,
  );

  // --- Datos vía TanStack Query ---
  const reportsQuery = useReports(network.pollIntervalMs);
  const reports = useMemo(
    () => reportsQuery.data?.reports ?? [],
    [reportsQuery.data],
  );
  const persistent = reportsQuery.data?.persistent ?? true;

  // Bounds del mapa: ref para el valor inmediato + estado debounced que alimenta
  // la query de marcadores (un request por cada ~350ms de pan, no por frame).
  const [debouncedBounds, setDebouncedBounds] = useState<MapBounds | null>(null);
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missingMapQuery = useMissingMap(debouncedBounds);
  const missingMapMarkers = useMemo(
    () => missingMapQuery.data ?? [],
    [missingMapQuery.data],
  );

  const confirmMutation = useConfirmReport();
  const resolveMutation = useResolveReport();

  // Helper: actualiza la lista de reportes en cache (updates optimistas).
  const patchReports = useCallback(
    (fn: (prev: EmergencyReport[]) => EmergencyReport[]) => {
      qc.setQueryData<ReportsResponse>(qk.reports.list, (prev) =>
        prev
          ? { ...prev, reports: fn(prev.reports) }
          : { reports: fn([]), persistent: true },
      );
    },
    [qc],
  );

  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  // Filtro multi-selección inclusivo: se muestran TODOS los tipos elegidos
  // (unión). Por defecto solo viene activo un tipo; el resto se enciende al
  // tocar su chip (cada chip prende/apaga su capa en el mapa).
  const [selectedTypes, setSelectedTypes] = useState<Set<ReportType>>(
    () => new Set<ReportType>(["critical"]),
  );
  const [confirmed, setConfirmed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("emergency:confirmed");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [now, setNow] = useState<number>(() => Date.now());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [listLimit, setListLimit] = useState(LIST_PAGE_SIZE);
  // Modo "colocar reporte": el próximo toque del mapa ubica el reporte. Evita
  // que un clic accidental abra el formulario.
  const [placing, setPlacing] = useState(false);
  // El formulario de reporte está abierto (independiente de si ya hay ubicación).
  const [reportOpen, setReportOpen] = useState(false);
  // Pedido de encuadre del mapa a los pines de un filtro (se actualiza al tocar
  // un chip de tipo).
  const [fitRequest, setFitRequest] = useState<{
    points: { lat: number; lng: number }[];
    ts: number;
  } | null>(null);
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
  } | null>(() => {
    // Enlace profundo: si la URL trae lat/lng (link compartido de un reporte),
    // arrancamos con el foco en ese punto para que el mapa vuele hasta él.
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const latRaw = params.get("lat");
    const lngRaw = params.get("lng");
    if (!latRaw || !lngRaw) return null;
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, ts: Date.now() };
  });
  // Store compartido: un solo poll de /api/missing/stats para toda la página
  // (la navbar también lo usa).
  const missingStats = useMissingStats();

  const isAdmin = Boolean(adminToken);

  // Refresca el reloj cada 30 s para que las etiquetas "hace X min" se mantengan
  // al día sin tener que recargar los reportes desde el servidor.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Debounce del filtro de texto (filtrado en cliente, sin red).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Esc cierra en cascada: primero "elegir en el mapa", luego el formulario de
  // reporte, luego el login de admin. Usamos fase de CAPTURA porque Leaflet
  // tiene su propio handler de teclado en el contenedor del mapa que se come el
  // Escape; capturar en window lo intercepta antes, sin depender del foco.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (placing) setPlacing(false);
      else if (reportOpen) {
        setReportOpen(false);
        setDraft(null);
      } else if (showAdminLogin) setShowAdminLogin(false);
      else return;
      event.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [placing, reportOpen, showAdminLogin]);

  const loginAdmin = useCallback((token: string) => {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, token);
    setAdminToken(token);
    setShowAdminLogin(false);
  }, []);

  const logoutAdmin = useCallback(() => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdminToken(null);
  }, []);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    if (boundsTimer.current) clearTimeout(boundsTimer.current);
    boundsTimer.current = setTimeout(() => {
      setDebouncedBounds(bounds);
    }, MAP_BOUNDS_DEBOUNCE_MS);
  }, []);

  const handleConfirm = useCallback(
    (id: string) => {
      setConfirmed((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem("emergency:confirmed", JSON.stringify([...next]));
        } catch {
          /* localStorage puede no estar disponible */
        }
        return next;
      });
      patchReports((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, confirmations: r.confirmations + 1 } : r,
        ),
      );
      confirmMutation.mutate(id, {
        onError: () => {
          // El servidor rechazó (dedup u otro): refrescamos para reconciliar.
          qc.invalidateQueries({ queryKey: qk.reports.all });
        },
      });
    },
    [patchReports, confirmMutation, qc],
  );

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
            patchReports((prev) =>
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
  }, [patchReports]);

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

  const handlePick = useCallback(
    (lat: number, lng: number) => {
      // El clic en el mapa solo crea un reporte cuando el usuario activó el
      // modo "colocar" con el botón "+ Reportar". Un clic normal no hace nada.
      if (placing) {
        setDraft({ lat, lng });
        setPlacing(false);
      }
    },
    [placing],
  );

  // El buscador de direcciones solo navega (vuela el mapa al punto); ya no abre
  // el formulario, para crear se usa el botón "+ Reportar".
  const handleAddressSelect = useCallback((result: GeocodeResult) => {
    setFocus({ lat: result.lat, lng: result.lng, ts: Date.now() });
  }, []);

  const handleFocusReport = useCallback((report: EmergencyReport) => {
    setFocus({
      lat: report.lat,
      lng: report.lng,
      id: report.id,
      ts: Date.now(),
    });
    // La lista vive debajo del mapa: subimos al mapa para ver el pin y su popup.
    document
      .getElementById("mapa")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // "+ Reportar" abre el modal SIN ubicación: el usuario la elige con "Elegir
  // en el mapa" o "Usar mi ubicación". El clic suelto en el mapa NO abre nada
  // (sin aperturas accidentales).
  const startReport = useCallback(() => {
    setPlacing(false);
    setDraft(null);
    setReportOpen(true);
  }, []);

  useEffect(() => {
    const openEmergencyReport = () => {
      document
        .getElementById("mapa")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      startReport();
    };

    window.addEventListener(OPEN_EMERGENCY_REPORT_EVENT, openEmergencyReport);
    return () =>
      window.removeEventListener(
        OPEN_EMERGENCY_REPORT_EVENT,
        openEmergencyReport,
      );
  }, [startReport]);

  const closeReport = useCallback(() => {
    setReportOpen(false);
    setDraft(null);
    setPlacing(false);
  }, []);

  // Al tocar un chip: alterna ese tipo en la selección y RECALCULA el encuadre
  // a la unión de pines seleccionados, tanto al agregar como al quitar (los
  // "missing" del cluster dependen del viewport; sumamos los cargados). Si no
  // queda nada seleccionado, no movemos el mapa.
  const handleChipClick = useCallback(
    (type: ReportType) => {
      const next = new Set(selectedTypes);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      setSelectedTypes(next);
      const points = reports
        .filter((r) => next.has(r.type))
        .map((r) => ({ lat: r.lat, lng: r.lng }));
      if (next.has("missing")) {
        for (const m of missingMapMarkers) {
          points.push({ lat: m.lat, lng: m.lng });
        }
      }
      if (points.length > 0) setFitRequest({ points, ts: Date.now() });
    },
    [selectedTypes, reports, missingMapMarkers],
  );

  const [shareCopied, setShareCopied] = useState(false);
  const shareMap = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Mapa de Emergencia y Rescate", url });
        return;
      } catch {
        // el usuario canceló o falló: intentamos copiar al portapapeles
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* sin permisos de portapapeles: no hacemos nada */
    }
  }, []);

  const handleSubmit = useCallback(
    async (payload: ReportComposerSubmit) => {
      if (!draft) return;

      // Detección de duplicados: mismo tipo, < 50 m, en las últimas 24 h.
      const candidates = reports.filter(
        (r) =>
          r.type === payload.type &&
          Date.now() - r.createdAt < DUPLICATE_WINDOW_MS &&
          distanceMeters(draft, r) < DUPLICATE_RADIUS_M,
      );
      if (candidates.length > 0) {
        const near = candidates[0]!;
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

      const full: QueuedPayload = {
        ...payload,
        lat: draft.lat,
        lng: draft.lng,
      };
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
        setReportOpen(false);
        setDraft(null);
        setPendingCount(await countPending());
        setQueuedFlash(true);
        return;
      }

      // outcome.status === "ok"
      setReportOpen(false);
      setDraft(null);
      // Update optimista: el reporte propio se ve al instante aunque el CDN
      // sirva una versión cacheada de la lista durante unos segundos.
      if (outcome.report) {
        const created = outcome.report;
        patchReports((prev) =>
          prev.some((r) => r.id === created.id) ? prev : [created, ...prev],
        );
      }
    },
    [draft, reports, patchReports],
  );

  const handleResolve = useCallback(
    (id: string) => {
      if (!adminToken) {
        setShowAdminLogin(true);
        return;
      }
      const previous = reports;
      patchReports((prev) => prev.filter((r) => r.id !== id));
      resolveMutation.mutate(
        { id, adminToken },
        {
          onError: (err) => {
            // 401: token vencido → cerramos sesión, restauramos y pedimos login.
            if (
              typeof err === "object" &&
              err !== null &&
              "status" in err &&
              (err as { status?: number }).status === 401
            ) {
              logoutAdmin();
              patchReports(() => previous);
              setShowAdminLogin(true);
            }
          },
        },
      );
    },
    [adminToken, reports, patchReports, resolveMutation, logoutAdmin],
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
    // Los edificios importados (read-only) se suman al conteo de "Edificios".
    base.building += EDIFICIOS_COUNT;
    return base;
  }, [reports, missingStats]);

  const allTypesSelected = selectedTypes.size === REPORT_TYPE_KEYS.length;
  const showMissingOnMap = selectedTypes.has("missing");
  // La capa de edificios importados se muestra cuando "Edificios" está elegido.
  const showEdificios = selectedTypes.has("building");

  const mapReports = useMemo(() => {
    return reports.filter((r) => selectedTypes.has(r.type));
  }, [reports, selectedTypes]);

  const visibleReports = useMemo(() => {
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
    const terms = normalize(debouncedQuery).split(/\s+/).filter(Boolean);

    return reports.filter((report) => {
      if (!selectedTypes.has(report.type)) return false;
      if (terms.length === 0) return true;
      const haystack = normalize(`${report.place} ${report.needs}`);
      return terms.every((term) => haystack.includes(term));
    });
  }, [reports, selectedTypes, debouncedQuery]);

  const filterKey = `${[...selectedTypes].sort().join(",")}|${debouncedQuery}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setListLimit(LIST_PAGE_SIZE);
  }

  const shownReports = visibleReports.slice(0, listLimit);
  const remainingReports = visibleReports.length - shownReports.length;

  const handleLoadMore = useCallback(
    () => setListLimit((n) => n + LIST_PAGE_SIZE),
    [],
  );

  return (
    <section
      id="mapa"
      className="mx-auto w-full max-w-[1760px] px-4 py-10 sm:px-6 lg:px-10"
    >
      <div className="mx-auto mb-5 flex w-full max-w-[1760px] flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="qi-h2">Mapa de reportes en tiempo real</h2>
          <p className="mt-1 text-sm text-[var(--etext2)]">
            Toca un punto del mapa para reportar o ver el estado de una zona.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={shareMap}
            aria-label="Compartir el mapa"
            title="Compartir el mapa"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span aria-hidden>{shareCopied ? "✓" : "🔗"}</span>
            <span>{shareCopied ? "Copiado" : "Compartir"}</span>
          </button>
          <button
            type="button"
            onClick={startReport}
            className="inline-flex min-h-10 items-center rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            Reportar Información
          </button>
        </div>
      </div>
      {pendingCount > 0 && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
        >
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
      {network.isConstrained && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {network.isOnline
            ? `Conexión lenta: actualizando cada ${Math.round(
                network.pollIntervalMs / 1000,
              )} s para ahorrar datos.`
            : "Sin conexión: mostrando datos guardados cuando estén disponibles."}
        </div>
      )}
      <div className={`e-map-grid ${placing ? "is-placing" : ""}`}>
        <MapPanel
          mapReports={mapReports}
          missingMapMarkers={missingMapMarkers}
          showMissingOnMap={showMissingOnMap}
          showEdificios={showEdificios}
          draft={draft}
          confirmed={confirmed}
          isAdmin={isAdmin}
          focus={focus}
          fitRequest={fitRequest}
          center={CARACAS}
          selectedTypes={selectedTypes}
          counts={counts}
          addressBias={
            focus ? { lat: focus.lat, lng: focus.lng } : AFFECTED_CENTER
          }
          placing={placing}
          shareCopied={shareCopied}
          onBoundsChange={handleBoundsChange}
          onPick={handlePick}
          onResolve={handleResolve}
          onConfirm={handleConfirm}
          onAddressSelect={handleAddressSelect}
          onChipClick={handleChipClick}
          onCancelPlacing={() => setPlacing(false)}
          onShare={shareMap}
          onStartReport={startReport}
        />

        <ReportsLayer
          reports={reports}
          visibleReports={visibleReports}
          shownReports={shownReports}
          remainingReports={remainingReports}
          selectedTypes={selectedTypes}
          allTypesSelected={allTypesSelected}
          query={query}
          onQueryChange={setQuery}
          now={now}
          confirmed={confirmed}
          isAdmin={isAdmin}
          missingStats={missingStats}
          onLoadMore={handleLoadMore}
          onFocusReport={handleFocusReport}
          onConfirm={handleConfirm}
          onResolve={handleResolve}
          onLogout={logoutAdmin}
        />
      </div>

      {!persistent && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Modo demo: los reportes no se están guardando de forma permanente.
          Conecta la base de datos (Neon) en Vercel para compartirlos entre todos
          los usuarios.
        </p>
      )}

      <ReportComposer
        open={reportOpen}
        coords={draft}
        hidden={placing}
        queuedFlash={queuedFlash}
        onPickOnMap={() => setPlacing(true)}
        onClearLocation={() => setDraft(null)}
        onCancel={closeReport}
        onCoordsChange={(c) => setDraft(c)}
        onSubmit={handleSubmit}
      />

      <AdminPanel
        open={showAdminLogin}
        onCancel={() => setShowAdminLogin(false)}
        onSuccess={loginAdmin}
      />
    </section>
  );
}
