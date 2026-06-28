# Guía: disparar la sincronización (scheduler del worker / Vercel Cron)

Cómo dejar corriendo la sincronización automática de fuentes. Tras el refactor
async, el trabajo pesado YA NO corre en el request: los endpoints solo **encolan**
jobs BullMQ y devuelven `202`; el procesamiento ocurre en el worker.
Ver el diseño en [RFC 0001](../rfcs/0001-sincronizacion-fuentes.md).

## Modelo actual (async/colas)

El scheduler **canónico** vive en el worker (BullMQ, equivalente a Celery-Beat):
`registerSourceSchedulers()` registra un job repetible por fuente habilitada
(`upsertJobScheduler`, cada `SYNC_EVERY_MS`, default 10 min, modo `chunk`) y
`registerMaintenanceSchedulers()` hace lo propio con el geocode
(`GEOCODE_EVERY_MS`, default 5 min). Estos schedulers se registran al arrancar el
worker
(`worker/index.ts`) y son idempotentes (upsert en cada arranque).

**Vercel Cron es ahora fallback/legacy**: en Hetzner el camino primario es el
scheduler del worker. Los crons de `vercel.json` (y el disparo manual) solo
ENCOLAN; sirven como trigger externo si no hay worker corriendo el scheduler.

## Qué hace

`vercel.json` define dos crons (triggers externos, encolan y vuelven enseguida):

| Cron | Endpoint | Frecuencia | Qué hace |
| --- | --- | --- | --- |
| Sync | `/api/sync/cron` | `*/10 * * * *` | Encola un job chunked por fuente y vuelve `202`. El worker procesa un chunk de páginas (reanuda vía cursor en `sync_state`). |
| Geocode | `/api/sync/geocode` | `*/5 * * * *` | Encola un job de geocode y vuelve `202`. El worker geocodifica un lote sin coordenadas. |

Ambos son **idempotentes**: el `jobId` es determinístico por (fuente, modo), así
que re-disparar mientras hay uno pendiente es no-op (BullMQ ignora ids
existentes); reintentar no duplica.

## Requisitos de plan

Los crons sub-diarios (`*/5`, `*/10`) requieren un plan **Vercel Pro o superior**.
El plan Hobby solo permite **un cron diario**. Confirma el plan antes de desplegar.

> Los endpoints YA NO usan `maxDuration` (no existe en `app/`): encolan y vuelven
> en milisegundos, así que el límite de duración de Vercel deja de ser relevante
> para el sync. El trabajo largo (~50 páginas por corrida) corre en el worker.

## Variables de entorno (Project → Settings → Environment Variables)

| Variable | Obligatoria | Para qué |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres (Neon o el `app` DB en Hetzner). |
| `VALKEY_URL` | ✅ | Redis/Valkey para BullMQ (productor y worker). Sin él no se puede encolar. |
| `CRON_SECRET` | ✅ (para el cron) | **Vercel manda `Authorization: Bearer $CRON_SECRET` a los crons SOLO si esta variable existe.** Sin ella, el cron llama sin auth → el endpoint responde 401 y no encola. Pon un valor aleatorio largo. |
| `ADMIN_PASSWORD` | ✅ (para el panel) | Disparo manual (`/api/sync/run`) y panel admin. |
| `SYNC_EVERY_MS` | opcional | Cadencia del scheduler del worker (default 600000 = 10 min). |
| `GEOCODE_EVERY_MS` | opcional | Cadencia del geocode en el worker (default 300000 = 5 min). |
| `SYNC_SOURCES` | opcional | CSV de fuentes habilitadas. Si no se define, todas. |
| `SYNC_USER_AGENT` | opcional | User-Agent identificable hacia las fuentes. |
| `SOURCE_DESAPARECIDOS_URL` | opcional | Override del endpoint de la fuente. |
| `SOURCE_DESAPARECIDOS_IMPORT_CONTACT` | opcional | `true` para importar teléfonos (default `false`, ver RFC §6). |

> ⚠️ `CRON_SECRET` es el error #1 al usar Vercel Cron. Si los crons devuelven 401
> en los logs, casi siempre es que falta esa variable.

## Pasos (Vercel Cron, fallback)

1. Conecta **Neon** al proyecto (Storage → Neon) → inyecta `DATABASE_URL`, o
   apunta `DATABASE_URL`/`VALKEY_URL` a la infra de Hetzner.
2. Define `CRON_SECRET` y `ADMIN_PASSWORD` en Environment Variables.
3. Despliega (`vercel --prod` o push a la rama de producción). Vercel detecta
   `vercel.json` y registra los crons.
4. Verifica en **Project → Crons**: deben aparecer los dos, con su próxima
   ejecución.

> En Hetzner no hace falta esto: basta con que el worker esté corriendo
> (`worker-deployment.yaml`); registra los schedulers al arrancar.

## Verificar que funciona

- **Logs**: filtra por `/api/sync/cron`. Debe responder `202` con
  `{ ok: true, queued: true, jobIds: [...] }`. Un `401` = falta `CRON_SECRET`;
  un `503` = no se pudo encolar (cola/Valkey no disponible).
- **Status-poll**: con cada `jobId`, consulta
  `GET /api/sync/status?jobId=<id>` (token admin) para ver `state`
  (`waiting|active|completed|failed|delayed`), `progress` y `result`.
- **Panel admin** (`/admin`): la sección "Sincronización de fuentes" muestra el
  cursor por fuente y las últimas corridas (tabla `sync_runs`).
- **Disparo manual**: en el panel, botón "Sincronizar ahora"
  (`POST /api/sync/run?mode=chunk` con el token admin) — encola y devuelve `202`
  con los `jobIds`; útil para forzar sin esperar al scheduler.
- **Mapa**: tras unos ciclos de geocode, los registros sincronizados aparecen
  como marcadores.

## Tiempos esperados

- Fuente actual ~46k registros (~462 páginas). Cada corrida de sync procesa hasta
  ~50 páginas (`DEFAULT_PAGES_PER_RUN`, acotado también por `timeBudgetMs`) en el
  worker → un ciclo completo en ~5 corridas (~50 min con cadencia de 10 min).
- El geocode respeta el ~1 req/s de Nominatim; va acotado por corrida y avanza
  ciclo a ciclo.
- El worker usa `lockDuration` ~300s (`LONG_JOB_LOCK_MS`) para que BullMQ no marque
  "stalled" un job chunked largo (~200s) y lo re-ejecute en paralelo.

## Alternativas sin Vercel Cron

Aparte del scheduler del worker (camino primario en Hetzner), `/api/sync/cron`
acepta `Authorization: Bearer $CRON_SECRET` de cualquier llamador, así que
también sirve: GitHub Actions (`on: schedule`), Upstash QStash, cron-job.org, o un
cron del sistema. En todos los casos el endpoint solo encola; el worker procesa.
Ver el RFC para detalles.
