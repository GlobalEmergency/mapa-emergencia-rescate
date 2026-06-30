import type { NextConfig } from "next";

// Cabeceras de seguridad aplicadas a todas las rutas.
//
// Las de abajo (sin CSP) son hardening sin riesgo de romper la app:
//   - nosniff: evita MIME-sniffing (defensa ante respuestas servidas como tipo
//     equivocado).
//   - X-Frame-Options + frame-ancestors: anti-clickjacking (la app no se embebe
//     en iframes de terceros).
//   - Referrer-Policy: no filtrar la URL completa a destinos cross-origin.
//   - Permissions-Policy: apaga APIs potentes que la app no usa.
//   - HSTS: fuerza HTTPS en navegadores que ya visitaron el sitio.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "microphone=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

// CSP en modo SOLO-REPORTE a propósito: el sitio carga scripts/recursos de
// terceros (Google Analytics, Google Translate), tiles de OpenStreetMap y fotos
// desde el CDN de R2, además de los redirects de foto a orígenes externos de las
// fuentes de sync. Empezar en `Report-Only` permite recopilar violaciones reales
// en consola del navegador SIN bloquear nada en una app humanitaria en vivo;
// cuando la política esté afinada, los maintainers pueden moverla a enforcing
// (renombrar la cabecera a `Content-Security-Policy` y, opcionalmente, añadir un
// `report-uri`/`report-to`). `img-src https:` se mantiene amplio por los tiles y
// los redirects de foto; el resto ya está acotado por origen.
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://translate.google.com https://translate.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://nominatim.openstreetmap.org",
  "frame-src 'self' https://translate.google.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // `output: "standalone"` empaqueta solo lo necesario (incluido un server.js
  // mínimo) en `.next/standalone`, para correr en Docker sin instalar todo
  // node_modules. Necesario para el despliegue en Hetzner/k3s (ver Dockerfile
  // + infra/). En Vercel es inocuo. `public` y `.next/static` se copian a mano
  // en el Dockerfile, tal como indican los docs de Next.
  output: "standalone",
  // Tree-shaking de barrels: importa solo los iconos usados de lucide-react en
  // vez del módulo completo. Next 16 ya lo hace por defecto para lucide; queda
  // explícito por si cambia el default o se suman más libs de barril.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Fija la raíz del workspace a este directorio. Sin esto Turbopack la infiere
  // por lockfiles en carpetas superiores (p. ej. un pnpm-lock.yaml en el home).
  turbopack: {
    root: import.meta.dirname,
  },
  // Cabeceras de seguridad para toda la app (ver constantes arriba).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspReportOnly,
          },
        ],
      },
    ];
  },
  // Protección anti version-skew para el roll multi-pod en Hetzner. `next build`
  // estampa un build-id ALEATORIO por defecto, así que los 2 pods de un mismo
  // deploy servirían URLs `/_next/static/<id>/…` distintas — un usuario en el pod
  // A podría pedir un chunk que solo tiene el pod B → 404 → ChunkLoadError (no hay
  // sticky sessions en el LB). Derivar el id del commit SHA hace que ambos pods
  // coincidan; `deploymentId` fuerza una navegación dura (recarga limpia) cuando
  // una pestaña vieja pega contra un pod nuevo entre deploys. APP_BUILD_SHA se lee
  // en BUILD time (build-arg → ENV en el Dockerfile); cae a "dev" en local.
  generateBuildId: async () => process.env.APP_BUILD_SHA || "dev",
  deploymentId: process.env.APP_BUILD_SHA || undefined,
  // Sirve /_next/static desde el CDN (R2 + dominio Cloudflare) para que una
  // petición de chunk nunca pegue a un pod mid-deploy con otro build — el CDN
  // tiene los assets inmutables y content-hashed de TODOS los builds, así siempre
  // resuelve. Fix estructural del 404/"Loading…" en la ventana de deploy. Se fija
  // en BUILD time (build-arg → env). Sin setear (local/dev, o antes de tener CDN)
  // → sin prefijo, los assets los sirve la app igual que antes.
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX
    ? process.env.NEXT_PUBLIC_ASSET_PREFIX.replace(/\/$/, "")
    : undefined,
  // NOTA: ya NO hay proxy de /api. El frontend llama al backend por su URL
  // ABSOLUTA (NEXT_PUBLIC_API_URL, ver lib/api.ts) — son servicios separados
  // (tier web vs tier api). El backend habilita CORS para el origen del front.
};

export default nextConfig;
