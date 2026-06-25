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

**Decisión: namespacing del `external_id`.** Para que dos fuentes no choquen
(ambas pueden usar `id="p123"`), se persiste `external_id = "${source}:${rawId}"`.
El índice único actual sigue siendo válido y sabemos siempre de qué fuente salió
cada registro.

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

`GET https://desaparecidos-terremoto-api.theempire.tech/api/personas` →
`{ "items": [ … ] }` (la paginación no se respeta; devuelve todo de golpe → §5).

| Campo API | `ExternalPerson` | Nota |
| --- | --- | --- |
| `id` | `externalId` (namespaced) | único por dominio |
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
- Usar paginación real de la fuente si/ cuando la exponga.

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

- `external_id` namespaced → reimportar no duplica.
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

| Fase | Entrega | Riesgo |
| --- | --- | --- |
| **0** | Extraer upsert + normalize + geocode a `lib/sync` (sin cambio de comportamiento; el script sigue funcionando) | nulo |
| **1** | `DesaparecidosTerremotoAdapter` + `runSync` + disparo manual admin (`/api/sync/run`, con `dryRun`) | bajo |
| **2** | Cron Vercel + `sync_runs` + panel admin | bajo |
| **3** | `PfifFeedAdapter` (consume el feed de la issue #1) | bajo |
| **4** | Dedup entre fuentes (`person_links` + cola de revisión) | medio |

La **Fase 1** ya reemplaza el paso manual de hoy: un admin aprieta un botón
(o corre dry-run) y se sincroniza `desaparecidosterremotovenezuela.com`.

## 10. Variables de entorno nuevas

```
CRON_SECRET=...            # lo inyecta Vercel para autenticar los crons
SYNC_SOURCES=desaparecidos-terremoto   # fuentes habilitadas (csv)
SYNC_USER_AGENT="MapaEmergenciaVE/1.0 (info@terremotovenezuela.app)"
SOURCE_DESAPARECIDOS_URL=https://desaparecidos-terremoto-api.theempire.tech/api/personas
SOURCE_DESAPARECIDOS_IMPORT_CONTACT=false
```
