# RFC 0003 — Refactor async: request-path no bloqueante + colas para todo el I/O pesado

Estado: implementado (merged via PR #108, 2026-06-28)
Fecha: 2026-06-27 (propuesta) / 2026-06-28 (implementado)
Autor: anon (+ asistencia)
Relacionado: `docs/audits/2026-06-27-auditoria-pesada.md` (hallazgos C-1, A-1..A-7,
M-1..M-8, R-1..R-7), `docs/rfcs/0002-federacion-hub-venezuela-ayuda.md` (colas hub).

> Registro: este RFC ya está implementado. El refactor async (request-path
> no bloqueante + colas) y el split de infra (web/api + autoscaling) se
> mergearon en `main` vía **PR #108** ("refactor: async overhaul"). El texto
> de abajo se conserva como diseño de referencia; lo que era estado "antes" se
> redacta en pasado. Para el cutover de nodos efímeros / cron→scheduler ver el
> runbook en `docs/rfcs/0004-*` (aún con pasos manuales).

## 0. TL;DR

Hacemos en mapa lo que **ya hacemos en Hermes (Celery + ADRF) y en boahaus
(BullMQ)**: ningún handler HTTP bloquea en I/O pesado de terceros, y todo el
trabajo lento/no interactivo vive en una cola con reintentos, idempotencia,
rate-limit, DLQ y observabilidad. El request path solo: valida → encola (o lee
con fan-out paralelo) → responde rápido (`202` para trabajo, `200` para lecturas).

mapa ya tiene la mitad de la infra (BullMQ en Valkey, 4 colas, workers con drain,
schedulers tipo beat). Este RFC cierra la otra mitad: **mover el sync inline a la
cola, añadir DLQ/safety-net/observabilidad, arreglar las lecturas que bloquean el
loop (COUNT, seq scans, serial awaits) y estandarizar el contrato de respuesta.**

No es una reescritura. Es terminar de aplicar el patrón que el 80% del repo ya
cumple a las rutas rezagadas.

## 1. La equivalencia Hermes ⇆ boahaus ⇆ mapa

El patrón de casa es el mismo en los tres; solo cambia el runtime. Esta tabla es
el contrato mental del refactor:

| Concepto | Hermes (Celery) | boahaus (BullMQ) | mapa (BullMQ) — objetivo |
|---|---|---|---|
| Vista async no bloqueante | `async def` ADRF + ORM async | `async` Express handler | `async function GET/POST` + drizzle |
| Encolar y volver | `task.delay()` → `202 {task_id}` | `enqueueAiJob()` → `{jobId}` | `enqueueX()` → `202 {jobIds}` |
| Worker | `@shared_task(bind, max_retries)` | `new Worker(name, processor)` | `new Worker(...)` (ya existe) |
| Reintentos + backoff | `self.retry`, `default_retry_delay` | `attempts:3, backoff:exp` | `attempts:3, backoff:exp` (ya) |
| Idempotencia / single-flight | Redis `SET NX EX` + status check | `jobId` determinístico | `jobId` determinístico (ya, con `-`) |
| Beat / periódico | RedBeat (lock distribuido) | repeatable jobs | `upsertJobScheduler` (ya) |
| Fan-out | `poll_all` → `sync_one.delay(id)` ×N | cron fan-out → per-user | producer → `enqueueX(id)` ×N (ya en hub) |
| Aislar trabajo pesado | `queue: "scraper"` (routing) | cola por dominio | cola por dominio (ya: tables/photos/hub-*) |
| acks_late / no perder en deploy | `CELERY_TASK_ACKS_LATE` | drain en SIGTERM | drain en SIGTERM (ya) + (falta) DLQ |
| Resultado introspectable | dict serializable + `AsyncResult` | job result + `getState()` | job result + `getJob().getState()` |
| I/O externo async dentro del job | `async_to_sync(httpx)` | `await fetch()` en processor | `await fetch()` en processor (ya en hub) |

**Lo que mapa ya cumple** (no tocar, solo reusar): colas aisladas, drain elegante,
rate-limit por cola, `attempts`+backoff, `jobId` determinístico, schedulers
idempotentes, lock de productor `SET NX EX` (`worker/redis.ts`).

**Lo que falta** (este RFC): (a) mover el sync de fuentes al patrón encolar→202;
(b) DLQ + alerting + safety-net de proceso; (c) arreglar las lecturas que bloquean
(COUNT exacto, seq scan, serial awaits, hashing síncrono); (d) status-poll
endpoint para trabajo encolado; (e) estandarizar contrato de respuesta.

## 2. Principios (el contrato del request path)

1. **Un handler HTTP nunca hace I/O de terceros multi-segundo inline.** Si tarda
   más que una query DB normal, se encola. (Hermes: vista ADRF dispara `.delay()`
   y vuelve; boahaus: `startProductScan` encola y vuelve.)
2. **Lecturas: fan-out paralelo, nunca waterfall.** Awaits independientes →
   `Promise.all`. (Hermes `select_related`/concurrencia; boahaus `Promise.all`.)
3. **Nada de CPU síncrona pesada por request.** Hashing/serialización se memoiza
   o se cachea junto al dato, no se recomputa por hit.
4. **Trabajo encolado = idempotente + reintentable + observable.** `jobId`
   determinístico, `attempts`+backoff, y si agota intentos → DLQ + alerta.
5. **Contrato de respuesta uniforme.** Trabajo → `202 {ok, jobIds}`; listas →
   `{ items, total?, page?, pageSize?, totalPages?, hasMore?, nextCursor? }` con
   UNA forma elegida, no dos.
6. **El esquema es la fuente de verdad** y **cada endpoint documenta su contrato
   real** (`@swagger`) — incluido el enum correcto y los campos que sí devuelve.

## 3. Fases del refactor

Ordenadas por riesgo/valor. Cada fase = 1 PR enfocado y revisable. Las fases de
seguridad (C-1, A-6, A-4) van **antes** que las de async porque son fugas activas;
están detalladas en el audit y se incluyen aquí solo como gate previo.

### Fase 0 — Gate de seguridad (PR aparte, primero, ya planificado en el audit)

No es async, pero bloquea todo lo demás moralmente. Cerrar **C-1** (PII pacientes),
**A-6** (`TRUSTED_IP_HEADER` spoofeable → anula rate-limit), **A-4/M-7-bis**
(`hashIp`), **A-5**, **A-7**. Sin esto, mover sync a colas es pulir bronce sobre
una fuga. Detalle en `docs/audits/...`. Salida: PR `fix/security-quick-wins`.

### Fase 1 — Lecturas que bloquean el event loop (quick wins, sin infra nueva)

Trabajo del request path que ya es async pero mata la latencia. Copiar patrones
que el repo YA usa en la ruta de al lado.

1. **R-1 — COUNT exacto en `/api/missing`.** `lib/missing.ts:334-338` corre
   `count(*)` sin acotar por request sin búsqueda → 2.5–5.7s con 67k filas.
   *Fix:* acotar el count sin búsqueda igual que con búsqueda
   (`... LIMIT 1000) t` → "1000+"), o `reltuples` aproximado para el total no
   filtrado, o cachear totales por status con TTL largo aparte de las páginas.
2. **M-3 / R-4 — `hub/stats` y `hub/reports` seriales.** 5 COUNT en for-loop →
   `Promise.all` (copiar de `admin/data/route.ts:85`). Paginar `hub/reports` por
   cursor para el tipo pesado (`missing_person`, 49k).
3. **A-3 — chat GET sin `cached()`+`jsonWithEtag()`.** Envolver como reports/missing.
4. **B-3 — serial enqueue en hubIngest.** `for await enqueueImage` →
   `Promise.all(map)` + `res.imagesQueued += pendingPhoto.length`.
5. **B-9 — `jsonWithEtag` re-stringify+sha1 por hit.** Cachear `{json, etag}`
   junto al valor en `cached()`.

Salida: PR `perf/request-path-nonblocking`. Cero migraciones, cero infra.

### Fase 2 — Índices que faltan (migraciones, alto impacto en latencia)

Trabajo DB inindexable en el request path.

1. **A-2 / R-3 — índice GIN trigram para `?q=`.** Crear migración:
   `CREATE EXTENSION pg_trgm; CREATE EXTENSION unaccent;` + `f_unaccent` IMMUTABLE
   + `CREATE INDEX idx_missing_search ... USING gin(f_unaccent(...) gin_trgm_ops)`.
   Expresarlo en `infra/db/schema.ts` con `sql\`...\`` y `db:generate`. Pasa por
   Squawk (índice en migración aparte, no en transacción del migrador — usar
   `CONCURRENTLY` en su propia migración o aceptar el lock en tabla con downtime
   mínimo, decidir en el PR). Mientras no exista, cada búsqueda es seq scan.
2. **M-5 — índice único parcial `(source, external_id)`.** El `ON CONFLICT` de
   `upsertExternalMissingBatch` depende de un árbitro que no está en el esquema.
   Añadir `uniqueIndex(...).where(sql\`external_id IS NOT NULL\`)`. **Verificar si
   prod ya lo tiene out-of-band antes de asumir** (si el sync funciona hoy, quizá
   existe creado a mano — confirmar con `to_regclass` en prod).

Salida: PR `db/missing-search-and-upsert-indexes`. Expand-contract, idempotente.

### Fase 3 — El refactor central: sync de fuentes → cola (el corazón del RFC)

Esto es el equivalente directo de `poll_all_jira` → `sync_one_connection.delay(id)`
de Hermes, y del `startProductScan` 202 de boahaus. **Antes** del refactor,
`app/api/sync/run` y `/cron` ejecutaban `runAllSources(Chunked)` inline hasta
300s (`maxDuration:300`). **Hoy** ese trabajo vive en la cola `sources-sync`
(`worker/sourcesSync.queue.ts`): los handlers encolan y devuelven `202`, y ya
no existe ningún `export const maxDuration` en `app/`.

**Diseño implementado (mismo shape que la cola hub que ya existe):**

1. **Cola `sources-sync`** en `worker/sourcesSync.queue.ts`, junto a `hub-ingest`:
   - `SOURCES_SYNC_QUEUE = "sources-sync"`, productor
     `enqueueSourceSync({sourceId, mode})` con `jobId` determinístico
     `sync-${mode}-${sourceId}` (`-`, no `:`), `attempts:3`,
     `backoff:{type:'exponential', delay:10_000}`, rate-limit por cola si la
     fuente lo necesita.
   - Processor `sourcesSyncProcessor` que llama el `runSyncChunked(adapter, opts)`
     EXISTENTE (no reescribir el motor — moverlo de detrás del handler a detrás
     del worker). El motor ya es chunked + checkpointed por cursor, así que un job
     reanuda donde quedó: perfecto para BullMQ.
   - Worker en `createWorkers()` con `SOURCES_SYNC_CONCURRENCY` (default 2).

2. **Scheduler (beat) reemplaza al cron de Vercel para el caso periódico:**
   `registerSourceSchedulers()` con `upsertJobScheduler` por fuente (incremental
   cada N min), igual que `registerHubSchedulers()`. Esto es el RedBeat de Hermes.
   El `app/api/sync/cron` queda como **fallback** que solo encola; el camino
   primario es el scheduler del worker, que corre 24/7 (Deployments `web` +
   `api` + worker dedicado, ver `infra/k8s/worker-deployment.yaml`).

3. **Endpoints encolan→202 (implementado):**
   - `POST /api/sync/run` (admin): valida → `enqueueSourceSync` por fuente (o una
     sola si `?source=`) → `202 {ok:true, jobIds:[...]}`. Sin `maxDuration:300`.
   - `/api/sync/cron`: solo encola y devuelve `202 {ok:true, queued:true, jobIds}`
     (ya no `200` con totales). `geocode` y `duplicates` siguen el mismo patrón.
   - `GET /api/sync/status?jobId=` (admin): `getSyncJobState(id)` →
     `getJob(id).getState()` + progreso (espejo de `getScanStatus` de boahaus /
     el status-poll de Hermes). Documentado con `@swagger`.

4. **Producer one-shot** (opcional, como `hub-backfill.ts`): para forzar un sync
   completo manual sin pasar por el handler.

**Por qué esto y no SSE/event-bus:** Hermes y boahaus usan pub/sub+SSE porque hay
un cliente humano esperando el resultado en vivo. Aquí el consumidor del sync es
el mapa público vía las tablas — no hay un cliente bloqueado esperando. Status-poll
admin basta. (Audit §4 "lo que mapa NO necesita copiar".) **YAGNI el event bus.**

Salida: PR `refactor/sync-to-queue`. Es el PR grande; requiere diseño revisado.

### Fase 4 — Robustez de la capa de colas (DLQ, safety-net, observabilidad)

Llevar TODAS las colas al estándar boahaus/Hermes de "crisis-grade".

1. **M-1 — Dead-letter queue + alerting.** En el `failed` final
   (`job.attemptsMade >= job.opts.attempts`) empujar `{queue, jobId, data, reason}`
   a una cola `dead-letter` (o tabla Postgres `dead_jobs`) para inspección/replay.
   Emitir métrica/alerta de tasa de fallos. Aplicar a tables/photos/hub-*/sources.
   Equivale a `CELERY_TASK_ACKS_LATE` + inspección de Hermes, pero explícito.
2. **B-1 — Safety-net de proceso.** `process.on('unhandledRejection'|'uncaughtException')`
   ruidoso en `worker/index.ts` (y entrypoints one-shot). boahaus se auto-marca
   este gap; no lo repitamos.
3. **B-4 — honrar `Retry-After`.** El processor lee `err.retryAfter` (ya parseado
   en `hub/config.ts:164-169`) y `job.moveToDelayed(...)` en vez del backoff fijo.
4. **B-5 — schedulers observables.** Reintentar el registro con backoff o fallar
   el proceso (que k8s reinicie) + readiness/liveness probe en `worker-deployment`.
5. **M-4 — pool: sacar I/O de la transacción.** En `migratePhoto`: claim+stamp en
   txn corta → `fetch`+`R2 PUT` SIN client → write URL en txn corta. Subir `max`
   del pool ≥ suma de concurrencias, o pools por cola. (Hermes/boahaus nunca
   retienen conexión a través de I/O de red.)

Salida: PR `worker/dlq-safety-observability`.

### Fase 5 — Contrato de API uniforme + doc correcta

1. **R-6a — una sola forma de paginación.** Elegir
   `{ items, total, page, pageSize, totalPages }` (offset, lo que ya usa missing)
   o `{ items, hasMore, nextCursor }` (cursor, lo que usa patients/search).
   **Recomendación:** cursor para listas que crecen sin techo (missing, hub,
   chat, reports), offset solo donde el total importa para UI de páginas.
   Estandarizar y migrar.
2. **R-6d — paginar `/api/reports` y `/api/chat`** (cursor + límite expuesto).
3. **R-5 — corregir enum Swagger de `hub/reports`** a los 5 valores reales.
4. **R-6b — añadir `nationality` al schema `MissingPerson`** en `lib/swagger.ts`.
5. **R-6c — poblar o quitar `states: null`** de hospitales.
6. **R-2 — default `limit` de hospitales 500→50** o exigir explícito.
7. **R-7 — `/api/missing/map`: exigir bbox o bajar default**; considerar
   clustering server-side.
8. **A-1 — sacar el seed de hospitales del request path** a migración/worker;
   mientras, INSERT multi-fila único (copiar `upsertExternalMissingBatch`).
9. **M-6 — consolidar los 5 parsers de data-URI** en `lib/image.ts` con un único
   `ALLOWED_MIME`; rechazar svg inline.

Salida: PRs `api/pagination-contract`, `api/swagger-and-defaults`,
`refactor/image-parser`.

## 4. Orden de ejecución y dependencias

```
Fase 0 (seguridad)  ──┐  (independiente, primero)
Fase 1 (loop)        ─┼─ (independientes entre sí, en paralelo)
Fase 2 (índices)     ─┘
Fase 3 (sync→cola)  ──── depende de nada nuevo (la cola se modela sola), pero
                          conviene tras Fase 4-DLQ para no encolar sin red.
Fase 4 (DLQ/robustez) ── habilita Fase 3 con seguridad; hacer M-1+B-1 ANTES de 3.
Fase 5 (contrato)   ──── independiente; se puede intercalar.
```

**Secuencia recomendada de PRs:**
1. `fix/security-quick-wins` (Fase 0)
2. `perf/request-path-nonblocking` (Fase 1)
3. `db/missing-search-and-upsert-indexes` (Fase 2)
4. `worker/dlq-safety-observability` (Fase 4: M-1, B-1 primero)
5. `refactor/sync-to-queue` (Fase 3, el grande)
6. `api/*` (Fase 5, intercalable)

## 5. Riesgos y mitigaciones

- **Migración de índices con lock (A-2).** GIN sobre 67k filas puede lockear.
  Mitigar con `CREATE INDEX CONCURRENTLY` en migración dedicada fuera de la
  transacción del migrador, o ventana de bajo tráfico. Decidir en el PR.
- **Mover sync a worker cambia el trigger.** Hoy lo dispara el cron de Vercel; el
  worker corre 24/7 en k3s. Verificar que el scheduler arranca (B-5) antes de
  apagar el cron, o el sync se detiene en silencio. Rollout: scheduler ON +
  monitorear una corrida + recién entonces cron OFF.
- **DLQ no debe tragar el dato.** El DLQ es para inspección, no la única copia: el
  rescan por `*_migrated_at IS NULL` / reconcile ya recupera; DLQ es
  observabilidad encima, no reemplazo.
- **Cambio de contrato de paginación rompe el frontend.** Coordinar Fase 5 con
  los consumidores; versionar o migrar endpoint por endpoint, no en un big-bang.

## 6. Definición de "hecho"

- Ningún handler en `app/api/**` con `maxDuration > 60` ni I/O de terceros inline.
- `?q=` y filtros de status responden <300ms a escala actual.
- Toda cola tiene DLQ + alerta de fallos; worker con `unhandledRejection`.
- Sync corre por scheduler (beat) + endpoint admin que encola→202 + status-poll.
- Una sola forma de paginación documentada; Swagger refleja el contrato real
  (enums, `nationality`).
- `npm run lint && npm run build && npm run openapi` verdes; Squawk pasa las
  migraciones nuevas.
