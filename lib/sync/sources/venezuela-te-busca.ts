/**
 * Adaptador para venezuelatebusca.com (con permiso de los responsables).
 *
 * Es una app Remix/React Router: los datos se sirven por el loader de la ruta
 * índice en formato turbo-stream. Endpoint: GET /_root.data?page=N
 * (paginación fija de 20 por página; ignora pageSize/limit).
 *
 * Respuesta (decodificada): { persons: [...], pagination: {page, hasMore},
 * stats, totalCount }. Cada persona trae:
 *   id, firstName, lastName, idNumber (cédula), age, gender, lastSeen,
 *   description, status ("missing"|"found"), foundNote?, photoUrl (relativa),
 *   createdAt, updatedAt, reporter { name, phone, email }.
 *
 * Notas:
 * - `reporter` (teléfono/email) y `idNumber` son PII: NO se importan salvo flag.
 * - photoUrl es relativa: se absolutiza con el dominio base.
 */

import { decode } from "turbo-stream";
import type { SourceAdapter, FetchCtx, ExternalPerson } from "../types";
import { normalizeAge, toEpochMs } from "../normalize";

const SOURCE_ID = "venezuelatebusca.com";
const BASE = "https://venezuelatebusca.com";
const PAGE_SIZE = 20; // fijo por la fuente
const FETCH_TIMEOUT_MS = 45_000;
const INTER_PAGE_DELAY_MS = 200;
const HARD_PAGE_CAP = 10_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ApiPerson {
  id?: string;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  lastSeen?: string | null;
  description?: string | null;
  status?: string | null;
  foundNote?: string | null;
  photoUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  reporter?: { name?: string; phone?: string; email?: string } | null;
}

interface LoaderData {
  persons?: ApiPerson[];
  pagination?: { page?: number; hasMore?: boolean };
  totalCount?: number;
}

function importContact(): boolean {
  return process.env.SOURCE_VENEZUELATEBUSCA_IMPORT_CONTACT === "true";
}

function absolutePhoto(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  if (/^https?:\/\//i.test(url)) return url.slice(0, 600);
  if (url.startsWith("/")) return (BASE + url).slice(0, 600);
  return null;
}

function mapPerson(p: ApiPerson): ExternalPerson | null {
  const externalId = String(p.id ?? "").trim();
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  if (!externalId || !name) return null;

  const status = p.status === "found" ? "found" : "active";
  return {
    externalId,
    source: SOURCE_ID,
    sourceUrl: `${BASE}/`,
    name,
    age: normalizeAge(p.age),
    lastSeen: p.lastSeen ?? null,
    description: p.description ?? null,
    contact: importContact() ? (p.reporter?.phone ?? null) : null,
    photoUrl: absolutePhoto(p.photoUrl),
    status,
    resolutionNote: status === "found" ? (p.foundNote ?? null) : null,
    resolvedAt: status === "found" ? toEpochMs(p.updatedAt) : null,
    createdAt: toEpochMs(p.createdAt),
    updatedAt: toEpochMs(p.updatedAt),
  };
}

/** Trae y decodifica una página del loader de Remix (turbo-stream). */
async function requestPage(page: number, ctx: FetchCtx): Promise<LoaderData> {
  const url = new URL(`${BASE}/_root.data`);
  url.searchParams.set("page", String(page));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  ctx.signal?.addEventListener("abort", () => controller.abort());

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "text/x-script", "user-agent": ctx.userAgent },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} al consultar ${SOURCE_ID} (page ${page})`);
  }

  const decoded = (await decode(res.body)) as { value: unknown; done?: Promise<unknown> };
  await decoded.done?.catch(() => {});
  const root = decoded.value as Record<string, { data?: LoaderData }> | LoaderData;

  // React Router single-fetch: mapa por routeId; buscamos el que trae `persons`.
  if (root && typeof root === "object" && !("persons" in root)) {
    for (const entry of Object.values(root as Record<string, { data?: LoaderData }>)) {
      if (entry?.data?.persons) return entry.data;
    }
  }
  return root as LoaderData;
}

export const venezuelaTeBuscaAdapter: SourceAdapter = {
  id: SOURCE_ID,
  label: "Venezuela Te Busca",
  kind: "remix-data",

  async fetchAll(ctx: FetchCtx): Promise<ExternalPerson[]> {
    const seen = new Set<string>();
    const people: ExternalPerson[] = [];
    let page = 1;
    while (page <= HARD_PAGE_CAP) {
      const data = await requestPage(page, ctx);
      const items = data.persons ?? [];
      if (items.length === 0) break;
      for (const raw of items) {
        const person = mapPerson(raw);
        if (!person || seen.has(person.externalId)) continue;
        seen.add(person.externalId);
        people.push(person);
        if (ctx.limit && people.length >= ctx.limit) return people;
      }
      if (!data.pagination?.hasMore) break;
      page++;
      await sleep(INTER_PAGE_DELAY_MS);
    }
    return people;
  },

  async fetchPage(page: number, ctx: FetchCtx) {
    const data = await requestPage(page, ctx);
    const people: ExternalPerson[] = [];
    for (const raw of data.persons ?? []) {
      const person = mapPerson(raw);
      if (person) people.push(person);
    }
    const totalPages =
      typeof data.totalCount === "number" && data.totalCount > 0
        ? Math.ceil(data.totalCount / PAGE_SIZE)
        : null;
    return { people, totalPages };
  },
};
