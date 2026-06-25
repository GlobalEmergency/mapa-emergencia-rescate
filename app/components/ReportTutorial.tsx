import Link from "next/link";
import { REPORT_TYPES, type ReportType } from "@/lib/types";

const STEPS: {
  icon: string;
  title: string;
  text: string;
  tip?: string;
}[] = [
  {
    icon: "📍",
    title: "Ubica el lugar",
    text: "Toca un punto del mapa o escribe la dirección en el buscador (ej.: “Av. Francisco de Miranda, Chacao”).",
    tip: "Acércate con el zoom para mayor precisión.",
  },
  {
    icon: "🏷️",
    title: "Elige el tipo de marcador",
    text: "Selecciona uno de los 5 tipos según la situación: emergencia crítica, suministros, centro de acopio, zona sin luz o persona buscada.",
    tip: "Cada color e icono ayuda a priorizar el rescate.",
  },
  {
    icon: "📝",
    title: "Describe y agrega foto",
    text: "Llena los datos del lugar, personas afectadas y qué se necesita. Si puedes, sube una foto: ayuda a verificar la situación.",
    tip: "Sé específico: paramédicos, agua, maquinaria, medicinas…",
  },
  {
    icon: "🚨",
    title: "Publica y comparte",
    text: "Tu alerta aparece de inmediato en el mapa de toda la comunidad. Comparte el enlace para que más gente pueda ayudar.",
    tip: "Si la emergencia ya fue atendida, avisa para limpiar el mapa.",
  },
];

export default function ReportTutorial() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            ¿Cómo reportar una emergencia o solicitar ayuda?
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Sigue estos 4 pasos. Solo te tomará unos segundos y tu reporte
            ayudará a los equipos de rescate en tiempo real.
          </p>
        </div>
        <Link
          href="#mapa"
          className="hidden shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 sm:inline-block"
        >
          Ir al mapa ↓
        </Link>
      </div>

      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span
              className="absolute right-4 top-4 text-xs font-bold text-slate-300"
              aria-hidden
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-2xl"
              aria-hidden
            >
              {step.icon}
            </span>
            <h3 className="mt-3 font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{step.text}</p>
            {step.tip && (
              <p className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-500">
                💡 {step.tip}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          🏷️ Tipos de marcador disponibles
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Elige el que mejor describa la situación. Cada color e icono se verá
          en el mapa.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(REPORT_TYPES) as ReportType[]).map((type) => {
            const meta = REPORT_TYPES[type];
            return (
              <div
                key={type}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base text-white shadow-sm"
                  style={{ background: meta.color }}
                  aria-hidden
                >
                  {meta.icon}
                </span>
                <span className="text-xs font-semibold text-slate-800">
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
    </section>
  );
}
