import type { MissingReportType, FoundPlace, PersonStatus } from "./types";

const MAX_DIM = 800;
const JPEG_QUALITY = 0.62;

export const NATIONALITY_OPTIONS = [
  "Venezolana",
  "Colombiana",
  "Peruana",
  "Ecuatoriana",
  "Chilena",
  "Argentina",
  "Brasileña",
  "Cubana",
  "Española",
  "Otra",
];

export async function fileToResizedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width >= height && width > MAX_DIM) {
    height = Math.round((height * MAX_DIM) / width);
    width = MAX_DIM;
  } else if (height > MAX_DIM) {
    width = Math.round((width * MAX_DIM) / height);
    height = MAX_DIM;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function formatLastSeen(
  location: string,
  lastContactAt: string,
  reportType: MissingReportType,
  foundPlace?: FoundPlace,
): string {
  const loc = location.trim();
  let base = loc;
  if (reportType === "found" && foundPlace) {
    const prefix =
      foundPlace === "hospital" ? "En un hospital" : "En la calle";
    base = loc ? `${prefix}: ${loc}` : prefix;
  }
  if (!lastContactAt.trim()) return base;
  const d = new Date(lastContactAt);
  if (Number.isNaN(d.getTime())) return base;
  const when = d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const suffix =
    reportType === "found"
      ? `Encontrada el ${when}`
      : `Sin contacto desde ${when}`;
  return base ? `${base} · ${suffix}` : suffix;
}

export function buildDescription(
  description: string,
  reportType: MissingReportType,
  personStatus?: PersonStatus,
): string {
  const text = description.trim();
  if (reportType !== "found" || !personStatus) return text;
  const statusLabel =
    personStatus === "safe" ? "Estado: A salvo." : "Estado: Fallecida.";
  return text ? `${statusLabel} ${text}` : statusLabel;
}
