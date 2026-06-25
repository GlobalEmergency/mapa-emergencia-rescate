import { REPORT_TYPES, type ReportType } from "@/lib/types";

export default function MarkerLegendSection() {
  return (
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
  );
}
