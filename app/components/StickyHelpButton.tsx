"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CONTACT_EMAIL, contactMailto, psychologyHelpUrl } from "@/lib/site";

export default function StickyHelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const psychologyUrl = psychologyHelpUrl();
  const psychologyIsExternal = !psychologyUrl.startsWith("mailto:");

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
      className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] right-3 z-[1900] flex flex-col items-end gap-3 md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:right-4"
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
          onClick={() => setOpen(false)}
          className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
        >
          <span aria-hidden>💜</span>
          Solicitar cita psicológica (Calma)
        </a>

        <a
          role="menuitem"
          href={contactMailto()}
          onClick={() => setOpen(false)}
          className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
        >
          <span aria-hidden>✉️</span>
          {CONTACT_EMAIL}
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
        aria-label={open ? "Cerrar menú de ayuda" : "Abrir menú de ayuda"}
        onClick={() => setOpen((value) => !value)}
        className={`relative flex min-h-12 items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
          open ? "" : "animate-pulse-soft"
        }`}
      >
        <span aria-hidden className="text-base">
          {open ? "×" : "🆘"}
        </span>
        {open ? "Cerrar" : "Ayuda"}
      </button>
    </div>
  );
}
