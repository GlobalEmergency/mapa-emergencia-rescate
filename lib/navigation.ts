export interface NavItem {
  href: string;
  label: string;
  icon: string;
  description: string;
  accent?: "red" | "purple" | "emerald" | "sky" | "slate" | "indigo";
}

export const PRIMARY_CTA: NavItem = {
  href: "/mapa",
  label: "Ir al mapa y reportar",
  icon: "🗺️",
  description: "Reporta emergencias y consulta alertas en tiempo real.",
  accent: "red",
};

export const SITE_NAV: NavItem[] = [
  {
    href: "/desaparecidas",
    label: "Personas desaparecidas",
    icon: "🧍",
    description: "Busca, reporta y comparte información para localizarlas.",
    accent: "purple",
  },
  {
    href: "/desaparecidas#localizados",
    label: "Localizados a salvo",
    icon: "💚",
    description: "Consulta quiénes ya fueron encontrados o contactados.",
    accent: "emerald",
  },
  {
    href: "/guia",
    label: "Guía rápida",
    icon: "🧭",
    description: "Acciones esenciales para vecinos en las primeras horas.",
    accent: "slate",
  },
  {
    href: "/centros-acopio",
    label: "Centros de acopio",
    icon: "🟢",
    description: "Puntos verificados para llevar donaciones físicas.",
    accent: "emerald",
  },
  {
    href: "/telefonos",
    label: "Teléfonos de emergencia",
    icon: "📞",
    description: "Líneas directas de ambulancias, bomberos y servicios.",
    accent: "red",
  },
  {
    href: "/ayuda-internacional",
    label: "Ayuda internacional",
    icon: "🌍",
    description: "Contactos de Cruz Roja para familiares en el exterior.",
    accent: "sky",
  },
  {
    href: "/voluntarios",
    label: "Voluntarios",
    icon: "🤝",
    description: "Chat para coordinar rescates, suministros y difusión.",
    accent: "indigo",
  },
];

/** Rutas legacy con ancla (#mapa, #desaparecidas, …) → página nueva. */
export const LEGACY_HASH_ROUTES: Record<string, string> = {
  mapa: "/mapa",
  tutorial: "/mapa",
  desaparecidas: "/desaparecidas",
  "desaparecidas-preview": "/desaparecidas",
  localizados: "/desaparecidas#localizados",
  guia: "/guia",
  "centros-acopio": "/centros-acopio",
  telefonos: "/telefonos",
  "ayuda-internacional": "/ayuda-internacional",
  chat: "/voluntarios",
};

export function isNavActive(pathname: string, href: string): boolean {
  const base = href.split("#")[0];
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}
