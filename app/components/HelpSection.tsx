import Link from "next/link";
import { Users, Heart, Globe } from "lucide-react";

export default function HelpSection() {
  return (
    <section id="equipo" className="bg-slate-50 px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-[clamp(28px,4vw,40px)] font-[family-name:var(--qi-font-display)] font-bold tracking-tight text-slate-900">
            ¿Quieres ayudar?
          </h2>
          <p className="text-lg text-slate-600">
            Elige cómo contribuir a los esfuerzos de rescate y recuperación.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {/* Voluntario Card */}
          <div className="flex flex-col items-center rounded-[24px] bg-white p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] border border-emerald-100 bg-emerald-50 text-emerald-600">
              <Users size={28} strokeWidth={2} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Voluntario</h3>
            <p className="mb-8 flex-1 text-sm leading-relaxed text-slate-600">
              Ofrece tu tiempo en labores de rescate, apoyo logístico o asistencia médica.
            </p>
            <Link
              href="/voluntario"
              className="w-full rounded-full bg-[#0a8a6a] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              Registrarme
            </Link>
          </div>

          {/* Donaciones Card */}
          <div className="flex flex-col items-center rounded-[24px] bg-white p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] border border-red-100 bg-red-50 text-red-600">
              <Heart size={28} strokeWidth={2} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Donaciones</h3>
            <p className="mb-8 flex-1 text-sm leading-relaxed text-slate-600">
              Apoya económicamente a organizaciones verificadas que trabajan sobre el terreno.
            </p>
            <Link
              href="/donaciones"
              className="w-full rounded-full bg-[#c41a1a] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
            >
              Donar ahora
            </Link>
          </div>

          {/* Internacional Card */}
          <div className="flex flex-col items-center rounded-[24px] bg-white p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] border border-blue-100 bg-blue-50 text-blue-600">
              <Globe size={28} strokeWidth={2} />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Apoyo global</h3>
            <p className="mb-8 flex-1 text-sm leading-relaxed text-slate-600">
              Estás fuera de Venezuela. Canales internacionales de donación y coordinación.
            </p>
            <Link
              href="/apoyo-global"
              className="w-full rounded-full bg-[#2b51f0] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              Cómo ayudar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
