"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isNavActive, PRIMARY_CTA, SITE_NAV } from "@/lib/navigation";

const ACCENT: Record<
  NonNullable<(typeof SITE_NAV)[number]["accent"]>,
  string
> = {
  red: "bg-red-600 text-white hover:bg-red-500",
  purple: "bg-purple-600 text-white hover:bg-purple-500",
  emerald: "bg-emerald-600 text-white hover:bg-emerald-500",
  sky: "bg-sky-600 text-white hover:bg-sky-500",
  slate: "bg-slate-800 text-white hover:bg-slate-700",
  indigo: "bg-indigo-600 text-white hover:bg-indigo-500",
};

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const navLinkClass = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isNavActive(pathname, href)
        ? "bg-red-50 text-red-700"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-[1600] border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="min-w-0 shrink truncate text-sm font-bold text-slate-900 sm:text-base"
        >
          <span aria-hidden className="mr-1">
            🚨
          </span>
          Mapa Emergencia VE
        </Link>

        <nav
          className="hidden max-w-[52rem] items-center gap-1 overflow-x-auto lg:flex [scrollbar-width:none]"
          aria-label="Navegación principal"
        >
          <Link href={PRIMARY_CTA.href} className={navLinkClass(PRIMARY_CTA.href)}>
            {PRIMARY_CTA.icon} Mapa
          </Link>
          {SITE_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href={PRIMARY_CTA.href}
          className={`hidden shrink-0 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm sm:inline-flex lg:hidden ${ACCENT.red}`}
        >
          {PRIMARY_CTA.icon} Reportar
        </Link>

        <button
          type="button"
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "×" : "☰"}
        </button>
      </div>

      <nav
        id="mobile-nav"
        aria-hidden={!open}
        inert={!open ? true : undefined}
        className={`border-t border-slate-100 bg-white px-4 py-3 lg:hidden ${
          open ? "block" : "hidden"
        }`}
      >
        <ul className="grid gap-1">
          <li>
            <Link
              href={PRIMARY_CTA.href}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${ACCENT.red}`}
            >
              {PRIMARY_CTA.icon} {PRIMARY_CTA.label}
            </Link>
          </li>
          {SITE_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  isNavActive(pathname, item.href)
                    ? "bg-red-50 text-red-700"
                    : "text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
