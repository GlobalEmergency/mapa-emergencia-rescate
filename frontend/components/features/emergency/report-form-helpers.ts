import type { ReportType } from "@/lib/types";

type FieldCopy = {
  placeLabel: string;
  placePlaceholder: string;
  showAffected: boolean;
  affectedLabel: string;
  needsLabel: string;
  needsPlaceholder: string;
};

const DEFAULT_COPY: FieldCopy = {
  placeLabel: "Nombre o Dirección exacta del Edificio / Lugar",
  placePlaceholder: "Ej: Residencias El Parque, Torre B, Municipio Chacao",
  showAffected: true,
  affectedLabel: "Cantidad estimada de personas afectadas o atrapadas",
  needsLabel: "¿Qué se necesita con urgencia?",
  needsPlaceholder:
    "Sé específico: Equipos de rescate, paramédicos, agua potable, maquinaria pesada para escombros, medicinas",
};

const COPY_BY_TYPE: Partial<Record<ReportType, Partial<FieldCopy>>> = {
  nopower: {
    placeLabel: "Zona / Sector",
    placePlaceholder: "Ej: Urbanización La Trinidad, calle principal",
    showAffected: false,
    needsLabel: "Detalles de la zona",
    needsPlaceholder:
      "¿Desde cuándo sin luz? ¿Hay agua, señal, comercios abiertos? ¿Vías despejadas?",
  },
  missing: {
    placeLabel: "Última ubicación conocida",
    placePlaceholder: "Ej: visto por última vez cerca de la plaza de Chacao",
    affectedLabel: "¿Cuántas personas se buscan?",
    needsLabel: "Descripción de la persona",
    needsPlaceholder:
      "Nombre, edad, estatura, vestimenta, señas particulares y un contacto",
  },
  building: {
    placeLabel: "Nombre o dirección del edificio",
    placePlaceholder: "Ej: Torre Solymar, Av. Andrés Bello, La Candelaria",
    showAffected: false,
    needsLabel: "Estado estructural observado",
    needsPlaceholder:
      "Ej: grietas verticales en columnas del 1er piso, fachada inclinada, vidrios rotos. Anexa foto para que ingenieros lo evalúen.",
  },
  starlink: {
    placeLabel: "Ubicación de la antena",
    placePlaceholder:
      "Ej: refugio comunitario en Chacao, iglesia San José, plaza principal",
    showAffected: false,
    needsLabel: "Detalles de conectividad",
    needsPlaceholder:
      "¿WiFi abierto? ¿Horario? ¿Cuántas personas puede atender? Red/contraseña si aplica.",
  },
};

export function copyFor(type: ReportType): FieldCopy {
  return { ...DEFAULT_COPY, ...COPY_BY_TYPE[type] };
}

const MAX_DIM = 960;
const JPEG_QUALITY = 0.62;

/** Redimensiona la imagen del usuario para reducir su peso antes de subirla. */
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
