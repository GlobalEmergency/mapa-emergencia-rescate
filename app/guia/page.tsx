import dynamic from "next/dynamic";
import type { Metadata } from "next";
import SubPageShell from "@/app/components/SubPageShell";

const SurvivalGuide = dynamic(
  () => import("@/app/components/SurvivalGuide"),
  {
    loading: () => (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-500">
        Cargando guía…
      </section>
    ),
  },
);

export const metadata: Metadata = {
  title: "Guía rápida de emergencia · Mapa de Emergencia Venezuela",
  description:
    "Pasos esenciales antes, durante y después de un sismo. Cómo proteger a tu familia y solicitar ayuda.",
};

export default function GuiaPage() {
  return (
    <SubPageShell breadcrumb="Guía rápida">
      <SurvivalGuide />
    </SubPageShell>
  );
}
