import Link from "next/link";
import { HandHeart, MapPin, Megaphone, Search } from "lucide-react";

/**
 * "¿Qué necesitas hacer?" — fila de tarjetas de acción del hero.
 * Solo presentación: cada tarjeta enlaza a una sección/ruta YA existente.
 * No introduce flujos nuevos. ponytail: reusa los anchors de section-nav.
 */
type Action = {
  href: string;
  title: string;
  desc: string;
  Icon: typeof Search;
  /** Clases de color para el chip del icono. */
  accent: string;
};

const ACTIONS: Action[] = [
  {
    href: "#desaparecidas",
    title: "Buscar persona",
    desc: "No encuentro a alguien que conozco",
    Icon: Search,
    accent: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  },
  {
    href: "#localizados",
    title: "Reportar persona",
    desc: "Encontré a alguien, quiero reportarlo",
    Icon: Megaphone,
    accent: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  {
    href: "#mapa",
    title: "Necesito ayuda",
    desc: "Reportar una emergencia en el mapa",
    Icon: MapPin,
    accent: "bg-red-50 text-red-600 ring-red-100",
  },
  {
    href: "/acopio",
    title: "Puedo ayudar",
    desc: "Quiero donar o ser voluntario",
    Icon: HandHeart,
    accent: "bg-amber-50 text-amber-600 ring-amber-100",
  },
];

function CardInner({ action }: { action: Action }) {
  const { Icon, title, desc, accent } = action;
  return (
    <span className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-4 ${accent}`}
        aria-hidden
      >
        <Icon className="h-6 w-6" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900">{title}</span>
        <span className="block truncate text-sm text-slate-500">{desc}</span>
      </span>
      <span aria-hidden className="shrink-0 text-slate-300">
        ›
      </span>
    </span>
  );
}

export default function HeroActionCards() {
  return (
    <section
      aria-label="¿Qué necesitas hacer?"
      className="mx-auto w-full max-w-5xl px-4 py-8"
    >
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
        ¿Qué necesitas hacer?
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {ACTIONS.map((action) =>
          action.href.startsWith("#") ? (
            <a key={action.href} href={action.href}>
              <CardInner action={action} />
            </a>
          ) : (
            <Link key={action.href} href={action.href} prefetch={false}>
              <CardInner action={action} />
            </Link>
          ),
        )}
      </div>
    </section>
  );
}
