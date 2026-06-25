"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { psychologyHelpUrl } from "@/lib/site";

function psychologyClickLabel(count: number): string {
  const n = count.toLocaleString("es-VE");
  return count === 1 ? `${n} persona` : `${n} personas`;
}

export default function StickyHelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [clickCount, setClickCount] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const psychologyUrl = psychologyHelpUrl();
  const psychologyIsExternal = !psychologyUrl.startsWith("mailto:");

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    setIsMobile(mobileQuery.matches);
    if (mobileQuery.matches) {
      setVisible(true);
      return;
    }

    let scrolled = false;
    let timerDone = false;
    let cancelled = false;

    const reveal = () => {
      if (!cancelled && scrolled && timerDone) {
        setVisible(true);
      }
    };

    const onScroll = () => {
      if (window.scrollY > 48) {
        scrolled = true;
        reveal();
      }
    };

    const timer = window.setTimeout(() => {
      timerDone = true;
      reveal();
    }, 5000);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

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
  }, []);

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

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      aria-hidden={!visible && !isMobile}
      inert={!visible && !isMobile ? true : undefined}
      className={`fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] right-3 z-[1900] flex flex-col items-end gap-3 transition-all duration-500 ease-out md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:right-4 max-md:pointer-events-auto max-md:translate-y-0 max-md:scale-100 max-md:opacity-100 ${
        visible
          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-3 scale-95 opacity-0 md:pointer-events-none md:translate-y-3 md:scale-95 md:opacity-0"
      }`}
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

      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="sticky-help-menu"
        aria-label={
          open ? "Cerrar menú de apoyo psicológico" : "Abrir menú de apoyo psicológico"
        }
        onClick={() => setOpen((value) => !value)}
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
  );
}
