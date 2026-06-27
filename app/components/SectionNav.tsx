"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MapPinned } from "lucide-react";
import TranslateWidget from "./TranslateWidget";
import PsychologyHelpButton from "./PsychologyHelpButton";
import { DonateNavButton } from "./DonateButton";
import { SiteBrand } from "./HeroSection";
import { toggleTheme } from "./ThemeProvider";
import {
  MOBILE_BAR_LINKS,
  PRIMARY_MAP_LINK,
  SECTION_LINKS,
  type SectionLink,
} from "@/lib/section-nav";
import { WHATSAPP_COMMUNITY_URL, X_PROFILE_URL } from "@/lib/site";

const SHARE_TEXT =
  "Mapa de Emergencia y Rescate: Terremoto en Venezuela. Reporta y consulta el estado de las zonas en tiempo real.";

const MOBILE_NAV_BOTTOM = "calc(3.25rem + env(safe-area-inset-bottom))";

function isAnchor(href: string): boolean {
  return href.startsWith("#");
}

/**
 * Devuelve el href final según el contexto:
 * - Ancla en el home: hash literal
 * - Ancla fuera del home: `/#xxx` para volver y posicionar
 * - Ruta absoluta: tal cual
 */
function resolveHref(href: string, onHome: boolean): string {
  if (!isAnchor(href)) return href;
  return onHome ? href : `/${href}`;
}

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

function NavHeaderActions() {
  return (
    <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2">
      <PsychologyHelpButton />
      <a
        href={WHATSAPP_COMMUNITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 min-h-0 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
      >
        <span aria-hidden>💬</span>
        <span className="hidden md:inline">Únete a la comunidad</span>
        <span className="md:hidden">WhatsApp</span>
      </a>
      <a
        href={X_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Síguenos en X"
        title="Síguenos en X"
        className="inline-flex h-9 w-9 min-h-0 items-center justify-center rounded-full border-[1.5px] border-[var(--eborder)] bg-[var(--esurf)] text-sm font-bold text-[var(--etext)] transition hover:bg-[var(--einput)]"
      >
        𝕏
      </a>
      <TranslateWidget nav />
    </div>
  );
}

/** Barra superior sticky: marca + enlaces sociales e idioma. */
export function HeroDesktopNav() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <nav
      aria-label="Secciones principales"
      className="sticky top-0 z-[1800] w-full border-b-[1.5px] border-[var(--eborder)] bg-[var(--esurf)] shadow-sm"
    >
      <div className="mx-auto flex h-[62px] max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-6">
        <SiteBrand
          onClick={onHome ? () => scrollToSection("main") : undefined}
        />
        <NavHeaderActions />
      </div>
    </nav>
  );
}

function ShareNavButton({ onAfterShare }: { onAfterShare?: () => void }) {
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
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";

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

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, link: SectionLink) => {
      if (isAnchor(link.href) && onHome) {
        e.preventDefault();
        scrollToSection(link.href);
      }
    },
    [onHome],
  );

  const handleSheetClick = useCallback(
    (link: SectionLink) => {
      setSheetOpen(false);
      if (isAnchor(link.href) && onHome) {
        window.setTimeout(() => scrollToSection(link.href), 50);
        return;
      }
      const href = resolveHref(link.href, onHome);
      if (href.startsWith("#")) {
        window.location.href = `/${href}`;
        return;
      }
      router.push(href);
    },
    [onHome, router],
  );

  return (
    <>
      <nav
        aria-label="Navegación rápida"
        className="fixed inset-x-0 bottom-0 z-[1850] border-t-[1.5px] border-[var(--eborder)] bg-[var(--esurf)]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(10,22,40,0.12)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {MOBILE_BAR_LINKS.map((link) => {
            const badge = badgeValue(link, missing, found);
            return (
              <a
                key={link.href}
                href={resolveHref(link.href, onHome)}
                onClick={(e) => handleBarClick(e, link)}
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
            className="fixed inset-x-0 top-0 z-[1940] touch-manipulation bg-slate-900/50 md:hidden"
            onClick={closeSheet}
          />

          <div
            id="mobile-section-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            style={{ bottom: MOBILE_NAV_BOTTOM }}
            className="fixed inset-x-0 z-[1950] flex max-h-[min(60vh,24rem)] flex-col rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl md:hidden"
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
                      onClick={() => handleSheetClick(link)}
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
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    closeSheet();
                  }}
                  className="flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--etext)] transition active:bg-[var(--einput)]"
                >
                  <span className="text-xl" aria-hidden>
                    🌓
                  </span>
                  Cambiar tema claro/oscuro
                </button>
              </li>
              <li className="pt-2">
                <DonateNavButton variant="sheet" onAfterDonate={closeSheet} />
              </li>
              <li className="pt-2">
                <div className="flex gap-2 px-1">
                  <div className="flex-1">
                    <ShareNavButton onAfterShare={closeSheet} />
                  </div>
                </div>
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

/** Mini hero móvil para sub-páginas: enlace de regreso al mapa principal. */
export function MobileBackToMapCta() {
  return (
    <Link
      href="/#mapa"
      prefetch={false}
      className="mt-4 inline-flex min-h-11 w-full max-w-sm touch-manipulation items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 md:hidden"
    >
      <MapPinned aria-hidden className="h-4 w-4" strokeWidth={2.2} />
      Volver al mapa
    </Link>
  );
}
