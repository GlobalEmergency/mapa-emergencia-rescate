import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";

const InternationalHelp = dynamic(
  () => import("@/components/features/international"),
  {
    loading: () => (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 text-sm text-slate-500">
        Cargando ayuda internacional…
      </section>
    ),
  },
);

export const metadata: Metadata = pageMetadata({
  title: "Apoyo global",
  description:
    "Cómo sumarte desde el exterior: donaciones, organizaciones aliadas y formas de difundir la emergencia. Iniciativa ciudadana, independiente y no gubernamental.",
  path: "/apoyo-global",
});

export default function ApoyoGlobalPage() {
  return (
    <SubPageShell breadcrumb="Apoyo global">
      <InternationalHelp />
    </SubPageShell>
  );
}
