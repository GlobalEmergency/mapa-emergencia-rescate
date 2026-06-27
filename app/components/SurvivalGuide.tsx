"use client";

import Image from "next/image";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Tipos y datos
// ---------------------------------------------------------------------------

interface GuideBullet {
  text: string;
  important?: boolean;
}

interface GuideCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  accentColor: string; // Tailwind bg class
  accentText: string; // Tailwind text class
  accentBorder: string; // Tailwind border class
  accentRing: string; // Tailwind ring class
  bullets: GuideBullet[];
  tip?: string;
}

const CARDS: GuideCard[] = [
  {
    id: "comunidad",
    icon: "🧑🏻‍🤝‍🧑🏾",
    title: "Revisa a tus vecinos",
    subtitle: "Primero lo más urgente",
    image: "/guide-community-check.jpg",
    imageAlt: "Vecinos ayudándose entre sí tras el sismo",
    accentColor: "bg-red-600",
    accentText: "text-red-700",
    accentBorder: "border-red-400",
    accentRing: "focus-visible:ring-red-400",
    bullets: [
      { text: "¿Alguien está herido o atrapado?", important: true },
      { text: "Revisa a los adultos mayores primero." },
      { text: "Confirma que ningún niño esté solo." },
      { text: "Habla en voz alta para que te escuchen si están atrapados." },
    ],
    tip: "Llama a los bomberos si alguien está atrapado: no muevas escombros grandes solo.",
  },
  {
    id: "suministros",
    icon: "💧",
    title: "Guarda agua y lo esencial",
    subtitle: "Para los próximos días",
    image: "/guide-supplies.jpg",
    imageAlt: "Artículos de emergencia: agua, linterna, botiquín",
    accentColor: "bg-sky-600",
    accentText: "text-sky-700",
    accentBorder: "border-sky-400",
    accentRing: "focus-visible:ring-sky-400",
    bullets: [
      {
        text: "Guarda agua potable: 2 litros por persona por día.",
        important: true,
      },
      { text: "Ten a mano tus medicamentos esenciales." },
      { text: "Linterna, radio y documentos en una bolsa lista." },
      { text: "Comida que no necesite cocción ni refrigeración." },
    ],
    tip: "No uses el agua del grifo hasta confirmar que es segura.",
  },
  {
    id: "atrapados",
    icon: "🆘",
    title: "Si hay personas atrapadas",
    subtitle: "Actúa con calma",
    image: "/guide-rescue.jpg",
    imageAlt: "Rescatistas ayudando a persona atrapada entre escombros",
    accentColor: "bg-amber-600",
    accentText: "text-amber-700",
    accentBorder: "border-amber-400",
    accentRing: "focus-visible:ring-amber-400",
    bullets: [
      {
        text: "Habla con la persona: mantenerla consciente es vital.",
        important: true,
      },
      { text: "NO muevas escombros grandes sin evaluar el riesgo." },
      { text: "Marca el lugar con tela o señal visible para los rescatistas." },
      { text: "Llama al 911 o a los bomberos y no cuelgues." },
    ],
    tip: "Los rescatistas profesionales tienen el equipo necesario. Tu trabajo es señalizar y mantener la calma.",
  },
  {
    id: "punto-encuentro",
    icon: "🏘️",
    title: "Punto de encuentro seguro",
    subtitle: "Organización comunitaria",
    image: "/guide-safe-zone.jpg",
    imageAlt: "Familia reunida en punto de encuentro seguro al aire libre",
    accentColor: "bg-emerald-600",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-400",
    accentRing: "focus-visible:ring-emerald-400",
    bullets: [
      {
        text: "Reúnete con tu familia en un espacio abierto, lejos de edificios.",
        important: true,
      },
      { text: "Define un punto de encuentro que todos conozcan." },
      { text: "Ayuda a los más vulnerables a llegar al punto seguro." },
      {
        text: "No regreses a un edificio dañado hasta que sea declarado seguro.",
      },
    ],
    tip: "Escoge un parque o plaza como punto de encuentro. Comparte la ubicación con todos los miembros de tu familia.",
  },
  {
    id: "comunicacion",
    icon: "📡",
    title: "Mantente comunicado",
    subtitle: "Información verificada",
    image: "/guide-community-group.jpg",
    imageAlt: "Grupo de personas compartiendo información al aire libre",
    accentColor: "bg-violet-600",
    accentText: "text-violet-700",
    accentBorder: "border-violet-400",
    accentRing: "focus-visible:ring-violet-400",
    bullets: [
      { text: "Usa el radio si no hay señal de celular.", important: true },
      { text: "Comparte solo información verificada con tus vecinos." },
      { text: "Carga tu teléfono al mínimo posible para durar más." },
      { text: "Envía un mensaje de texto si las llamadas fallan." },
    ],
    tip: "No difundas rumores. Confía en fuentes oficiales y en esta plataforma.",
  },
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function SurvivalGuide() {
  const [allOpen, setAllOpen] = useState(false);

  return (
    <section id="guia" className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      {/* Cabecera */}
      <div className="mb-6 text-center sm:mb-8">
        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
          Fuente: Operación Todos con VZLA
        </span>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          🧭 Guía rápida para la comunidad
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600 sm:text-xl">
          Acciones esenciales en las primeras horas. Léelas, recuérdalas y
          compártelas con tus vecinos y familia.
        </p>

        {/* Botón expandir todo */}
        <button
          type="button"
          onClick={() => setAllOpen((v) => !v)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-base font-bold text-white shadow-md transition hover:bg-slate-800 active:scale-[0.97] sm:text-lg"
        >
          {allOpen ? "Contraer todo" : "Ver todos los pasos"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 transition-transform ${allOpen ? "rotate-180" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 12.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Grid de cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((card) => (
          <ControlledCard key={card.id} card={card} forceOpen={allOpen} />
        ))}
      </div>

      {/* Banner inferior de compartir */}
      <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 px-5 py-6 text-center text-white shadow-lg sm:flex-row sm:text-left">
        <span className="text-4xl">🔁</span>
        <div className="flex-1">
          <p className="text-lg font-bold sm:text-xl">Comparte esta guía</p>
          <p className="mt-0.5 text-sm text-white/80 sm:text-base">
            Las primeras horas son las más importantes para salvar vidas.
            Envíala a tus grupos de WhatsApp y redes sociales.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (navigator.share) {
              void navigator.share({
                title: "Guía rápida de emergencia — Venezuela",
                text: "Acciones esenciales tras el sismo:",
                url: typeof window !== "undefined" ? window.location.href : "",
              });
            } else {
              void navigator.clipboard.writeText(
                typeof window !== "undefined" ? window.location.href : "",
              );
            }
          }}
          className="shrink-0 rounded-xl bg-white px-5 py-3 text-base font-bold text-slate-900 shadow transition hover:bg-slate-50 active:scale-[0.97] sm:text-lg"
        >
          Compartir →
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Card controlada externamente (para el botón "Ver todo")
// ---------------------------------------------------------------------------

function ControlledCard({
  card,
  forceOpen,
}: {
  card: GuideCard;
  forceOpen: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = forceOpen || localOpen;

  return (
    <article
      className={`overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all duration-300 ${
        open
          ? card.accentBorder
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      {/* Imagen de cabecera */}
      <div className="relative h-44 w-full overflow-hidden sm:h-52">
        <Image
          src={card.image}
          alt={card.imageAlt}
          fill
          className="object-cover transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Badge de icono */}
        <div
          className={`absolute left-4 top-4 grid h-12 w-12 place-items-center rounded-xl text-2xl shadow-lg ${card.accentColor} sm:h-14 sm:w-14 sm:text-3xl`}
        >
          {card.icon}
        </div>

        {/* Texto sobre imagen */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            {card.subtitle}
          </p>
          <h2 className="text-xl font-bold leading-tight !text-white sm:text-2xl">
            {card.title}
          </h2>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="px-4 pb-4 pt-3 sm:px-5">
        <div className="rounded-xl bg-slate-50 p-3">
          {/* Primer bullet siempre visible */}
          <div className="flex items-start gap-3">
            <span
              className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${card.accentColor}`}
            />
            <p
              className={`text-base font-semibold leading-snug sm:text-lg ${card.accentText}`}
            >
              {card.bullets[0].text}
            </p>
          </div>

          {/* Resto al expandir */}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              open ? "mt-3 max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            }`}
            aria-hidden={!open}
          >
            <ul className="space-y-3">
              {card.bullets.slice(1).map((bullet) => (
                <li key={bullet.text} className="flex items-start gap-3">
                  <span
                    className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                      bullet.important ? card.accentColor : "bg-slate-300"
                    }`}
                  />
                  <span
                    className={`text-base leading-snug sm:text-lg ${
                      bullet.important
                        ? `font-semibold ${card.accentText}`
                        : "text-slate-700"
                    }`}
                  >
                    {bullet.text}
                  </span>
                </li>
              ))}
            </ul>

            {card.tip && (
              <div
                className={`mt-4 rounded-xl border ${card.accentBorder} bg-white px-3 py-3`}
              >
                <p className="flex items-start gap-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                  <span className="shrink-0 text-lg" aria-hidden>
                    💡
                  </span>
                  <span>{card.tip}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botón toggle */}
        <button
          type="button"
          onClick={() => setLocalOpen((v) => !v)}
          aria-expanded={open}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3 text-base font-bold transition-all active:scale-[0.97] sm:text-lg ${card.accentRing} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            open
              ? `${card.accentBorder} ${card.accentText} bg-white hover:bg-slate-50`
              : `${card.accentColor} border-transparent text-white hover:opacity-90`
          }`}
        >
          {open ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z"
                  clipRule="evenodd"
                />
              </svg>
              Ocultar pasos
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 12.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
              Ver todos los pasos
            </>
          )}
        </button>
      </div>
    </article>
  );
}
