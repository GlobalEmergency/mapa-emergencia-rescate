#!/usr/bin/env node
/**
 * Crea LUGARES NUEVOS (hospitales/clínicas/refugios) en la tabla `hospitals` a
 * partir de `lugares_nuevos.json`, que el agente rellenó investigando en la web.
 *
 * Guarda anti-invención: una entrada SOLO se crea si trae name + type + state +
 * municipality + address + source. Las incompletas se RECHAZAN y se listan para
 * que el agente las investigue o el usuario las confirme. Nunca se adivina ni se
 * deja una dirección vacía.
 *
 * Idempotente (por external_id). Dry-run por defecto; escribe solo con --confirm.
 *
 * Uso (desde la raíz del repo):
 *   node .claude/skills/ingesta-pacientes/scripts/crear-lugares.mjs [--lugares <archivo.json>]            # dry-run
 *   node .claude/skills/ingesta-pacientes/scripts/crear-lugares.mjs --confirm
 */
import { resolve } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { getSql } from "../lib/db.mjs";
import { loadEnv } from "../lib/normalize.mjs";
import { loadPlaces, resolvePlaces, validatePlace } from "../lib/hospitals.mjs";

const argv = process.argv.slice(2);
const DRY_RUN = !argv.includes("--confirm");
const LUGARES = (argv.includes("--lugares") && argv[argv.indexOf("--lugares") + 1]) || resolve(homedir(), "Downloads", "lugares_nuevos.json");

await loadEnv();
const sql = getSql();
console.log(`\n${DRY_RUN ? "🟡 DRY-RUN (no escribe)" : "🔴 ESCRITURA REAL"}\nArchivo: ${LUGARES}\n`);

const places = await resolvePlaces(sql, await loadPlaces(LUGARES));
if (!places.length) { console.log("No hay lugares en el archivo (¿corriste detectar-lugares.mjs y lo rellenaste?).\n"); process.exit(0); }

const toCreate = [], incomplete = [], exists = [];
for (const p of places) {
  if (p.hosp) { exists.push(p); continue; }            // ya está en la BD
  const v = validatePlace(p);
  if (!v.ok) { incomplete.push({ p, missing: v.missing }); continue; } // falta investigar → no se inventa
  toCreate.push(p);
}

const line = "─".repeat(56);
console.log(line);
console.log(`Ya existen en la BD: ${exists.length}`);
console.log(`➜ A crear (completos + con fuente): ${toCreate.length}`);
console.log(`⚠️ Incompletos (NO se crean, faltan datos): ${incomplete.length}`);
console.log(line);
if (toCreate.length) {
  console.log("\nA crear:");
  toCreate.forEach((p) => console.log(`  • [${p.type}] ${p.name} — ${p.municipality}, ${p.state}\n      dir: ${String(p.address).slice(0, 60)} · fuente: ${String(p.source).slice(0, 50)}`));
}
if (incomplete.length) {
  console.log("\n⚠️ Incompletos (investiga en web y completa, o pide al usuario que confirme):");
  incomplete.forEach(({ p, missing }) => console.log(`  • ${p.name || p.match} — faltan: ${missing.join(", ")}`));
}

if (DRY_RUN) { console.log(`\n🟡 DRY-RUN: nada escrito. Aplicar: --confirm\n`); process.exit(0); }
if (!toCreate.length) { console.log("\nNada completo que crear.\n"); process.exit(0); }

const now = Date.now();
console.log(`\n🔴 Creando ${toCreate.length} lugares... (created_at=${now})`);
console.log(`   rollback: DELETE FROM hospitals WHERE created_at=${now} AND external_id LIKE 'MANUAL-LUGAR-%';`);
let ok = 0, err = 0;
for (const p of toCreate) {
  try {
    await sql`INSERT INTO hospitals (id, external_id, name, facility_type, state, municipality, address, level, priority_zone, is_priority, created_at)
      VALUES (${randomUUID()}, ${p.ext}, ${String(p.name).slice(0, 200)}, ${p.type || "hospital"}, ${p.state}, ${p.municipality}, ${p.address}, ${p.level ?? null}, ${p.priority_zone || "P3"}, ${p.is_priority === true}, ${now})`;
    ok++;
  } catch (e) { err++; console.error("  ❌", p.name, e?.message ?? e); }
}
console.log(`\n✅ Lugares creados: ${ok} · Errores: ${err}`);
console.log(`   Ahora corre ingest.mjs / ingest-refugios.mjs para insertar a sus personas.\n`);
process.exit(0);
