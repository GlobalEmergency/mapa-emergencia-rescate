import type { Metadata } from "next";
import PageHeader from "../../components/PageHeader";
import EmergencyContacts from "../../components/EmergencyContacts";

export const metadata: Metadata = {
  title: "Teléfonos de emergencia",
  description:
    "Directorio de líneas directas de ambulancias, bomberos y servicios de emergencia en Caracas y Gran Caracas.",
};

export default function PhonesPage() {
  return (
    <main className="flex-1">
      <PageHeader
        icon="📞"
        title="Teléfonos de emergencia"
        description="Toca para ver y llamar directamente. Caracas y Gran Caracas (0212)."
      />
      <EmergencyContacts embedded />
    </main>
  );
}
