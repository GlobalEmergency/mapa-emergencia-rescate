"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import Supercluster, { type ClusterProperties, type AnyProps } from "supercluster";
import { REPORT_TYPES, type EmergencyReport, type ReportType } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { xShareHref, whatsappShareHref } from "@/lib/share";
import LinkText from "./LinkText";
import type { MissingMapMarker } from "@/lib/missing";
import EdificiosAfectadosLayer from "./EdificiosAfectadosLayer";

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

function jitterPosition(id: string, lat: number, lng: number): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const angle = ((h % 360) * Math.PI) / 180;
  const radius = 0.00025 * ((Math.abs(h) % 8) + 1);
  return [lat + radius * Math.cos(angle), lng + radius * Math.sin(angle)];
}

const iconCache = new Map<ReportType, L.DivIcon>();

function markerIcon(type: ReportType): L.DivIcon {
  const cached = iconCache.get(type);
  if (cached) return cached;
  const meta = REPORT_TYPES[type];
  const icon = L.divIcon({
    className: "emergency-marker",
    html: `<span class="emergency-pin" style="background:${meta.color}"><span class="emergency-pin__icon">${meta.icon}</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
  iconCache.set(type, icon);
  return icon;
}

/** Devuelve bg sólido, anillo exterior y tamaño del cluster según el número de puntos. */
function clusterVisual(count: number): { bg: string; ring: string; size: number } {
  const size =
    count >= 500 ? 72 :
    count >= 100 ? 60 :
    count >= 50  ? 52 :
    count >= 20  ? 44 :
    count >= 10  ? 38 : 32;

  if (count >= 50) return { bg: "#dc2626", ring: "rgba(220,38,38,0.28)", size };
  if (count >= 10) return { bg: "#d97706", ring: "rgba(217,119,6,0.28)", size };
  return { bg: "#2563eb", ring: "rgba(37,99,235,0.28)", size };
}

function clusterIcon(count: number): L.DivIcon {
  const { bg, ring, size } = clusterVisual(count);
  const inner = Math.round(size * 0.72);
  const label = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
  const fs = inner < 36 ? 11 : 13;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${ring};display:flex;align-items:center;justify-content:center;"><div style="width:${inner}px;height:${inner}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:${fs}px;font-weight:700;font-family:system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.35);">${label}</div></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

type MissingProps = { id: string; name: string; age: number | null; lastSeen: string; photoUrl: string | null };
type ClusterFeature = ReturnType<Supercluster<MissingProps>["getClusters"]>[number];
type ClusterOrPoint = (ClusterProperties & AnyProps) | MissingProps;

function MissingClusterLayer({
  markers,
  markerRefs,
}: {
  markers: MissingMapMarker[];
  markerRefs: React.MutableRefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();
  const [clusters, setClusters] = useState<ClusterFeature[]>([]);

  const sc = useMemo(() => {
    const index = new Supercluster<MissingProps>({ radius: 60, maxZoom: 17 });
    index.load(
      markers.map((m) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] },
        properties: { id: m.id, name: m.name, age: m.age, lastSeen: m.lastSeen, photoUrl: m.photoUrl },
      }))
    );
    return index;
  }, [markers]);

  const updateClusters = useCallback(() => {
    const b = map.getBounds();
    setClusters(
      sc.getClusters(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        Math.floor(map.getZoom())
      )
    );
  }, [map, sc]);

  useEffect(() => { updateClusters(); }, [updateClusters]);

  useMapEvents({ moveend: updateClusters, zoomend: updateClusters });

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties as ClusterOrPoint;

        if ("cluster" in props && props.cluster) {
          const count = props.point_count as number;
          const clusterId = props.cluster_id as number;
          return (
            <Marker
              key={`cluster-${clusterId}`}
              position={[lat, lng]}
              icon={clusterIcon(count)}
              eventHandlers={{
                click: () => {
                  const zoom = sc.getClusterExpansionZoom(clusterId);
                  map.flyTo([lat, lng], zoom, { duration: 0.5 });
                },
              }}
            />
          );
        }

        const p = props as MissingProps;
        const [jLat, jLng] = jitterPosition(p.id, lat, lng);
        const markerId = `missing:${p.id}`;
        return (
          <Marker
            key={markerId}
            position={[jLat, jLng]}
            icon={markerIcon("missing")}
            ref={(marker) => {
              if (marker) markerRefs.current.set(markerId, marker);
              else markerRefs.current.delete(markerId);
            }}
          >
            <Popup>
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold">{REPORT_TYPES.missing.emoji} Se busca</p>
                {p.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photoUrl}
                    alt={`Foto de ${p.name}`}
                    loading="lazy"
                    className="my-1 max-h-52 w-full rounded-lg bg-slate-100 object-contain"
                  />
                )}
                <p className="font-medium">{p.name}</p>
                {p.age !== null && (
                  <p className="text-xs text-slate-600">{p.age} años</p>
                )}
                {p.lastSeen && (
                  <p className="text-slate-600">📍 {p.lastSeen}</p>
                )}
                <a
                  href="#desaparecidas"
                  className="mt-1 inline-block text-xs font-medium text-purple-700 underline"
                >
                  Ver ficha completa →
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

function FlyToHandler({
  focus,
  getMarker,
}: {
  focus: { lat: number; lng: number; ts: number; id?: string } | null;
  getMarker: (id: string) => L.Marker | undefined;
}) {
  const map = useMap();
  const lastTs = useRef<number | null>(null);
  useEffect(() => {
    if (!focus || focus.ts === lastTs.current) return;
    lastTs.current = focus.ts;
    map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 16), { duration: 1 });
    if (focus.id) {
      const id = focus.id;
      map.once("moveend", () => { getMarker(id)?.openPopup(); });
    }
  }, [focus, map, getMarker]);
  return null;
}

/** Cierra el popup abierto al presionar Esc, sin importar dónde esté el foco.
 * Acotado: no hace nada si hay un modal/diálogo abierto (lo maneja él). */
function EscClosePopup() {
  const map = useMap();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (
        document.querySelector('[role="dialog"][aria-modal="true"]:not(.hidden)')
      )
        return;
      if (document.querySelector(".leaflet-popup")) {
        map.closePopup();
        event.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [map]);
  return null;
}

/** Centra y hace zoom para que entren en pantalla los pines del filtro activo. */
function FitToBoundsHandler({
  fitRequest,
}: {
  fitRequest: { points: { lat: number; lng: number }[]; ts: number } | null;
}) {
  const map = useMap();
  const lastTs = useRef<number | null>(null);
  useEffect(() => {
    if (!fitRequest || fitRequest.ts === lastTs.current) return;
    lastTs.current = fitRequest.ts;
    const pts = fitRequest.points;
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.flyTo([pts[0].lat, pts[0].lng], Math.max(map.getZoom(), 15), {
        duration: 0.6,
      });
      return;
    }
    const bounds = L.latLngBounds(
      pts.map((p) => [p.lat, p.lng] as [number, number]),
    );
    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 0.6 });
  }, [fitRequest, map]);
  return null;
}

function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const timeout = setTimeout(invalidate, 200);
    window.addEventListener("resize", invalidate);
    window.addEventListener("orientationchange", invalidate);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("orientationchange", invalidate);
    };
  }, [map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) { onPick(event.latlng.lat, event.latlng.lng); },
  });
  return null;
}

function BoundsHandler({ onBoundsChange }: { onBoundsChange?: (bounds: MapBounds) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onBoundsChange) return;
    const emit = () => {
      const b = map.getBounds();
      onBoundsChange({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    };
    emit();
    map.on("moveend", emit);
    map.on("zoomend", emit);
    return () => { map.off("moveend", emit); map.off("zoomend", emit); };
  }, [map, onBoundsChange]);
  return null;
}

interface MapViewProps {
  reports: EmergencyReport[];
  missingMarkers?: MissingMapMarker[];
  showMissingOnMap?: boolean;
  onBoundsChange?: (bounds: MapBounds) => void;
  draft: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
  onResolve: (id: string) => void;
  onConfirm: (id: string) => void;
  confirmed: Set<string>;
  isAdmin: boolean;
  focus: { lat: number; lng: number; ts: number; id?: string } | null;
  center: [number, number];
  zoom: number;
  /** Pedido para encuadrar el mapa a un conjunto de pines (al filtrar por tipo). */
  fitRequest?: { points: { lat: number; lng: number }[]; ts: number } | null;
  /** Muestra la capa de edificios afectados (snapshot de sismovenezuela.org). */
  showEdificios?: boolean;
}

export default function MapView({
  reports,
  missingMarkers = [],
  showMissingOnMap = true,
  onBoundsChange,
  draft,
  onPick,
  onResolve,
  onConfirm,
  confirmed,
  isAdmin,
  focus,
  center,
  zoom,
  fitRequest = null,
  showEdificios = false,
}: MapViewProps) {
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const getMarker = useCallback((id: string) => markerRefs.current.get(id), []);

  const draftIcon = useMemo(
    () =>
      L.divIcon({
        className: "emergency-marker",
        html: `<span class="emergency-pin emergency-pin--draft"></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      }),
    []
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <ResizeHandler />
      <FlyToHandler focus={focus} getMarker={getMarker} />
      <FitToBoundsHandler fitRequest={fitRequest} />
      <EscClosePopup />

      {showEdificios && <EdificiosAfectadosLayer />}
      <BoundsHandler onBoundsChange={onBoundsChange} />
      <ClickHandler onPick={onPick} />

      {showMissingOnMap && (
        <MissingClusterLayer markers={missingMarkers} markerRefs={markerRefs} />
      )}

      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.lat, report.lng]}
          icon={markerIcon(report.type)}
          ref={(marker) => {
            if (marker) markerRefs.current.set(report.id, marker);
            else markerRefs.current.delete(report.id);
          }}
        >
          <Popup>
            <div className="space-y-1.5 text-sm">
              <p className="font-semibold">
                {REPORT_TYPES[report.type].emoji} {REPORT_TYPES[report.type].label}
              </p>
              {report.photoUrl && (
                <a href={report.photoUrl} target="_blank" rel="noopener noreferrer" aria-label="Ver foto en grande">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.photoUrl}
                    alt="Foto del reporte"
                    loading="lazy"
                    className="my-1 max-h-52 w-full rounded-lg bg-slate-100 object-contain"
                  />
                </a>
              )}
              <p className="font-medium">{report.place}</p>
              {report.affected > 0 && (
                <p className="text-xs text-slate-600">
                  Personas afectadas/atrapadas: {report.affected}
                </p>
              )}
              {report.needs && (
                <p className="break-words text-slate-600">
                  Necesidad: <LinkText text={report.needs} />
                </p>
              )}
              <p
                className="text-xs text-slate-500"
                title={new Date(report.createdAt).toLocaleString("es-VE")}
              >
                🕒 {timeAgo(report.createdAt)} · {new Date(report.createdAt).toLocaleString("es-VE")}
              </p>
              <div className="mt-2 flex gap-1.5">
                <a
                  href={xShareHref(report)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir en X"
                  style={{ color: "#ffffff" }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-black px-2 py-1.5 text-xs font-semibold no-underline transition hover:opacity-90"
                >
                  <span aria-hidden className="font-bold">𝕏</span> Compartir
                </a>
                <a
                  href={whatsappShareHref(report)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir por WhatsApp"
                  style={{ color: "#0f172a" }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#4ade80] px-2 py-1.5 text-xs font-bold no-underline transition hover:brightness-95"
                >
                  WhatsApp
                </a>
              </div>
              <button
                type="button"
                onClick={() => onConfirm(report.id)}
                disabled={confirmed.has(report.id)}
                title={confirmed.has(report.id) ? "Ya confirmaste este reporte" : "Yo también veo esto"}
                className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition ${
                  confirmed.has(report.id)
                    ? "border-slate-200 bg-slate-100 text-slate-500"
                    : "border-sky-200 text-sky-700 hover:bg-sky-50"
                }`}
              >
                ✓ Yo también veo esto · {report.confirmations}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onResolve(report.id)}
                  className="mt-1 block text-xs font-medium text-emerald-700 underline"
                >
                  Marcar como atendido (limpiar del mapa)
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {draft && <Marker position={[draft.lat, draft.lng]} icon={draftIcon} />}
    </MapContainer>
  );
}
