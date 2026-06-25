# Mapa de Emergencia y Rescate: Terremoto en Venezuela

Plataforma de reporte ciudadano en tiempo real para coordinar rescates,
identificar daños estructurales y organizar la entrega de ayuda humanitaria.

Construida con **Next.js (App Router)**, **Leaflet + OpenStreetMap** (sin API key)
y **Upstash Redis**. Pensada para alto tráfico y para funcionar bien en móvil.

## Funcionalidad

- Mapa interactivo: toca/clic en un punto para abrir el formulario de reporte.
- 3 tipos de marcadores: 🔴 Emergencia crítica, 🟡 Suministros, 🟢 Centro de acopio.
- Panel lateral con lista de reportes, contadores y filtro por tipo.
- Botón "Atendido" para limpiar reportes ya resueltos.
- Refresco automático cada 5 s (polling), pausado cuando la pestaña no está visible.

## Optimizaciones para alto flujo de uso

- **Caché de CDN** en `GET /api/reports` (`s-maxage=4, stale-while-revalidate=30`):
  miles de usuarios haciendo polling se sirven desde el edge de Vercel y no
  golpean Redis en cada petición.
- **Actualizaciones optimistas**: el reporte propio aparece al instante aunque el
  CDN sirva una versión cacheada de la lista durante unos segundos.
- **Rate limiting** por IP en `POST` y `DELETE` (8 req/min) con `@upstash/ratelimit`,
  para frenar spam y reportes falsos.
- **Polling pausado** automáticamente cuando la pestaña está en segundo plano.

> Si no configuras Upstash, la app funciona en "modo demo" con almacenamiento en
> memoria (los reportes no se comparten entre usuarios ni persisten). El banner
> amarillo te avisa de ello.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Despliegue en Vercel

1. Sube el repositorio a GitHub e **importa el proyecto en Vercel**
   (o ejecuta `vercel` con la CLI).
2. Conecta **Upstash Redis** para que los reportes se compartan y persistan:

   ```bash
   vercel integration add upstash
   ```

   Esto crea la base y agrega `UPSTASH_REDIS_REST_URL` y
   `UPSTASH_REDIS_REST_TOKEN` al proyecto automáticamente. También puedes hacerlo
   desde el dashboard: **Storage → Marketplace → Upstash**.
3. Vuelve a desplegar (`vercel --prod`) para que las variables surtan efecto.

Para desarrollo local con la misma base:

```bash
vercel env pull .env.local
npm run dev
```

## Estructura

```
app/
  api/reports/route.ts        # GET (lista, cacheada) y POST (crear)
  api/reports/[id]/route.ts   # DELETE (marcar atendido)
  components/EmergencyApp.tsx  # estado, polling, updates optimistas
  components/MapView.tsx       # mapa Leaflet (carga solo en cliente)
  components/ReportForm.tsx    # formulario emergente
  page.tsx                     # landing (títulos, pasos, leyenda, aviso)
lib/
  types.ts                     # tipos y definición de marcadores
  store.ts                     # Redis con fallback en memoria
  ratelimit.ts                 # rate limiting con fallback en memoria
```
