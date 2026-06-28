# Mapa de Emergencia y Rescate: Terremoto en Venezuela

Plataforma de reporte ciudadano en tiempo real para coordinar rescates,
identificar daños estructurales y organizar la entrega de ayuda humanitaria.

Construida con **Next.js (App Router)**, **Leaflet + OpenStreetMap** (sin API key)
y **Postgres** (acceso vía **Drizzle ORM**), con **workers BullMQ** para el trabajo
asíncrono. Pensada para alto tráfico y para funcionar bien en móvil.

## Funcionalidad

- Mapa interactivo: toca/clic en un punto para abrir el formulario de reporte.
- 3 tipos de marcadores: 🔴 Emergencia crítica, 🟡 Suministros, 🟢 Centro de acopio.
- Panel lateral con lista de reportes, contadores y filtro por tipo.
- Botón "Atendido" para limpiar reportes ya resueltos.
- Refresco automático cada 5 s (polling), pausado cuando la pestaña no está visible.

## Diseño

El sistema visual vive en [`design/DESIGN.md`](design/DESIGN.md). Sigue el
formato DESIGN.md de Google para combinar tokens de diseño con criterios
humanos de uso, y debe revisarse antes de cambios visuales en la interfaz
pública.

## Optimizaciones para alto flujo de uso

- **Caché de CDN** en `GET /api/reports` (`s-maxage=4, stale-while-revalidate=30`):
  miles de usuarios haciendo polling se sirven desde el edge/CDN y no
  golpean la base de datos en cada petición.
- **Actualizaciones optimistas**: el reporte propio aparece al instante aunque el
  CDN sirva una versión cacheada de la lista durante unos segundos.
- **Rate limiting** por IP en `POST` y `DELETE` (8 req/min) en memoria,
  para frenar spam y reportes falsos.
- **Polling pausado** automáticamente cuando la pestaña está en segundo plano.

> Si no configuras la base de datos (`DATABASE_URL`), la app funciona en "modo
> demo" con almacenamiento en memoria (los reportes no se comparten entre
> usuarios ni persisten). El banner amarillo te avisa de ello.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Contribuir

Antes de abrir una issue o pull request, lee [CONTRIBUTING.md](CONTRIBUTING.md).
El proyecto usa un flujo fork-first para contribuciones externas, plantillas de
issues/PRs y reglas estrictas para no publicar datos personales o sensibles en
GitHub. Para vulnerabilidades o fugas de datos, usa [SECURITY.md](SECURITY.md).

## Despliegue

El despliegue canónico es **Hetzner Cloud + k3s**, aprovisionado con **OpenTofu**
(`infra/tofu/`) y desplegado con manifiestos de Kubernetes (`infra/k8s/`). El
workflow `.github/workflows/deploy-hetzner.yml` construye la imagen, la publica
en GHCR y aplica los manifiestos por entorno (`staging` | `prod`).

Componentes principales del clúster:

- Dos `Deployment` de la misma imagen: `web` (tier `web`) y `api` (tier `api`),
  cada uno con 3 réplicas base y autoescalado por HPA (`web` 3–20, `api` 3–30,
  CPU 60%).
- Dos `Service` `LoadBalancer`: `web` → LB público (dominio del sitio) y `api` →
  LB para terceros. El perfil TLS se inyecta por target con `envsubst` (staging =
  cert origin tras Cloudflare; prod = cert gestionado por Hetzner).
- Workers BullMQ (`worker-deployment.yaml`) para sync, geocode, deduplicación,
  rehost de imágenes y los schedulers; el Job `migrate` aplica las migraciones de
  Drizzle (`worker/migrate.ts`) antes del roll.
- Nodos efímeros con cluster-autoscaler de Hetzner: la configuración por defecto
  (`infra/tofu/variables.tf`, `k3s_worker_count = 0`) y los manifiestos apuntan a
  ese modelo. El runbook de cutover está en `docs/rfcs/0004-*` (aún con pasos
  manuales).

La base de datos es **Postgres** y el esquema es la **única fuente de verdad** en
`infra/db/schema.ts`: NO hay `CREATE TABLE` en runtime. Los cambios se generan con
`npm run db:generate` (migraciones en `infra/db/migrations/`) y el Job `migrate`
los aplica de forma idempotente en cada deploy.

> Vercel/Neon pueden seguir presentes como alternativa o despliegue legado
> (`vercel.json` aún define crons), pero el camino soportado y descrito arriba es
> Hetzner + k3s.

Para desarrollo local define `DATABASE_URL` en `.env.local` (o usa el modo demo en
memoria) y ejecuta:

```bash
npm run dev
```

## Estructura

El repo creció bastante: hoy hay ~46 endpoints (`route.ts`) bajo `app/api/`. Vista
de alto nivel:

```
app/
  api/
    admin/        # panel: contacto, datos, donaciones, suministros, login
    chat/         # chat ciudadano (lista cacheada + hilos)
    contact/      # bandeja de contacto
    donations/    # donaciones y stats
    geo/  geocode/ # geolocalización y geocodificación
    hospitals/    # hospitales, pacientes y suministros (status/needs/help)
    hub/          # federación con el hub "Venezuela Ayuda" (reportes, stats)
    missing/      # personas desaparecidas (mapa, stats, fotos, resolución)
    patients/     # búsqueda de pacientes
    reports/      # GET (lista, cacheada), POST (crear), confirmar, foto, DELETE
    sync/         # run/cron/geocode/duplicates/status (encolan jobs BullMQ)
    docs/ openapi/ readyz/ stats/ op/   # docs Swagger, healthcheck, etc.
  components/      # UI pública: mapa Leaflet, formularios, paneles
  page.tsx        # landing
lib/              # tipos, acceso a datos (Drizzle), cache, sync, rate-limit
infra/
  db/schema.ts    # esquema Drizzle (fuente de verdad) + migrations/
  k8s/            # manifiestos: web/api, services, hpa, workers, migrate
  tofu/           # OpenTofu: red, k3s, postgres, valkey, firewall
worker/           # workers BullMQ (sync, geocode, rehost, schedulers, migrate)
docs/             # RFCs, ADRs, arquitectura y guías
```

El acceso a datos pasa por **Drizzle ORM** (`lib/drizzle.ts`); el esquema y sus 27
tablas viven en `infra/db/schema.ts`.
