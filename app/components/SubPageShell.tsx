import Link from "next/link";
import type { ReactNode } from "react";
import { HeroDesktopNav, MobileStickyNav } from "./SectionNav";
import SiteFooter from "./SiteFooter";

interface SubPageShellProps {
  /** Texto del último item del breadcrumb. */
  breadcrumb: string;
  children: ReactNode;
}

export default function SubPageShell({
  breadcrumb,
  children,
}: SubPageShellProps) {
  return (
    <>
      <main id="main" className="flex-1 bg-[var(--ebg)]">
      <HeroDesktopNav />

      <div className="border-b border-[var(--eborder)] bg-[var(--esurf)]">
        <div className="mx-auto flex w-full max-w-[1120px] items-center gap-2 px-4 py-3 text-sm text-[var(--etext2)] sm:px-6">
          <Link href="/" className="hover:text-[var(--etext)] hover:underline">
            ← Inicio
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-[var(--etext)]">{breadcrumb}</span>
        </div>
      </div>

      <div className="pb-12">{children}</div>
    </main>

      <SiteFooter />
      <MobileStickyNav />
    </>
  );
}
