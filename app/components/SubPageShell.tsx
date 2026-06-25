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
    <main className="flex-1 bg-slate-50 md:pt-16">
      <HeroDesktopNav />

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-700 hover:underline">
            ← Inicio
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-slate-700">{breadcrumb}</span>
        </div>
      </div>

      <div className="pb-12">{children}</div>

      <SiteFooter />
      <MobileStickyNav />
    </main>
  );
}
