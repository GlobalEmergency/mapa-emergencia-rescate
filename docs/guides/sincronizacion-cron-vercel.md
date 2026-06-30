# Guía: disparar la sincronización (scheduler del worker)

Cómo dejar corriendo la sincronización automática de fuentes. Tras el refactor
async, el trabajo pesado YA NO corre en el request: los endpoints solo **encolan**
jobs BullMQ y devuelven `202`; el procesamiento ocurre en el worker.
Ver el diseño en [RFC 0001](../rfcs/0001-sincronizacion-fuentes.md).

> En prod los schedulers vienen **apagados** por defecto
> (`SYNC_SCHEDULERS=0`, `HUB_SCHEDULERS=0` en `worker-deployment.yaml`) para
> evitar scraping automático. Reactivar = quitar esas vars o ponerlas a `"1"`.

## Modelo actual (async/colas)

El scheduler **canónico** vive en el worker (BullMQ, equivalente a Celery-Beat):
`registerSourceSchedulers()` registra un job repetible por fuente habilitada
(`upsertJobScheduler`, cada `SYNC_EVERY_MS`, default 10 min, modo `chunk`) y
`registerMaintenanceSchedulers()` hace lo propio con el geocode
(`GEOCODE_EVERY_MS`, default 5 min). Estos schedulers se registran al arrancar el
worker (`backend/worker/index.ts`) y son idempotentes (upsert en cada arranque).

En Hetzner el camino primario es el scheduler del worker. Los endpoints
`/api/sync/*` siguen existiendo como **trigger externo opcional** (GitHub
Actions, QStash, cron-job.org, Vercel Cron, etc.): solo ENCOLAN y vuelven `202`;
el worker procesa. No hay `vercel.json` en el repo.

## Qué hace

El worker registra dos jobs repetibles; los mismos endpoints aceptan un trigger
externo (encolan y vuelven enseguida):

| Job repetible | Endpoint externo | Frecuencia | Qué hace |
| --- | --- | --- | --- |
| Sync | `/api/sync/cron` | `SYNC_EVERY_MS` (10 min) | Encola un job chunked por fuente y vuelve `202`. El worker procesa un chunk de páginas (reanuda vía cursor en `sync_state`). |
| Geocode | `/api/sync/geocode` | `GEOCODE_EVERY_MS` (5 min) | Encola un job de geocode y vuelve `202`. El worker geocodifica un lote sin coordenadas. |

Ambos son **idempotentes**: el `jobId` es determinístico por (fuente, modo), así
que re-disparar mientras hay uno pendiente es no-op (BullMQ ignora ids
existentes); reintentar no duplica.

> Los endpoints encolan y vuelven en milisegundos (no hacen I/O largo inline), así
> que cualquier límite de duración del disparador externo es irrelevante. El
> trabajo largo (~50 páginas por corrida) corre en el worker.

## Variables de entorno (Project → Settings → Environment Variables)

| Variable | Obligatoria | Para qué |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres (Neon o el `app` DB en Hetzner). |
| `VALKEY_URL` | ✅ | Redis/Valkey para BullMQ (productor y worker). Sin él no se puede encolar. |
| `CRON_SECRET` | ✅ (para el trigger externo) | El endpoint exige `Authorization: Bearer $CRON_SECRET` (middleware `requireCron`). Un trigger externo que no lo mande recibe 401 y no encola. Pon un valor aleatorio largo. (Solo el scheduler interno del worker no lo necesita.) |
| `ADMIN_PASSWORD` | ✅ (para el panel) | Disparo manual (`/api/sync/run`) y panel admin. |
| `SYNC_EVERY_MS` | opcional | Cadencia del scheduler del worker (default 600000 = 10 min). |
| `GEOCODE_EVERY_MS` | opcional | Cadencia del geocode en el worker (default 300000 = 5 min). |
| `SYNC_SOURCES` | opcional | CSV de fuentes habilitadas. Si no se define, todas. |
| `SYNC_USER_AGENT` | opcional | User-Agent identificable hacia las fuentes. |
| `SOURCE_DESAPARECIDOS_URL` | opcional | Override del endpoint de la fuente. |
| `SOURCE_DESAPARECIDOS_IMPORT_CONTACT` | opcional | `true` para importar teléfonos (default `false`, ver RFC §6). |

> ⚠️ `CRON_SECRET` es el error #1 de los triggers de cron. `requireCron` valida
> `Authorization: Bearer $CRON_SECRET` venga de donde venga (GitHub Actions,
> QStash, Vercel Cron, etc.): si los crons devuelven 401 en los logs, casi
> siempre es que falta esa variable.

## Pasos (camino primario: worker en Hetzner)

1. Asegura que el worker esté corriendo (`worker-deployment.yaml`); registra los
   schedulers al arrancar. `DATABASE_URL` y `VALKEY_URL` ya vienen de `app-env`.
2. Pon `SYNC_SCHEDULERS` y `HUB_SCHEDULERS` a `"1"` (o quítalas) en el Deployment
   para activar el crawl automático; quedan en `"0"` por defecto.
3. Verifica con el status-poll / el panel admin (ver abajo).

### Trigger externo opcional (sin worker scheduler)

Si quieres disparar desde fuera (GitHub Actions `on: schedule`, QStash,
cron-job.org, Vercel Cron, cron del sistema):

1. Define `CRON_SECRET` (y `ADMIN_PASSWORD` para el disparo manual).
2. Programa una llamada periódica:
   `curl -H "Authorization: Bearer $CRON_SECRET" https://api.terremotovenezuela.app/api/sync/cron`
   y otra a `/api/sync/geocode`.
3. El endpoint solo encola y vuelve `202`; el worker procesa.

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
