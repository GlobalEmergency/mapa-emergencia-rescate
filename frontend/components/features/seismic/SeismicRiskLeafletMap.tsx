"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import buildingPointsData from "@/data/derived/seismic-risk-building-points.json";
import {
  SEISMIC_RISK_AOIS,
  SEISMIC_RISK_CITIES,
  type SeismicRiskBuildingPoint,
  type SeismicRiskLevel,
} from "@/lib/seismic-risk";

const levelColor: Record<SeismicRiskLevel, string> = {
  critical: "#dc2626",
  high: "#d97706",
};

const levelLabel: Record<SeismicRiskLevel, string> = {
  critical: "Crítico",
  high: "Alto",
};

const formatNumber = (value: number) => value.toLocaleString("es-VE");

const buildingPoints =
  buildingPointsData.points as SeismicRiskBuildingPoint[];

type AreaFilter = "litoral-central" | "puerto-cabello" | "all";

const mapFocus: Record<AreaFilter, { center: [number, number]; zoom: number }> = {
  "litoral-central": { center: [10.598, -66.985], zoom: 12 },
  "puerto-cabello": { center: [10.4731, -68.0125], zoom: 13 },
  all: { center: [10.55, -67.45], zoom: 8 },
};

function MapFocus({ selectedArea }: { selectedArea: AreaFilter }) {
  const map = useMap();

  useEffect(() => {
    const next = mapFocus[selectedArea];
    map.flyTo(next.center, next.zoom, { duration: 0.45 });
  }, [map, selectedArea]);

  return null;
}

export default function SeismicRiskLeafletMap() {
  const [selectedArea, setSelectedArea] =
    useState<AreaFilter>("litoral-central");

  const visiblePoints = useMemo(() => {
    if (selectedArea === "all") return buildingPoints;
    return buildingPoints.filter((point) => point.areaId === selectedArea);
  }, [selectedArea]);

  return (
    <div className="relative h-full min-h-[360px] w-full">
      <div className="absolute bottom-8 right-3 z-[650] flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-1.5 rounded-xl bg-white/95 p-1.5 text-xs font-semibold shadow-sm ring-1 ring-slate-200 backdrop-blur">
        <button
          type="button"
          onClick={() => setSelectedArea("litoral-central")}
          className={`rounded-lg px-2.5 py-1.5 ${
            selectedArea === "litoral-central"
              ? "bg-slate-950 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Litoral
        </button>
        <button
          type="button"
          onClick={() => setSelectedArea("puerto-cabello")}
          className={`rounded-lg px-2.5 py-1.5 ${
            selectedArea === "puerto-cabello"
              ? "bg-slate-950 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          P. Cabello
        </button>
        <button
          type="button"
          onClick={() => setSelectedArea("all")}
          className={`rounded-lg px-2.5 py-1.5 ${
            selectedArea === "all"
              ? "bg-slate-950 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Todo
        </button>
        <span className="basis-full px-2 pb-0.5 text-right text-[11px] text-slate-500">
          {formatNumber(visiblePoints.length)} puntos
        </span>
      </div>

      <MapContainer
        center={mapFocus[selectedArea].center}
        zoom={mapFocus[selectedArea].zoom}
        minZoom={7}
        preferCanvas
        scrollWheelZoom={false}
        className="h-full min-h-[360px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFocus selectedArea={selectedArea} />

        {SEISMIC_RISK_AOIS.map((area) => (
          <Circle
            key={area.name}
            center={area.center}
            radius={area.radiusKm * 1000}
            pathOptions={{
              color: "#b91c1c",
              fillColor: "#ef4444",
              fillOpacity: 0.1,
              opacity: 0.5,
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{area.name}</p>
                <p>
                  {formatNumber(area.criticalBuildings)} edificios OSM
                  priorizados
                </p>
                <p className="text-xs text-slate-500">{area.basis}</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {visiblePoints.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={point.priorityScore >= 80 ? 3.4 : 2.7}
            pathOptions={{
              color: point.priorityScore >= 80 ? "#7f1d1d" : "#991b1b",
              fillColor: point.priorityScore >= 80 ? "#dc2626" : "#ef4444",
              fillOpacity: point.priorityScore >= 80 ? 0.82 : 0.62,
              opacity: 0.7,
              weight: 0.7,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">
                  {point.label || "Edificio OSM priorizado"}
                </p>
                <p>{point.areaName}</p>
                <p>
                  Tipo: <strong>{point.building}</strong>
                  {point.amenity ? ` · ${point.amenity}` : ""}
                </p>
                <p>Prioridad: {point.priorityScore}</p>
                <a
                  href={`https://www.openstreetmap.org/${point.osmType}/${point.osmId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-red-700 underline"
                >
                  Ver en OpenStreetMap
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {SEISMIC_RISK_CITIES.map((city) => (
          <CircleMarker
            key={city.city}
            center={[city.lat, city.lng]}
            radius={city.level === "critical" ? 9 : 7}
            pathOptions={{
              color: "#ffffff",
              fillColor: levelColor[city.level],
              fillOpacity: 0.92,
              opacity: 1,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">
                  #{city.rank} {city.city}
                </p>
                <p>{city.state}</p>
                <p>
                  Nivel: <strong>{levelLabel[city.level]}</strong>
                </p>
                <p>MMI estimado: {city.mmi.toFixed(2)}</p>
                <p>Población: {formatNumber(city.population)}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
