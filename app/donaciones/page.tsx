import type { Metadata } from "next";
import SubPageShell from "../components/SubPageShell";
import { Phone, Info } from "lucide-react";

export const metadata: Metadata = {
  title: "Donaciones · Mapa de Emergencia Venezuela",
  alternates: { canonical: "/donaciones" },
  description: "Dona dinero, sangre o insumos a organizaciones verificadas que trabajan en el terreno.",
};

function DonationCard({ title, description, actionUrl }: { title: string, description: string, actionUrl: string }) {
  return (
    <div className="e-card flex flex-col items-start justify-between gap-4 rounded-[20px] bg-white p-6 sm:flex-row sm:items-center">
      <div>
        <h3 className="text-[17px] font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <a 
        href={actionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-full bg-[#c41a1a] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-800"
      >
        Donar &rarr;
      </a>
    </div>
  );
}

export default function DonacionesPage() {
  return (
    <SubPageShell breadcrumb="Inicio">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-[28px] font-bold text-slate-900 sm:text-[32px]">Donaciones</h1>
        <p className="mb-10 text-[15px] text-slate-600 sm:text-base">
          Dona dinero, sangre o insumos a organizaciones verificadas que trabajan en el terreno.
        </p>

        <div className="mb-10">
          <h2 className="mb-4 text-xs font-bold tracking-wider text-slate-400 uppercase">Donación Económica</h2>
          <div className="flex flex-col gap-4">
            <DonationCard 
              title="Cruz Roja Venezolana"
              description="Atención médica, rescate y ayuda humanitaria en Venezuela."
              actionUrl="#"
            />
            <DonationCard 
              title="Banco de Alimentos Venezuela"
              description="Distribución de alimentos a familias en situación de vulnerabilidad."
              actionUrl="#"
            />
            <DonationCard 
              title="FUNDALATIN"
              description="Apoyo a comunidades vulnerables y coordinación de refugios."
              actionUrl="#"
            />
          </div>
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
