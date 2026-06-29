import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";

const CollectionCenters = dynamic(
  () => import("@/components/features/collection/CollectionCenters"),
  {
    loading: () => (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-500">
        Cargando centros de acopio…
      </section>
    ),
  },
);

export const metadata: Metadata = pageMetadata({
  title: "Centros de acopio",
  description:
    "Puntos verificados para entregar agua, alimentos, medicinas y artículos de primera necesidad.",
  path: "/acopio",
});

export default function AcopioPage() {
  return (
    <SubPageShell breadcrumb="Centros de acopio">
      <CollectionCenters />
    </SubPageShell>
  );
}
