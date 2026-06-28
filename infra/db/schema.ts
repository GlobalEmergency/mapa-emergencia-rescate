/**
 * Drizzle schema — the single source of truth for the database.
 *
 * This MIRRORS the schema currently created lazily (CREATE TABLE IF NOT EXISTS)
 * across lib/*.ts. The goal of moving it here: make the schema explicit,
 * versioned and reviewable, and let `drizzle-kit` generate real migration
 * files (which the gated migrate Job in infra/k8s/ then applies) instead of
 * relying on scattered runtime DDL.
 *
 * Conventions captured from the existing code:
 *   - String IDs: `id TEXT PRIMARY KEY` (app generates crypto.randomUUID()).
 *   - Timestamps are epoch-MILLISECONDS stored as BIGINT (bigint mode:"number"
 *     — values stay within Number.MAX_SAFE_INTEGER; lib/db.ts already parses
 *     oid 20 as a JS number for driver parity).
 *   - Coordinates: DOUBLE PRECISION (`doublePrecision`).
 *
 * 16 tables total. The only real relation is hospital_patients -> hospitals.
 * (12 canónicas + contact_messages, analytics_events, damage_candidates,
 * unidentified_persons; estas 4 existen en prod aunque parte sean legado.)
 */
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  bigint,
  doublePrecision,
  boolean,
  bigserial,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// epoch-ms timestamp stored as BIGINT, surfaced as a JS number.
const epochMs = (name: string) => bigint(name, { mode: "number" });

/* ------------------------------------------------------------------ reports */
export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    place: text("place").notNull(),
    affected: integer("affected").notNull().default(0),
    needs: text("needs").notNull().default(""),
    photo: text("photo"),
    confirmations: integer("confirmations").notNull().default(0),
    createdAt: epochMs("created_at").notNull(),
    // Set when this row's `photo` has been moved off the DB (base64) / external
    // host and onto R2. NULL = not yet migrated. Lets the image-rehost worker
    // claim only un-migrated rows (FOR UPDATE SKIP LOCKED) and be re-runnable.
    photoMigratedAt: epochMs("photo_migrated_at"),
  },
  (t) => [
    index("idx_reports_created_at").on(t.createdAt.desc()),
    // Partial index: cheap scan for the rehost worker's "WHERE photo_migrated_at
    // IS NULL AND photo IS NOT NULL" claim query.
    index("idx_reports_photo_pending")
      .on(t.id)
      .where(sql`photo_migrated_at IS NULL AND photo IS NOT NULL`),
  ],
);

export const reportConfirmations = pgTable(
  "report_confirmations",
  {
    reportId: text("report_id").notNull(),
    ipHash: text("ip_hash").notNull(),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.reportId, t.ipHash] })],
);

/* ----------------------------------------------------------- missing_persons */
export const missingPersons = pgTable(
  "missing_persons",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    age: integer("age"),
    nationality: text("nationality").notNull().default(""),
    description: text("description").notNull().default(""),
    lastSeen: text("last_seen").notNull().default(""),
    contact: text("contact").notNull().default(""),
    photo: text("photo"),
    status: text("status").notNull().default("active"),
    resolutionNote: text("resolution_note"),
    resolutionPhoto: text("resolution_photo"),
    resolvedAt: epochMs("resolved_at"),
    externalId: text("external_id"),
    source: text("source"),
    sourceUrl: text("source_url"),
    photoExternalUrl: text("photo_external_url"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    createdAt: epochMs("created_at").notNull(),
    // See reports.photoMigratedAt. Covers BOTH base64 `photo` and external
    // `photo_external_url` being moved onto R2. NULL = pending.
    photoMigratedAt: epochMs("photo_migrated_at"),
  },
  (t) => [
    index("idx_missing_status_created").on(t.status, t.createdAt.desc()),
    index("idx_missing_map_coords").on(t.lat, t.lng),
    index("idx_missing_photo_pending")
      .on(t.id)
      .where(
        sql`photo_migrated_at IS NULL AND (photo IS NOT NULL OR photo_external_url IS NOT NULL)`,
      ),
  ],
);

/* ------------------------------------------------------------- chat_messages */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().default("Anónimo"),
    role: text("role").notNull().default("ciudadano"),
    text: text("text").notNull(),
    replyTo: text("reply_to"),
    replyPreview: text("reply_preview"),
    threadRootId: text("thread_root_id"),
    // Nullable en prod: filas antiguas se rellenan con UPDATE en lib/chat.ts.
    threadBumpedAt: epochMs("thread_bumped_at"),
    createdAt: epochMs("created_at").notNull(),
    // Nota: prod conserva 3 columnas legado (reply_to_id/name/text) ya en
    // desuso (sustituidas por reply_to/reply_preview). Se omiten a propósito.
  },
  (t) => [
    index("idx_chat_thread_bumped").on(t.threadBumpedAt.desc()),
    index("idx_chat_reply").on(t.replyTo),
  ],
);

/* ----------------------------------------------------------------- hospitals */
export const hospitals = pgTable(
  "hospitals",
  {
    id: text("id").primaryKey(),
    externalId: text("external_id"),
    name: text("name").notNull(),
    facilityType: text("facility_type").notNull().default("hospital"),
    state: text("state").notNull().default(""),
    municipality: text("municipality").notNull().default(""),
    address: text("address").notNull().default(""),
    level: text("level"),
    priorityZone: text("priority_zone").notNull().default("P3"),
    isPriority: boolean("is_priority").notNull().default(false),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [
    // Partial unique index: external_id unique WHERE NOT NULL.
    uniqueIndex("idx_hospitals_external")
      .on(t.externalId)
      .where(sql`external_id IS NOT NULL`),
    index("idx_hospitals_state").on(t.state, t.priorityZone, t.name),
  ],
);

export const hospitalPatients = pgTable(
  "hospital_patients",
  {
    id: text("id").primaryKey(),
    hospitalId: text("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    age: integer("age"),
    condition: text("condition").notNull().default("unknown"),
    status: text("status").notNull().default("hospitalized"),
    notes: text("notes").notNull().default(""),
    contact: text("contact").notNull().default(""),
    admittedAt: epochMs("admitted_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [
    index("idx_hospital_patients_hospital").on(
      t.hospitalId,
      t.status,
      t.admittedAt.desc(),
    ),
  ],
);

/* ----------------------------------------------------------------- donations */
export const donations = pgTable(
  "donations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    amountUsd: integer("amount_usd").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: epochMs("created_at").notNull(),
    // Ciclo de vida de la donación. Hoy la app nunca lo muta (insert-only), por
    // eso worker/tables.ts la trata como append-only ("ignore").
    status: text("status").notNull().default("intent"),
  },
  (t) => [index("donations_created_at_idx").on(t.createdAt.desc())],
);

/* ------------------------------------------------------------ click_counters */
export const clickCounters = pgTable("click_counters", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
});

export const clickCounterDedup = pgTable(
  "click_counter_dedup",
  {
    counterKey: text("counter_key").notNull(),
    ipHash: text("ip_hash").notNull(),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.counterKey, t.ipHash] })],
);

/* ------------------------------------------------------------- geocode_cache */
export const geocodeCache = pgTable("geocode_cache", {
  normalizedKey: text("normalized_key").primaryKey(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  label: text("label").notNull().default(""),
  updatedAt: epochMs("updated_at").notNull(),
});

/* ----------------------------------------------------------- sync_state/runs */
export const syncState = pgTable("sync_state", {
  source: text("source").primaryKey(),
  nextPage: integer("next_page").notNull().default(1),
  totalPages: integer("total_pages"),
  lastRunAt: epochMs("last_run_at"),
  lastCycleCompletedAt: epochMs("last_cycle_completed_at"),
  updatedAt: epochMs("updated_at").notNull(),
});

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    source: text("source").notNull(),
    trigger: text("trigger"),
    ok: boolean("ok").notNull(),
    fetched: integer("fetched").notNull().default(0),
    inserted: integer("inserted").notNull().default(0),
    updated: integer("updated").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    errors: integer("errors").notNull().default(0),
    fromPage: integer("from_page"),
    toPage: integer("to_page"),
    nextPage: integer("next_page"),
    cycleCompleted: boolean("cycle_completed"),
    error: text("error"),
    durationMs: integer("duration_ms").notNull().default(0),
    startedAt: epochMs("started_at").notNull(),
    finishedAt: epochMs("finished_at").notNull(),
  },
  (t) => [index("idx_sync_runs_started").on(t.startedAt.desc())],
);

/* ----------------------------------------------------- contact_messages */
// Bandeja de contacto del panel admin. La DDL viva está en
// lib/contact-inbox.ts (CREATE TABLE IF NOT EXISTS); se refleja aquí para
// centralizar el esquema.
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    read: boolean("read").notNull().default(false),
    ipHash: text("ip_hash"),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [
    index("contact_messages_created_at_idx").on(t.createdAt.desc()),
    index("contact_messages_unread_idx").on(t.read, t.createdAt.desc()),
  ],
);

/* ----------------------------------------------------- analytics_events */
// Eventos de analítica. Presente en prod; sin acceso desde el código de la
// app (legado/externo). Se documenta para que el esquema cubra prod.
export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(),
  path: text("path").notNull(),
  label: text("label").notNull().default(""),
  referrer: text("referrer").notNull().default(""),
  userAgent: text("user_agent").notNull().default(""),
  screen: text("screen").notNull().default(""),
  language: text("language").notNull().default(""),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: epochMs("created_at").notNull(),
});

/* ---------------------------------------------------- damage_candidates */
// Candidatos de daño estructural. Presente en prod; legado/externo.
export const damageCandidates = pgTable("damage_candidates", {
  id: text("id").primaryKey(),
  buildingId: text("building_id").notNull(),
  name: text("name").notNull().default(""),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  damageLevel: text("damage_level").notNull(),
  confidence: doublePrecision("confidence").notNull().default(0),
  reviewStatus: text("review_status").notNull().default("needs_review"),
  sourceBefore: text("source_before").notNull().default(""),
  sourceAfter: text("source_after").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: epochMs("created_at").notNull(),
  updatedAt: epochMs("updated_at").notNull(),
});

/* ------------------------------------------------- unidentified_persons */
// Personas no identificadas. Presente en prod; legado/externo.
export const unidentifiedPersons = pgTable("unidentified_persons", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("alive"),
  name: text("name").notNull().default(""),
  surname: text("surname").notNull().default(""),
  locationFound: text("location_found").notNull().default(""),
  description: text("description").notNull().default(""),
  contactName: text("contact_name").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  photo: text("photo"),
  createdAt: epochMs("created_at").notNull(),
});

/* =====================================================================
 * Federación con el hub central "Venezuela Ayuda" (terremoto.hazlohoy.org).
 * Espejo READ-ONLY de los datos de OTROS sitios socios. Ver
 * docs/rfcs/0002-federacion-hub-venezuela-ayuda.md.
 *
 * Una tabla por tipo del hub (catálogo cerrado de 5), espejando sus DTOs
 * `*Public`. NUNCA se mezclan con las tablas nativas (evita duplicación: ya
 * somos fuente del hub). Columnas comunes de federación:
 *   hub_id   uuid del hub (identidad estable, UNIQUE -> idempotencia del upsert)
 *   source   sitio socio que lo publicó (excluimos los nuestros al ingerir)
 *   external_id  id del socio dentro de su sistema (puede venir null)
 *   ingested_at  cuándo lo trajimos; updated_at  high-water de cambios vistos
 * Columnas de imagen (mismo patrón que las nativas; la foto se copia a R2):
 *   photo_external_url  la URL del socio (efímera, puede dar 404)
 *   photo_url           la URL de R2 tras copiar
 *   photo_migrated_at   sellado cuando ya está en R2 (NULL = pendiente)
 *   photo_broken        true si la fuente devolvió 404/permanente
 * ===================================================================== */

// Columnas compartidas por todas las tablas hub_*. Se hace spread en cada una.
const hubCommon = {
  id: text("id").primaryKey(), // crypto.randomUUID() local
  hubId: text("hub_id").notNull(), // uuid del hub (único)
  source: text("source").notNull().default(""),
  externalId: text("external_id"),
  city: text("city"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  hubCreatedAt: text("hub_created_at"), // created_at del hub (ISO, tal cual)
  ingestedAt: epochMs("ingested_at").notNull(),
  updatedAt: epochMs("updated_at").notNull(),
};

// Columnas de imagen compartidas (solo en los tipos con foto).
const hubPhoto = {
  photoExternalUrl: text("photo_external_url"),
  photoUrl: text("photo_url"),
  photoMigratedAt: epochMs("photo_migrated_at"),
  photoBroken: boolean("photo_broken").notNull().default(false),
};

export const hubMissingPersons = pgTable(
  "hub_missing_persons",
  {
    ...hubCommon,
    ...hubPhoto,
    name: text("name").notNull().default(""),
    status: text("status"), // LOOKING_FOR_SOMEONE, etc.
    message: text("message"),
    placeName: text("place_name"),
  },
  (t) => [
    uniqueIndex("idx_hub_missing_hubid").on(t.hubId),
    index("idx_hub_missing_source").on(t.source),
    index("idx_hub_missing_photo_pending")
      .on(t.id)
      .where(sql`photo_migrated_at IS NULL AND photo_external_url IS NOT NULL`),
  ],
);

export const hubCheckins = pgTable(
  "hub_checkins",
  {
    ...hubCommon,
    ...hubPhoto,
    name: text("name").notNull().default(""),
    status: text("status"), // SAFE, NEEDS_HELP, LOOKING_FOR_SOMEONE
    message: text("message"),
    placeName: text("place_name"),
  },
  (t) => [
    uniqueIndex("idx_hub_checkins_hubid").on(t.hubId),
    index("idx_hub_checkins_source").on(t.source),
  ],
);

export const hubHelpRequests = pgTable(
  "hub_help_requests",
  {
    ...hubCommon,
    category: text("category"), // medical, food, water, ...
    description: text("description"),
    urgency: text("urgency"), // LOW..CRITICAL
    status: text("status"), // OPEN, IN_PROGRESS, RESOLVED
    placeName: text("place_name"),
  },
  (t) => [
    uniqueIndex("idx_hub_helpreq_hubid").on(t.hubId),
    index("idx_hub_helpreq_source").on(t.source),
  ],
);

export const hubHelpOffers = pgTable(
  "hub_help_offers",
  {
    ...hubCommon,
    category: text("category"), // transportation, food, ...
    description: text("description"),
    availability: text("availability"),
    available: boolean("available"),
  },
  (t) => [
    uniqueIndex("idx_hub_helpoffer_hubid").on(t.hubId),
    index("idx_hub_helpoffer_source").on(t.source),
  ],
);

export const hubDamagedBuildings = pgTable(
  "hub_damaged_buildings",
  {
    ...hubCommon,
    ...hubPhoto,
    placeName: text("place_name"),
    name: text("name"),
    description: text("description"),
    severity: text("severity"), // CRACKS, PARTIAL, COLLAPSE_RISK, COLLAPSED
  },
  (t) => [
    uniqueIndex("idx_hub_damaged_hubid").on(t.hubId),
    index("idx_hub_damaged_source").on(t.source),
  ],
);

/* ------------------------------------------------------- hub_sync_state */
// Cursor de paginación por tipo del hub (created_at|id). Igual que sync_state
// pero para la federación: el backfill/incremental reanudan desde aquí.
export const hubSyncState = pgTable("hub_sync_state", {
  type: text("type").primaryKey(), // missing_person, checkin, ...
  cursor: text("cursor"), // último next_cursor visto (null = desde el inicio)
  lastRunAt: epochMs("last_run_at"),
  cycleCompletedAt: epochMs("cycle_completed_at"),
});
