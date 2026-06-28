"use client";

import { useCallback } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { toggleTheme } from "./ThemeProvider";

const OPEN_EMERGENCY_REPORT_EVENT = "open-emergency-report";

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  } else {
    window.location.hash = id;
  }
}

interface HeroAccessCardProps {
  emoji: string;
  title: string;
  description: string;
  onClick: () => void;
  highlight?: boolean;
}

function HeroAccessCard({
  emoji,
  title,
  description,
  onClick,
}: HeroAccessCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="e-card-hover e-pulse-border group flex w-full flex-col items-center justify-center rounded-[16px] border-2 border-slate-200 bg-gradient-to-b from-white to-slate-50 text-center shadow-[0_2px_0_0_rgba(15,23,42,0.08),0_6px_16px_-4px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5 hover:[animation-play-state:paused] hover:border-[#1B3A6B]/40 hover:shadow-[0_4px_0_0_rgba(15,23,42,0.1),0_10px_24px_-6px_rgba(27,58,107,0.35)] active:translate-y-0 active:scale-[0.98] active:shadow-[0_1px_0_0_rgba(15,23,42,0.08),0_3px_8px_-4px_rgba(15,23,42,0.18)]"
      style={{ padding: "clamp(14px, 2.2vw, 22px) clamp(12px, 1.6vw, 18px)" }}
    >
      <div
        className="mb-2 sm:mb-2.5"
        style={{ fontSize: "clamp(36px, 4.4vw, 52px)", lineHeight: 1 }}
        role="img"
        aria-hidden
      >
        {emoji}
      </div>
      <div className="mb-1 text-[15px] font-bold text-slate-900 sm:text-[17px]">{title}</div>
      <div className="text-[12px] leading-snug text-slate-600 sm:text-[13px]">{description}</div>
    </button>
  );
}

export default function HeroSection() {
  const goMissing = useCallback(() => scrollToSection("e-directory"), []);
  const goHelp = useCallback(() => scrollToSection("tutorial"), []);
  const goVolunteer = useCallback(() => scrollToSection("equipo"), []);
  const openEmergencyReport = useCallback(() => {
    scrollToSection("mapa");
    window.dispatchEvent(new CustomEvent(OPEN_EMERGENCY_REPORT_EVENT));
  }, []);

  return (
    <header className="relative overflow-hidden">
      <div
        className="relative"
        style={{
          background:
            "linear-gradient(135deg, #0A1628 0%, #122040 40%, #1B3A6B 70%, #0D2144 100%)",
        }}
      >
        <div
          className="absolute inset-0 bg-[url('/images/hero-terremoto-venezuela.png')] bg-cover bg-center opacity-[0.12]"
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,22,40,0.55) 0%, rgba(10,22,40,0.3) 100%)",
          }}
          aria-hidden
        />

        <div className="relative z-10 mx-auto max-w-[1120px] px-4 py-10 text-center sm:px-6 sm:py-14">
          <h1
            className="mb-2.5 font-[family-name:var(--qi-font-display)] !text-white"
            style={{
              fontSize: "clamp(22px, 5vw, 48px)",
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#FFFFFF",
              textShadow: "0 2px 12px rgba(0,0,0,.4)",
            }}
          >
            Estamos contigo. ¿Qué necesitas hacer?
          </h1>
          <p
            className="mx-auto mb-8 max-w-2xl !text-white"
            style={{
              fontSize: "clamp(13px, 1.5vw, 17px)",
              color: "#FFFFFF",
              opacity: 0.9,
              textShadow: "0 1px 4px rgba(0,0,0,.3)",
            }}
          >
            Da clic en una opción  para recibir o brindar ayuda.
          </p>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
            <HeroAccessCard
              emoji="🔎"
              title="Buscar personas"
              description="No encuentro a alguien que conozco."
              onClick={goMissing}
            />
            <HeroAccessCard
              emoji="📢"
              title="Reportar Información"
              description="Reporta emergencias, refugios, suministros, personas desaparecidas y más."
              onClick={openEmergencyReport}
            />
            <HeroAccessCard
              emoji="🆘"
              title="Necesito Ayuda"
              description="Estoy en peligro o necesito insumos."
              onClick={goHelp}
            />
            <HeroAccessCard
              emoji="🤝"
              title="Puedo Ayudar"
              description="Siendo voluntario, donando o apoyando."
              onClick={goVolunteer}
            />
          </div>

          <p
            className="mt-6 text-center !text-white sm:mt-8"
            style={{
              fontSize: "clamp(12px, 1.3vw, 14px)",
              color: "#FFFFFF",
              opacity: 0.9,
              textShadow: "0 1px 4px rgba(0,0,0,.3)",
            }}
          >
            ¿Necesitas escribirnos?{" "}
            <a
              href="mailto:info@terremotovenezuela.app"
              className="font-semibold underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
            >
              info@terremotovenezuela.app
            </a>
          </p>
        </div>
      </div>
    </header>
  );
}

/** Logo + marca para la barra de navegación sticky. */
export function SiteBrand({ onClick }: { onClick?: () => void }) {
  const inner = (
    <>
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-[#C41A1A]">
        <AlertTriangle aria-hidden className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </span>
      <span
        className="font-[family-name:var(--qi-font-display)] text-sm font-semibold text-[var(--etext)] sm:text-lg"
      >
        Terremoto Venezuela
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2.5 border-none bg-transparent p-0"
      >
        {inner}
      </button>
    );
  }

  return (
    <Link href="/" prefetch={false} className="flex items-center gap-2.5">
      {inner}
    </Link>
  );
}

/** Botón para alternar tema claro/oscuro en la nav. */
export function ThemeToggleButton() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar tema claro/oscuro"
      className="e-btn e-btn-secondary hidden h-9 min-h-0 px-3 py-1.5 text-xs sm:inline-flex"
    >
      🌓
    </button>
  );
}
