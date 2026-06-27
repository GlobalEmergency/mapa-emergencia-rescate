/**
 * Aplicador de migraciones de esquema (drizzle-kit migrate, en runtime).
 *
 * Corre como un Job de k8s gateado ANTES del roll de la app (ver
 * infra/k8s/migrate-job.yaml + el workflow). Usa el `migrate()` de
 * drizzle-orm (dep de runtime), NO el CLI drizzle-kit (que es devDependency y no
 * está en la imagen). Aplica solo las migraciones pendientes y las registra en
 * la tabla `__drizzle_migrations`, así que es idempotente y re-ejecutable.
 *
 * Va en la imagen `worker` (que lleva el node_modules completo + tsx + pg). El
 * `app` DB es Postgres por TCP, así que usamos el driver node-postgres.
 *
 * Env: DATABASE_URL (el app DB de Hetzner).
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || "infra/db/migrations";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurada (app DB destino).");

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const db = drizzle(pool);
    console.log(`[migrate] aplicando migraciones desde ${MIGRATIONS_DIR}...`);
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    console.log("[migrate] listo. Esquema al día.");
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[migrate] fatal:", err);
    process.exit(1);
  });
