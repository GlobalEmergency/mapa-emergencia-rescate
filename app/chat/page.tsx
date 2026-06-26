import dynamic from "next/dynamic";
import type { Metadata } from "next";
import SubPageShell from "@/app/components/SubPageShell";

const ChatPanel = dynamic(() => import("@/app/components/ChatPanel"), {
  loading: () => (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-500">
      Cargando chat…
    </section>
  ),
});

export const metadata: Metadata = {
  title: "Chat de voluntarios · Mapa de Emergencia Venezuela",
  alternates: { canonical: "/chat" },
  description:
    "Coordina rescates, suministros y difusión con otros voluntarios en tiempo real.",
};

export default function ChatPage() {
  return (
    <SubPageShell breadcrumb="Chat de voluntarios">
      <ChatPanel />
    </SubPageShell>
  );
}
