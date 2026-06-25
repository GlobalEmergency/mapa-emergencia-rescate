import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";
import HashRedirect from "../components/HashRedirect";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HashRedirect />
      <SiteNav />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </>
  );
}
