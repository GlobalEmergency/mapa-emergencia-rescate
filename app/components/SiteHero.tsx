import Link from "next/link";
import { CONTACT_EMAIL, contactMailto } from "@/lib/site";
import { PRIMARY_CTA } from "@/lib/navigation";

export default function SiteHero() {
  return (
    <header className="relative overflow-hidden border-b border-slate-800">
      <div
        className="absolute inset-0 bg-[url('/images/hero-terremoto-venezuela.png')] bg-cover bg-center bg-no-repeat"
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/65 sm:bg-black/60" aria-hidden />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[18rem] sm:py-12 md:min-h-[20rem]">
        <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-600/90 px-3 py-1 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
          🚨 Plataforma de ayuda humanitaria
        </span>
        <h1 className="mt-3 text-balance text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:mt-4 sm:text-4xl md:text-5xl">
          Mapa de Emergencia y Rescate: Terremoto en Venezuela
        </h1>
        <p className="mx-auto mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-slate-200 sm:mt-4 sm:text-lg">
          Reporte ciudadano en tiempo real para coordinar rescates, identificar
          daños estructurales y organizar la entrega de ayuda humanitaria.
        </p>
        <a
          href={contactMailto()}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
        >
          <span aria-hidden>✉️</span>
          {CONTACT_EMAIL}
        </a>
        <Link
          href={PRIMARY_CTA.href}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-red-500"
        >
          {PRIMARY_CTA.icon} {PRIMARY_CTA.label}
        </Link>
      </div>
    </header>
  );
}
