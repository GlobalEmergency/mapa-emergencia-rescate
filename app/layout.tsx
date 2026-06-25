import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "./components/PwaRegister";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Franja tricolor de Venezuela: muy fina, en el borde superior de toda la página */}
        <div
          aria-hidden
          className="h-1.5 w-full shrink-0"
          style={{
            background:
              "linear-gradient(to bottom, #FFCC00 0 33.34%, #00247D 33.34% 66.67%, #CF142B 66.67% 100%)",
          }}
        />

        {/* Cinta de luto en memoria de las víctimas del terremoto */}
        <span
          title="En memoria de las víctimas del terremoto"
          aria-label="En memoria de las víctimas del terremoto"
          className="fixed right-3 top-3.5 z-[1500] block h-8 w-7 drop-shadow-sm"
        >
          <span
            aria-hidden
            style={{ transformOrigin: "center 28%" }}
            className="absolute left-1/2 top-0 h-8 w-[5px] -translate-x-1/2 rotate-[24deg] rounded-full bg-neutral-900"
          />
          <span
            aria-hidden
            style={{ transformOrigin: "center 28%" }}
            className="absolute left-1/2 top-0 h-8 w-[5px] -translate-x-1/2 -rotate-[24deg] rounded-full bg-neutral-900"
          />
        </span>

        {children}
        <PwaRegister />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
