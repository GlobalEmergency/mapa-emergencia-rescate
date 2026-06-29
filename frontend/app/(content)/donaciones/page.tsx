import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import { Info } from "lucide-react";
import OfertasList from "./OfertasList";

export const metadata: Metadata = pageMetadata({
  title: "Donaciones",
  description: "Dona dinero, sangre o insumos a organizaciones verificadas que trabajan en el terreno. Iniciativa ciudadana, independiente y no gubernamental.",
  path: "/donaciones",
});

export default function DonacionesPage() {
  return (
    <SubPageShell breadcrumb="Donaciones">
      <section className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-[28px] font-bold text-slate-900 sm:text-[32px]">Donaciones</h1>
        <p className="mb-10 text-[15px] text-slate-600 sm:text-base">
          Dona dinero, sangre o insumos a organizaciones verificadas que trabajan en el terreno.
        </p>

        <div className="mb-10">
          <OfertasList />
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          <Info size={18} className="shrink-0 text-amber-600" />
          <p>Dona solo en sitios oficiales. Desconfía de cuentas no verificadas en redes sociales.</p>
        </div>
      </section>
    </SubPageShell>
  );
}
