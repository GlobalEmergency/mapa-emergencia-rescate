"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Brain,
  ChevronDown,
  CircleCheck,
  Globe2,
  HandHeart,
  HeartHandshake,
  Link2,
  MapPinned,
  MessageCircle,
  PhoneCall,
  Search,
  Share2,
} from "lucide-react";
import TranslateWidget from "./TranslateWidget";
import {
  DESKTOP_NAV_GROUPS,
  MOBILE_BAR_LINKS,
  PRIMARY_MAP_LINK,
  SECTION_LINKS,
  linksForDesktopGroup,
  type DesktopNavGroup,
  type SectionLink,
} from "@/lib/section-nav";
import { psychologyHelpUrl } from "@/lib/site";

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

const DESKTOP_CHIP: Record<NonNullable<SectionLink["tone"]>, string> = {
  primary: "border-red-500 bg-red-600 text-white hover:bg-red-500",
  purple:
    "border-purple-300 bg-purple-50 text-purple-900 hover:border-purple-400 hover:bg-purple-100",
  emerald:
    "border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-100",
  sky: "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100",
  default:
    "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
};

const DESKTOP_ICON = {
  [PRIMARY_MAP_LINK.href]: MapPinned,
  "#desaparecidas": Search,
  "#localizados": CircleCheck,
  "/hospitales": HeartHandshake,
  "/telefonos": PhoneCall,
  "/guia": HeartHandshake,
  "/acopio": HandHeart,
  "/apoyo-global": Globe2,
  "/chat": MessageCircle,
};

const DESKTOP_GROUP_ICON: Record<
  DesktopNavGroup["id"],
  typeof Search
> = {
  personas: Search,
  salud: HeartHandshake,
  recursos: Globe2,
};

function groupBadge(
  group: DesktopNavGroup,
  missing: number | null,
  found: number | null,
): string | null {
  if (group.id === "personas") {
    if (missing !== null) return missing.toLocaleString("es-VE");
    if (found !== null) return found.toLocaleString("es-VE");
  }
  return null;
}

function NavDropdownItem({
  link,
  missing,
  found,
  onHome,
}: {
  link: SectionLink;
  missing: number | null;
  found: number | null;
  onHome: boolean;
}) {
  const badge = badgeValue(link, missing, found);
  const Icon = DESKTOP_ICON[link.href as keyof typeof DESKTOP_ICON] ?? Link2;

  const row = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-base">
        {link.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">
          {link.label}
        </span>
      </span>
      {badge ? (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          {compactBadge(badge)}
        </span>
      ) : (
        <Icon aria-hidden className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
      )}
    </>
  );

  const itemClassName =
    "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50";

  if (isAnchor(link.href)) {
    return (
      <a
        href={resolveHref(link.href, onHome)}
        onClick={
          onHome
            ? (e) => {
                e.preventDefault();
                scrollToSection(link.href);
              }
            : undefined
        }
        title={link.label}
        className={itemClassName}
      >
        {row}
      </a>
    );
  }

  return (
    <Link
      href={link.href}
      prefetch={false}
      title={link.label}
      className={itemClassName}
    >
      {row}
    </Link>
  );
}

function NavGroup({
  group,
  missing,
  found,
  onHome,
}: {
  group: DesktopNavGroup;
  missing: number | null;
  found: number | null;
  onHome: boolean;
}) {
  const links = linksForDesktopGroup(group);
  const tone = group.tone ?? "default";
  const GroupIcon = DESKTOP_GROUP_ICON[group.id];
  const badge = groupBadge(group, missing, found);

  return (
    <div className="group/nav relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-label={`${group.label}: ver secciones`}
        className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold shadow-sm transition lg:gap-1.5 lg:px-2.5 lg:text-[13px] ${DESKTOP_CHIP[tone]}`}
      >
        <GroupIcon aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="hidden lg:inline xl:hidden">{group.shortLabel}</span>
        <span className="hidden xl:inline">{group.label}</span>
        <span className="lg:hidden">{group.shortLabel.slice(0, 4)}</span>
        {badge && (
          <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold leading-none">
            {compactBadge(badge)}
          </span>
        )}
        <ChevronDown
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 opacity-70 transition group-hover/nav:rotate-180"
          strokeWidth={2.5}
        />
      </button>

      <div
        role="menu"
        className="invisible absolute left-1/2 top-full z-[1900] w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 pt-1.5 opacity-0 transition-all duration-150 group-hover/nav:visible group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:opacity-100"
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
          <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {group.label}
          </p>
          {links.map((link) => (
            <NavDropdownItem
              key={link.href}
              link={link}
              missing={missing}
              found={found}
              onHome={onHome}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Menú superior de secciones — solo desktop/tablet. */
export function HeroDesktopNav() {
  const { missing, found } = usePeopleTotals();
  const pathname = usePathname();
  const onHome = pathname === "/";

  const primaryHref = resolveHref(PRIMARY_MAP_LINK.href, onHome);

  return (
    <nav
      aria-label="Secciones principales"
      className="fixed inset-x-0 top-0 z-[1800] hidden w-full border-b border-white/10 bg-black/45 px-2 py-3 shadow-lg backdrop-blur-md md:block lg:px-3"
    >
      <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-center gap-1 lg:gap-1.5">
        <a
          href={primaryHref}
          onClick={
            onHome
              ? (e) => {
                  e.preventDefault();
                  scrollToSection(PRIMARY_MAP_LINK.href);
                }
              : undefined
          }
          title={PRIMARY_MAP_LINK.label}
          aria-label={PRIMARY_MAP_LINK.label}
          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-500 lg:gap-1.5 lg:px-2.5 lg:text-[13px]"
        >
          <MapPinned aria-hidden className="h-4 w-4" strokeWidth={2.2} />
          {PRIMARY_MAP_LINK.shortLabel}
        </a>

        {DESKTOP_NAV_GROUPS.map((group) => (
          <NavGroup
            key={group.id}
            group={group}
            missing={missing}
            found={found}
            onHome={onHome}
          />
        ))}
        <PsychologyHelpNavButton />
        <ShareNavButton variant="desktop" />
      </div>
    </nav>
  );
}

function PsychologyHelpNavButton() {
  const psychologyUrl = psychologyHelpUrl();
  const psychologyIsExternal = !psychologyUrl.startsWith("mailto:");

  const trackPsychologyClick = useCallback(() => {
    fetch("/api/stats/psychology-help", {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }, []);

  return (
    <a
      href={psychologyUrl}
      target={psychologyIsExternal ? "_blank" : undefined}
      rel={psychologyIsExternal ? "noopener noreferrer" : undefined}
      onClick={trackPsychologyClick}
      title="Apoyo psicológico"
      aria-label="Apoyo psicológico"
      className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-1.5 py-1.5 text-xs font-semibold text-violet-900 shadow-sm transition hover:border-violet-400 hover:bg-violet-100 lg:gap-1.5 lg:px-2 lg:text-[13px] xl:px-2.5"
    >
      <Brain aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
      <span className="lg:hidden">Psi.</span>
      <span className="hidden lg:inline xl:hidden">Psico</span>
      <span className="hidden xl:inline">Apoyo psicológico</span>
    </a>
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
        aria-label={copied ? "Enlace copiado" : "Compartir mapa"}
        title={copied ? "Enlace copiado" : "Compartir mapa"}
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:gap-1.5 lg:px-2 lg:text-[13px] xl:px-2.5"
      >
        <Share2 aria-hidden className="h-4 w-4" strokeWidth={2.2} />
        <span className="sr-only lg:not-sr-only">
          {copied ? "Copiado" : "Compartir"}
        </span>
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
        className="fixed inset-x-0 bottom-0 z-[1850] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(15,23,42,0.12)] backdrop-blur-md md:hidden"
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
                <div className="flex gap-2 px-1">
                  <div className="flex-1">
                    <ShareNavButton variant="sheet" onAfterShare={closeSheet} />
                  </div>
                  <TranslateWidget />
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
