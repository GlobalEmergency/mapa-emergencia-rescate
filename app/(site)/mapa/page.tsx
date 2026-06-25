import type { Metadata } from "next";
import dynamic from "next/dynamic";
import PageHeader from "../../components/PageHeader";
import ReportTutorial from "../../components/ReportTutorial";
import MarkerLegendSection from "../../components/MarkerLegendSection";

const EmergencyApp = dynamic(() => import("../../components/EmergencyApp"), {
  loading: () => (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 text-center text-sm text-slate-500">
      Cargando mapa…
    </section>
  ),
});

export const metadata: Metadata = {
  title: "Mapa y reportes",
  description:
    "Reporta emergencias, consulta alertas ciudadanas y coordina rescates en el mapa interactivo.",
};

export default function MapPage() {
  return (
    <main className="flex-1">
      <PageHeader
        icon="🗺️"
        title="Mapa de emergencia y reportes"
        description="Ubica incidentes, publica alertas con foto y consulta el estado de las zonas en tiempo real."
      />
      <ReportTutorial />
      <EmergencyApp />
      <MarkerLegendSection />
    </main>
  );
}
