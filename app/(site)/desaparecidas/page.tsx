import type { Metadata } from "next";
import dynamic from "next/dynamic";
import PageHeader from "../../components/PageHeader";

const MissingPersonsCarousel = dynamic(
  () => import("../../components/MissingPersonsCarousel"),
  {
    loading: () => (
      <section className="border-b border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        Cargando personas desaparecidas…
      </section>
    ),
  },
);

const MissingPersons = dynamic(
  () => import("../../components/MissingPersons"),
  {
    loading: () => (
      <section className="mx-auto w-full max-w-7xl px-4 pb-14 text-sm text-slate-500">
        Cargando lista de personas…
      </section>
    ),
  },
);

const FoundPersons = dynamic(() => import("../../components/FoundPersons"));

export const metadata: Metadata = {
  title: "Personas desaparecidas",
  description:
    "Busca, reporta y comparte información para localizar personas desaparecidas tras el terremoto.",
};

export default function MissingPersonsPage() {
  return (
    <main className="flex-1">
      <PageHeader
        icon="🧍"
        title="Personas desaparecidas"
        description="Ayúdanos a localizarlas. Si reconoces a alguien o tienes información, contacta a la persona indicada en cada ficha."
      />
      <MissingPersonsCarousel />
      <MissingPersons />
      <FoundPersons />
    </main>
  );
}
