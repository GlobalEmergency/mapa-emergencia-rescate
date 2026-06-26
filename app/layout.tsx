import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import PwaRegister from "./components/PwaRegister";
import MourningRibbon from "./components/MourningRibbon";
import StickyHelpButton from "./components/StickyHelpButton";
import OpenPanelProduction from "./components/OpenPanelProduction";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://terremotovenezuela.app";
const SITE_TITLE = "Mapa de Emergencia y Rescate · Terremoto en Venezuela";
const SITE_DESC =
  "Reporte ciudadano en tiempo real para coordinar rescates, identificar daños estructurales y organizar la entrega de ayuda humanitaria tras el terremoto en Venezuela.";
const OPENPANEL_CLIENT_ID = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;

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
    // La imagen la aporta el archivo app/opengraph-image.png (file convention).
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    // La imagen la aporta el archivo app/twitter-image.png (file convention).
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#dc2626",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-lg focus:bg-red-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Saltar al contenido
        </a>
        {/* Franja tricolor de Venezuela: muy fina, en el borde superior de toda la página */}
        <div
          aria-hidden
          className="h-1.5 w-full shrink-0"
          style={{
            background:
              "linear-gradient(to bottom, #FFCC00 0 33.34%, #00247D 33.34% 66.67%, #CF142B 66.67% 100%)",
          }}
        />

        {/* Cinta de luto: solo en páginas de cara al público, no en /admin */}
        <MourningRibbon />

        {OPENPANEL_CLIENT_ID && (
          <OpenPanelProduction clientId={OPENPANEL_CLIENT_ID} />
        )}

        {children}
        <PwaRegister />
        <StickyHelpButton />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // Escapar `<` evita un breakout de </script> si algún día el JSON-LD
            // incluyera datos dinámicos (hoy son solo constantes).
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </body>
      <GoogleAnalytics gaId="G-CHV8FZE23K" />
    </html>
  );
}
