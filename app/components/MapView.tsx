"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { REPORT_TYPES, type EmergencyReport, type ReportType } from "@/lib/types";
import { timeAgo } from "@/lib/format";

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
    map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 16), {
      duration: 1,
    });
    if (focus.id) {
      const id = focus.id;
      // El marcador puede abrir su popup una vez termina la animación.
      map.once("moveend", () => {
        getMarker(id)?.openPopup();
      });
    }
  }, [focus, map, getMarker]);
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

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

interface MapViewProps {
  reports: EmergencyReport[];
  draft: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
  onResolve: (id: string) => void;
  onConfirm: (id: string) => void;
  confirmed: Set<string>;
  isAdmin: boolean;
  focus: { lat: number; lng: number; ts: number; id?: string } | null;
  center: [number, number];
  zoom: number;
}

export default function MapView({
  reports,
  draft,
  onPick,
  onResolve,
  onConfirm,
  confirmed,
  isAdmin,
  focus,
  center,
  zoom,
}: MapViewProps) {
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const getMarker = useCallback(
    (id: string) => markerRefs.current.get(id),
    [],
  );
  const draftIcon = useMemo(
    () =>
      L.divIcon({
        className: "emergency-marker",
        html: `<span class="emergency-pin emergency-pin--draft"></span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      }),
    [],
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ResizeHandler />
      <FlyToHandler focus={focus} getMarker={getMarker} />
      <ClickHandler onPick={onPick} />

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
            <div className="space-y-1">
              <p className="font-semibold">
                {REPORT_TYPES[report.type].emoji} {REPORT_TYPES[report.type].label}
              </p>
              {report.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <a
                  href={report.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ver foto en grande"
                >
                  <img
                    src={report.photoUrl}
                    alt="Foto del reporte"
                    loading="lazy"
                    className="my-1 max-h-40 w-full rounded-md object-cover"
                  />
                </a>
              )}
              <p className="font-medium">{report.place}</p>
              {report.affected > 0 && (
                <p>Personas afectadas/atrapadas: {report.affected}</p>
              )}
              {report.needs && <p>Necesidad: {report.needs}</p>}
              <p
                className="text-xs text-gray-500"
                title={new Date(report.createdAt).toLocaleString("es-VE")}
              >
                🕒 {timeAgo(report.createdAt)} ·{" "}
                {new Date(report.createdAt).toLocaleString("es-VE")}
              </p>
              <button
                type="button"
                onClick={() => onConfirm(report.id)}
                disabled={confirmed.has(report.id)}
                title={
                  confirmed.has(report.id)
                    ? "Ya confirmaste este reporte"
                    : "Yo también veo esto"
                }
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
