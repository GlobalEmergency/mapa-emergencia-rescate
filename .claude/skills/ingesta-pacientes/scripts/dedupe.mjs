#!/usr/bin/env node
/**
 * Depura duplicados que YA están en `hospital_patients` (mismo hospital + mismo
 * nombre con palabras ordenadas). Conserva el registro más completo y fusiona
 * edad/cédula que falten. GUARDIA: no fusiona si edad (gap ≥2) o cédula chocan
 * → esos van a un CSV de revisión. Respaldo + dry-run.
 *
 * Uso (desde la raíz del repo):
 *   node .claude/skills/ingesta-pacientes/scripts/dedupe.mjs            # dry-run
 *   node .claude/skills/ingesta-pacientes/scripts/dedupe.mjs --fuzzy    # + variantes ortográficas
 *   node .claude/skills/ingesta-pacientes/scripts/dedupe.mjs --confirm
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { getSql } from "../lib/db.mjs";
import { loadEnv, sortN, ciFromNotes, fuzzySim, csvCell } from "../lib/normalize.mjs";

const argv = process.argv.slice(2);
const DRY_RUN = !argv.includes("--confirm");
const FUZZY = argv.includes("--fuzzy");
const BACKUP = resolve(homedir(), "Downloads", "dedupe_backup.csv");
const REVIEW = resolve(homedir(), "Downloads", "dedupe_revisar.csv");

await loadEnv();
const sql = getSql();
console.log(`\n${DRY_RUN ? "🟡 DRY-RUN" : "🔴 ESCRITURA REAL"} · dedupe ${FUZZY ? "(exacto+fuzzy)" : "(exacto)"}\n`);

const all = await sql`SELECT id,hospital_id,name,age,notes FROM hospital_patients`;
console.log("Pacientes:", all.length);

// agrupar por hospital + nombre ordenado
const byKey = new Map();
for (const r of all) { const k = r.hospital_id + "|" + sortN(r.name); (byKey.get(k) ?? byKey.set(k, []).get(k)).push(r); }
let clusters = [...byKey.values()].filter((g) => g.length > 1);

if (FUZZY) { // fusiona claves del mismo hospital con nombres ordenados ≥0.90
  const byHosp = new Map();
  for (const r of all) { const mm = byHosp.get(r.hospital_id) ?? byHosp.set(r.hospital_id, new Map()).get(r.hospital_id); const s = sortN(r.name); (mm.get(s) ?? mm.set(s, []).get(s)).push(r); }
  clusters = [];
  for (const mm of byHosp.values()) {
    const keys = [...mm.keys()], used = new Set();
    for (let i = 0; i < keys.length; i++) {
      if (used.has(i)) continue; let g = [...mm.get(keys[i])]; used.add(i);
      for (let j = i + 1; j < keys.length; j++) { if (used.has(j)) continue; if (keys[i].length >= 6 && keys[j].length >= 6 && fuzzySim(keys[i], keys[j]) >= 0.90) { g.push(...mm.get(keys[j])); used.add(j); } }
      if (g.length > 1) clusters.push(g);
    }
  }
}

const score = (r) => (r.age != null ? 1000 : 0) + (/ci:|c[eé]dula/i.test(r.notes) ? 500 : 0) + String(r.notes).length;
const toDelete = [], toUpdate = [], backup = [], review = [];
for (const g of clusters) {
  const ages = [...new Set(g.map((r) => r.age).filter((a) => a != null))];
  const cis = [...new Set(g.map((r) => ciFromNotes(r.notes)).filter(Boolean))];
  if ((ages.length > 1 && Math.max(...ages) - Math.min(...ages) >= 2) || cis.length > 1) { review.push(g); continue; }
  g.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  const keep = g[0], drop = g.slice(1);
  let age = keep.age, notes = keep.notes;
  for (const d of drop) { if (age == null && d.age != null) age = d.age; if (!ciFromNotes(notes) && ciFromNotes(d.notes)) notes = `${notes} CI: ${ciFromNotes(d.notes)}.`.slice(0, 600); }
  if (age !== keep.age || notes !== keep.notes) toUpdate.push({ id: keep.id, age, notes });
  for (const d of drop) toDelete.push(d.id);
  for (const r of g) backup.push(r);
}

console.log(`Clusters: ${clusters.length} · fusionables: ${clusters.length - review.length} · en revisión (conflicto): ${review.length}`);
console.log(`Filas a BORRAR: ${toDelete.length} · keepers a actualizar: ${toUpdate.length}`);
await writeFile(BACKUP, ["id,hospital_id,name,age,notes"].concat(backup.map((r) => [r.id, r.hospital_id, r.name, r.age ?? "", r.notes].map(csvCell).join(","))).join("\n"), "utf8");
await writeFile(REVIEW, ["id,hospital_id,name,age,notes"].concat(review.flat().map((r) => [r.id, r.hospital_id, r.name, r.age ?? "", r.notes].map(csvCell).join(","))).join("\n"), "utf8");
console.log(`📄 Respaldo: ${BACKUP}\n📄 Revisión (conflictos): ${REVIEW}`);

if (DRY_RUN) { console.log(`\n🟡 DRY-RUN: nada borrado. Aplicar: --confirm\n`); process.exit(0); }
console.log(`\n🔴 Aplicando...`);
let upd = 0, del = 0;
for (const u of toUpdate) { await sql`UPDATE hospital_patients SET age=${u.age}, notes=${u.notes}, updated_at=${Date.now()} WHERE id=${u.id}`; upd++; }
for (const id of toDelete) { await sql`DELETE FROM hospital_patients WHERE id=${id}`; del++; if (del % 100 === 0) console.log(`  ... ${del}/${toDelete.length}`); }
console.log(`\n✅ Actualizados: ${upd} · Borrados: ${del}\n`);
process.exit(0);
