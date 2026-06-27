"use client";

import { useState } from "react";
import Link from "next/link";
import { REPORT_TYPES, type ReportType } from "@/lib/types";
import { AlertTriangle, BookOpen, Heart, Home, ChevronRight } from "lucide-react";

export default function TutorialSteps() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  return (
    <section
      id="tutorial"
      className="w-full scroll-mt-20 border-b border-[var(--eborder)] py-6"
      style={{ backgroundColor: "rgb(249, 250, 251)" }}
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[rgb(17,24,39)] text-center m-[0px_0px_8px] leading-[1.1]">¿Necesitas ayuda?</h2>
            <p className="mt-1 text-sm text-center mb-10 text-[var(--etext2)]">
              Tu solicitud llega directo a brigadas activas. En peligro inmediato, llama al 911.
            </p>
          </div>
        </div>

        {/* TODO: Formulario en desarrollo, oculto temporalmente */}
        <div className="hidden max-w-[712px] mx-auto bg-white border border-[#e5e7eb] rounded-[20px] p-7 sm:p-8 shadow-[0_1px_4px_rgba(0,0,0,0.06)] mb-7">
          <div className="flex items-center gap-[10px] mb-[18px]">
            <div className="w-8 h-8 bg-red-100 rounded-[8px] flex items-center justify-center shrink-0">
              <AlertTriangle size={16} color="#B91C1C" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-[15px] font-bold text-[var(--etext)]">Solicitar ayuda de emergencia</div>
              <div className="text-[12px] text-[var(--etext2)]">En peligro inmediato, llama al 911 o 171.</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="text-[13px] font-semibold text-[var(--etext)] mb-[10px]">¿Qué tipo de ayuda necesitas?</div>
            <div className="e-htypes">
              <button
                type="button"
                onClick={() => setSelectedType("atrapado")}
                className={selectedType === "atrapado"
                  ? "bg-[#b91c1c] text-white border-[1.5px] border-[#b91c1c] rounded-[10px] p-[11px_8px] text-[12px] font-bold cursor-pointer transition duration-[0.15s] flex flex-col items-center gap-[6px] text-center"
                  : "bg-[var(--esurf)] text-[var(--etext)] border-[1.5px] border-[var(--eborder)] rounded-[10px] p-[11px_8px] text-[12px] font-bold cursor-pointer transition duration-[0.15s] flex flex-col items-center gap-[6px] text-center hover:bg-[var(--einput)]"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Estoy atrapado
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("medico")}
                className={selectedType === "medico"
                  ? "bg-[#b91c1c] text-white border-[1.5px] border-[#b91c1c] rounded-[10px] p-[11px_8px] text-[12px] font-bold cursor-pointer transition duration-[0.15s] flex flex-col items-center gap-[6px] text-center"
                  : "bg-[var(--esurf)] text-[var(--etext)] border-[1.5px] border-[var(--eborder)] rounded-[10px] p-[11px_8px] text-[12px] font-bold cursor-pointer transition duration-[0.15s] flex flex-col items-center gap-[6px] text-center hover:bg-[var(--einput)]"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                Necesito médico
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("alimentos")}
                className={selectedType === "alimentos"
                  ? "bg-[#b91c1c] text-white border-[1.5px] border-[#b91c1c] rounded-[10px] p-[11px_8px] text-[12px] font-bold cursor-pointer transition duration-[0.15s] flex flex-col items-center gap-[6px] text-center"
                  : "bg-[var(--esurf)] text-[var(--etext)] border-[1.5px] border-[var(--eborder)] rounded-[10px] p-[11px_8px] text-[12px] font-bold cursor-pointer transition duration-[0.15s] flex flex-col items-center gap-[6px] text-center hover:bg-[var(--einput)]"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
                Agua o alimentos
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("otro")}
                className={selectedType === "otro"
                  ? "bg-[#b91c1c] text-white border-[1.5px] border-[#b91c1c] rounded-[10px] p-[11px_8px] text-[12px] font-bold cursor-pointer transition duration-[0.15s] flex flex-col items-center gap-[6px] text-center"
                  : "bg-[var(--esurf)] text-[var(--etext)] border-[1.5px] border-[var(--eborder)] rounded-[10px] p-[11px_8px] text-[12px] font-bold cursor-pointer transition duration-[0.15s] flex flex-col items-center gap-[6px] text-center hover:bg-[var(--einput)]"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Otro
              </button>
            </div>
          </div>
          <form className="flex flex-col gap-[14px]">
            <div className="e-form2">
              <div>
                <label className="text-[12px] font-semibold text-[var(--etext)] block mb-[5px]">Mi ubicación</label>
                <input type="text" placeholder="Ej. Calle Principal de Las Mercedes, Caracas" className="w-full bg-[var(--esurf)] border-[1.5px] border-[var(--eborder)] rounded-[9px] p-[11px_13px] text-[14px] text-[var(--etext)] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[var(--etext)] block mb-[5px]">Personas que necesitan ayuda</label>
                <input type="number" placeholder="Ej. 4" min="1" className="w-full bg-[var(--esurf)] border-[1.5px] border-[var(--eborder)] rounded-[9px] p-[11px_13px] text-[14px] text-[var(--etext)] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600" />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[var(--etext)] block mb-[5px]">Tu número de contacto</label>
              <input type="tel" placeholder="0414-XXX-XXXX" className="w-full bg-[var(--esurf)] border-[1.5px] border-[var(--eborder)] rounded-[9px] p-[11px_13px] text-[14px] text-[var(--etext)] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600" />
            </div>
            <div className="e-ayuda-btns flex gap-[10px] flex-wrap">
              <button type="submit" className="flex-1 min-w-[140px] bg-[#b91c1c] text-white border-none rounded-full p-[14px_18px] text-[15px] font-bold cursor-pointer transition-opacity duration-[0.15s] hover:opacity-90">Pedir ayuda ahora</button>
            </div>
          </form>
        </div>

        <div className="e-ayuda-3cards mt-6 max-w-[712px] mx-auto mb-20">
          <Link
            href="/guia"
            className="bg-[var(--ebg)] border-[1.5px] border-[var(--eborder)] rounded-[16px] p-[14px_20px] flex items-center gap-[12px] cursor-pointer text-left w-full hover:bg-[var(--einput)] transition duration-150"
          >
            <div className="w-[38px] h-[38px] bg-[#fef3c7] rounded-[10px] flex items-center justify-center shrink-0">
              <BookOpen size={18} color="#92400E" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-[var(--etext)]">Guías rápidas</div>
              <div className="text-[12px] text-[var(--etext2)]">Qué hacer en cada situación</div>
            </div>
            <ChevronRight size={14} className="text-[var(--etext3)]" strokeWidth={2.5} />
          </Link>
          <Link
            href="/apoyo-global"
            className="bg-[var(--ebg)] border-[1.5px] border-[var(--eborder)] rounded-[16px] p-[14px_20px] flex items-center gap-[12px] cursor-pointer text-left w-full hover:bg-[var(--einput)] transition duration-150"
          >
            <div className="w-[38px] h-[38px] bg-[#ebf0ff] rounded-[10px] flex items-center justify-center shrink-0">
              <Heart size={18} color="#1649CC" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-[var(--etext)]">Apoyo</div>
              <div className="text-[12px] text-[var(--etext2)]">Psicológico y Protección Civil</div>
            </div>
            <ChevronRight size={14} className="text-[var(--etext3)]" strokeWidth={2.5} />
          </Link>
          <a
            href="/acopio"
            className="bg-[var(--ebg)] border-[1.5px] border-[var(--eborder)] rounded-[16px] p-[14px_20px] flex items-center gap-[12px] cursor-pointer text-left w-full hover:bg-[var(--einput)] transition duration-150"
          >
            <div className="w-[38px] h-[38px] bg-[#e3f5f0] rounded-[10px] flex items-center justify-center shrink-0">
              <Home size={18} color="#0A8A6A" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-[var(--etext)]">Centros de acopio</div>
              <div className="text-[12px] text-[var(--etext2)]">Puntos activos de ayuda</div>
            </div>
            <ChevronRight size={14} className="text-[var(--etext3)]" strokeWidth={2.5} />
          </a>
        </div>

        <div className="e-card mt-6 p-5">
          <h3 className="qi-h4">🏷️ Tipos de marcador disponibles</h3>
          <p className="mt-1 text-xs text-[var(--etext2)]">
            Elige el que mejor describa la situación. Cada color e icono se
            verá en el mapa.
          </p>
          <div className="e-htypes mt-3">
            {(Object.keys(REPORT_TYPES) as ReportType[]).map((type) => {
              const meta = REPORT_TYPES[type];
              return (
                <div
                  key={type}
                  className="flex items-center gap-2 rounded-xl border border-[var(--eborder)] bg-[var(--einput)] p-2"
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base text-white shadow-sm"
                    style={{ background: meta.color }}
                    aria-hidden
                  >
                    {meta.icon}
                  </span>
                  <span className="text-xs font-semibold text-[var(--etext)]">
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">
              ✅ Antes de publicar
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-emerald-900">
              <li>Asegúrate de que la ubicación esté correcta.</li>
              <li>Indica claramente qué tipo de ayuda se necesita.</li>
              <li>Si tienes una foto del lugar, súbela.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              ⚠️ Evita confundir el mapa
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-900">
              <li>No envíes reportes falsos ni duplicados.</li>
              <li>Si ya hay un punto similar cerca, no lo repitas.</li>
              <li>Avisa cuando una emergencia ya fue atendida.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
