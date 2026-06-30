#!/usr/bin/env node
/**
 * Ingesta genérica de una lista de pacientes a `hospital_patients`:
 * normaliza → mapea hospital (curado) → deduplica vs lo cargado → dry-run/confirm.
 *
 * Para una FUENTE NUEVA: ajustar CONFIG (src + FIELD) y, si hay hospitales nuevos,
 * añadir reglas en lib/hospitals.mjs. Lo no mapeado cae a pendientes (no se inventa).
 *
 * Uso (desde la raíz del repo):
 *   node .claude/skills/ingesta-pacientes/scripts/ingest.mjs            # dry-run
 *   node .claude/skills/ingesta-pacientes/scripts/ingest.mjs --confirm
 *   node .claude/skills/ingesta-pacientes/scripts/ingest.mjs --src <archivo>
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { getSql } from "../lib/db.mjs";
import {
  loadEnv, readInput, fixMojibake, normHosp, sortN, cleanName, validName, isDamaged,
  normCedula, validCedula, ciFromNotes, parseAge, fuzzySim, mapCondition, isDeceased, csvCell, guessFieldMap,
} from "../lib/normalize.mjs";
import { resolveRules, matchHospital, isNonHospital, loadPlaces, resolvePlaces, validatePlace } from "../lib/hospitals.mjs";
import { snapshotPatients, backupDir } from "../lib/backup.mjs";

const argv = process.argv.slice(2);
const DRY_RUN = !argv.includes("--confirm");
const srcArg = argv[argv.indexOf("--src") + 1];
const LUGARES = (argv.includes("--lugares") && argv[argv.indexOf("--lugares") + 1]) || resolve(homedir(), "Downloads", "lugares_nuevos.json");

// ── CONFIG: editar para una fuente nueva ──
const CONFIG = {
  src: srcArg && argv.includes("--src") ? srcArg : resolve(homedir(), "Downloads", "pacientes_export.json"),
  // mapeo de columnas de la fuente → campos canónicos
  FIELD: null, // null = auto-detecta columnas por sinónimos (guessFieldMap). Pon un objeto {nombre,apellido,cedula,edad,hospital,tipo,estado,diag} para forzar.
  note: "Dato de lista consolidada (export). No verificado directamente con familiar.",
  withCedula: true, // incluir CI en notas (buscable). Decisión de privacidad del maintainer.
  dupSim: 0.88,
};

await loadEnv();
const sql = getSql();
console.log(`\n${DRY_RUN ? "🟡 DRY-RUN (no escribe)" : "🔴 ESCRITURA REAL"}\nFuente: ${CONFIG.src}\n`);

const rules = await resolveRules(sql);
const places = await resolvePlaces(sql, await loadPlaces(LUGARES));
if (places.length) console.log(`Lugares curados (${LUGARES}): ${places.length} · ya creados en BD: ${places.filter((p) => p.hosp).length}`);

// existentes → índices de dedup
const db = await sql`SELECT hospital_id, name, notes FROM hospital_patients`;
const dbByCi = new Set(), dbByHosp = new Map(), dbSorted = new Set();
for (const r of db) {
  const ci = ciFromNotes(r.notes); if (ci.length >= 6) dbByCi.add(ci);
  const s = sortN(r.name); dbSorted.add(s);
  (dbByHosp.get(r.hospital_id) ?? dbByHosp.set(r.hospital_id, []).get(r.hospital_id)).push(s);
}
console.log(`Existentes: ${db.length} · con cédula: ${dbByCi.size}`);

const rows = await readInput(CONFIG.src);
console.log(`Entrada: ${rows.length} registros`);
const F = CONFIG.FIELD || guessFieldMap(Object.keys(rows[0] || {}));
console.log("Mapeo de columnas:", JSON.stringify(F), "(verifica que sea correcto)\n");

const insert = [], pending = new Map(), curatedPending = new Map(), seen = new Set();
let excluded = 0, badName = 0, damaged = 0, haveCi = 0, haveName = 0, internalDup = 0;
for (const r of rows) {
  const hospText = fixMojibake(r[F.hospital]);
  const hn = normHosp(hospText);
  if (isNonHospital(hn, r[F.tipo])) { excluded++; continue; }
  const hosp = matchHospital(hn, rules, places);
  if (!hosp) {
    const key = hospText || "(vacío)";
    // ¿está curado (con datos completos) en lugares_nuevos.json pero aún no creado?
    const curatedEntry = places.find((p) => !p.hosp && p._aliases.some((a) => a && (hn === a || hn.includes(a))));
    const m = curatedEntry && validatePlace(curatedEntry).ok ? curatedPending : pending;
    m.set(key, (m.get(key) || 0) + 1);
    continue;
  }
  const name = cleanName(`${r[F.nombre] || ""} ${r[F.apellido] || ""}`);
  if (!validName(name)) { badName++; continue; }
  if (isDamaged(name)) { damaged++; continue; } // encoding irrecuperable/mezclado → cuarentena
  const ci = normCedula(r[F.cedula]); const ciOk = validCedula(ci);
  const bk = ciOk ? "ci:" + ci : "n:" + sortN(name) + "|" + hosp.id;
  if (seen.has(bk)) { internalDup++; continue; } seen.add(bk);
  if (ciOk && dbByCi.has(ci)) { haveCi++; continue; }
  const s = sortN(name);
  if (dbSorted.has(s)) { haveName++; continue; }
  if ((dbByHosp.get(hosp.id) || []).some((d) => d === s || (s.length >= 6 && fuzzySim(s, d) >= CONFIG.dupSim))) { haveName++; continue; }
  insert.push({ name, hosp, age: parseAge(r[F.edad]), ci: ciOk ? ci : "", estado: String(r[F.estado] || ""), diag: fixMojibake(r[F.diag]) });
}

const line = "─".repeat(56);
console.log(line);
console.log(`Excluidos (no hospital): ${excluded}`);
console.log(`Nombre inválido (<2 tokens ≥2 letras): ${badName}`);
console.log(`Dañados por encoding (cuarentena, no se insertan): ${damaged}`);
console.log(`Ya los tenemos (cédula): ${haveCi}`);
console.log(`Ya los tenemos (nombre): ${haveName}`);
console.log(`Duplicados internos: ${internalDup}`);
console.log(`Pendientes (hospital sin mapear ni curar): ${[...pending.values()].reduce((a, b) => a + b, 0)}`);
console.log(`Pendientes (curados, falta correr crear-lugares): ${[...curatedPending.values()].reduce((a, b) => a + b, 0)}`);
console.log(`➜ NUEVOS a insertar: ${insert.length}`);
console.log(line);
const per = new Map(); for (const p of insert) per.set(p.hosp.name, (per.get(p.hosp.name) || 0) + 1);
console.log("\nNuevos por hospital:"); [...per].sort((a, b) => b[1] - a[1]).forEach(([h, n]) => console.log(`  ${String(n).padStart(4)}  ${h.slice(0, 46)}`));
if (curatedPending.size) { console.log("\nCurados pendientes de crear (corre crear-lugares.mjs):"); [...curatedPending].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([h, n]) => console.log(`  ${String(n).padStart(4)}  ${h.slice(0, 46)}`)); }
if (pending.size) { console.log("\nPendientes sin curar (investiga en web → detectar-lugares.mjs):"); [...pending].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([h, n]) => console.log(`  ${String(n).padStart(4)}  ${h.slice(0, 46)}`)); }
console.log("\nMuestra:"); insert.slice(0, 6).forEach((p) => console.log(`  • ${p.name}${p.age != null ? " (" + p.age + ")" : ""} -> ${p.hosp.name.slice(0, 26)}${p.ci ? " · CI" : ""}`));

if (DRY_RUN) { console.log(`\n🟡 DRY-RUN: nada escrito. Aplicar: --confirm\n`); process.exit(0); }

const now = Date.now();
const dir = await backupDir();
console.log(`\n🔴 Insertando ${insert.length}... (lote admitted_at=${now})`);
console.log(`   rollback: DELETE FROM hospital_patients WHERE admitted_at=${now};`);
const antes = resolve(dir, `backup_pacientes_antes_${now}.csv`);
const despues = resolve(dir, `backup_pacientes_despues_${now}.csv`);
console.log(`📦 Respaldo ANTES: ${antes} (${await snapshotPatients(sql, antes)} personas)`);
await writeFile(resolve(dir, "ingest_backup.csv"), ["name,hospital,age,ci"].concat(insert.map((p) => [p.name, p.hosp.name, p.age ?? "", p.ci].map(csvCell).join(","))).join("\n"), "utf8");
let ok = 0, err = 0;
for (const p of insert) {
  const notes = [CONFIG.note, CONFIG.withCedula && p.ci ? `CI: ${p.ci}.` : "", p.diag && !/se desconoce/i.test(p.diag) ? `Diag: ${p.diag}.` : ""].filter(Boolean).join(" ").slice(0, 600);
  try {
    await sql`INSERT INTO hospital_patients (id, hospital_id, name, age, condition, status, notes, contact, admitted_at, updated_at)
      VALUES (${randomUUID()}, ${p.hosp.id}, ${p.name.slice(0, 120)}, ${p.age}, ${mapCondition(p.estado)}, ${isDeceased(p.estado) ? "deceased" : "hospitalized"}, ${notes}, ${""}, ${now}, ${now})`;
    ok++; if (ok % 200 === 0) console.log(`  ... ${ok}/${insert.length}`);
  } catch (e) { err++; console.error("  ❌", p.name, e?.message ?? e); }
}
console.log(`📦 Respaldo DESPUÉS: ${despues} (${await snapshotPatients(sql, despues)} personas)`);
console.log(`\n✅ Insertados: ${ok} · Errores: ${err}\n`);
process.exit(0);
