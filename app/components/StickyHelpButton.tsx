"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HandCoins } from "lucide-react";
import PlatformDonatePanel from "./PlatformDonatePanel";
import { trackEvent } from "./openpanel";

export default function StickyHelpButton() {
  const pathname = usePathname();
  const [donateOpen, setDonateOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!donateOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDonateOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setDonateOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [donateOpen]);

  useEffect(() => {
    const closeIfMobileSheetOpen = () => {
      if (document.body.classList.contains("mobile-sheet-open")) {
        setDonateOpen(false);
      }
    };
    closeIfMobileSheetOpen();
    const observer = new MutationObserver(closeIfMobileSheetOpen);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const openFromEvent = () => setDonateOpen(true);
    window.addEventListener("responde:open-donate-panel", openFromEvent);
    return () =>
      window.removeEventListener("responde:open-donate-panel", openFromEvent);
  }, []);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      data-sticky-help-root
      className="pointer-events-none fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] right-3 z-[1840] flex flex-col items-end gap-3 md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:right-4 md:z-[1900]"
    >
      <div
        id="__donate-tooltip"
        role="dialog"
        aria-labelledby="donate-tooltip-title"
        aria-hidden={!donateOpen}
        inert={!donateOpen ? true : undefined}
        className={`e-donate-tooltip origin-bottom-right w-[min(calc(100vw-2rem),300px)] transition-all duration-200 ${
          donateOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0"
        }`}
      >
        <PlatformDonatePanel titleId="donate-tooltip-title" refreshKey={donateOpen} />
      </div>

      <button
        id="__donate-btn"
        type="button"
        aria-expanded={donateOpen}
        aria-controls="__donate-tooltip"
        aria-haspopup="dialog"
        aria-label={
          donateOpen ? "Cerrar panel de apoyo a la plataforma" : "Apóyanos"
        }
        onClick={() => {
          setDonateOpen((value) => !value);
          trackEvent("donation_fab_toggled", { open: !donateOpen });
        }}
        data-track="donation_fab_toggled"
        className={`e-donate-fab-btn pointer-events-auto flex min-h-12 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full px-4 py-3 text-xs font-bold text-white shadow-lg transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:max-w-none sm:text-sm ${
          donateOpen ? "" : "animate-pulse-soft"
        }`}
      >
        <HandCoins aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="truncate">Apóyanos</span>
      </button>
    </div>
  );
}
