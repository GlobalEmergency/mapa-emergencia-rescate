"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  type MissingReportType,
  type MissingPersonPayload,
} from "@/components/features/missing/MissingPersonForm";
import { TabNav, type TabDef } from "@/components/ui/TabNav";
import { useCreateMissing } from "@/hooks/missing";
import { PersonsTab, type PersonsTabHandle } from "./PersonsTab";
import { HospitalsTab } from "./HospitalsTab";

// Form de reporte: code-split (pesado, solo al pulsar "Reportar").
const MissingPersonForm = dynamic(
  () => import("@/components/features/missing/MissingPersonForm"),
  { ssr: false },
);

type DirectoryTab = "personas" | "hospitales";

const TABS: ReadonlyArray<TabDef<DirectoryTab>> = [
  {
    id: "personas",
    label: "Personas",
    tabId: "tab-personas",
    panelId: "panel-personas",
  },
  {
    id: "hospitales",
    label: "Hospitales",
    tabId: "tab-hospitales",
    panelId: "panel-hospitales",
  },
];

function tabFromHash(hash: string): DirectoryTab | null {
  const id = hash.replace("#", "");
  if (id === "hospitales") return "hospitales";
  if (
    id === "personas" ||
    id === "desaparecidas" ||
    id === "desaparecidas-preview" ||
    id === "e-directory" ||
    id === "localizados"
  ) {
    return "personas";
  }
  return null;
}

function hashForTab(tab: DirectoryTab): string {
  return tab === "hospitales" ? "#hospitales" : "#e-directory";
}

/**
 * Contenedor del directorio (personas + hospitales). Orquesta: pestañas
 * (TabNav), botones de reporte, el form (code-split) y el sync con el hash de
 * la URL. Los DATOS viven en cada pestaña vía hooks TanStack. UI verbatim del
 * MissingPersonsCarousel original.
 */
export default function MissingCarousel() {
  const [activeTab, setActiveTab] = useState<DirectoryTab>("personas");
  const [showForm, setShowForm] = useState(false);
  const [formReportType, setFormReportType] =
    useState<MissingReportType>("missing");
  const [formSessionKey, setFormSessionKey] = useState(0);
  const personasRef = useRef<PersonsTabHandle>(null);
  const createMissing = useCreateMissing();

  const selectTab = useCallback((tab: DirectoryTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", hashForTab(tab));
  }, []);

  const openReportForm = useCallback((reportType: MissingReportType) => {
    setFormReportType(reportType);
    setFormSessionKey((k) => k + 1);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (payload: MissingPersonPayload) => {
      await createMissing.mutateAsync(payload);
      setShowForm(false);
      personasRef.current?.refresh();
    },
    [createMissing],
  );

  useEffect(() => {
    const syncFromHash = () => {
      const next = tabFromHash(window.location.hash);
      if (next) setActiveTab(next);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <section
      id="e-directory"
      className="relative scroll-mt-20 border-b border-[var(--eborder)] bg-[var(--ebg)]"
    >
      <span
        id="hospitales"
        className="pointer-events-none absolute -top-24"
        aria-hidden
      />
      <span
        id="desaparecidas-preview"
        className="pointer-events-none absolute -top-24"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="-mx-4 mb-7 border-b-2 border-[var(--eborder)] px-4 sm:mx-0 sm:px-0">
          <div className="grid gap-2 py-3 sm:flex sm:items-center sm:justify-end">
            {/* Un solo botón: el modal trae el toggle "desaparecida / encontrada"
                adentro, así que abrimos en "missing" por defecto. */}
            <button
              type="button"
              onClick={() => openReportForm("missing")}
              className="e-btn w-full border-red-600 bg-red-600 px-5 py-2.5 text-white hover:bg-red-700 sm:w-auto"
            >
              Reportar persona
            </button>
          </div>
          <TabNav
            tabs={TABS}
            active={activeTab}
            onSelect={selectTab}
            ariaLabel="Directorio de personas y hospitales"
          />
        </div>

        {activeTab === "personas" ? (
          <div
            role="tabpanel"
            id="panel-personas"
            aria-labelledby="tab-personas"
          >
            <PersonsTab ref={personasRef} />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="panel-hospitales"
            aria-labelledby="tab-hospitales"
          >
            <HospitalsTab />
          </div>
        )}

        {showForm && (
          <MissingPersonForm
            key={`${formReportType}-${formSessionKey}`}
            initialReportType={formReportType}
            initialFoundPlace={null}
            onCancel={() => setShowForm(false)}
            onSubmit={handleFormSubmit}
          />
        )}
      </div>
    </section>
  );
}
