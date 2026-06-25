/**
 * Adaptador para desaparecidosterremotovenezuela.com (theempire.tech).
 *
 * Fuente: GET https://desaparecidos-terremoto-api.theempire.tech/api/personas
 * Respuesta: { items: [ { id, nombre, edad, ubicacion, descripcion, contacto,
 *              foto, estado, localizado*, createdAt, updatedAt } ] }
 *
 * Paginación: GET ...?page=N&pageSize=M. La respuesta trae
 * { items, total, page, pageSize, totalPages, counts }. Es paginación por
 * OFFSET sobre un feed vivo: como entran registros nuevos arriba, las páginas
 * se desplazan y un mismo id puede aparecer en páginas contiguas. Por eso
 * deduplicamos por externalId dentro de cada corrida (y el upsert es idempotente
 * de todos modos). Ver RFC §3.5.
 *
 * Notas:
 * - `contacto` son teléfonos en claro: NO se importan salvo que se active
 *   explícitamente el flag (ver RFC §6).
 */

import type { SourceAdapter, FetchCtx, ExternalPerson } from "../types";
import { normalizeAge, toEpochMs, httpUrlOrNull } from "../normalize";

const SOURCE_ID = "desaparecidosterremotovenezuela.com";
const DEFAULT_URL =
  "https://desaparecidos-terremoto-api.theempire.tech/api/personas";
/** Timeout por página. */
const FETCH_TIMEOUT_MS = 45_000;
/** Tamaño de página al escanear (la API lo respeta hasta 100). */
const PAGE_SIZE = 100;
/** Pausa entre páginas para ser gentiles con la fuente. */
const INTER_PAGE_DELAY_MS = 200;
/** Tope duro de páginas (cinturón de seguridad anti-bucle). */
const HARD_PAGE_CAP = 10_000;

interface ApiResponse {
  items?: ApiPerson[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ApiPerson {
  id?: string;
  nombre?: string;
  edad?: number | null;
  ubicacion?: string | null;
  descripcion?: string | null;
  contacto?: string | null;
  foto?: string | null;
  estado?: string | null;
  localizadoPor?: string | null;
  localizadoContacto?: string | null;
  localizadoRelacion?: string | null;
  localizadoNota?: string | null;
  createdAt?: number | string | null;
  updatedAt?: number | string | null;
}

function sourceUrl(): string {
  return process.env.SOURCE_DESAPARECIDOS_URL || DEFAULT_URL;
}

/** Por defecto NO se importa el contacto (riesgo de extorsión). */
function importContact(): boolean {
  return process.env.SOURCE_DESAPARECIDOS_IMPORT_CONTACT === "true";
}

function mapStatus(estado: string | null | undefined): "active" | "found" {
  return estado === "localizado" ? "found" : "active";
}

function resolutionNote(r: ApiPerson): string | null {
  const parts = [
    r.localizadoNota?.trim(),
    r.localizadoPor
      ? `Reportado por: ${r.localizadoPor}` +
        (r.localizadoRelacion ? ` (${r.localizadoRelacion})` : "")
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

function mapPerson(r: ApiPerson): ExternalPerson | null {
  const externalId = String(r.id ?? "").trim();
  const name = String(r.nombre ?? "").trim();
  if (!externalId || !name) return null;

  const status = mapStatus(r.estado);
  return {
    externalId,
    source: SOURCE_ID,
    sourceUrl: "https://desaparecidosterremotovenezuela.com/",
    name,
    age: normalizeAge(r.edad),
    lastSeen: r.ubicacion ?? null,
    description: r.descripcion ?? null,
    contact: importContact() ? (r.contacto ?? null) : null,
    photoUrl: httpUrlOrNull(r.foto),
    status,
    resolutionNote: status === "found" ? resolutionNote(r) : null,
    resolvedAt: status === "found" ? toEpochMs(r.updatedAt) : null,
    createdAt: toEpochMs(r.createdAt),
    updatedAt: toEpochMs(r.updatedAt),
  };
}

export const desaparecidosTerremotoAdapter: SourceAdapter = {
  id: SOURCE_ID,
  label: "Desaparecidos Terremoto Venezuela",
  kind: "json-api",

  async fetchAll(ctx: FetchCtx): Promise<ExternalPerson[]> {
    // Si el límite es chico, no pidas páginas de 100.
    const pageSize = ctx.limit ? Math.min(ctx.limit, PAGE_SIZE) : PAGE_SIZE;

    const seen = new Set<string>(); // dedup de solapes entre páginas
    const people: ExternalPerson[] = [];
    let page = 1;
    let totalPages = Infinity;

    while (page <= totalPages && page <= HARD_PAGE_CAP) {
      const { items, meta } = await fetchPage(page, pageSize, ctx);
      if (typeof meta.totalPages === "number" && meta.totalPages > 0) {
        totalPages = meta.totalPages;
      }
      if (items.length === 0) break;

      for (const raw of items) {
        const person = mapPerson(raw);
        if (!person || seen.has(person.externalId)) continue;
        seen.add(person.externalId);
        people.push(person);
        if (ctx.limit && people.length >= ctx.limit) return people;
      }

      // Última página: menos items que el tamaño pedido.
      if (items.length < pageSize) break;
      page++;
      await sleep(INTER_PAGE_DELAY_MS);
    }

    return people;
  },
};

/** Trae una página y devuelve sus items + metadatos de paginación. */
async function fetchPage(
  page: number,
  pageSize: number,
  ctx: FetchCtx,
): Promise<{ items: ApiPerson[]; meta: ApiResponse }> {
  const url = new URL(sourceUrl());
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  ctx.signal?.addEventListener("abort", () => controller.abort());

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": ctx.userAgent },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al consultar ${SOURCE_ID} (page ${page})`);
  }

  const body = (await res.json()) as ApiResponse | ApiPerson[];
  if (Array.isArray(body)) return { items: body, meta: {} };
  return { items: body.items ?? [], meta: body };
}
