# Database models (Drizzle)

`schema.ts` is the single source of truth for the database — a Drizzle mirror of
the schema that lib/*.ts currently creates lazily at runtime. Moving it here
makes the schema explicit, versioned, and migratable instead of scattered
`CREATE TABLE IF NOT EXISTS` calls.

## The 12 tables

| Table | Purpose | PK | Notable |
|---|---|---|---|
| `reports` | Citizen emergency reports (the map markers) | `id` text | `type`, lat/lng, `photo`, `confirmations`; idx on `created_at` |
| `report_confirmations` | Per-IP "confirm" dedup for reports | (`report_id`,`ip_hash`) | composite PK |
| `missing_persons` | Missing-people registry (+ external sync) | `id` text | `status`, resolution_*, `external_id`/`source` (synced), lat/lng |
| `chat_messages` | Public chat / threads | `id` text | `role`, `reply_to`, `thread_root_id`, `thread_bumped_at` |
| `hospitals` | Hospital / facility directory | `id` text | `external_id` (partial-unique), `priority_zone`, `is_priority` |
| `hospital_patients` | Patients per hospital | `id` text | **FK** `hospital_id → hospitals(id)` ON DELETE CASCADE |
| `donations` | Donation pledges | `id` text | `amount_usd`, `ip_hash` |
| `click_counters` | Generic counters (e.g. psychology-help) | `key` text | |
| `click_counter_dedup` | Per-IP dedup for counters | (`counter_key`,`ip_hash`) | composite PK |
| `geocode_cache` | Cached geocoding results | `normalized_key` text | |
| `sync_state` | Per-source ingest cursor | `source` text | `next_page`, cycle timestamps |
| `sync_runs` | Ingest run audit log | `id` bigserial | the only auto-increment PK |

## Conventions

- **IDs**: `TEXT PRIMARY KEY`, app-generated (`crypto.randomUUID()`), except
  `sync_runs` (`bigserial`).
- **Timestamps**: epoch-**milliseconds** as `BIGINT` (`bigint mode:"number"`),
  not SQL `timestamp`. Stays within `Number.MAX_SAFE_INTEGER`.
- **Coordinates**: `DOUBLE PRECISION`.
- **Relations**: only one real FK (`hospital_patients → hospitals`). Everything
  else is flat — by design, this app is CRUD + list queries, not a join-heavy
  domain. (This is *why* a heavy ORM like Prisma would be overkill; Drizzle
  gives typed schema + migrations without the abstraction tax.)

## Workflow

```bash
# one-time install
npm i drizzle-orm && npm i -D drizzle-kit

# generate a migration after editing schema.ts
npx drizzle-kit generate --config infra/db/drizzle.config.ts   # -> migrations/

# apply (CI migrate Job does this against $DATABASE_URL)
npx drizzle-kit migrate  --config infra/db/drizzle.config.ts
```

**Migrations must stay backward-compatible** (expand-contract): during a
zero-downtime roll the OLD pods still run against the new schema, so add columns
/ tables first, remove only in a later deploy. See `../k8s/migrate-job.yaml`.

## Migration path from the current lazy DDL

This schema is descriptive today. To switch the app over:
1. `drizzle-kit generate` to capture the current state as the baseline migration
   (run `generate` against a fresh DB, or use `--custom`/baseline so it doesn't
   try to recreate existing tables on the live DB).
2. Wire `drizzle-kit migrate` into the gated migrate Job.
3. Optionally drop the per-module `ensureSchema()` calls in lib/*.ts once
   migrations own the schema — or leave them (idempotent) during transition.
