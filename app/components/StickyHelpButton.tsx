"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { psychologyHelpUrl } from "@/lib/site";
import { trackEvent } from "./openpanel";
import TranslateWidget from "./TranslateWidget";

function psychologyClickLabel(count: number): string {
  const n = count.toLocaleString("es-VE");
  return count === 1 ? `${n} persona` : `${n} personas`;
}

export default function StickyHelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [clickCount, setClickCount] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const psychologyUrl = psychologyHelpUrl();
  const psychologyIsExternal = !psychologyUrl.startsWith("mailto:");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats/psychology-help")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: number } | null) => {
        if (!cancelled && typeof data?.count === "number") {
          setClickCount(data.count);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const trackPsychologyClick = useCallback(() => {
    trackEvent("psychology_help_requested", {
      destination: psychologyIsExternal ? "external" : "mailto",
    });
    fetch("/api/stats/psychology-help", {
      method: "POST",
      keepalive: true,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: number } | null) => {
        if (typeof data?.count === "number") {
          setClickCount(data.count);
        }
      })
      .catch(() => {});
  }, [psychologyIsExternal]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  useEffect(() => {
    const closeIfMobileSheetOpen = () => {
      if (document.body.classList.contains("mobile-sheet-open")) {
        setOpen(false);
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

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  // El root va con pointer-events-none porque su caja incluye el menú oculto
  // (opacity-0 pero presente en el layout); sin esto bloquearía el mapa/página
  // detrás. Los hijos interactivos (botón, y el menú al abrirse) reactivan los
  // pointer-events.
  return (
    <div
      ref={rootRef}
      data-sticky-help-root
      className="pointer-events-none fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] right-3 z-[1840] flex flex-col items-end gap-3 md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:right-4 md:z-[1900]"
    >
      <div
        id="sticky-help-menu"
        role="menu"
        aria-hidden={!open}
        inert={!open ? true : undefined}
        className={`origin-bottom-right w-[min(calc(100vw-2rem),18rem)] rounded-2xl border border-violet-200 bg-white p-4 shadow-2xl transition-all duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0"
        }`}
      >
        <p className="text-sm font-bold text-slate-900">¿Necesitas apoyo?</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Primeros auxilios psicológicos en línea vía{" "}
          <strong className="font-semibold text-slate-700">Calma</strong> (voluntarios
          de la Universidad Continental). Agenda tu cita en el formulario.
        </p>

        <a
          role="menuitem"
          href={psychologyUrl}
          target={psychologyIsExternal ? "_blank" : undefined}
          rel={psychologyIsExternal ? "noopener noreferrer" : undefined}
          onClick={() => {
            setOpen(false);
            trackPsychologyClick();
          }}
          data-track="psychology_help_clicked"
          className="relative mt-3 flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden>💜</span>
            Solicitar cita psicológica (Calma)
          </span>
          {clickCount !== null && clickCount > 0 ? (
            <span className="text-[10px] font-medium text-violet-200">
              {psychologyClickLabel(clickCount)} han pedido cita
            </span>
          ) : null}
        </a>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Si estás en peligro inmediato, llama a los servicios de emergencia
          (171 / 911).
        </p>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <TranslateWidget floating />
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls="sticky-help-menu"
          aria-label={
            open ? "Cerrar menú de apoyo psicológico" : "Abrir menú de apoyo psicológico"
          }
          onClick={() => setOpen((value) => !value)}
          data-track="psychology_menu_toggled"
          className={`relative flex min-h-12 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full bg-violet-600 px-3 py-3 text-xs font-semibold text-white shadow-lg transition hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 sm:max-w-none sm:px-4 sm:text-sm ${
            open ? "" : "animate-pulse-soft"
          }`}
        >
          <span aria-hidden className="shrink-0 text-base">
            {open ? "×" : "💜"}
          </span>
          <span className="truncate">{open ? "Cerrar" : "Apoyo psicológico"}</span>
        </button>
      </div>
    </div>
  );
}
