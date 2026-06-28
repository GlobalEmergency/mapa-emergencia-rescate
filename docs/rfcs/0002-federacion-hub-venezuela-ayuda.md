> Estado: propuesta · Autor: equipo · Relacionado: integración con el hub
> central "Venezuela Ayuda" (https://terremoto.hazlohoy.org)

# RFC 0002 — Federación con el hub central (ingesta async)

## Contexto

Existe un **hub central** ("Venezuela Ayuda", `terremoto.hazlohoy.org`) que
unifica reportes de varios sitios socios tras el terremoto. Expone una API
OpenAPI 3.1 con **un recurso** (`reports`) y **5 tipos** cerrados:
`missing_person`, `checkin`, `help_request`, `help_offer`, `damaged_building`.

- **Lectura** `GET /api/v1/reports?type=…` es **abierta** (sin API key), sin PII.
- **Escritura** `POST`/`PATCH` requiere `x-api-key` (emitida por el equipo del hub).
- Paginación por **cursor estable**: orden `created_at` asc, desempate por `id`;
  el parámetro `since` recibe el `next_cursor` anterior (o un ISO suelto).
- **Rate limit:** ~120 req / 60 s por socio (best-effort), máx 200 por request,
  respeta `Retry-After` en 429.
- `Cache-Control: max-age=0` → el hub **no cachea**: cada lectura pega su BD.

### Hallazgos medidos contra la API en vivo (no supuestos)

- Volúmenes por tipo: `missing_person`, `help_offer`, `damaged_building`
  ≥ 40 000 c/u; `checkin` 156; `help_request` 95.
- **Ya somos fuente del hub**: ~37 k `damaged_building` (`terremotovenezuela.com`)
  y 42 `help_request` (`terremotovenezuela.app`). Re-ingerir todo crearía un
  **bucle de eco** (nuestros datos volviendo a entrar). → hay que **excluir
  nuestras propias `source`** al consumir.
- **Imágenes:** el `photo_url` es una URL externa por socio (Supabase de cada
  uno). **Se rompen**: el bucket de `damaged_building` devuelve 404 "Bucket not
  found" (100 % muerto en la muestra). → hay que **copiar a R2**, nunca
  hotlinkear.
- **Cross de imágenes (medido):** de 3 000 `missing_person` del hub, 825 sin
  foto → de esos, nosotros solo tenemos foto para 15 (**1.8 %**). Recuperar
  fotos hacia el hub **no vale la pena**. El match por nombre normalizado da
  99.5 % (misma población), con 8.5 % de ambigüedad (nombres repetidos).
- **`since` es por `created_at`, NO `updated_at`** → se pueden traer registros
  **nuevos** baratos, pero **las ediciones in-place (status, foto tardía) son
  invisibles** a un scan incremental. Implica una pasada de **reconciliación**.

## Decisión

Consumir el hub con **ingesta asíncrona** (workers BullMQ), **no** en el camino
de request, escribiendo a **tablas propias separadas** (`hub_*`) servidas por
**endpoints nuevos** (`/api/hub/*`). Las tablas y endpoints nativos **no se
tocan** (evita duplicación y contaminación de provenance).

### Por qué tablas separadas y no proyectar a las nuestras

Somos 37 k de su `damaged_building`: proyectar el hub a nuestras tablas
re-importaría nuestros propios registros. Mantenerlo en `hub_*` hace imposible
la duplicación, conserva provenance, deja los endpoints nativos intactos y
permite "apagar la federación" tirando una tabla.

### Modelo de datos: una tabla por tipo (espeja sus DTOs `*Public`)

5 tablas nuevas, columnas tipadas según el DTO de lectura del hub + columnas de
federación e imagen:

| Tabla | Tipo hub |
|---|---|
| `hub_missing_persons` | `missing_person` |
| `hub_checkins` | `checkin` |
| `hub_help_requests` | `help_request` |
| `hub_help_offers` | `help_offer` |
| `hub_damaged_buildings` | `damaged_building` |

Columnas comunes a todas: `hub_id` (uuid del hub, **único** → idempotencia),
`source`, `external_id`, `city`, `lat`, `lng`, `created_at`, `ingested_at`,
`updated_at`. Imagen (mismo patrón que nuestras tablas):
`photo_external_url` (la del hub), `photo_url` (R2 tras copiar),
`photo_migrated_at`, `photo_broken` (cuando la fuente da 404).

> Un **socio nuevo** = nuevas filas con otra `source` → **cero migraciones**.
> Un **tipo nuevo** = migración, pero el catálogo es **cerrado en 5**.

### Topología de colas (BullMQ sobre Valkey)

| Cola | Para qué | Rate limit |
|---|---|---|
| `hub-ingest` | paginar el hub → upsert `hub_*` | presupuesto del hub (120/60s) |
| `hub-images` | copiar `photo_url` → R2 | gentil con Supabase (como `migrate-photos`) |
| `dead-letter` | jobs agotados (reintentos) | — |

Misma Valkey y mismo node-pool de workers que la migración; colas separadas =
aislamiento de rate-limit/prioridad, no hardware distinto. Idempotencia por
`hub_id` + jobIds deterministas (reintentar es no-op). Reintentos con backoff
exponencial; `UnrecoverableError` para fallos permanentes (400/auth).

### Los 3 jobs de sincronización

1. **Backfill (una vez):** `worker/hub-backfill.ts` (productor one-shot, como
   `worker/enqueue.ts`) → un job por tipo, pagina desde `since=null` hasta
   `next_cursor=null`, upsert, encola copia de imagen. **Reanudable** (cursor en
   `hub_sync_state`), **idempotente**.
2. **Incremental (cada 5 min):** BullMQ **Job Scheduler** (equivalente a Celery
   Beat) → `since` = último cursor → solo registros **nuevos**. Barato.
3. **Reconciliación (cada 6 h):** re-scan completo + upsert idempotente → única
   forma de captar **ediciones** (status/foto), porque `since` es `created_at`.

> **Cadencia:** 5 min incremental (no cada minuto — gastaría el presupuesto sin
> ganar frescura real para datos de otros sitios), 6 h reconciliación,
> imágenes continuas y rate-limited.

### Imágenes

Toda foto ingerida se copia a R2 (reusa `worker/r2.ts`); `/api/hub/*` sirve la
URL de R2 (o 302), nunca el Supabase del socio. Fuente muerta (404) → marca
`photo_broken` y placeholder. El cross de fotos hacia el hub se **descarta**
(1.8 % de rendimiento medido).

### Cómputo / escalado

Workers en un **node-pool dedicado** del clúster k3s (taint/affinity), no un
clúster ni VPS aparte. Para I/O (fetch + upsert) se escala por **concurrencia**,
no por nº de procesos: ~2–4 procesos × 100–200 concurrencia. El cuello es el
rate-limit del hub + IOPS de Postgres, no la RAM. Escalar = sumar un nodo al
pool (BullMQ balancea).

### Llamadas externas asíncronas (futuro)

"AI inference" = llamar una API externa y esperar 20–30 s = **job I/O lento**,
misma clase. Si se añade, va en su propia cola (`external-calls`) por su propio
rate-limit, con `lockDuration` > tiempo de respuesta para que BullMQ no
mate+reintente (y duplique el cobro).

## Consecuencias

- **+5 tablas** `hub_*`, **+endpoints** `/api/hub/*`, **+2 colas** y schedulers
  BullMQ, **+1 productor** de backfill. Nativo intacto.
- La frescura de datos de socios es de **minutos**, no realtime (aceptable; si
  hiciera falta realtime, la solución correcta es pedir **webhooks** al hub, no
  pollear más rápido).
- Se requiere la pasada de reconciliación porque la API es append-cursor
  (`created_at`); sin ella, los cambios de estado (p. ej. "encontrado") nunca se
  reflejarían — bug crítico en contexto humanitario.
- Sin secretos en el código; sin PII (la lectura del hub ya viene sin PII).
