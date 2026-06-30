import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

// Conexión de la skill, STANDALONE (no importa código de la app). El repo es
// pg-only tras el split monorepo: Postgres plano (Hetzner/k3s y local/compose).
// Neon también habla protocolo Postgres por TCP, así que `pg` también sirve para
// Neon. Resuelve `pg` desde las deps del repo (backend/ primero, donde vive tras
// el split; con fallback a la resolución por ancestros). Lee DATABASE_URL (o
// POSTGRES_URL) y devuelve un tag `sql`...`` que entrega el array de filas.

function loadPg() {
  // db.mjs -> .claude/skills/ingesta-pacientes/lib ; sube 4 niveles a la raíz.
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "../../../..");
  const bases = ["backend/package.json", "frontend/package.json"]
    .map((p) => resolve(root, p))
    .filter(existsSync);
  for (const base of bases) {
    try { return createRequire(base)("pg"); } catch { /* probar siguiente */ }
  }
  // Fallback: resolución por ancestros desde este archivo (incluye la raíz).
  try { return createRequire(import.meta.url)("pg"); } catch {
    throw new Error(
      "No se pudo resolver 'pg'. Instala las deps del backend: `cd backend && npm install`.",
    );
  }
}

/** Cliente `sql` (tag template -> filas, como neon(fullResults:false)). */
export function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!url) throw new Error("Falta DATABASE_URL (o POSTGRES_URL) en .env.local");
  const { Pool, types } = loadPg();
  // BIGINT (oid 20) llega como string por defecto; admitted_at/created_at son
  // epoch-ms dentro del rango seguro de Number -> parsearlos a número.
  types.setTypeParser(20, (v) => parseInt(v, 10));
  const pool = new Pool({ connectionString: url });

  const sql = (strings, ...values) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
    return pool.query(text, values).then((res) => res.rows);
  };
  sql.query = (text, params = []) => pool.query(text, params).then((res) => res.rows);
  return sql;
}
