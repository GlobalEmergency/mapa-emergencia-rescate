export const CONTACT_EMAIL = "info@terremotovenezuela.app";

/** Grupo/comunidad de voluntarios en WhatsApp (configurable en Vercel). */
export const WHATSAPP_COMMUNITY_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ??
  "https://wa.me/?text=" +
    encodeURIComponent(
      "Hola, quiero unirme a la comunidad de voluntarios de Terremoto Venezuela 🆘 https://terremotovenezuela.app",
    );

/** Perfil oficial del proyecto en X. */
export const X_PROFILE_URL =
  process.env.NEXT_PUBLIC_X_PROFILE_URL ?? "https://x.com/cristianmock";

/** Calma — primeros auxilios psicológicos en línea (Universidad Continental). */
export const PSYCHOLOGY_HELP_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdbhPR8aO-dOLYgdnilRIYkv7nNbsaaA0JkonX1-VusOTxjXA/viewform";

export function contactMailto(subject?: string): string {
  if (!subject) return `mailto:${CONTACT_EMAIL}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export function psychologyHelpUrl(): string {
  return process.env.NEXT_PUBLIC_PSYCHOLOGY_HELP_URL ?? PSYCHOLOGY_HELP_URL;
}
