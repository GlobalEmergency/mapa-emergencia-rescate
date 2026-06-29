"use client";

import type { EmergencyReport, ReportType } from "@/lib/types";
import type { MissingStats } from "@/hooks/useMissingStats";
import {
  EDIFICIOS_COUNT,
  EDIFICIOS_SOURCE_LABEL,
  EDIFICIOS_SOURCE_URL,
} from "@/lib/edificios";
import SearchInput from "@/components/ui/SearchInput";
import ReportCard from "./ReportCard";
import { AdminToggle } from "./AdminPanel";

export interface ReportsLayerProps {
  reports: EmergencyReport[];
  visibleReports: EmergencyReport[];
  shownReports: EmergencyReport[];
  remainingReports: number;
  selectedTypes: Set<ReportType>;
  allTypesSelected: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  now: number;
  confirmed: Set<string>;
  isAdmin: boolean;
  missingStats: MissingStats | null;
  onLoadMore: () => void;
  onFocusReport: (report: EmergencyReport) => void;
  onConfirm: (id: string) => void;
  onResolve: (id: string) => void;
  onLogout: () => void;
}

export default function ReportsLayer({
  reports,
  visibleReports,
  shownReports,
  remainingReports,
  selectedTypes,
  allTypesSelected,
  query,
  onQueryChange,
  now,
  confirmed,
  isAdmin,
  missingStats,
  onLoadMore,
  onFocusReport,
  onConfirm,
  onResolve,
  onLogout,
}: ReportsLayerProps) {
  return (
    <div className="e-map-sidebar">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--eborder)] px-3 py-3">
        <div aria-live="polite">
          <p className="text-sm font-semibold text-[var(--etext)]">
            Desaparecidas activas:{" "}
            {missingStats ? (
              <span className="font-bold text-red-600 tabular-nums">
                {missingStats.active.toLocaleString("es-VE")}
              </span>
            ) : (
              <span className="text-[var(--etext2)]">cargando…</span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--etext2)] tabular-nums">
            Reportes en mapa: {reports.length.toLocaleString("es-VE")}
            {missingStats
              ? ` · ${missingStats.onMap.toLocaleString("es-VE")} con punto`
              : ""}
          </p>
          <p className="text-[11px] text-[var(--etext2)]">
            Toca un tipo en el mapa para filtrar la lista
          </p>
        </div>
        <AdminToggle isAdmin={isAdmin} onLogout={onLogout} />
      </div>

      <div className="mt-3 flex flex-col gap-2 px-3">
        <SearchInput
          value={query}
          onChange={onQueryChange}
          placeholder="Buscar por nombre, sector, zona o necesidad…"
          ariaLabel="Buscar reportes"
        />
      </div>

      <div className="mx-3 mb-3 mt-3 max-h-[70vh] min-h-0 flex-1 overflow-y-auto rounded-xl border border-[var(--eborder)] bg-[var(--esurf)] p-2 md:max-h-none">
        {selectedTypes.has("missing") &&
          missingStats &&
          missingStats.active > 0 && (
            <div className="mb-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-900">
              Hay{" "}
              <strong>{missingStats.active.toLocaleString("es-VE")}</strong>{" "}
              personas desaparecidas en la base consolidada. En el mapa se
              muestran las que tienen ubicación geocodificada (
              {missingStats.onMap.toLocaleString("es-VE")}).{" "}
              <a href="#e-directory" className="font-semibold underline">
                Ver lista completa →
              </a>
            </div>
          )}
        {selectedTypes.has("building") && (
          <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            En el mapa hay <strong>{EDIFICIOS_COUNT}</strong> edificios de{" "}
            <a
              href={EDIFICIOS_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              {EDIFICIOS_SOURCE_LABEL}
            </a>{" "}
            (solo lectura; toca uno para ver el daño). Abajo, los reportados por
            usuarios.
          </div>
        )}
        {visibleReports.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            {query.trim()
              ? `No se encontraron reportes para “${query.trim()}”.`
              : selectedTypes.size === 0
                ? "Selecciona un tipo en el mapa para ver reportes."
                : `Aún no hay reportes${allTypesSelected ? "" : " de los tipos seleccionados"}. Usa el botón "+ Reportar" para crear el primero.`}
          </p>
        ) : (
          <>
            {(query.trim() || !allTypesSelected) && (
              <p
                aria-live="polite"
                className="px-3 py-2 text-xs font-medium text-slate-500"
              >
                {visibleReports.length} resultado(s)
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {shownReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  now={now}
                  confirmed={confirmed.has(report.id)}
                  isAdmin={isAdmin}
                  onFocus={onFocusReport}
                  onConfirm={onConfirm}
                  onResolve={onResolve}
                />
              ))}
            </ul>
            {remainingReports > 0 && (
              <button
                type="button"
                onClick={onLoadMore}
                className="mt-2 w-full rounded-xl border border-[var(--eborder)] bg-[var(--einput)] px-3 py-2.5 text-sm font-semibold text-[var(--etext)] transition hover:bg-[var(--esurf)]"
              >
                Ver más ({remainingReports.toLocaleString("es-VE")} restantes)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
