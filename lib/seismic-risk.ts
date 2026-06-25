export const USGS_EVENT_URL =
  "https://earthquake.usgs.gov/earthquakes/eventpage/us6000t7zp/executive";

export const OSM_URL = "https://www.openstreetmap.org/";

export const OVERPASS_URL = "https://overpass-turbo.eu/";

export const SEISMIC_RISK_EVENT = {
  title: "USGS M7.5 - 28 km SE of Yumare, Venezuela",
  eventId: "us6000t7zp",
  occurredAt: "2026-06-24T22:05:11Z",
  source: "USGS",
};

export type SeismicRiskLevel = "critical" | "high";

export interface SeismicRiskCity {
  rank: number;
  city: string;
  state: string;
  level: SeismicRiskLevel;
  mmi: number;
  population: number;
  lat: number;
  lng: number;
}

export interface SeismicRiskAoi {
  name: string;
  area: string;
  criticalBuildings: number;
  basis: string;
  center: [number, number];
  radiusKm: number;
}

export interface SeismicRiskBuildingPoint {
  id: string;
  osmType: string;
  osmId: number;
  areaId: string;
  areaName: string;
  lat: number;
  lng: number;
  priorityScore: number;
  label: string | null;
  building: string;
  amenity: string | null;
}

export const SEISMIC_RISK_CITIES: SeismicRiskCity[] = [
  {
    rank: 1,
    city: "Puerto Cabello",
    state: "Carabobo",
    level: "critical",
    mmi: 7.99,
    population: 209080,
    lat: 10.4731,
    lng: -68.0125,
  },
  {
    rank: 2,
    city: "Catia La Mar",
    state: "La Guaira",
    level: "critical",
    mmi: 7.85,
    population: 661897,
    lat: 10.6038,
    lng: -67.0303,
  },
  {
    rank: 3,
    city: "Ocumare de la Costa",
    state: "Aragua",
    level: "critical",
    mmi: 7.63,
    population: 7000,
    lat: 10.4667,
    lng: -67.7667,
  },
  {
    rank: 4,
    city: "Maiquetia",
    state: "La Guaira",
    level: "critical",
    mmi: 7.08,
    population: 87909,
    lat: 10.5962,
    lng: -66.9549,
  },
  {
    rank: 5,
    city: "San Felipe",
    state: "Yaracuy",
    level: "high",
    mmi: 6.83,
    population: 220786,
    lat: 10.3406,
    lng: -68.7425,
  },
  {
    rank: 6,
    city: "Caracas",
    state: "Distrito Capital",
    level: "high",
    mmi: 6.8,
    population: 2245744,
    lat: 10.4806,
    lng: -66.9036,
  },
  {
    rank: 7,
    city: "Tucacas",
    state: "Falcon",
    level: "high",
    mmi: 6.64,
    population: 13901,
    lat: 10.7906,
    lng: -68.3253,
  },
  {
    rank: 8,
    city: "La Guaira",
    state: "La Guaira",
    level: "high",
    mmi: 6.61,
    population: 203520,
    lat: 10.599,
    lng: -66.9346,
  },
];

export const SEISMIC_RISK_AOIS: SeismicRiskAoi[] = [
  {
    name: "Catia La Mar, Maiquetia y La Guaira",
    area: "Litoral central",
    criticalBuildings: 975,
    basis: "Huellas OSM dentro de zonas con sacudida crítica estimada.",
    center: [10.598, -66.985],
    radiusKm: 20,
  },
  {
    name: "Puerto Cabello",
    area: "Costa de Carabobo",
    criticalBuildings: 996,
    basis: "Huellas OSM dentro de zonas con sacudida crítica estimada.",
    center: [10.4731, -68.0125],
    radiusKm: 18,
  },
];

export const SEISMIC_RISK_TOTALS = {
  criticalCities: SEISMIC_RISK_CITIES.filter(
    (city) => city.level === "critical",
  ).length,
  highCities: SEISMIC_RISK_CITIES.filter((city) => city.level === "high")
    .length,
  criticalBuildings: SEISMIC_RISK_AOIS.reduce(
    (sum, area) => sum + area.criticalBuildings,
    0,
  ),
  candidateBuildings: 64662,
};
