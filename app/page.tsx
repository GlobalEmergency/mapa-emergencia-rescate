import dynamic from "next/dynamic";
import EmergencyApp from "./components/EmergencyApp";
import {
  HeroDesktopNav,
  HeroMobileCta,
  MobileStickyNav,
} from "./components/SectionNav";
import SiteFooter from "./components/SiteFooter";
import { REPORT_TYPES, type ReportType } from "@/lib/types";
import { CONTACT_EMAIL, contactMailto } from "@/lib/site";

const MissingPersonsCarousel = dynamic(
  () => import("./components/MissingPersonsCarousel"),
  {
    loading: () => (
      <section className="border-b border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        Cargando personas desaparecidas…
      </section>
    ),
  },
);

const DonationsTicker = dynamic(() => import("./components/DonationsTicker"), {
  loading: () => null,
});

const PersonsTabs = dynamic(() => import("./components/PersonsTabs"), {
  loading: () => (
    <section className="mx-auto w-full max-w-7xl px-4 pb-14 text-sm text-slate-500">
      Cargando personas…
    </section>
  ),
});

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
    tip: "Cada color y icono ayuda a priorizar el rescate.",
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

export default function Home() {
  return (
    <>
      <main id="main" className="flex-1">
      <header className="relative overflow-hidden border-b border-slate-800 md:pt-16">
        <div
          className="absolute inset-0 bg-[url('/images/hero-terremoto-venezuela.png')] bg-cover bg-center bg-no-repeat"
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/65 sm:bg-black/60" aria-hidden />
        <HeroDesktopNav />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[22rem] sm:py-14 md:min-h-[23rem] md:py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-600/90 px-3 py-1 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
            🚨 Plataforma de ayuda humanitaria
          </span>
          <h1 className="mt-3 text-balance text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:mt-4 sm:text-4xl md:text-5xl">
            Mapa de Emergencia y Rescate: Terremoto en Venezuela
          </h1>
          <h2 className="mx-auto mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-slate-200 sm:mt-4 sm:text-lg">
            Reporte ciudadano en tiempo real para coordinar rescates, identificar
            daños estructurales y organizar la entrega de ayuda humanitaria.
          </h2>
          <a
            href={contactMailto()}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <span aria-hidden>✉️</span>
            {CONTACT_EMAIL}
          </a>
          <HeroMobileCta />
        </div>
        <DonationsTicker variant="hero" />
      </header>

      <MobileStickyNav />

      <MissingPersonsCarousel />

      <section id="tutorial" className="mx-auto w-full max-w-7xl px-4 py-10">
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
          <a
            href="#mapa"
            className="hidden shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 sm:inline-block"
          >
            Ir al mapa →
          </a>
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
            Elige el que mejor describa la situación. Cada color e icono se
            verá en el mapa.
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

      <EmergencyApp />

      <PersonsTabs />
    </main>

      <SiteFooter />
    </>
  );
}
