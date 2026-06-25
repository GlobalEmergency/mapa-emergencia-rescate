import type { Metadata } from "next";
import PageHeader from "../../components/PageHeader";
import CollectionCenters from "../../components/CollectionCenters";

export const metadata: Metadata = {
  title: "Centros de acopio",
  description:
    "Puntos verificados donde puedes llevar donaciones físicas para quienes fueron afectados por el terremoto.",
};

export default function CollectionCentersPage() {
  return (
    <main className="flex-1">
      <PageHeader
        icon="🟢"
        title="Centros de acopio"
        description="Lugares verificados donde puedes llevar donaciones físicas. Revisa qué reciben antes de ir."
      />
      <CollectionCenters embedded />
    </main>
  );
}
