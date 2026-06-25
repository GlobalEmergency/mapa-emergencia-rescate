export type ReportType = "critical" | "supplies" | "shelter";

export interface EmergencyReport {
  id: string;
  type: ReportType;
  lat: number;
  lng: number;
  place: string;
  affected: number;
  needs: string;
  createdAt: number;
}

export type NewReport = Omit<EmergencyReport, "id" | "createdAt">;

export const REPORT_TYPES: Record<
  ReportType,
  { label: string; color: string; emoji: string; description: string }
> = {
  critical: {
    label: "Emergencia Crítica",
    color: "#dc2626",
    emoji: "🔴",
    description:
      "Personas atrapadas, heridos de gravedad o colapso estructural inminente. Prioridad máxima de rescate.",
  },
  supplies: {
    label: "Suministros",
    color: "#eab308",
    emoji: "🟡",
    description:
      "Zonas seguras pero con necesidad urgente de suministros (falta de agua, comida, cobijo o primeros auxilios).",
  },
  shelter: {
    label: "Centro de Acopio",
    color: "#16a34a",
    emoji: "🟢",
    description:
      "Punto verificado y habilitado para recibir donaciones físicas o resguardar familias (Refugio seguro).",
  },
};
