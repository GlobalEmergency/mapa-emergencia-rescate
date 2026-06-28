# Modelo de datos

Esquema de la base de datos (Neon Postgres / Hetzner `app`) del proyecto
**Mapa de Emergencia y Rescate**.

> **Fuente de verdad:** [`infra/db/schema.ts`](../../infra/db/schema.ts) (Drizzle)
> define las **27 tablas** que existen en prod: canónicas activas (reportes,
> personas, hospitales y su acopio `hospital_supply_*` / `hospital_poc_*`,
> donaciones, contadores, sync) + `contact_messages` (ya en Drizzle) +
> `analytics_events`, `damage_candidates`, `unidentified_persons` (legado/externas
> sin código de app, pero presentes en la base) + la federación `hub_*` con el
> hub central (espejo read-only, ver RFC 0002). Si cambias el esquema, edita
> `schema.ts`, corre `npm run db:generate` y luego actualiza este doc.

## Convenciones

Tomadas del código (ver cabecera de `schema.ts`):

- **IDs de texto:** `id TEXT PRIMARY KEY`, generados por la app con
  `crypto.randomUUID()`. Excepción: `sync_runs.id` es `BIGSERIAL`.
- **Marcas de tiempo:** epoch en **milisegundos** guardado como `BIGINT`
  (modo `number`; valores dentro de `Number.MAX_SAFE_INTEGER`).
- **Coordenadas:** `DOUBLE PRECISION` (`lat` / `lng`).
- **`photo_migrated_at`:** marca cuándo la foto se movió a R2. `NULL` = pendiente
  (lo usa el worker de re-hospedaje para reclamar solo filas sin migrar).

## Resumen de tablas

| Tabla | Grupo | PK | Propósito |
| --- | --- | --- | --- |
| `reports` | canónica | `id` | Reportes de emergencia en el mapa |
| `report_confirmations` | canónica | `(report_id, ip_hash)` | Dedup de confirmaciones por IP |
| `missing_persons` | canónica | `id` | Personas desaparecidas / localizadas |
| `chat_messages` | canónica | `id` | Chat ciudadano (con hilos) |
| `hospitals` | canónica | `id` | Hospitales y centros de atención |
| `hospital_patients` | canónica | `id` | Pacientes por hospital (**FK** → hospitals) |
| `hospital_supply_statuses` | canónica | `id` | Estado de insumos por hospital (**FK** → hospitals) |
| `hospital_supply_needs` | canónica | `id` | Necesidades de insumos por hospital (**FK** → hospitals) |
| `hospital_supply_help_requests` | canónica | `id` | Pedidos de ayuda del hospital (**FK** → hospitals) |
| `hospital_poc_assignments` | canónica | `id` | POC asignado al hospital (**FK** → hospitals) |
| `hospital_supply_events` | canónica | `id` | Bitácora de eventos de acopio (**FK** → hospitals) |
| `donations` | canónica | `id` | Donaciones registradas |
| `click_counters` | canónica | `key` | Contadores de clics agregados |
| `click_counter_dedup` | canónica | `(counter_key, ip_hash)` | Dedup de clics por IP |
| `geocode_cache` | canónica | `normalized_key` | Caché de geocodificación |
| `sync_state` | canónica | `source` | Estado de paginación de cada sync |
| `sync_runs` | canónica | `id` | Bitácora de ejecuciones de sync |
| `contact_messages` | canónica | `id` | Bandeja de contacto (admin) |
| `analytics_events` | legado/externa | `id` | Eventos de analítica (sin código de app) |
| `damage_candidates` | legado/externa | `id` | Candidatos de daño estructural (sin código) |
| `unidentified_persons` | legado/externa | `id` | Personas no identificadas (sin código) |
| `hub_missing_persons` | federación | `id` | Espejo read-only de desaparecidos del hub |
| `hub_checkins` | federación | `id` | Espejo read-only de check-ins del hub |
| `hub_help_requests` | federación | `id` | Espejo read-only de pedidos de ayuda del hub |
| `hub_help_offers` | federación | `id` | Espejo read-only de ofertas de ayuda del hub |
| `hub_damaged_buildings` | federación | `id` | Espejo read-only de edificios dañados del hub |
| `hub_sync_state` | federación | `type` | Cursor de paginación por tipo del hub |

---

## Tablas canónicas (`infra/db/schema.ts`)

### `reports`

Reportes de emergencia que se muestran en el mapa.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `type` | TEXT | no | — | Tipo de marcador |
| `lat` | DOUBLE PRECISION | no | — | |
| `lng` | DOUBLE PRECISION | no | — | |
| `place` | TEXT | no | — | Nombre/dirección |
| `affected` | INTEGER | no | `0` | Personas afectadas |
| `needs` | TEXT | no | `''` | |
| `photo` | TEXT | sí | — | base64 o URL del CDN tras migrar |
| `confirmations` | INTEGER | no | `0` | |
| `created_at` | BIGINT | no | — | epoch-ms |
| `photo_migrated_at` | BIGINT | sí | — | `NULL` = foto sin migrar a R2 |

Índices: `idx_reports_created_at (created_at DESC)`;
`idx_reports_photo_pending (id) WHERE photo_migrated_at IS NULL AND photo IS NOT NULL`.

### `report_confirmations`

Dedup de confirmaciones de un reporte por IP (append-only).

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `report_id` | TEXT | no | — | PK compuesta · *lógico* → `reports.id` |
| `ip_hash` | TEXT | no | — | PK compuesta |
| `created_at` | BIGINT | no | — | epoch-ms |

PK: `(report_id, ip_hash)`.

### `missing_persons`

Personas desaparecidas y localizadas (incluye registros importados por sync).

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `name` | TEXT | no | — | |
| `age` | INTEGER | sí | — | |
| `nationality` | TEXT | no | `''` | |
| `description` | TEXT | no | `''` | |
| `last_seen` | TEXT | no | `''` | |
| `contact` | TEXT | no | `''` | |
| `photo` | TEXT | sí | — | base64 o URL del CDN tras migrar |
| `status` | TEXT | no | `'active'` | `active` / `found` |
| `resolution_note` | TEXT | sí | — | |
| `resolution_photo` | TEXT | sí | — | Foto-prueba al localizar |
| `resolved_at` | BIGINT | sí | — | epoch-ms |
| `external_id` | TEXT | sí | — | ID en la fuente externa |
| `source` | TEXT | sí | — | Fuente del registro |
| `source_url` | TEXT | sí | — | |
| `photo_external_url` | TEXT | sí | — | Foto alojada externamente |
| `lat` | DOUBLE PRECISION | sí | — | |
| `lng` | DOUBLE PRECISION | sí | — | |
| `created_at` | BIGINT | no | — | epoch-ms |
| `photo_migrated_at` | BIGINT | sí | — | cubre `photo` y `photo_external_url` |

Índices: `idx_missing_status_created (status, created_at DESC)`;
`idx_missing_map_coords (lat, lng)`;
`idx_missing_photo_pending (id) WHERE photo_migrated_at IS NULL AND (photo IS NOT NULL OR photo_external_url IS NOT NULL)`;
`missing_persons_source_external_id_idx (source, external_id) UNIQUE WHERE external_id IS NOT NULL`
(árbitro del `ON CONFLICT` del upsert de registros externos).

### `chat_messages`

Chat ciudadano con soporte de respuestas e hilos (auto-referencia lógica).

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `name` | TEXT | no | `'Anónimo'` | |
| `role` | TEXT | no | `'ciudadano'` | |
| `text` | TEXT | no | — | |
| `reply_to` | TEXT | sí | — | *lógico* → `chat_messages.id` |
| `reply_preview` | TEXT | sí | — | |
| `thread_root_id` | TEXT | sí | — | *lógico* → `chat_messages.id` |
| `thread_bumped_at` | BIGINT | sí | — | epoch-ms |
| `created_at` | BIGINT | no | — | epoch-ms |

Índices: `idx_chat_thread_bumped (thread_bumped_at DESC)`;
`idx_chat_reply (reply_to)`.

> Prod conserva 3 columnas legado en desuso (`reply_to_id`, `reply_to_name`,
> `reply_to_text`), sustituidas por `reply_to` / `reply_preview`. Se omiten del
> esquema Drizzle a propósito.

### `hospitals`

Hospitales y centros de atención.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `external_id` | TEXT | sí | — | único WHERE NOT NULL |
| `name` | TEXT | no | — | |
| `facility_type` | TEXT | no | `'hospital'` | |
| `state` | TEXT | no | `''` | |
| `municipality` | TEXT | no | `''` | |
| `address` | TEXT | no | `''` | |
| `level` | TEXT | sí | — | |
| `priority_zone` | TEXT | no | `'P3'` | |
| `is_priority` | BOOLEAN | no | `false` | |
| `created_at` | BIGINT | no | — | epoch-ms |

Índices: `idx_hospitals_external (external_id) UNIQUE WHERE external_id IS NOT NULL`;
`idx_hospitals_state (state, priority_zone, name)`.

### `hospital_patients`

Pacientes asociados a un hospital. Una de las **6 FK reales** del esquema, todas
hacia `hospitals.id` con `ON DELETE CASCADE`.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `hospital_id` | TEXT | no | — | **FK** → `hospitals.id` `ON DELETE CASCADE` |
| `name` | TEXT | no | — | |
| `age` | INTEGER | sí | — | |
| `condition` | TEXT | no | `'unknown'` | |
| `status` | TEXT | no | `'hospitalized'` | |
| `notes` | TEXT | no | `''` | |
| `contact` | TEXT | no | `''` | |
| `admitted_at` | BIGINT | no | — | epoch-ms |
| `updated_at` | BIGINT | no | — | epoch-ms |

Índices: `idx_hospital_patients_hospital (hospital_id, status, admitted_at DESC)`.

### `hospital_supply_statuses`

Estado de cada categoría de insumos de un hospital (semáforo de acopio).
**FK** `hospital_id` → `hospitals.id` `ON DELETE CASCADE`.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `hospital_id` | TEXT | no | — | **FK** → `hospitals.id` `ON DELETE CASCADE` |
| `category` | TEXT | no | — | |
| `status` | TEXT | no | `'unknown'` | |
| `public_note` | TEXT | no | `''` | Nota visible al público |
| `restricted_note` | TEXT | no | `''` | Nota interna/restringida |
| `stale_after_hours` | INTEGER | no | `12` | Umbral de "dato viejo" |
| `last_updated_at` | BIGINT | no | — | epoch-ms |
| `last_confirmed_at` | BIGINT | no | — | epoch-ms |
| `updated_by` | TEXT | no | `'equipo_operativo'` | |
| `source` | TEXT | no | `'admin_panel'` | |
| `created_at` | BIGINT | no | — | epoch-ms |

Índices: `idx_hospital_supply_status_unique (hospital_id, category) UNIQUE`;
`idx_hospital_supply_status_stale (category, status, last_confirmed_at)`;
`idx_hospital_supply_status_hospital (hospital_id)`.

### `hospital_supply_needs`

Necesidades puntuales de insumos por hospital. **FK** `hospital_id` →
`hospitals.id` `ON DELETE CASCADE`.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `hospital_id` | TEXT | no | — | **FK** → `hospitals.id` `ON DELETE CASCADE` |
| `category` | TEXT | no | — | |
| `item_type` | TEXT | no | — | |
| `quantity` | INTEGER | sí | — | |
| `unit` | TEXT | no | `''` | |
| `urgency` | TEXT | no | `'yellow'` | |
| `status` | TEXT | no | `'active'` | |
| `public_note` | TEXT | no | `''` | |
| `restricted_note` | TEXT | no | `''` | |
| `last_confirmed_at` | BIGINT | no | — | epoch-ms |
| `updated_by` | TEXT | no | `'equipo_operativo'` | |
| `source` | TEXT | no | `'admin_panel'` | |
| `created_at` | BIGINT | no | — | epoch-ms |
| `updated_at` | BIGINT | no | — | epoch-ms |

Índices: `idx_hospital_supply_needs_active (hospital_id, status, urgency, updated_at DESC)`;
`idx_hospital_supply_needs_category (category, status)`.

### `hospital_supply_help_requests`

Pedidos de ayuda emitidos por el hospital. **FK** `hospital_id` →
`hospitals.id` `ON DELETE CASCADE`.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `hospital_id` | TEXT | no | — | **FK** → `hospitals.id` `ON DELETE CASCADE` |
| `category` | TEXT | no | — | |
| `message` | TEXT | no | `''` | |
| `urgency` | TEXT | no | `'yellow'` | |
| `status` | TEXT | no | `'open'` | |
| `requested_by` | TEXT | no | `'poc_hospitalario'` | |
| `source` | TEXT | no | `'admin_panel'` | |
| `restricted_note` | TEXT | no | `''` | |
| `created_at` | BIGINT | no | — | epoch-ms |
| `updated_at` | BIGINT | no | — | epoch-ms |

Índices: `idx_hospital_supply_help_open (status, urgency, created_at DESC)`;
`idx_hospital_supply_help_hospital (hospital_id)`.

### `hospital_poc_assignments`

Punto de contacto (POC) asignado a un hospital. **FK** `hospital_id` →
`hospitals.id` `ON DELETE CASCADE`.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `hospital_id` | TEXT | no | — | **FK** → `hospitals.id` `ON DELETE CASCADE` |
| `display_name` | TEXT | no | `'POC hospitalario'` | |
| `role` | TEXT | no | `'hospital_poc'` | |
| `restricted_contact` | TEXT | no | `''` | Contacto interno/restringido |
| `access_token_hash` | TEXT | no | `''` | Hash del token de acceso del POC |
| `active` | BOOLEAN | no | `true` | |
| `created_at` | BIGINT | no | — | epoch-ms |
| `updated_at` | BIGINT | no | — | epoch-ms |

Índices: `idx_hospital_poc_assignments_hospital (hospital_id, active)`;
`idx_hospital_poc_assignments_token (hospital_id, access_token_hash, active)`.

### `hospital_supply_events`

Bitácora de acciones sobre el acopio de un hospital. **FK** `hospital_id` →
`hospitals.id` `ON DELETE CASCADE`.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `hospital_id` | TEXT | no | — | **FK** → `hospitals.id` `ON DELETE CASCADE` |
| `category` | TEXT | sí | — | |
| `entity_type` | TEXT | no | — | |
| `entity_id` | TEXT | sí | — | |
| `action` | TEXT | no | — | |
| `actor` | TEXT | no | `'equipo_operativo'` | |
| `source` | TEXT | no | `'admin_panel'` | |
| `payload` | JSONB | no | `{}` | |
| `created_at` | BIGINT | no | — | epoch-ms |

Índices: `idx_hospital_supply_events_hospital (hospital_id, created_at DESC)`;
`idx_hospital_supply_events_entity (entity_type, entity_id)`.

### `donations`

Donaciones registradas (append-only en la práctica; ver `worker/tables.ts`).

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `name` | TEXT | no | — | |
| `amount_usd` | INTEGER | no | — | en centavos |
| `ip_hash` | TEXT | sí | — | |
| `user_agent` | TEXT | sí | — | |
| `created_at` | BIGINT | no | — | epoch-ms |
| `status` | TEXT | no | `'intent'` | ciclo de vida; el código no lo muta hoy |

Índices: `donations_created_at_idx (created_at DESC)`.

> Nota: `status` existe en prod y ya está en el esquema Drizzle. Hoy el código
> nunca lo actualiza (insert-only), por eso `worker/tables.ts` la migra como
> append-only (`ignore`). Si se agrega un flujo que mute `status`, cambia su
> política de migración a `update`.

### `click_counters`

Contadores de clics agregados.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `key` | TEXT | no | — | PK |
| `count` | INTEGER | no | `0` | |

### `click_counter_dedup`

Dedup de clics por IP (append-only).

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `counter_key` | TEXT | no | — | PK compuesta · *lógico* → `click_counters.key` |
| `ip_hash` | TEXT | no | — | PK compuesta |
| `created_at` | BIGINT | no | — | epoch-ms |

PK: `(counter_key, ip_hash)`.

### `geocode_cache`

Caché de geocodificación de lugares.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `normalized_key` | TEXT | no | — | PK |
| `lat` | DOUBLE PRECISION | no | — | |
| `lng` | DOUBLE PRECISION | no | — | |
| `label` | TEXT | no | `''` | |
| `updated_at` | BIGINT | no | — | epoch-ms |

### `sync_state`

Estado de paginación por fuente de sincronización.

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `source` | TEXT | no | — | PK |
| `next_page` | INTEGER | no | `1` | |
| `total_pages` | INTEGER | sí | — | |
| `last_run_at` | BIGINT | sí | — | epoch-ms |
| `last_cycle_completed_at` | BIGINT | sí | — | epoch-ms |
| `updated_at` | BIGINT | no | — | epoch-ms |

### `sync_runs`

Bitácora de ejecuciones de sync (append-only).

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | BIGSERIAL | no | seq | PK |
| `source` | TEXT | no | — | |
| `trigger` | TEXT | sí | — | |
| `ok` | BOOLEAN | no | — | |
| `fetched` | INTEGER | no | `0` | |
| `inserted` | INTEGER | no | `0` | |
| `updated` | INTEGER | no | `0` | |
| `skipped` | INTEGER | no | `0` | |
| `errors` | INTEGER | no | `0` | |
| `from_page` | INTEGER | sí | — | |
| `to_page` | INTEGER | sí | — | |
| `next_page` | INTEGER | sí | — | |
| `cycle_completed` | BOOLEAN | sí | — | |
| `error` | TEXT | sí | — | |
| `duration_ms` | INTEGER | no | `0` | |
| `started_at` | BIGINT | no | — | epoch-ms |
| `finished_at` | BIGINT | no | — | epoch-ms |

Índices: `idx_sync_runs_started (started_at DESC)`.

---

## Tablas adicionales (admin / legado)

> Estas tablas ya están en `infra/db/schema.ts`. `contact_messages` es la
> bandeja de contacto del panel admin; las otras 3 son legado/externas sin
> código de app (presentes solo porque existen en prod y la migración las copia).

### `contact_messages`

Bandeja de contacto del panel admin. Definida en `infra/db/schema.ts` y
consumida por [`lib/contact-inbox.ts`](../../lib/contact-inbox.ts) vía Drizzle
(ya no usa `CREATE TABLE IF NOT EXISTS` en runtime).

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `id` | TEXT | no | — | PK |
| `name` | TEXT | no | — | |
| `email` | TEXT | no | — | |
| `subject` | TEXT | no | — | |
| `message` | TEXT | no | — | |
| `read` | BOOLEAN | no | `false` | |
| `ip_hash` | TEXT | sí | — | |
| `created_at` | BIGINT | no | — | epoch-ms |

Índices: `contact_messages_created_at_idx (created_at DESC)`;
`contact_messages_unread_idx (read, created_at DESC)`.

### `analytics_events` — legado/externa (sin código de app)

Presente en la fuente Neon y copiada por la migración; sin referencias en el
código de la app. Definición tomada de la base.

| Columna | Tipo | Nulo | Notas |
| --- | --- | --- | --- |
| `id` | TEXT | no | PK |
| `session_id` | TEXT | no | |
| `type` | TEXT | no | |
| `path` | TEXT | no | |
| `label` | TEXT | no | |
| `referrer` | TEXT | no | |
| `user_agent` | TEXT | no | |
| `screen` | TEXT | no | |
| `language` | TEXT | no | |
| `metadata` | JSONB | no | |
| `created_at` | BIGINT | no | epoch-ms |

### `damage_candidates` — legado/externa (sin código de app)

| Columna | Tipo | Nulo | Notas |
| --- | --- | --- | --- |
| `id` | TEXT | no | PK |
| `building_id` | TEXT | no | |
| `name` | TEXT | no | |
| `lat` | DOUBLE PRECISION | no | |
| `lng` | DOUBLE PRECISION | no | |
| `damage_level` | TEXT | no | |
| `confidence` | DOUBLE PRECISION | no | |
| `review_status` | TEXT | no | |
| `source_before` | TEXT | no | |
| `source_after` | TEXT | no | |
| `source_url` | TEXT | no | |
| `notes` | TEXT | no | |
| `created_at` | BIGINT | no | epoch-ms |
| `updated_at` | BIGINT | no | epoch-ms |

### `unidentified_persons` — legado/externa (sin código de app)

| Columna | Tipo | Nulo | Notas |
| --- | --- | --- | --- |
| `id` | TEXT | no | PK |
| `status` | TEXT | no | |
| `name` | TEXT | no | |
| `surname` | TEXT | no | |
| `location_found` | TEXT | no | |
| `description` | TEXT | no | |
| `contact_name` | TEXT | no | |
| `contact_phone` | TEXT | no | |
| `photo` | TEXT | sí | |
| `created_at` | BIGINT | no | epoch-ms |

---

## Federación con el hub central (`hub_*`)

Espejo **read-only** de los datos de otros sitios socios traídos del hub central
"Venezuela Ayuda" (ver [`docs/rfcs/0002-federacion-hub-venezuela-ayuda.md`](../rfcs/0002-federacion-hub-venezuela-ayuda.md)).
Una tabla por tipo del hub; nunca se mezclan con las tablas nativas.

Columnas comunes (`hubCommon`) en todas las `hub_*` salvo `hub_sync_state`:
`id` (PK), `hub_id` (uuid del hub, **UNIQUE** → idempotencia del upsert),
`source`, `external_id`, `city`, `lat`, `lng`, `hub_created_at` (ISO del hub),
`ingested_at`, `updated_at`. Los tipos con foto agregan `photo_external_url`,
`photo_url`, `photo_migrated_at` (NULL = pendiente) y `photo_broken`.

| Tabla | Foto | Campos propios |
| --- | --- | --- |
| `hub_missing_persons` | sí | `name`, `status`, `message`, `place_name` |
| `hub_checkins` | sí | `name`, `status`, `message`, `place_name` |
| `hub_help_requests` | no | `category`, `description`, `urgency`, `status`, `place_name` |
| `hub_help_offers` | no | `category`, `description`, `availability`, `available` |
| `hub_damaged_buildings` | sí | `place_name`, `name`, `description`, `severity` |

Índices: cada tabla tiene `idx_hub_<tipo>_hubid (hub_id) UNIQUE` y
`idx_hub_<tipo>_source (source)`; `hub_missing_persons` añade
`idx_hub_missing_photo_pending (id) WHERE photo_migrated_at IS NULL AND photo_external_url IS NOT NULL`.

### `hub_sync_state`

Cursor de paginación por tipo del hub (equivalente a `sync_state` para la
federación).

| Columna | Tipo | Nulo | Default | Notas |
| --- | --- | --- | --- | --- |
| `type` | TEXT | no | — | PK (`missing_person`, `checkin`, …) |
| `cursor` | TEXT | sí | — | último `next_cursor` visto (NULL = desde el inicio) |
| `last_run_at` | BIGINT | sí | — | epoch-ms |
| `cycle_completed_at` | BIGINT | sí | — | epoch-ms |

---

## Relaciones

- **FK reales (6, todas → `hospitals.id` con `ON DELETE CASCADE`):**
  `hospital_patients`, `hospital_supply_statuses`, `hospital_supply_needs`,
  `hospital_supply_help_requests`, `hospital_poc_assignments` y
  `hospital_supply_events`, cada una por su columna `hospital_id`.
- **Relaciones lógicas (no forzadas por FK):**
  - `report_confirmations.report_id` → `reports.id`
  - `click_counter_dedup.counter_key` → `click_counters.key`
  - `chat_messages.reply_to` / `thread_root_id` → `chat_messages.id` (auto-ref)
  - `sync_state.source` / `sync_runs.source` comparten el espacio de "fuentes",
    sin clave foránea entre sí.

El resto de las tablas son independientes (sin relaciones).

### Diagrama (Mermaid)

> `(FK)` = clave foránea real; `(logico)` = relación lógica no forzada por la
> base de datos. Mermaid `erDiagram` solo dibuja líneas sólidas; la distinción
> va en la etiqueta.

```mermaid
erDiagram
    hospitals ||--o{ hospital_patients : "tiene (FK)"
    hospitals ||--o{ hospital_supply_statuses : "acopio (FK)"
    hospitals ||--o{ hospital_supply_needs : "necesita (FK)"
    hospitals ||--o{ hospital_supply_help_requests : "pide (FK)"
    hospitals ||--o{ hospital_poc_assignments : "POC (FK)"
    hospitals ||--o{ hospital_supply_events : "bitacora (FK)"
    reports ||--o{ report_confirmations : "confirma (logico)"
    click_counters ||--o{ click_counter_dedup : "dedup (logico)"
    chat_messages ||--o{ chat_messages : "hilo (logico)"

    reports {
        string id PK
        string type
        float lat
        float lng
        string place
        int affected
        string needs
        string photo
        int confirmations
        bigint created_at
        bigint photo_migrated_at
    }
    report_confirmations {
        string report_id PK
        string ip_hash PK
        bigint created_at
    }
    missing_persons {
        string id PK
        string name
        int age
        string status
        string photo
        string photo_external_url
        float lat
        float lng
        bigint created_at
        bigint photo_migrated_at
    }
    chat_messages {
        string id PK
        string name
        string role
        string text
        string reply_to
        string thread_root_id
        bigint thread_bumped_at
        bigint created_at
    }
    hospitals {
        string id PK
        string external_id
        string name
        string facility_type
        string state
        bool is_priority
        bigint created_at
    }
    hospital_patients {
        string id PK
        string hospital_id FK
        string name
        int age
        string condition
        string status
        bigint admitted_at
        bigint updated_at
    }
    click_counters {
        string key PK
        int count
    }
    click_counter_dedup {
        string counter_key PK
        string ip_hash PK
        bigint created_at
    }
```

> El diagrama muestra solo las tablas **con relaciones**. Las demás
> (`donations`, `geocode_cache`, `sync_state`, `sync_runs`, `contact_messages`,
> `analytics_events`, `damage_candidates`, `unidentified_persons` y la familia
> `hub_*` de federación) son independientes a nivel de FK; sus columnas están en
> las secciones de arriba.
