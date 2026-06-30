import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Space_Grotesk } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import PwaRegister from "@/components/layout/PwaRegister";
import MourningRibbon from "@/components/layout/MourningRibbon";
import OpenPanelProduction from "@/components/layout/OpenPanelProduction";
import ThemeProvider from "@/components/layout/ThemeProvider";
import QueryProvider from "@/components/layout/QueryProvider";
import { SITE_URL } from "@/lib/site";

const stara = localFont({
  src: [
    {
      path: "./fonts/stara/Stara-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/stara/Stara-MediumItalic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/stara/Stara-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/stara/Stara-SemiBoldItalic.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/stara/Stara-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/stara/Stara-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "./fonts/stara/Stara-ExtraBold.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/stara/Stara-Black.otf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const SITE_TITLE = "Mapa de Emergencia y Rescate · Terremoto en Venezuela";
const SITE_DESC =
  "Reporte ciudadano en tiempo real para coordinar rescates, identificar daños estructurales y organizar la entrega de ayuda humanitaria tras el terremoto en Venezuela.";
const OPENPANEL_CLIENT_ID = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;

// Orígenes cross-origin que el navegador SIEMPRE golpea: el backend (datos de
// emergencia, vía fetch con credenciales) y el CDN R2 (fotos). Preconectar
// adelanta DNS+TCP+TLS para que el primer request no pague el handshake. Solo el
// origin (esquema+host), no la ruta. Guardado por si el env viene vacío/inválido.
function safeOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}
const API_ORIGIN = safeOrigin(process.env.NEXT_PUBLIC_API_URL);
const R2_ORIGIN = safeOrigin(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: {
    default: SITE_TITLE,
    template: "%s · Mapa Emergencia VE",
  },
  description: SITE_DESC,
  applicationName: "Mapa Emergencia VE",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  keywords: [
    "terremoto",
    "Venezuela",
    "Caracas",
    "ayuda humanitaria",
    "rescate",
    "mapa de emergencia",
    "reporte ciudadano",
    "personas desaparecidas",
    "ONG",
  ],
  openGraph: {
    type: "website",
    siteName: "Mapa Emergencia VE",
    title: SITE_TITLE,
    description: SITE_DESC,
    locale: "es_VE",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#EEF2F7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Mapa Emergencia VE",
        url: SITE_URL,
        inLanguage: "es-VE",
        description: SITE_DESC,
      },
      {
        "@type": "EmergencyService",
        name: "Plataforma ciudadana de coordinación de rescate",
        areaServed: { "@type": "Country", name: "Venezuela" },
        url: SITE_URL,
      },
      {
        "@type": "SpecialAnnouncement",
        name: "Mapa colaborativo del terremoto en Venezuela",
        text: SITE_DESC,
        datePosted: new Date().toISOString(),
        category: "https://www.wikidata.org/wiki/Q8068",
        spatialCoverage: { "@type": "Country", name: "Venezuela" },
        url: SITE_URL,
      },
    ],
  };
  return (
    <html
      lang="es"
      data-dark="false"
      className={`${stara.variable} ${spaceGrotesk.variable} h-full overflow-x-hidden antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconexión a los orígenes cross-origin críticos. El backend va con
            credenciales (cookies) → use-credentials; el CDN R2 es anónimo. */}
        {API_ORIGIN && (
          <link
            rel="preconnect"
            href={API_ORIGIN}
            crossOrigin="use-credentials"
          />
        )}
        {R2_ORIGIN && (
          <link rel="preconnect" href={R2_ORIGIN} crossOrigin="anonymous" />
        )}
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden bg-[var(--ebg)] text-[var(--etext)]">
        <ThemeProvider />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-lg focus:bg-[#C41A1A] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Saltar al contenido
        </a>
        <div
          aria-hidden
          className="h-[5px] w-full shrink-0"
          style={{
            background:
              "linear-gradient(to right, #CF9A0C 0 33.34%, #00247D 33.34% 66.67%, #CF0A2C 66.67% 100%)",
          }}
        />

        <MourningRibbon />

        {OPENPANEL_CLIENT_ID && (
          <OpenPanelProduction clientId={OPENPANEL_CLIENT_ID} />
        )}

        <QueryProvider>
          {children}
        </QueryProvider>
        <PwaRegister />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </body>
      <GoogleAnalytics gaId="G-CHV8FZE23K" />
    </html>
  );
}
