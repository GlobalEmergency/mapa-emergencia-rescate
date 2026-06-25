import type { Metadata } from "next";
import dynamic from "next/dynamic";
import PageHeader from "../../components/PageHeader";

const ChatPanel = dynamic(() => import("../../components/ChatPanel"), {
  loading: () => (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 text-center text-sm text-slate-500">
      Cargando chat de voluntarios…
    </section>
  ),
});

export const metadata: Metadata = {
  title: "Voluntarios",
  description:
    "Espacio de coordinación entre voluntarios para rescates, suministros, difusión y soporte técnico.",
};

export default function VolunteersPage() {
  return (
    <main className="flex-1">
      <PageHeader
        icon="🤝"
        title="Espacio de voluntarios"
        description="Coordínense, compartan información verificada y ofrezcan o pidan apoyo. Sean respetuosos y no difundan rumores sin confirmar."
      />
      <ChatPanel embedded />
    </main>
  );
}
