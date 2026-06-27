/**
 * drizzle-kit config — generates SQL migrations from infra/db/schema.ts.
 *
 *   npx drizzle-kit generate --config infra/db/drizzle.config.ts
 *     -> writes versioned .sql files to infra/db/migrations/
 *   npx drizzle-kit migrate  --config infra/db/drizzle.config.ts
 *     -> applies pending migrations to $DATABASE_URL (used by the gated
 *        migrate Job in infra/k8s/migrate-job.yaml)
 *
 * Requires the dev deps: drizzle-orm, drizzle-kit, pg (pg is already a runtime
 * dependency). Install before first use:
 *   npm i drizzle-orm && npm i -D drizzle-kit
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./infra/db/schema.ts",
  out: "./infra/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Don't let generate touch tables we don't model (none today, but keeps the
  // diff honest if the DB ever has extra objects).
  strict: true,
  verbose: true,
});
