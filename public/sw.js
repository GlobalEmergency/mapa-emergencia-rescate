/**
 * Service worker mínimo y prudente para esta plataforma de emergencia.
 *
 * Estrategia:
 *  - HTML/navegaciones: network-first con fallback al último HTML cacheado o
 *    a una página simple offline. Nunca devolvemos contenido viejo si la red
 *    está disponible, porque los reportes cambian rápido.
 *  - Imágenes de reportes/desaparecidos (/api/.../photo): cache-first.
 *  - Tiles de OpenStreetMap: cache-first con TTL implícito por cache name.
 *  - Otros assets estáticos del propio dominio (_next/static, /icon.svg,
 *    manifest, etc.): cache-first.
 *  - APIs JSON (/api/...): siempre network; si falla, devolvemos lo último
 *    cacheado por GET. No interceptamos POST/DELETE.
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PHOTO_CACHE = `photos-${CACHE_VERSION}`;
const TILE_CACHE = `tiles-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const HTML_CACHE = `html-${CACHE_VERSION}`;

const KEEP_CACHES = new Set([
  STATIC_CACHE,
  PHOTO_CACHE,
  TILE_CACHE,
  API_CACHE,
  HTML_CACHE,
]);

const CORE_ASSETS = [
  "/icon.svg",
  "/favicon.ico",
  "/manifest.webmanifest",
];
const CORE_PAGES = ["/", "/privacidad"];
const CORE_API_SNAPSHOTS = [
  "/api/reports",
  "/api/missing",
  "/api/missing?status=found",
];
// Página de último recurso: se muestra solo si ni siquiera hay un "/" cacheado
// (caché fría o desalojada). Lleva embebidos los teléfonos de emergencia
// universales para que SIEMPRE haya números a la mano sin conexión.
// Mantener sincronizado con el grupo "Emergencias (línea directa)" de
// app/components/EmergencyContacts.tsx.
const OFFLINE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>Sin conexión · Teléfonos de emergencia</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:2rem 1rem;min-height:100vh;box-sizing:border-box}main{max-width:30rem;margin:0 auto;text-align:center}h1{margin:.5rem 0;font-size:1.25rem}p{color:#475569}.lead{max-width:28rem;margin:.5rem auto 1.5rem}ul{list-style:none;padding:0;margin:0;display:grid;gap:.5rem;text-align:left}li{display:flex;align-items:center;justify-content:space-between;gap:.75rem;border:1px solid #e2e8f0;background:#fff;border-radius:.75rem;padding:.625rem .875rem}.name{font-size:.875rem;font-weight:500;color:#1e293b}a.call{display:inline-flex;align-items:center;gap:.375rem;border:1px solid #fecaca;background:#fff;color:#b91c1c;font-weight:700;text-decoration:none;border-radius:.5rem;padding:.5rem .75rem;font-size:.875rem}.note{margin-top:1.5rem;font-size:.75rem;color:#64748b}</style></head><body><main><h1>🛰️ Sin conexión</h1><p class="lead">No hay internet en este momento. Estos teléfonos de emergencia funcionan aunque la app no cargue:</p><ul><li><span class="name">Cantv (desde fijo)</span><a class="call" href="tel:171">📞 171</a></li><li><span class="name">Movilnet</span><a class="call" href="tel:*1">📞 *1</a></li><li><span class="name">Digitel</span><a class="call" href="tel:112">📞 112</a></li><li><span class="name">Movistar</span><a class="call" href="tel:911">📞 911</a></li></ul><p class="note">Cuando vuelva la conexión podrás ver el mapa, reportar y consultar la lista completa de bomberos y ambulancias.</p></main></body></html>`;
const API_TIMEOUT_MS = 2500;
const NAVIGATION_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .open(STATIC_CACHE)
        .then((cache) => cache.addAll(CORE_ASSETS).catch(() => {})),
      caches
        .open(HTML_CACHE)
        .then((cache) => cache.addAll(CORE_PAGES).catch(() => {})),
      caches
        .open(API_CACHE)
        .then((cache) => cache.addAll(CORE_API_SNAPSHOTS).catch(() => {})),
    ])
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (KEEP_CACHES.has(key) ? null : caches.delete(key))),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isPhotoApi(url) {
  return (
    url.pathname.startsWith("/api/missing/") && url.pathname.endsWith("/photo")
  ) || (
    url.pathname.startsWith("/api/reports/") && url.pathname.endsWith("/photo")
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetchWithTimeout(request, API_TIMEOUT_MS);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

function fetchWithTimeout(request, timeoutMs) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("network timeout")), timeoutMs),
    ),
  ]);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // 1. Navegaciones HTML: cache-first después de la primera visita, con
  // refresco en segundo plano para que la app abra aun con señal muy débil.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const cache = await caches.open(HTML_CACHE);
          const cached = await cache.match(request);
          const freshPromise = fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS)
            .then((fresh) => {
              if (fresh.ok) cache.put(request, fresh.clone());
              return fresh;
            })
            .catch(() => null);

          if (cached) {
            event.waitUntil(freshPromise);
            return cached;
          }

          const fresh = await freshPromise;
          if (fresh) return fresh;
          const cachedHome = await cache.match("/");
          if (cachedHome) return cachedHome;
        } catch {
          // cae al HTML offline abajo
        }
        return new Response(OFFLINE_HTML, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      })(),
    );
    return;
  }

  // Solo manejamos same-origin y tiles de OSM más abajo.
  const sameOrigin = url.origin === self.location.origin;

  // 2. Fotos de reportes/desaparecidos: cache-first (no cambian).
  if (sameOrigin && isPhotoApi(url)) {
    event.respondWith(cacheFirst(request, PHOTO_CACHE));
    return;
  }

  // 3. APIs JSON: network-first con cache de respaldo.
  if (sameOrigin && url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // 4. Assets estáticos de Next y públicos: cache-first.
  if (
    sameOrigin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname === "/icon.svg" ||
      url.pathname === "/favicon.ico" ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js"))
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 5. Tiles de OpenStreetMap (mapa offline parcial).
  if (url.hostname.endsWith(".tile.openstreetmap.org")) {
    event.respondWith(cacheFirst(request, TILE_CACHE));
    return;
  }
});
