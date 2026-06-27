import type { Metadata } from "next";
import SubPageShell from "../components/SubPageShell";
import { Mail, Phone, Share2, Copy, MapPin, Clock, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Ayuda Internacional · Mapa de Emergencia Venezuela",
  alternates: { canonical: "/internacional" },
  description: "Canales internacionales de donación y coordinación.",
};

export default function InternacionalPage() {
  return (
    <SubPageShell breadcrumb="Inicio / Apoyo global">
      <section className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6">
        
        {/* Banner principal */}
        <div className="e-card mb-6 flex flex-col gap-6 rounded-[24px] bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex flex-1 items-start gap-4 sm:gap-6">
            <span className="text-4xl font-bold text-slate-800 sm:text-5xl">CO</span>
            <div>
              <span className="mb-2 block text-xs font-bold tracking-wider text-[#c41a1a] uppercase">Apoyo Global</span>
              <h1 className="mb-3 text-[26px] font-bold leading-tight text-slate-900 sm:text-[32px]">
                Ayuda para Venezuela desde Colombia
              </h1>
              <p className="text-[15px] leading-relaxed text-slate-600">
                Te mostramos la información local del país seleccionado. Puedes cambiarlo si estás ayudando desde otro lugar.
              </p>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-[20px] border border-red-100 bg-red-50/50 p-5 sm:w-[360px]">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">¿Este es tu país para donar?</h3>
              <span className="text-xs font-bold text-[#c41a1a]">Detectado: Colombia</span>
            </div>
            <p className="mb-4 text-[13px] leading-snug text-slate-500">
              Si estás en otro lugar o quieres buscar puntos de otro país, cámbialo aquí.
            </p>
            <select className="e-input w-full cursor-pointer bg-white">
              <option>Colombia</option>
              <option>España</option>
              <option>Estados Unidos</option>
              <option>México</option>
              <option>Chile</option>
              <option>Argentina</option>
            </select>
          </div>
        </div>

        {/* Dos columnas */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card: Entidad */}
          <div className="e-card rounded-[24px] bg-white p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="text-2xl font-bold text-slate-800">CO</span>
              <div>
                <span className="block text-xs text-slate-500">Colombia</span>
                <h2 className="text-lg font-bold text-[#c41a1a]">Cruz Roja Colombiana</h2>
              </div>
            </div>

            <div className="space-y-3 text-[15px] text-slate-600">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-slate-400" />
                <a href="mailto:rcf@cruzrojacolombiana.org" className="hover:underline">rcf@cruzrojacolombiana.org</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-slate-400" />
                <span>(+57) 321 213 9525</span>
              </div>
              <div className="flex items-center gap-3 text-[#25D366]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.81 11.81 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z"/>
                </svg>
                <span className="text-slate-600">WhatsApp 3245309495</span>
              </div>
            </div>

            <hr className="my-5 border-slate-100" />
            
            <p className="text-[13px] text-slate-400">
              Bogotá/Cundinamarca: rcf@cruzrojabogota.org.co
            </p>
          </div>

          {/* Card: Compartir */}
          <div className="e-card rounded-[24px] bg-white p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Share2 size={20} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-slate-900">Compartir en redes</h2>
                <p className="text-sm text-slate-500">Copia un mensaje o envíalo por WhatsApp.</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-500">
              Ayuda a Venezuela desde Colombia. Dona a Cruz Roja Colombiana:
              rcf@cruzrojacolombiana.org · (+57) 321 213 9525
              <br />
              <br />
              #TerremotoVenezuela
            </div>

            <div className="flex gap-3">
              <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                <Copy size={16} strokeWidth={2.5} />
                Copiar
              </button>
              <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition-colors hover:bg-[#20bd5a]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.81 11.81 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Puntos de acopio */}
        <div className="mt-6 e-card rounded-[24px] bg-white p-6 sm:p-8">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <h2 className="text-[17px] font-bold text-slate-900">Puntos de acopio en Colombia</h2>
            <span className="text-[13px] font-bold text-[#c41a1a]">Para donar insumos físicos</span>
          </div>

          <div className="flex flex-col gap-4">
            {/* Punto 1 */}
            <div className="rounded-xl border border-slate-100 p-5">
              <span className="mb-1 block text-xs font-bold tracking-wider text-[#c41a1a] uppercase">Bogotá</span>
              <h3 className="mb-3 text-[17px] font-bold text-slate-900">Fundación Juntos Se Puede</h3>
              
              <div className="mb-3 space-y-1.5 text-[14px] text-slate-500">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-[#c41a1a]" />
                  <span>Calle 104 #54-31, Pasadena, Suba</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  <span>Desde las 7:00 a.m.</span>
                </div>
              </div>

              <p className="mb-3 text-[14px] text-slate-600">Ayudas para familias afectadas y apoyo de búsqueda familiar.</p>
              
              <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">INFOBAE · 25 JUN 2026</span>
            </div>

            {/* Punto 2 */}
            <div className="rounded-xl border border-slate-100 p-5">
              <span className="mb-1 block text-xs font-bold tracking-wider text-[#c41a1a] uppercase">Cartagena</span>
              <h3 className="mb-3 text-[17px] font-bold text-slate-900">Red de Apoyo Cartagena</h3>
              
              <div className="mb-3 space-y-1.5 text-[14px] text-slate-500">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-[#c41a1a]" />
                  <span>Barrio El Cabrero, frente al Parque Apolo</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  <span>8:00 a.m.–6:00 p.m.</span>
                </div>
              </div>

              <p className="mb-3 text-[14px] text-slate-600">Recolección de alimentos y ropa.</p>
              
              <span className="text-[12px] text-slate-400">Operación Todos con VZLA</span>
            </div>
          </div>
        </div>

        {/* Fundaciones y canales para difundir */}
        <div className="mt-6 e-card rounded-[24px] bg-white p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="mb-1 text-[17px] font-bold text-slate-900">Fundaciones y canales para difundir</h2>
            <p className="text-[14px] text-slate-500">Prioriza fuentes verificadas; confirma antes de mover donaciones.</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-100 p-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="mb-1.5 text-[16px] font-bold text-slate-900">Fundación Juntos Se Puede</h3>
                <p className="mb-2 text-[14px] text-slate-600">Centro de acopio en Bogotá y apoyo para ubicar familiares en listas de desaparecidos.</p>
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">INFOBAE · 25 JUN 2026</span>
              </div>
              
              <a 
                href="#"
                target="_blank"
                rel="noopener noreferrer" 
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
              >
                Abrir canal
                <ExternalLink size={16} strokeWidth={2.5} />
              </a>
            </div>
          </div>
        </div>

      </section>
    </SubPageShell>
  );
}
