import type { NextConfig } from "next";

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
