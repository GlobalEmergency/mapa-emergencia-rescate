import Link from "next/link";
import type { ReactNode } from "react";
import { HeroDesktopNav, MobileStickyNav } from "./SectionNav";
import SiteFooter from "./SiteFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleSchema, breadcrumbSchema, graph } from "@/lib/jsonld";

interface SubPageShellArticle {
  /** Titular real de la página (suele ser más descriptivo que el breadcrumb). */
  headline: string;
  description: string;
  datePublished?: string;
  dateModified?: string;
}

interface SubPageShellProps {
  /** Texto del último item del breadcrumb. */
  breadcrumb: string;
  /** Ruta de la página (p.ej. "/guia"). Habilita la URL del último breadcrumb
   *  y el marcado Article. */
  path?: string;
  /** Si la página es contenido de referencia, emite también schema Article. */
  article?: SubPageShellArticle;
  children: ReactNode;
}

export default function SubPageShell({
  breadcrumb,
  path,
  article,
  children,
}: SubPageShellProps) {
  const nodes = [
    breadcrumbSchema([
      { name: "Inicio", path: "/" },
      { name: breadcrumb, ...(path ? { path } : {}) },
    ]),
  ];
  if (article && path) {
    nodes.push(
      articleSchema({
        title: article.headline,
        description: article.description,
        path,
        datePublished: article.datePublished,
        dateModified: article.dateModified,
      }),
    );
  }
  return (
    <>
      <JsonLd data={graph(...nodes)} />
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
