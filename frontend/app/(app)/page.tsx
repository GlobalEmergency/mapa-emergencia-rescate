import dynamic from "next/dynamic";
import EmergencyApp from "@/components/features/emergency";
import { HeroDesktopNav, MobileStickyNav } from "@/components/layout/SectionNav";
import SiteFooter from "@/components/layout/SiteFooter";
import HeroSection from "@/components/layout/HeroSection";
import HelpSection from "@/components/layout/HelpSection";
import AlertTicker from "@/components/layout/AlertTicker";
import TutorialSteps from "@/components/layout/TutorialSteps";

const MissingPersonsCarousel = dynamic(
  () => import("@/components/features/missing-carousel"),
  {
    loading: () => (
      <section className="border-b border-[var(--eborder)] bg-[var(--esurf)] px-4 py-6 text-center text-sm text-[var(--etext2)]">
        Cargando directorio…
      </section>
    ),
  },
);

export default function Home() {
  return (
    <>
      <HeroDesktopNav />
      <main id="main" className="flex-1">
        <HeroSection />
        <AlertTicker />

        <MissingPersonsCarousel />

        <TutorialSteps />
        
        <HelpSection />

        <EmergencyApp />
      </main >

      <SiteFooter />
      <MobileStickyNav />
    </>
  );
}
