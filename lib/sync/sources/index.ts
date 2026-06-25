/**
 * Registro de fuentes. Agregar una fuente nueva = importar su adaptador aquí
 * y sumarlo a `ALL_SOURCES`.
 *
 * Habilitación por env: `SYNC_SOURCES` es una lista csv de ids de fuente. Si no
 * se define, se habilitan todas las registradas.
 */

import type { SourceAdapter } from "../types";
import { desaparecidosTerremotoAdapter } from "./desaparecidos-terremoto";
import { venezuelaTeBuscaAdapter } from "./venezuela-te-busca";

/** Todas las fuentes registradas (habilitadas o no). */
export const ALL_SOURCES: SourceAdapter[] = [
  desaparecidosTerremotoAdapter,
  venezuelaTeBuscaAdapter,
];

/** Adaptadores activos según `SYNC_SOURCES` (csv de ids); todas si no se define. */
export function enabledSources(): SourceAdapter[] {
  const raw = (process.env.SYNC_SOURCES ?? "").trim();
  if (!raw) return ALL_SOURCES;
  const ids = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return ALL_SOURCES.filter((s) => ids.has(s.id));
}

/** Busca un adaptador por id. */
export function getSource(id: string): SourceAdapter | undefined {
  return ALL_SOURCES.find((s) => s.id === id);
}
