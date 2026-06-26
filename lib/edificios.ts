/** Edificios afectados: snapshot de solo-lectura importado de sismovenezuela.org
 * (con luz verde). Es un dataset congelado (no se actualiza solo); se sirve
 * desde un JSON estático en el repo, igual que el riesgo sísmico. */

export interface EdificioAfectado {
  id: string;
  lat: number;
  lng: number;
  /** Severidad de daño 1-4 (ver lib/severity.ts). */
  severity: number;
  place: string;
  /** Ruta local de la foto rehospedada, o null. */
  photo_url: string | null;
  note: string;
  created_at: string;
}

/** Fecha del snapshot (los datos no se actualizan solos; se etiqueta en la UI).
 * Para frescura futura: pedir un export/endpoint oficial a su equipo. */
export const EDIFICIOS_SNAPSHOT_DATE = "25 jun 2026";

/** Total del snapshot (constante; el dataset está congelado). */
export const EDIFICIOS_COUNT = 288;

export const EDIFICIOS_SOURCE_LABEL = "sismovenezuela.org";
export const EDIFICIOS_SOURCE_URL = "https://sismovenezuela.org";
