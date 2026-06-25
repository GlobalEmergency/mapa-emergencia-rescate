interface GuideCard {
  icon: string;
  title: string;
  subtitle?: string;
  bullets: string[];
  accent: string;
}

const CARDS: GuideCard[] = [
  {
    icon: "👥",
    title: "Revisión rápida de la comunidad",
    subtitle: "Entre vecinos",
    bullets: [
      "Verifiquen si hay personas heridas.",
      "Revisen si alguien quedó atrapado.",
      "Confirmen que ningún niño esté separado de su familia.",
      "Revisen a adultos mayores y personas con discapacidad.",
    ],
    accent: "#dc2626",
  },
  {
    icon: "💧",
    title: "Guarda agua y lo esencial",
    bullets: [
      "Guarda agua potable.",
      "Mantén cerca medicamentos.",
      "Ten listas linternas y artículos básicos.",
    ],
    accent: "#0ea5e9",
  },
  {
    icon: "🆘",
    title: "Si hay personas atrapadas",
    bullets: [
      "Habla con la persona para mantenerla consciente y tranquila.",
      "No muevan grandes escombros sin evaluar antes los riesgos.",
      "Marca claramente el lugar para facilitar el trabajo de los rescatistas.",
    ],
    accent: "#b45309",
  },
  {
    icon: "🤝",
    title: "Grupos de apoyo y vigilancia",
    subtitle: "Las primeras horas son fundamentales",
    bullets: [
      "Mantengan comunicación entre vecinos.",
      "Ayuden a quienes sean más vulnerables.",
      "Definan un punto de encuentro seguro.",
    ],
    accent: "#16a34a",
  },
];

export default function SurvivalGuide() {
  return (
    <section id="guia" className="mx-auto w-full max-w-7xl px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              🧭 Guía rápida para la comunidad
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Acciones esenciales en las primeras horas. Compártelas con tus
              vecinos, familiares y grupos de chat.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Fuente: Operación Todos con VZLA
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <article
              key={card.title}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4"
              style={{ borderLeft: `4px solid ${card.accent}` }}
            >
              <header className="flex items-start gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl text-white shadow-sm"
                  style={{ background: card.accent }}
                  aria-hidden
                >
                  {card.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                    {card.title}
                  </h3>
                  {card.subtitle && (
                    <p className="text-xs font-medium text-slate-500">
                      {card.subtitle}
                    </p>
                  )}
                </div>
              </header>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: card.accent }}
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mt-5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
          🔁 Comparte esta información. Las primeras horas son las más
          importantes para salvar vidas.
        </p>
      </div>
    </section>
  );
}
