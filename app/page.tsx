import EmergencyApp from "./components/EmergencyApp";
import { REPORT_TYPES, type ReportType } from "@/lib/types";

const STEPS = [
  {
    title: "Ubica el lugar exacto",
    text: "Navega por el mapa y haz clic o toca sobre la ubicación específica del edificio o zona afectada.",
  },
  {
    title: "Completa el reporte",
    text: "Se abrirá un formulario. Ingresa los datos reales y sé lo más preciso posible.",
  },
  {
    title: "Publica la alerta",
    text: "Tu reporte aparecerá inmediatamente en el mapa para que los equipos de rescate, ONGs y voluntarios puedan localizarte.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
            🚨 Plataforma de ayuda humanitaria
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Mapa de Emergencia y Rescate: Terremoto en Venezuela
          </h1>
          <h2 className="mx-auto mt-4 max-w-3xl text-base text-slate-600 sm:text-lg">
            Reporte ciudadano en tiempo real para coordinar rescates, identificar
            daños estructurales y organizar la entrega de ayuda humanitaria.
          </h2>
          <a
            href="#mapa"
            className="mt-6 inline-block rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            Ir al mapa y reportar
          </a>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-10">
        <h2 className="text-xl font-bold text-slate-900">
          ¿Cómo reportar una emergencia o solicitar ayuda?
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-3 font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <EmergencyApp />

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
                    className="mt-1 h-4 w-4 shrink-0 rounded-full"
                    style={{ background: REPORT_TYPES[type].color }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {REPORT_TYPES[type].emoji} {REPORT_TYPES[type].label}
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

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 text-center text-xs text-slate-500">
          Plataforma de reporte ciudadano. Datos de mapas © OpenStreetMap. En caso
          de peligro inmediato, contacta también a los servicios de emergencia
          oficiales.
        </div>
      </footer>
    </main>
  );
}
