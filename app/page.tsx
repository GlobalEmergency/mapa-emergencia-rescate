import dynamic from "next/dynamic";
import EmergencyApp from "./components/EmergencyApp";
import { HeroDesktopNav, MobileStickyNav } from "./components/SectionNav";
import SiteFooter from "./components/SiteFooter";
import HeroSection from "./components/HeroSection";
import HelpSection from "./components/HelpSection";
import AlertTicker from "./components/AlertTicker";
import TutorialSteps from "./components/TutorialSteps";

const MissingPersonsCarousel = dynamic(
  () => import("./components/MissingPersonsCarousel"),
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
