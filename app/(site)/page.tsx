import SiteHero from "../components/SiteHero";
import SiteMenuGrid from "../components/SiteMenuGrid";

export default function HomePage() {
  return (
    <main className="flex-1">
      <SiteHero />
      <SiteMenuGrid />
    </main>
  );
}
