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

const iconCache = new Map<ReportType, L.DivIcon>();

function markerIcon(type: ReportType): L.DivIcon {
  const cached = iconCache.get(type);
  if (cached) return cached;
  const color = REPORT_TYPES[type].color;
  const icon = L.divIcon({
    className: "emergency-marker",
    html: `<span class="emergency-pin" style="background:${color}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
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
        iconSize: [26, 26],
        iconAnchor: [13, 26],
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
              <p className="font-medium">{report.place}</p>
              {report.affected > 0 && (
                <p>Personas afectadas/atrapadas: {report.affected}</p>
              )}
              {report.needs && <p>Necesidad: {report.needs}</p>}
              <p className="text-xs text-gray-500">
                {new Date(report.createdAt).toLocaleString("es-VE")}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onResolve(report.id)}
                  className="mt-1 text-xs font-medium text-emerald-700 underline"
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
