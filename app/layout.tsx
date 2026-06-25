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
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/opengraph-image"],
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
