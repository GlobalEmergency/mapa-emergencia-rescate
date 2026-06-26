import type { MetadataRoute } from "next";
import { listHospitals } from "@/lib/hospitals";
import { buildHospitalSlug } from "@/lib/hospitals-meta";

const SITE_URL = "https://terremotovenezuela.app";

// Refresca el sitemap cada hora para reflejar altas/bajas de hospitales sin
// necesidad de un redeploy completo.
export const revalidate = 3600;

// Rutas públicas estáticas. Se excluyen a propósito /admin (panel interno),
// /chat (herramienta efímera de voluntarios) y /api/* (endpoints no indexables).
const STATIC_PATHS = [
  { path: "/", changeFrequency: "hourly", priority: 1 },
  { path: "/hospitales", changeFrequency: "hourly", priority: 0.9 },
  { path: "/telefonos", changeFrequency: "weekly", priority: 0.8 },
  { path: "/guia", changeFrequency: "weekly", priority: 0.8 },
  { path: "/acopio", changeFrequency: "daily", priority: 0.7 },
  { path: "/apoyo-global", changeFrequency: "weekly", priority: 0.7 },
  { path: "/riesgo-sismico", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacidad", changeFrequency: "yearly", priority: 0.3 },
  { path: "/contacto", changeFrequency: "monthly", priority: 0.5 },
] as const;

const DB_TIMEOUT_MS = 5_000;

async function listHospitalsWithTimeout() {
  return Promise.race([
    listHospitals({ limit: 1000 }),
    new Promise<Awaited<ReturnType<typeof listHospitals>>>((resolve) =>
      setTimeout(() => resolve([]), DB_TIMEOUT_MS),
    ),
  ]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((entry) => ({
    url: `${SITE_URL}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  let hospitalEntries: MetadataRoute.Sitemap = [];
  try {
    const hospitals = await listHospitalsWithTimeout();
    hospitalEntries = hospitals.map((hospital) => ({
      url: `${SITE_URL}/hospitales/${buildHospitalSlug(hospital)}`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.6,
    }));
  } catch {
    // Si la base de datos no está disponible al generar el sitemap, servimos
    // solo las rutas estáticas en vez de romper el build.
    hospitalEntries = [];
  }

  return [...staticEntries, ...hospitalEntries];
}
