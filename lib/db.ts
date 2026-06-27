import { createRequire } from "module";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export function hasDbEnv(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Adaptador `node-postgres` (TCP) que expone la misma interfaz de template tag
 * que el resto del código (`sql\`...\``) y devuelve el array de filas, igual que
 * Neon con `fullResults: false`. Se usa para todo Postgres plano: desarrollo
 * local y el VPS de Postgres privado en Hetzner.
 */
function createTcpSql(url: string): NeonQueryFunction<false, false> {
  const require = createRequire(import.meta.url);
  const { Pool, types } = require("pg") as typeof import("pg");
  // BIGINT (oid 20) llega como string por defecto; Neon lo entrega como número.
  // created_at/resolved_at son epoch-ms, dentro del rango seguro de Number.
  types.setTypeParser(20, (v: string) => parseInt(v, 10));
  const pool = new Pool({ connectionString: url });

  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
    return pool.query(text, values as unknown[]).then((res) => res.rows);
  };

  // Paridad con el driver de Neon: `sql.query(text, params)` ejecuta una
  // consulta parametrizada con placeholders $1..$n y devuelve las filas.
  (sql as { query?: unknown }).query = (text: string, params: unknown[] = []) =>
    pool.query(text, params).then((res) => res.rows);

  return sql as unknown as NeonQueryFunction<false, false>;
}

/**
 * Elige el driver. Explícito gana SIEMPRE sobre el valor por defecto:
 *
 *   1. DB_DRIVER=tcp   -> fuerza node-postgres (Hetzner, local).
 *   2. DB_DRIVER=neon  -> fuerza el driver HTTP de Neon.
 *   3. (sin DB_DRIVER) -> POR DEFECTO neon (es el prod actual de Vercel+Neon;
 *      es el fallback seguro: si alguien despliega sin fijar la variable, no se
 *      rompe Neon). Los entornos TCP (Hetzner, compose) fijan DB_DRIVER=tcp
 *      explícitamente, así que no dependen de este default.
 *
 * Nota: ya NO se autodetecta por host. La elección es explícita o el default
 * neon — para que un cambio en la URL nunca cambie el driver por sorpresa.
 */
function chooseDriver(): "neon" | "tcp" {
  const forced = process.env.DB_DRIVER?.toLowerCase();
  if (forced === "tcp") return "tcp";
  if (forced === "neon") return "neon";
  if (forced) {
    throw new Error(`DB_DRIVER inválido: "${forced}". Usa "neon" o "tcp".`);
  }
  return "neon"; // default seguro
}

let _sql: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const url = process.env.DATABASE_URL!;
    _sql = chooseDriver() === "neon" ? neon(url) : createTcpSql(url);
  }
  return _sql;
}
