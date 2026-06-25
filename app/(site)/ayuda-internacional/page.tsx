import type { Metadata } from "next";
import PageHeader from "../../components/PageHeader";
import InternationalHelp from "../../components/InternationalHelp";

export const metadata: Metadata = {
  title: "Ayuda internacional",
  description:
    "Contactos de Cruz Roja para familiares en el exterior que buscan restablecer contacto tras el terremoto.",
};

export default function InternationalHelpPage() {
  return (
    <main className="flex-1">
      <PageHeader
        icon="🌍"
        title="Ayuda internacional"
        description="Canal de búsqueda y reunificación familiar para quienes están fuera de Venezuela y perdieron contacto con sus familiares."
      />
      <InternationalHelp embedded />
    </main>
  );
}
