import dynamic from "next/dynamic";
import type { Metadata } from "next";
import SubPageShell from "@/app/components/SubPageShell";

const InternationalHelp = dynamic(
  () => import("@/app/components/InternationalHelp"),
  {
    loading: () => (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-500">
        Cargando ayuda internacional…
      </section>
    ),
  },
);

export const metadata: Metadata = {
  title: "Apoyo global · Mapa de Emergencia Venezuela",
  description:
    "Cómo sumarte desde el exterior: donaciones, organizaciones aliadas y formas de difundir la emergencia.",
};

export default function ApoyoGlobalPage() {
  return (
    <SubPageShell breadcrumb="Apoyo global">
      <InternationalHelp />
    </SubPageShell>
  );
}
