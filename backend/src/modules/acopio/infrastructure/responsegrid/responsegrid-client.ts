import { CollectionCenterProviderError } from "../../domain/collection-center-provider";

export const RESPONSEGRID_SOURCE = "responsegrid";

const DEFAULT_TIMEOUT_MS = 8000;
const RESPONSEGRID_MAX_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 40;

export interface ResponseGridLocation {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ResponseGridResource {
  id: string;
  type?: string | null;
  stage?: string | null;
  name?: string | null;
  description?: string | null;
  location?: ResponseGridLocation | null;
  verificationLevel?: string | null;
  publicStatus?: string | null;
  accepts?: unknown;
  contact?: string | null;
  schedule?: string | null;
  manager?: string | null;
  country?: string | null;
  city?: string | null;
  disputed?: boolean | null;
}

interface ResponseGridResourcesPage {
  items?: ResponseGridResource[];
  total?: number;
}

interface ResponseGridEmergency {
  id?: string;
  slug?: string;
  name?: string;
}

export interface ResponseGridClientOptions {
  readonly baseUrl: string;
  readonly emergencySlug: string;
  readonly timeoutMs?: number;
  readonly pageSize?: number;
  readonly maxPages?: number;
}

export class ResponseGridClient {
  private readonly baseUrl: string;
  private readonly emergencySlug: string;
  private readonly timeoutMs: number;
  private readonly pageSize: number;
  private readonly maxPages: number;

  constructor(options: ResponseGridClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.emergencySlug = options.emergencySlug;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.pageSize = options.pageSize ?? RESPONSEGRID_MAX_PAGE_SIZE;
    this.maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  }

  async resolveEmergencyId(): Promise<string> {
    const emergency = await this.fetchJson<ResponseGridEmergency>(
      `/emergencies/by-slug/${encodeURIComponent(this.emergencySlug)}`,
    );
    if (!emergency?.id) {
      throw new CollectionCenterProviderError(
        "La fuente no reconoce la emergencia configurada.",
        RESPONSEGRID_SOURCE,
      );
    }
    return emergency.id;
  }

  async listAllResources(): Promise<ResponseGridResource[]> {
    const emergencyId = await this.resolveEmergencyId();
    const resources: ResponseGridResource[] = [];
    for (let page = 1; page <= this.maxPages; page++) {
      const responsePage = await this.fetchJson<ResponseGridResourcesPage>(
        `/emergencies/${emergencyId}/public/resources?page=${page}&limit=${this.pageSize}`,
      );
      const items = Array.isArray(responsePage.items) ? responsePage.items : [];
      resources.push(...items);
      const total = responsePage.total ?? resources.length;
      if (items.length < this.pageSize || resources.length >= total) break;
    }
    return resources;
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
    } catch (cause) {
      throw new CollectionCenterProviderError(
        "No se pudo consultar la fuente de centros de acopio.",
        RESPONSEGRID_SOURCE,
        cause,
      );
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      throw new CollectionCenterProviderError(
        `La fuente de centros de acopio respondió ${response.status}.`,
        RESPONSEGRID_SOURCE,
      );
    }
    return (await response.json()) as T;
  }
}
