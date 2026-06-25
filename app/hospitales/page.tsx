import dynamic from "next/dynamic";
import type { Metadata } from "next";
import SubPageShell from "@/app/components/SubPageShell";

const Hospitals = dynamic(() => import("@/app/components/Hospitals"), {
  loading: () => (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-500">
      Cargando hospitales…
    </section>
  ),
});

export const metadata: Metadata = {
  title: "Hospitales y pacientes · Mapa de Emergencia Venezuela",
  description:
    "Red hospitalaria priorizada con búsqueda global de pacientes por nombre o número de cédula.",
};

export default function HospitalesPage() {
  return (
    <SubPageShell breadcrumb="Hospitales y pacientes">
      <Hospitals />
    </SubPageShell>
  );
}
