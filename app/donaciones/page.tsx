import type { Metadata } from "next";
import SubPageShell from "../components/SubPageShell";
import { Phone, Info } from "lucide-react";
import OfertasList from "./OfertasList";

export const metadata: Metadata = {
  title: "Donaciones · Mapa de Emergencia Venezuela",
  alternates: { canonical: "/donaciones" },
  description: "Dona dinero, sangre o insumos a organizaciones verificadas que trabajan en el terreno.",
};

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

        <div className="mb-10">
          <h2 className="mb-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Donar Sangre</h2>
          <div className="e-card rounded-[20px] bg-white p-6">
            <h3 className="text-[17px] font-bold text-slate-900">Banco de Sangre — Hospital Vargas</h3>
            <p className="mt-2 text-[13px] text-slate-500">Av. La Paz, Los Dos Caminos, Caracas · Lun-Sab 7am-12pm</p>
            <p className="mt-0.5 text-[13px] text-slate-500">Lleva cédula de identidad. Ayunas mínimo 4 horas.</p>

            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-[#c41a1a]">
              <Phone size={16} strokeWidth={2.5} />
              <span>0212-257-2111</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
          <Info size={18} className="shrink-0" />
          <p>Dona solo en sitios oficiales. Desconfía de cuentas no verificadas en redes sociales.</p>
        </div>
      </section>
    </SubPageShell>
  );
}
