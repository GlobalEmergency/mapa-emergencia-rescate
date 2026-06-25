# RFC: Sincronización automática de fuentes de desaparecidos

> Estado: propuesta · Autor: (contribuidor externo) · Relacionado: issue #1 (sync PFIF)

## 1. Problema

Hoy la integración de otros sitios de desaparecidos es **manual**: alguien
scrapea una fuente externa a un JSON y corre `scripts/import-missing.mjs`. Esto:

- no escala (depende de que un humano lo corra),
- queda desactualizado entre corridas,
- asume **un solo formato** de entrada (un JSON con una forma fija),
- no deja rastro de qué se sincronizó ni cuándo.

Queremos un **sistema automatizado y abierto a múltiples fuentes** que mantenga
`missing_persons` al día consumiendo las plataformas que ya existen
(p. ej. `desaparecidosterremotovenezuela.com`, el futuro feed PFIF de este mismo
mapa, etc.), **sin re-fragmentar** el esfuerzo y **respetando** a las fuentes.

## 2. Lo que el repo ya tiene (no reinventar)

- Tabla `missing_persons` con columnas multi-fuente: `external_id`
  (índice único parcial), `source`, `source_url`, `photo_external_url`,
  `lat`, `lng`, además de `status`/`resolution_*`.
- Upsert idempotente por `external_id` (`scripts/import-missing.mjs`).
- Geocodificación con caché Nominatim (`scripts/geocode-missing-locations.mjs`).
- Auth admin: `ADMIN_PASSWORD` + header `x-admin-token` (`lib/admin.ts`).
- Acceso a DB unificado: `getSql()` / `hasDbEnv()` (`lib/db.ts`).

**La pieza que falta es el *fetch* automático + la *abstracción de fuentes* +
*scheduling* + *observabilidad*.** El almacenamiento ya está resuelto.

## 3. Arquitectura

### 3.1 Modelo canónico de entrada

Cada fuente produce el mismo tipo normalizado; el motor no sabe de dónde vino:

```ts
// lib/sync/types.ts
export interface ExternalPerson {
  externalId: string;          // único DENTRO de la fuente
  source: string;              // id de la fuente, ej. "desaparecidosterremotovenezuela.com"
  sourceUrl?: string | null;   // link al registro original
  name: string;
  age?: number | null;
  lastSeen?: string;           // texto de ubicación
  description?: string;
  contact?: string | null;     // ver §6 (privacidad)
  photoUrl?: string | null;    // absoluta
  status: "active" | "found";
  resolutionNote?: string | null;
  resolvedAt?: number | null;  // epoch ms
  createdAt?: number;          // epoch ms
  updatedAt?: number;          // epoch ms (watermark incremental)
}
```

**Decisión (revisada tras validar contra datos reales): unicidad por
`(source, external_id)`, NO namespacing.** Los `external_id` ya importados
manualmente se guardaron CRUDOS (ej. `p8fd01c513881`). Si namespáramos
(`source:rawId`) no harían match y la sync DUPLICARÍA ~33k filas en vez de
actualizarlas. En cambio, guardamos el `external_id` crudo y movemos la unicidad
a un índice compuesto parcial `(source, external_id) WHERE external_id IS NOT
NULL`. Así dos fuentes pueden reusar el mismo id sin chocar, y los datos
existentes siguen funcionando. La migración en prod es solo un *swap de índice*
(crear el compuesto, soltar el viejo de solo `external_id`) — `ensureSchema` lo
aplica solo. Confirmado read-only contra prod: los ids de la API coinciden 20/20
con los `external_id` ya importados.

### 3.2 Adaptador de fuente (el punto de extensión)

```ts
// lib/sync/types.ts
export interface SourceAdapter {
  readonly id: string;                 // "desaparecidosterremotovenezuela.com"
  readonly label: string;
  readonly kind: "json-api" | "pfif" | "html";
  /** Trae los registros de la fuente, ya normalizados. */
  fetchAll(ctx: FetchCtx): Promise<ExternalPerson[]>;
}
```

Cada adaptador encapsula: URL/endpoint, la **petición educada** (timeout, gzip,
retry con backoff, `User-Agent` que identifica el proyecto + correo de contacto)
y el **mapeo** de la forma de la fuente a `ExternalPerson`, incluida la
**normalización del vocabulario de estado** (cada sitio nombra distinto el
"localizado").

Adaptadores concretos:

| Adaptador | kind | Fuente |
| --- | --- | --- |
| `DesaparecidosTerremotoAdapter` | `json-api` | `GET /api/personas` → `{items:[…]}` |
| `PfifFeedAdapter` | `pfif` | Feed PFIF de este mapa (issue #1) y cualquier otro PFIF |
| `HtmlScraperAdapter` | `html` | Sitios sin API, **solo con consentimiento** y respetando `robots.txt` |

**Registro de fuentes** (`lib/sync/sources/index.ts`): un array de adaptadores
habilitados, configurado por env (qué fuentes activas, URLs, si se importa el
contacto). Activar una fuente nueva = agregar un archivo + una línea.

#### Mapeo de `desaparecidosterremotovenezuela.com`

`GET .../api/personas?page=N&pageSize=M` →
`{ items, total, page, pageSize, totalPages, counts }`. Paginación por OFFSET
sobre feed vivo: páginas contiguas se solapan (mismo id) → deduplicar por
externalId en cada corrida (el upsert es idempotente igual). Ver §5.

| Campo API | `ExternalPerson` | Nota |
| --- | --- | --- |
| `id` | `externalId` (crudo) | unicidad por (source, external_id) |
| `nombre` | `name` | |
| `edad` | `age` | nullable |
| `ubicacion` | `lastSeen` | |
| `descripcion` | `description` | |
| `foto` | `photoUrl` | absoluta (S3) |
| `contacto` | `contact` | ⚠️ teléfono en claro — ver §6 |
| `estado: "sin-contacto"` | `status: "active"` | |
| `estado: "localizado"` | `status: "found"` (+ `localizadoNota` → `resolutionNote`) | |
| `createdAt` / `updatedAt` | `createdAt` / `updatedAt` | epoch ms |

### 3.3 Motor de sincronización

```ts
// lib/sync/engine.ts
export async function runSync(adapter, { dryRun }): Promise<SyncResult>
export async function runAllSources({ dryRun }): Promise<SyncResult[]>
```

Pipeline por fuente:

1. `adapter.fetchAll()` — con timeout/retry/backoff. Si la fuente está caída,
   se aborta **esa** fuente y se sigue con las demás (no rompe la corrida).
2. Validar + recortar campos. **Se extrae** la lógica de `clip`/`normalizeAge`/
   mapeo de estado del script a `lib/sync/normalize.ts`, compartida por el script
   legacy y el motor (una sola fuente de verdad).
3. Upsert por registro con el mismo `ON CONFLICT (external_id)`. **Se extrae** a
   `lib/missing.ts` como `upsertExternalMissing()` para que cron y script usen
   **un solo camino de escritura**.
4. Acumular contadores: insertados / actualizados / saltados / errores.
5. Registrar la corrida en `sync_runs` (observabilidad, §7).

Geocodificación: una pasada aparte (reusa `lib/sync/geocode.ts`) sobre los
registros nuevos/cambiados sin `lat`/`lng`. Nominatim exige ~1 req/s, así que va
en su **propio cron** con tope por corrida (no bloquea la sync).

### 3.4 Scheduling y disparo

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/sync/cron",    "schedule": "*/15 * * * *" },
    { "path": "/api/sync/geocode", "schedule": "*/10 * * * *" }
  ]
}
```

- **Endpoints cron** (`app/api/sync/cron/route.ts`, `.../geocode/route.ts`):
  Vercel manda `Authorization: Bearer $CRON_SECRET`; el handler lo verifica.
- **Disparo manual admin** (`app/api/sync/run/route.ts`): protegido con el
  `x-admin-token` existente. Permite "Sincronizar ahora" + `?dryRun=1`.
- ⚠️ **Next.js 16**: revisar `node_modules/next/dist/docs` antes de escribir los
  route handlers (firmas cambiaron).

### 3.5 Límite serverless (importante)

Traer 37k+ registros y hacer upsert en **una** invocación puede exceder el
tiempo máximo de función. Estrategias (combinables):

- `export const maxDuration = 300` en el route segment (según plan de Vercel).
- **Sync incremental por watermark**: guardar en `sync_state` el `max(updatedAt)`
  visto por fuente; cada corrida procesa solo lo más nuevo (cuando la fuente lo
  permita filtrar) o, si la fuente solo da todo, hacer upsert acotado por lote y
  comparar un hash de contenido para no reescribir lo igual.
- La fuente expone paginación real (`?page=N&pageSize=M`, hasta 100/pág; ~437
  páginas para 43k). El adaptador la escanea página por página. Pendiente:
  el cuello de botella no es traer las páginas sino los ~43k upserts por corrida
  (chunking / bulk upsert / proceso en background).

## 4. Deduplicación entre fuentes (fase posterior)

`external_id` resuelve duplicados **dentro** de una fuente. La misma persona en
**dos** sitios necesita matching difuso (lo de la issue #1). Propuesta **no
destructiva**:

- No fusionar filas. Agregar tabla `person_links` que **agrupa** registros
  probablemente-iguales (calculado por el motor de dedup: nombre normalizado +
  similitud de ubicación, con **banda de revisión manual**).
- El mapa/lista colapsa los enlazados en una sola ficha.
- Un falso positivo **nunca** borra a nadie (solo desagrupa).

Esto va **después** de que la sync básica funcione (alto valor, bajo riesgo
primero).

## 5. Idempotencia e incremental

- Unicidad por `(source, external_id)` con `external_id` crudo → reimportar no
  duplica (re-correr actualiza; solo entran los genuinamente nuevos).
- `sync_state(source, last_updated_at, last_run_at)` como watermark por fuente.
- El upsert actual usa `COALESCE(existing, new)` para `photo/source/source_url`
  (first-write-wins) y **sí** actualiza `status`/`resolution` → correcto.

## 6. Privacidad y trato a las fuentes (no negociable)

- **Contacto**: la API de la fuente expone **teléfonos en claro** (riesgo de
  extorsión a familias). Flag por fuente `importContact` (default **OFF** para
  registros de terceros). Si se importa, **no** re-exponerlo en feeds públicos
  sin consentimiento del dueño de la fuente. → **confirmar política con los
  maintainers y con `developer@theempire.tech`.**
- **Educación con la fuente**: `User-Agent` identificable (proyecto + correo),
  baja frecuencia, backoff, respetar `robots.txt` en scraping, **nunca** saltar
  auth/401/403. Pedir API antes que scrapear.
- **No espejar masivamente**: sincronizar lo necesario; alinear caducidad.

## 7. Observabilidad

- Tabla `sync_runs(id, source, started_at, finished_at, inserted, updated,
  skipped, errors, ok)`.
- Panel admin: última sync por fuente + contadores + errores + botón
  "Sincronizar ahora".

## 8. Disposición de archivos (encaja en el repo)

```
lib/sync/
  types.ts            # ExternalPerson, SourceAdapter, SyncResult
  normalize.ts        # clip, normalizeAge, mapeo de estado (compartido con el script)
  engine.ts           # runSync(adapter), runAllSources()
  geocode.ts          # geocodificación extraída (compartida con el script)
  state.ts            # sync_state + sync_runs
  sources/
    index.ts          # registro + config por env
    desaparecidos-terremoto.ts
    pfif-feed.ts
    html-scraper.ts
lib/missing.ts        # + upsertExternalMissing() (camino único de escritura)
app/api/sync/cron/route.ts      # sync por cron (CRON_SECRET)
app/api/sync/geocode/route.ts   # geocode por cron (lote acotado)
app/api/sync/run/route.ts       # disparo manual admin (x-admin-token)
vercel.json                     # crons
scripts/import-missing.mjs      # refactor para llamar a lib/sync (opcional)
docs/rfcs/0001-sincronizacion-fuentes.md
```

## 9. Plan por fases

Resumen de estado:

| Fase | Entrega | Estado |
| --- | --- | --- |
| **0** | `lib/sync` (tipos, normalize) + `upsertExternalMissing` (camino único) | ✅ hecho |
| **1** | `DesaparecidosTerremotoAdapter` + motor + disparo admin (`/api/sync/run`) | ✅ hecho |
| **1.5** | Identidad `(source, external_id)` + scan paginado real | ✅ hecho (ADR 0001) |
| **2** | **Upsert por lotes** (desbloquea el sync completo) | ✅ hecho (ADR 0002) |
| **2.5** | Ejecución por chunks (cursor `sync_state`, freno por páginas+tiempo) | ✅ hecho |
| **3** | Cron Vercel + observabilidad (`sync_runs`/`sync_state`) + panel admin | ✅ hecho |
| **4** | Geocodificación automática acotada | ✅ hecho |
| **5** | `PfifFeedAdapter` (consume el feed de la issue #1) | pendiente |
| **6** | Dedup entre fuentes (`person_links` + revisión manual) | pendiente |

### Fase 2 — Upsert por lotes (el desbloqueador) · ADR 0002

Sin esto, un sync de ~43.700 registros tarda ~90 min (123 ms/llamada × N). Con
lotes baja a segundos.

- `upsertExternalMissingBatch(people)` en `lib/missing.ts`: INSERT multi-fila +
  `ON CONFLICT (source, external_id)`, lotes de 500.
- **Deduplicar la clave dentro de cada lote** (quedarse con el último) — Postgres
  falla si la misma `(source, external_id)` aparece dos veces en el lote.
- El motor (`engine.ts`) llama al batch en vez del loop por registro.
- **Aceptación**: sync completo contra copia local en segundos; `inserted`/
  `updated` correctos; 0 grupos duplicados al re-correr.
- **Riesgos**: tope de parámetros (mitigado: 14×500=7.000 ≪ 65.535); fallo de un
  lote → cuenta error y sigue.

### Fase 2.5 — Ejecución por chunks

Con el upsert resuelto, el costo pasa a **traer ~437 páginas**: medido ~10 s por
20 páginas → **~215 s** el scan completo (el write batched es ~5 s). Roza el
`maxDuration = 300` y la API es flaky bajo carga, así que un solo invoke NO es
confiable. Para robustez:

- Cursor por fuente en `sync_state` (última página / watermark `updatedAt`).
- Cada tick de cron procesa un **rango acotado de páginas** y avanza el cursor;
  la próxima continúa. Idempotente → seguro reintentar.
- El disparo manual admin permite forzar un rango (`?limit=`, futuro `?pages=`).
- **Nota de consistencia**: la paginación por offset sobre feed vivo puede
  *saltarse* algún registro entre páginas; el re-scan periódico + idempotencia lo
  resuelven (consistencia eventual). No silenciar: registrar lo barrido.

### Fase 3 — Cron + observabilidad

- `vercel.json`: `/api/sync/cron` (cada 15–30 min) y `/api/sync/geocode`.
- `CRON_SECRET` (`Authorization: Bearer`) en los endpoints de cron.
- Tabla `sync_runs` (corridas: fuente, contadores, duración, ok) y `sync_state`
  (cursor/watermark por fuente).
- Panel admin: últimas corridas + botón "Sincronizar ahora".

### Fase 4 — Geocodificación automática acotada

- 43k registros necesitan `lat/lng` para el mapa; Nominatim exige ~1 req/s, pero
  `geocode_cache` deduplica por ubicación normalizada (muchas menos llamadas).
- Cron propio con **tope por corrida** que solo procesa nuevos/cambiados sin
  coordenadas.

### Fase 5 — Adaptador PFIF

- `PfifFeedAdapter` consume el feed PFIF de la issue #1 (y cualquier otro PFIF).

### Fase 6 — Dedup entre fuentes

- `person_links` (agrupa probables-iguales) + matching difuso (nombre normalizado
  + ubicación, trigram/Levenshtein) con **banda de revisión manual**. No
  destructivo: un falso positivo nunca borra a nadie.

## 10. Variables de entorno nuevas

```
CRON_SECRET=...            # lo inyecta Vercel para autenticar los crons
SYNC_SOURCES=desaparecidos-terremoto   # fuentes habilitadas (csv)
SYNC_USER_AGENT="MapaEmergenciaVE/1.0 (info@terremotovenezuela.app)"
SOURCE_DESAPARECIDOS_URL=https://desaparecidos-terremoto-api.theempire.tech/api/personas
SOURCE_DESAPARECIDOS_IMPORT_CONTACT=false
```
