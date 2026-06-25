import type { Metadata } from "next";
import PageHeader from "../../components/PageHeader";
import SurvivalGuide from "../../components/SurvivalGuide";

export const metadata: Metadata = {
  title: "Guía rápida",
  description:
    "Acciones esenciales para vecinos y comunidades en las primeras horas tras el terremoto.",
};

export default function GuidePage() {
  return (
    <main className="flex-1">
      <PageHeader
        icon="🧭"
        title="Guía rápida para la comunidad"
        description="Acciones esenciales en las primeras horas. Compártelas con tus vecinos, familiares y grupos de chat."
      />
      <SurvivalGuide embedded />
    </main>
  );
}
