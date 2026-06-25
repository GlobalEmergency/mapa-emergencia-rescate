import dynamic from "next/dynamic";
import EmergencyApp from "./components/EmergencyApp";
import ShareButton from "./components/ShareButton";
import EmergencyContacts from "./components/EmergencyContacts";
import SurvivalGuide from "./components/SurvivalGuide";
import { REPORT_TYPES, type ReportType } from "@/lib/types";

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

const MissingPersons = dynamic(() => import("./components/MissingPersons"), {
  loading: () => (
    <section className="mx-auto w-full max-w-7xl px-4 pb-14 text-sm text-slate-500">
      Cargando lista de personas…
    </section>
  ),
});

const FoundPersons = dynamic(() => import("./components/FoundPersons"));
const ChatPanel = dynamic(() => import("./components/ChatPanel"));

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
    <main className="flex-1">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 text-center sm:py-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
            🚨 Plataforma de ayuda humanitaria
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:mt-4 sm:text-4xl md:text-5xl">
            Mapa de Emergencia y Rescate: Terremoto en Venezuela
          </h1>
          <h2 className="mx-auto mt-3 max-w-3xl text-sm text-slate-600 sm:mt-4 sm:text-lg">
            Reporte ciudadano en tiempo real para coordinar rescates, identificar
            daños estructurales y organizar la entrega de ayuda humanitaria.
          </h2>
          <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 sm:mt-6 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center sm:gap-3">
            <a
              href="#mapa"
              className="col-span-2 flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 sm:col-span-1"
            >
              Ir al mapa y reportar
            </a>
            <a
              href="#desaparecidas"
              className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              🧍 Personas desaparecidas
            </a>
            <a
              href="#localizados"
              className="flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
            >
              💚 Localizados a salvo
            </a>
            <a
              href="#guia"
              className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              🧭 Guía rápida
            </a>
            <a
              href="#telefonos"
              className="flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              📞 Teléfonos de emergencia
            </a>
            <ShareButton />
          </div>
        </div>
      </header>

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

      <MissingPersons />

      <FoundPersons />

      <SurvivalGuide />

      <EmergencyContacts />

      <section className="mx-auto w-full max-w-7xl px-4 pb-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              📍 Leyenda de Marcadores
            </h2>
            <ul className="mt-4 space-y-4">
              {(Object.keys(REPORT_TYPES) as ReportType[]).map((type) => (
                <li key={type} className="flex gap-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base text-white shadow-sm"
                    style={{ background: REPORT_TYPES[type].color }}
                    aria-hidden
                  >
                    {REPORT_TYPES[type].icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {REPORT_TYPES[type].label}
                    </p>
                    <p className="text-sm text-slate-600">
                      {REPORT_TYPES[type].description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-amber-900">
              ⚠️ Aviso Importante para los Usuarios
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-amber-900">
              Esta plataforma funciona con reportes ciudadanos para salvar vidas.
              Por favor, no envíes reportes falsos ni dupliques alertas. Los
              recursos logísticos son limitados y cada segundo cuenta. Si la
              emergencia en un punto ya fue atendida por las autoridades,
              notifícalo para limpiar el mapa y redirigir los esfuerzos a quienes
              aún esperan ayuda.
            </p>
          </div>
        </div>
      </section>

      <ChatPanel />

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-10">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                🤝 ¿Quiénes hacemos esto?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Somos un equipo de voluntarios construyendo esta plataforma
                abierta para que cualquier persona afectada por el terremoto
                pueda pedir y ofrecer ayuda en tiempo real. El proyecto es
                gratuito, sin fines de lucro y de código abierto.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://x.com/allanodremans"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white"
                  >
                    𝕏
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="font-semibold">Allan Odreman</span>
                    <span className="text-xs text-slate-500">
                      @allanodremans
                    </span>
                  </span>
                </a>
                <a
                  href="https://x.com/cristianmock"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white"
                  >
                    𝕏
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="font-semibold">Cristian Mock</span>
                    <span className="text-xs text-slate-500">
                      @cristianmock
                    </span>
                  </span>
                </a>
                <a
                  href="https://x.com/vickytorrss"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white"
                  >
                    𝕏
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="font-semibold">Vicky Torres</span>
                    <span className="text-xs text-slate-500">
                      @vickytorrss
                    </span>
                  </span>
                </a>
                <a
                  href="https://x.com/andresg747"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white"
                  >
                    𝕏
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="font-semibold">Andrés G.</span>
                    <span className="text-xs text-slate-500">
                      @andresg747
                    </span>
                  </span>
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
              <h3 className="text-base font-bold text-indigo-900">
                💬 Únete como voluntario
              </h3>
              <p className="mt-1 text-sm text-indigo-900">
                Entra al Discord para coordinar rescates, suministros, traducción,
                difusión o soporte técnico.
              </p>
              <a
                href="https://discord.gg/5hhaQxU3PM"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <span aria-hidden>🎧</span> Entrar al Discord
              </a>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-bold text-slate-900">
                👩‍💻 ¿Sabes programar?
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                El código es abierto. Reporta bugs, sugiere mejoras o abre un
                pull request: cada aporte ayuda a salvar vidas.
              </p>
              <a
                href="https://github.com/ArturoRiosMock/mapa-emergencia-rescate"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
              >
                <span aria-hidden>⭐</span> Colabora en GitHub
              </a>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-100 pt-8">
            <h3 className="text-base font-bold text-slate-900">
              🔗 Sitios aliados
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Otras plataformas ciudadanas que ayudan ante el terremoto.
              Compártelas para llegar a más personas.
            </p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  🗺️ Mapas y daños
                </h4>
                <ul className="mt-2 space-y-2">
                  <li>
                    <a
                      href="https://terremotovenezuela.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-900">
                        Terremoto Venezuela
                      </span>
                      <span className="block text-xs text-slate-500">
                        Mapa colaborativo de daños en edificaciones
                      </span>
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  🔍 Búsqueda de personas
                </h4>
                <ul className="mt-2 space-y-2">
                  <li>
                    <a
                      href="https://venezuelatebusca.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-900">
                        Venezuela Te Busca
                      </span>
                      <span className="block text-xs text-slate-500">
                        Registro centralizado de personas desaparecidas
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://venezuelareporta.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-900">
                        Venezuela Reporta
                      </span>
                      <span className="block text-xs text-slate-500">
                        Reporta desaparecidos, confirma a salvo o avistamientos
                      </span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-6 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
            <p>
              Plataforma de reporte ciudadano. Datos de mapas ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                OpenStreetMap
              </a>
              . En caso de peligro inmediato, contacta también a los servicios
              de emergencia oficiales.
            </p>
            <a
              href="/admin"
              className="text-slate-400 hover:text-slate-600 hover:underline"
            >
              Panel de administración
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
