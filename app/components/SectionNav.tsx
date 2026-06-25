"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MOBILE_BAR_LINKS,
  PRIMARY_MAP_LINK,
  SECTION_LINKS,
  type SectionLink,
} from "@/lib/section-nav";

const SHARE_TEXT =
  "Mapa de Emergencia y Rescate: Terremoto en Venezuela. Reporta y consulta el estado de las zonas en tiempo real.";

const MOBILE_NAV_BOTTOM = "calc(3.25rem + env(safe-area-inset-bottom))";

/** Navegación por ancla compatible con iOS Safari y barra inferior fija. */
function scrollToSection(href: string) {
  const id = href.replace(/^#/, "");
  if (!id) return;

  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
    return;
  }

  window.location.hash = id;
}

function useIosScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;
    document.body.classList.add("mobile-sheet-open");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.body.classList.remove("mobile-sheet-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

function usePeopleTotals() {
  const [missing, setMissing] = useState<number | null>(null);
  const [found, setFound] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [activeRes, foundRes] = await Promise.all([
          fetch("/api/missing?pageSize=1", { cache: "no-store" }),
          fetch("/api/missing?status=found&pageSize=1", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (activeRes.ok) {
          const data = await activeRes.json();
          if (!cancelled) setMissing(data.total ?? 0);
        }
        if (foundRes.ok) {
          const data = await foundRes.json();
          if (!cancelled) setFound(data.total ?? 0);
        }
      } catch {
        // se reintenta en el próximo ciclo
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { missing, found };
}

function compactBadge(value: string): string {
  const digits = value.replace(/\D/g, "");
  const n = Number(digits);
  if (Number.isNaN(n) || n < 1000) return value;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `${Math.round(n / 1000)}k`;
}

function badgeValue(
  link: SectionLink,
  missing: number | null,
  found: number | null,
): string | null {
  if (link.badge === "missing" && missing !== null) {
    return missing.toLocaleString("es-VE");
  }
  if (link.badge === "found" && found !== null) {
    return found.toLocaleString("es-VE");
  }
  return null;
}

const DESKTOP_CHIP: Record<NonNullable<SectionLink["tone"]>, string> = {
  primary:
    "border-red-400/40 bg-red-600/90 text-white hover:bg-red-500",
  purple:
    "border-purple-300/40 bg-purple-600/85 text-white hover:bg-purple-500",
  emerald:
    "border-emerald-300/40 bg-emerald-600/85 text-white hover:bg-emerald-500",
  sky: "border-sky-300/40 bg-sky-600/85 text-white hover:bg-sky-500",
  default:
    "border-white/25 bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm",
};

function NavLink({
  link,
  missing,
  found,
  className,
  compact = false,
}: {
  link: SectionLink;
  missing: number | null;
  found: number | null;
  className?: string;
  compact?: boolean;
}) {
  const badge = badgeValue(link, missing, found);
  const tone = link.tone ?? "default";

  return (
    <a
      href={link.href}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition ${DESKTOP_CHIP[tone]} ${className ?? ""}`}
    >
      <span aria-hidden>{link.icon}</span>
      <span className={compact ? "sr-only sm:not-sr-only" : undefined}>
        {compact ? link.shortLabel : link.label}
      </span>
      {badge && (
        <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-bold">
          {badge}
        </span>
      )}
    </a>
  );
}

/** Menú de secciones en el hero — solo desktop/tablet. */
export function HeroDesktopNav() {
  const { missing, found } = usePeopleTotals();

  return (
    <nav
      aria-label="Secciones principales"
      className="mt-6 hidden w-full max-w-4xl md:block"
    >
      <a
        href={PRIMARY_MAP_LINK.href}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-base font-bold text-white shadow-lg transition hover:bg-red-500"
      >
        <span aria-hidden>{PRIMARY_MAP_LINK.icon}</span>
        {PRIMARY_MAP_LINK.label}
      </a>

      <div className="mt-3 rounded-2xl border border-white/15 bg-black/25 p-3 shadow-lg backdrop-blur-md">
        <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-white/70">
          Ir a una sección
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SECTION_LINKS.map((link) => (
            <NavLink
              key={link.href}
              link={link}
              missing={missing}
              found={found}
              compact
            />
          ))}
          <ShareNavButton variant="desktop" />
        </div>
      </div>
    </nav>
  );
}

function ShareNavButton({
  variant,
  onAfterShare,
}: {
  variant: "desktop" | "sheet";
  onAfterShare?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    onAfterShare?.();
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mapa de Emergencia y Rescate",
          text: SHARE_TEXT,
          url,
        });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sin permisos */
    }
  }, [onAfterShare]);

  if (variant === "desktop") {
    return (
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25"
      >
        <span aria-hidden>🔗</span>
        {copied ? "Copiado" : "Compartir"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
    >
      <span aria-hidden>🔗</span>
      {copied ? "Enlace copiado" : "Compartir mapa"}
    </button>
  );
}

/** Barra inferior fija en móvil + hoja de más secciones. */
export function MobileStickyNav() {
  const { missing, found } = usePeopleTotals();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("has-mobile-nav");
    return () => document.body.classList.remove("has-mobile-nav");
  }, []);

  useIosScrollLock(sheetOpen);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const sheetLinks = SECTION_LINKS.filter((link) => !link.mobileBar);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const navigateFromSheet = useCallback((href: string) => {
    setSheetOpen(false);
    window.setTimeout(() => scrollToSection(href), 50);
  }, []);

  const navigateFromBar = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      scrollToSection(href);
    },
    [],
  );

  return (
    <>
      <nav
        aria-label="Navegación rápida"
        className="fixed inset-x-0 bottom-0 z-[1850] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(15,23,42,0.12)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {MOBILE_BAR_LINKS.map((link) => {
            const badge = badgeValue(link, missing, found);
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => navigateFromBar(e, link.href)}
                className="flex min-h-[3.25rem] touch-manipulation flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold text-slate-700 transition active:bg-slate-100"
              >
                <span className="relative text-lg leading-none" aria-hidden>
                  {link.icon}
                  {badge && (
                    <span className="absolute -right-2 -top-1 rounded-full bg-red-600 px-1 text-[8px] font-bold leading-tight text-white">
                      {compactBadge(badge)}
                    </span>
                  )}
                </span>
                <span className="truncate">{link.shortLabel}</span>
              </a>
            );
          })}
          <button
            type="button"
            aria-expanded={sheetOpen}
            aria-controls="mobile-section-sheet"
            onClick={() => setSheetOpen((open) => !open)}
            className="flex min-h-[3.25rem] touch-manipulation flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold text-slate-700 transition active:bg-slate-100"
          >
            <span className="text-lg leading-none" aria-hidden>
              {sheetOpen ? "×" : "☰"}
            </span>
            {sheetOpen ? "Cerrar" : "Más"}
          </button>
        </div>
      </nav>

      {sheetOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú de secciones"
            style={{ bottom: MOBILE_NAV_BOTTOM }}
            className="fixed inset-x-0 top-0 z-[1860] touch-manipulation bg-slate-900/50 md:hidden"
            onClick={closeSheet}
          />

          <div
            id="mobile-section-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            style={{ bottom: MOBILE_NAV_BOTTOM }}
            className="fixed inset-x-0 z-[1870] flex max-h-[min(60vh,24rem)] flex-col rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl md:hidden"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">Más secciones</p>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Cerrar menú"
                className="grid h-10 w-10 touch-manipulation place-items-center rounded-full bg-slate-100 text-lg text-slate-600"
              >
                ×
              </button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [-webkit-overflow-scrolling:touch]">
              {sheetLinks.map((link) => {
                const badge = badgeValue(link, missing, found);
                return (
                  <li key={link.href}>
                    <button
                      type="button"
                      onClick={() => navigateFromSheet(link.href)}
                      className="flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 transition active:bg-slate-100"
                    >
                      <span className="text-xl" aria-hidden>
                        {link.icon}
                      </span>
                      <span className="flex-1">{link.label}</span>
                      {badge && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          {badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              <li className="pt-2">
                <ShareNavButton variant="sheet" onAfterShare={closeSheet} />
              </li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}

/** CTA principal visible solo en móvil dentro del hero. */
export function HeroMobileCta() {
  return (
    <a
      href={PRIMARY_MAP_LINK.href}
      onClick={(e) => {
        if (window.matchMedia("(max-width: 767px)").matches) {
          e.preventDefault();
          scrollToSection(PRIMARY_MAP_LINK.href);
        }
      }}
      className="mt-5 inline-flex min-h-12 w-full max-w-sm touch-manipulation items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-red-500 md:hidden"
    >
      <span aria-hidden>{PRIMARY_MAP_LINK.icon}</span>
      {PRIMARY_MAP_LINK.label}
    </a>
  );
}
