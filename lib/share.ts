import { REPORT_TYPES, type EmergencyReport } from "@/lib/types";

const SITE_FALLBACK = "https://terremotovenezuela.app";

/** Enlace profundo a un reporte: abre el mapa centrado en su ubicación.
 * Mantiene el tráfico en terremotovenezuela.app (estrategia de consolidación)
 * y `EmergencyApp` lee `lat`/`lng` al cargar para volar hasta el punto. */
export function reportShareUrl(report: Pick<EmergencyReport, "lat" | "lng">): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : SITE_FALLBACK;
  const params = new URLSearchParams({
    lat: report.lat.toFixed(5),
    lng: report.lng.toFixed(5),
  });
  return `${origin}/?${params.toString()}#mapa`;
}

/** Texto humano para compartir, sin el enlace (cada destino lo añade aparte). */
export function reportShareText(report: EmergencyReport): string {
  const meta = REPORT_TYPES[report.type];
  const parts = [`${meta.emoji} ${meta.label}: ${report.place}`];
  if (report.needs.trim()) parts.push(report.needs.trim());
  parts.push("Mapa de Emergencia y Rescate · Terremoto Venezuela");
  return parts.join(" — ");
}

export function xShareHref(report: EmergencyReport): string {
  const text = encodeURIComponent(reportShareText(report));
  const url = encodeURIComponent(reportShareUrl(report));
  return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
}

export function whatsappShareHref(report: EmergencyReport): string {
  const message = encodeURIComponent(
    `${reportShareText(report)} ${reportShareUrl(report)}`,
  );
  return `https://wa.me/?text=${message}`;
}
