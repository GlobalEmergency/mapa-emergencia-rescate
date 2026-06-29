"use client";

/**
 * Hook de datos del dominio "acopio" (centros de acopio) — sigue el patrón
 * canónico de hooks/hospitals.ts. El backend proxea ResponseGrid en /api/acopio
 * (cache + ETag), así que el navegador solo habla con NUESTRO backend vía apiGet.
 *
 * El filtrado (país/categoría/texto) ocurre en el servidor sobre el set cacheado;
 * las facetas vienen en la misma respuesta para poblar los chips de filtro. El
 * componente hace "ver más" en cliente sobre la lista ya filtrada.
 */
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export interface CollectionCenter {
  id: string;
  name: string;
  manager: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  accepts: string[];
  contact: string | null;
  schedule: string | null;
  status: string;
  verificationLevel: string;
  disputed: boolean;
  description: string | null;
}

export interface AcopioFacets {
  byCountry: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface AcopioResponse {
  items: CollectionCenter[];
  total: number;
  facets: AcopioFacets;
}

export interface AcopioFilters {
  country?: string;
  category?: string;
  q?: string;
}

const ACOPIO_STALE_MS = 2 * 60_000;

function buildUrl(f: AcopioFilters): string {
  const sp = new URLSearchParams();
  if (f.country) sp.set("country", f.country);
  if (f.category) sp.set("category", f.category);
  if (f.q) sp.set("q", f.q);
  const qs = sp.toString();
  return qs ? `/api/acopio?${qs}` : "/api/acopio";
}

/**
 * Centros de acopio filtrados + facetas. El término `q` debe venir ya debounced
 * del componente. `placeholderData` evita parpadeo al cambiar de filtro.
 */
export function useCollectionCenters(filters: AcopioFilters) {
  return useQuery({
    queryKey: qk.acopio.list(filters),
    queryFn: ({ signal }) => apiGet<AcopioResponse>(buildUrl(filters), signal),
    staleTime: ACOPIO_STALE_MS,
    placeholderData: (prev) => prev,
  });
}
