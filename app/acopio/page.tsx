import dynamic from "next/dynamic";
import type { Metadata } from "next";
import SubPageShell from "@/app/components/SubPageShell";

const CollectionCenters = dynamic(
  () => import("@/app/components/CollectionCenters"),
  {
    loading: () => (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-500">
        Cargando centros de acopio…
      </section>
    ),
  },
);

export const metadata: Metadata = {
  title: "Centros de acopio · Mapa de Emergencia Venezuela",
  alternates: { canonical: "/acopio" },
  description:
    "Puntos verificados para entregar agua, alimentos, medicinas y artículos de primera necesidad.",
};

export default function AcopioPage() {
  return (
    <SubPageShell breadcrumb="Centros de acopio">
      <CollectionCenters />
    </SubPageShell>
  );
}
