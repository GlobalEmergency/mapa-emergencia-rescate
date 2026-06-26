import dynamic from "next/dynamic";
import type { Metadata } from "next";
import SubPageShell from "@/app/components/SubPageShell";

const EmergencyContacts = dynamic(
  () => import("@/app/components/EmergencyContacts"),
  {
    loading: () => (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-500">
        Cargando teléfonos…
      </section>
    ),
  },
);

export const metadata: Metadata = {
  title: "Teléfonos de emergencia · Mapa de Emergencia Venezuela",
  alternates: { canonical: "/telefonos" },
  description:
    "Directorio actualizado de teléfonos para emergencias, salud, rescate y servicios públicos durante el terremoto.",
};

export default function TelefonosPage() {
  return (
    <SubPageShell breadcrumb="Teléfonos de emergencia">
      <EmergencyContacts />
    </SubPageShell>
  );
}
