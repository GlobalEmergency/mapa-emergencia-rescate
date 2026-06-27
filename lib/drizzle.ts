/**
 * Punto único de acceso a la base de datos con Drizzle ORM.
 *
 * Reemplaza el `getSql()` de SQL crudo (lib/db.ts) como capa central: todos los
 * módulos de `lib/*` consultan a través de este `getDb()`, tipado contra el
 * esquema en `infra/db/schema.ts` (la fuente de verdad).
 *
 * Mantiene la MISMA elección de driver que lib/db.ts (DB_DRIVER), porque hay dos
 * entornos:
 *   - DB_DRIVER=neon -> Vercel + Neon (HTTP)   -> drizzle-orm/neon-http
 *   - DB_DRIVER=tcp  -> Hetzner + Postgres VPS -> drizzle-orm/node-postgres
 *   - (sin DB_DRIVER) -> default neon (fallback seguro, igual que lib/db.ts)
 *
 * El esquema vive y se gestiona con drizzle-kit (migraciones automáticas en el
 * deploy), no con CREATE TABLE en runtime.
 */
import { createRequire } from "module";
import * as schema from "../infra/db/schema";

type Driver = "neon" | "tcp";

function chooseDriver(): Driver {
  const forced = process.env.DB_DRIVER?.toLowerCase();
  if (forced === "tcp") return "tcp";
  if (forced === "neon") return "neon";
  if (forced) throw new Error(`DB_DRIVER inválido: "${forced}". Usa "neon" o "tcp".`);
  return "neon"; // default seguro (prod Vercel+Neon)
}

// El tipo de retorno difiere por driver; ambos exponen la misma API de consulta
// de Drizzle tipada con `schema`. Unificamos con un tipo común derivado.
type Db =
  | ReturnType<typeof import("drizzle-orm/neon-http").drizzle<typeof schema>>
  | ReturnType<typeof import("drizzle-orm/node-postgres").drizzle<typeof schema>>;

let _db: Db | null = null;

export function hasDbEnv(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): Db {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurada.");
  const require = createRequire(import.meta.url);

  if (chooseDriver() === "neon") {
    const { neon } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
    const { drizzle } = require("drizzle-orm/neon-http") as typeof import("drizzle-orm/neon-http");
    _db = drizzle(neon(url), { schema });
  } else {
    const { Pool, types } = require("pg") as typeof import("pg");
    // BIGINT (oid 20) como número: created_at/resolved_at son epoch-ms dentro del
    // rango seguro (paridad con lib/db.ts y el driver de Neon).
    types.setTypeParser(20, (v: string) => parseInt(v, 10));
    const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
    _db = drizzle(new Pool({ connectionString: url }), { schema });
  }
  return _db;
}

// Re-export del esquema para que los módulos importen tablas desde un solo lugar:
//   import { getDb, schema } from "@/lib/drizzle";
export { schema };
