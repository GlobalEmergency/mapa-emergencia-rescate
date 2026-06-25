export interface SectionLink {
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
  tone?: "default" | "primary" | "purple" | "emerald" | "sky";
  badge?: "missing" | "found";
  /** Visible en la barra inferior móvil (máx. 3 + botón Menú). */
  mobileBar?: boolean;
}

export const PRIMARY_MAP_LINK: SectionLink = {
  href: "#mapa",
  label: "Ir al mapa y reportar",
  shortLabel: "Mapa",
  icon: "🗺️",
  tone: "primary",
  mobileBar: true,
};

export const SECTION_LINKS: SectionLink[] = [
  {
    href: "#desaparecidas",
    label: "Personas desaparecidas",
    shortLabel: "Desaparecidas",
    icon: "🧍",
    tone: "purple",
    badge: "missing",
    mobileBar: true,
  },
  {
    href: "#localizados",
    label: "Localizados a salvo",
    shortLabel: "Localizados",
    icon: "💚",
    tone: "emerald",
    badge: "found",
  },
  {
    href: "#telefonos",
    label: "Teléfonos de emergencia",
    shortLabel: "Teléfonos",
    icon: "📞",
    tone: "default",
    mobileBar: true,
  },
  {
    href: "#guia",
    label: "Guía rápida",
    shortLabel: "Guía",
    icon: "🧭",
  },
  {
    href: "#centros-acopio",
    label: "Centros de acopio",
    shortLabel: "Acopio",
    icon: "🟢",
    tone: "emerald",
  },
  {
    href: "#ayuda-internacional",
    label: "Ayuda internacional",
    shortLabel: "Int'l",
    icon: "🌍",
    tone: "sky",
  },
  {
    href: "#chat",
    label: "Voluntarios",
    shortLabel: "Chat",
    icon: "🤝",
  },
];

export const MOBILE_BAR_LINKS: SectionLink[] = [
  PRIMARY_MAP_LINK,
  ...SECTION_LINKS.filter((link) => link.mobileBar),
];
