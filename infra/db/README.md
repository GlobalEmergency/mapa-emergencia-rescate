# Database models (Drizzle)

`schema.ts` is the single source of truth for the database. There is no longer
any runtime DDL: the old `CREATE TABLE IF NOT EXISTS` calls are gone (contact
inbox, etc. now go through Drizzle in `backend/src/services`). The schema is
explicit, versioned, and applied via real migration files — see *Workflow* below.

## The 38 tables

| Table | Purpose | PK | Notable |
|---|---|---|---|
| `reports` | Citizen emergency reports (the map markers) | `id` text | `type`, lat/lng, `photo`, `confirmations`; idx on `created_at` |
| `report_confirmations` | Per-IP "confirm" dedup for reports | (`report_id`,`ip_hash`) | composite PK |
| `missing_persons` | Missing-people registry (+ external sync) | `id` text | `status`, resolution_*, `nationality`, `external_id`/`source` (synced), lat/lng |
| `chat_messages` | Public chat / threads | `id` text | `role`, `reply_to`, `thread_root_id`, `thread_bumped_at` |
| `hospitals` | Hospital / facility directory | `id` text | `external_id` (partial-unique), `priority_zone`, `is_priority` |
| `hospital_patients` | Patients per hospital | `id` text | **FK** `hospital_id → hospitals(id)` ON DELETE CASCADE |
| `hospital_supply_statuses` | Supply status per hospital+category | `id` text | **FK** → `hospitals(id)` CASCADE; unique (`hospital_id`,`category`) |
| `hospital_supply_needs` | Open supply needs per hospital | `id` text | **FK** → `hospitals(id)` CASCADE; `urgency`, `status` |
| `hospital_supply_help_requests` | Help requests raised by a hospital | `id` text | **FK** → `hospitals(id)` CASCADE; `urgency`, `status` |
| `hospital_poc_assignments` | Hospital POC access (token-gated) | `id` text | **FK** → `hospitals(id)` CASCADE; `access_token_hash`, `active` |
| `hospital_supply_events` | Audit log of supply changes | `id` text | **FK** → `hospitals(id)` CASCADE; `entity_type`, `action`, `payload` jsonb |
| `donations` | Donation pledges | `id` text | `amount_usd`, `ip_hash`, `status` |
| `click_counters` | Generic counters (e.g. psychology-help) | `key` text | |
| `click_counter_dedup` | Per-IP dedup for counters | (`counter_key`,`ip_hash`) | composite PK |
| `geocode_cache` | Cached geocoding results | `normalized_key` text | |
| `sync_state` | Per-source ingest cursor | `source` text | `next_page`, cycle timestamps |
| `sync_runs` | Ingest run audit log | `id` bigserial | the only auto-increment PK |
| `contact_messages` | Admin contact inbox | `id` text | `read`, `ip_hash` |
| `analytics_events` | Analytics events (legacy/external) | `id` text | `metadata` jsonb |
| `damage_candidates` | Structural-damage candidates (legacy/external) | `id` text | `damage_level`, `review_status` |
| `unidentified_persons` | Unidentified persons (legacy/external) | `id` text | `status`, contact_* |
| `earthquakes` | USGS seismic events (worker ingest) | `id` text | natural key (USGS id); `magnitude`, lat/lng, `occurred_at`, `usgs_updated_at` |
| `hub_missing_persons` | Federated missing persons (hub mirror) | `id` text | `hub_id` (unique); RFC 0002 |
| `hub_checkins` | Federated check-ins (hub mirror) | `id` text | `hub_id` (unique) |
| `hub_help_requests` | Federated help requests (hub mirror) | `id` text | `hub_id` (unique) |
| `hub_help_offers` | Federated help offers (hub mirror) | `id` text | `hub_id` (unique) |
| `hub_damaged_buildings` | Federated damaged buildings (hub mirror) | `id` text | `hub_id` (unique) |
| `hub_sync_state` | Per-type pagination cursor for the hub | `type` text | mirrors `sync_state` for federation |
| `capabilities` | Fixed capability catalog (`resource:verb`) | `key` text | seeded by migration; not user-created |
| `roles` | Admin-defined roles (rows, not enum) | `id` text | `is_system` (immutable seed admin), `org_id` (phase 2) |
| `role_capabilities` | M:N role ↔ capability | (`role_id`,`capability_key`) | composite PK |
| `users` | Authenticated users (admin panel, RBAC) | `id` text | `password_hash` (bcrypt, NULL while invited), `role_id`, `status` |
| `permission_grants` | Individual capability on top of the role | `id` text | subject = user OR role; `expires_at`/`revoked_at` |
| `invitations` | Invite-based onboarding | `id` text | `token_hash` (sha256, single-use, expires) |
| `password_resets` | Password recovery via 6-digit OTP | `id` text | `code_hash` (sha256), `attempts`, short expiry |
| `audit_log` | Audit trail of every sensitive mutation | `id` bigserial | `action`, `target_*`, `metadata` jsonb, `ip_hash` |
| `api_keys` | Per-user API keys for `api/public/*` (least-privilege) | `id` text | `key_hash` (sha256, never raw), `prefix`, `scopes` ⊆ user caps, soft-delete `revoked_at` |
| `hub_credentials` | Ledger of public-replica (hub) SQL consumers (RFC 0006) | `id` text | `pg_role` (unique), `allowed_ip`, `hetzner_rule_ref`; password never stored; soft-delete `revoked_at` |

> The `capabilities`…`audit_log` block plus `api_keys` is the **RBAC/auth tier**
> added with the standalone admin panel (RFC 0005) and per-user API keys (#171).
> `org_id` columns are present but NULL (global) today — phase-2 multi-tenancy.
> The capability catalog lives in `backend/src/auth/capabilities.ts` and is seeded
> into `capabilities`. `hub_credentials` (RFC 0006) is the ledger for the public
> SQL replica: it lets a super admin revoke both the Postgres role and the Hetzner
> firewall rule of each external consumer.

## Conventions

- **IDs**: `TEXT PRIMARY KEY`, app-generated (`crypto.randomUUID()`), except
  `sync_runs` (`bigserial`).
- **Timestamps**: epoch-**milliseconds** as `BIGINT` (`bigint mode:"number"`),
  not SQL `timestamp`. Stays within `Number.MAX_SAFE_INTEGER`.
- **Coordinates**: `DOUBLE PRECISION`.
- **Relations**: 6 foreign keys, all pointing to `hospitals(id)` with
  `ON DELETE CASCADE` — from `hospital_patients`, `hospital_supply_statuses`,
  `hospital_supply_needs`, `hospital_supply_help_requests`,
  `hospital_poc_assignments` and `hospital_supply_events`. Everything else is
  flat — by design, this app is CRUD + list queries, not a join-heavy domain.
  (This is *why* a heavy ORM like Prisma would be overkill; Drizzle gives typed
  schema + migrations without the abstraction tax.)

## Workflow

```bash
# generate a migration after editing schema.ts (writes infra/db/migrations/)
npm run db:generate   # -> drizzle-kit generate --config infra/db/drizzle.config.ts
```

Commit the generated `.sql` plus the `meta/` journal. **Migrations are applied at
deploy time by the gated migrate Job**, which runs `worker/migrate.ts` — that
calls drizzle-orm's `migrate()` (a runtime dependency), NOT the `drizzle-kit`
CLI (a devDependency, absent from the image). It applies only pending migrations
and records them in `__drizzle_migrations`, so it is idempotent and re-runnable.
See `../k8s/migrate-job.yaml` and `worker/migrate.ts`.

**Migrations must stay backward-compatible** (expand-contract): during a
zero-downtime roll the OLD pods still run against the new schema, so add columns
/ tables first, remove only in a later deploy.

## Migration state

This plan is **done**. Migrations `0000_thankful_miss_america.sql` through
`0011_thankful_lady_mastermind.sql` live in `infra/db/migrations/`, the runtime
`CREATE TABLE IF NOT EXISTS` DDL has been removed from the app code, and
`schema.ts` is the real source of truth applied through the migrate Job. There
is no longer an `ensureSchema()` anywhere.
