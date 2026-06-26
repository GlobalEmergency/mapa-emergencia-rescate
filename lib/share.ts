import { REPORT_TYPES, type EmergencyReport } from "@/lib/types";

const SITE_FALLBACK = "https://terremotovenezuela.app";

type LatLng = { lat: number; lng: number };

/** Enlace profundo a un punto del mapa (lat/lng): abre el mapa centrado ahí.
 * Mantiene el tráfico en terremotovenezuela.app (estrategia de consolidación);
 * `EmergencyApp` lee `lat`/`lng` al cargar para volar hasta el punto. */
export function shareUrl(point: LatLng): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : SITE_FALLBACK;
  const params = new URLSearchParams({
    lat: point.lat.toFixed(5),
    lng: point.lng.toFixed(5),
  });
  return `${origin}/?${params.toString()}#mapa`;
}

/** Intent de compartir en X para un punto del mapa + un texto. */
export function xShareHrefFor(point: LatLng, text: string): string {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(shareUrl(point));
  return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
}

/** Intent de compartir por WhatsApp para un punto del mapa + un texto. */
export function whatsappShareHrefFor(point: LatLng, text: string): string {
  const message = encodeURIComponent(`${text} ${shareUrl(point)}`);
  return `https://wa.me/?text=${message}`;
}

export function reportShareUrl(
  report: Pick<EmergencyReport, "lat" | "lng">,
): string {
  return shareUrl(report);
}

/** Texto humano para compartir un reporte, sin el enlace (lo añade el destino). */
export function reportShareText(report: EmergencyReport): string {
  const meta = REPORT_TYPES[report.type];
  const parts = [`${meta.emoji} ${meta.label}: ${report.place}`];
  if (report.needs.trim()) parts.push(report.needs.trim());
  parts.push("Mapa de Emergencia y Rescate · Terremoto Venezuela");
  return parts.join(" — ");
}

export function xShareHref(report: EmergencyReport): string {
  return xShareHrefFor(report, reportShareText(report));
}

export function whatsappShareHref(report: EmergencyReport): string {
  return whatsappShareHrefFor(report, reportShareText(report));
}
