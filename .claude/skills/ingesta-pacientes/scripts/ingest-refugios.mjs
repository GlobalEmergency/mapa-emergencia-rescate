#!/usr/bin/env node
/**
 * Ingiere personas A SALVO EN REFUGIOS / centros de acopio (NO hospitalizadas)
 * en `hospital_patients` con status="sheltered", para que una familia las
 * encuentre en la misma búsqueda distinguiendo refugio vs hospital.
 *
 * El refugio (su UBICACIÓN REAL: estado, municipio, dirección, fuente) se crea
 * antes con `crear-lugares.mjs` a partir de `lugares_nuevos.json`. Este script
 * NO inventa ni adivina la ubicación: si el refugio de una persona no está
 * curado+creado, esa persona queda PENDIENTE (no se inserta).
 *
 * Solo inserta personas que NO estén ya en la BD (dedup por cédula + nombre).
 * Dry-run por defecto. Escribe solo con --confirm.
 *
 * Uso (desde la raíz del repo):
 *   node .claude/skills/ingesta-pacientes/scripts/ingest-refugios.mjs [--src <archivo>] [--lugares <json>]            # dry-run
 *   node .claude/skills/ingesta-pacientes/scripts/ingest-refugios.mjs --confirm
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { getSql } from "../lib/db.mjs";
import {
  loadEnv, readInput, fixMojibake, normHosp, sortN, cleanName, validName, isDamaged,
  normCedula, validCedula, ciFromNotes, parseAge, csvCell, guessFieldMap,
} from "../lib/normalize.mjs";
import { isNonHospital, loadPlaces, resolvePlaces, validatePlace } from "../lib/hospitals.mjs";
import { snapshotPatients, backupDir } from "../lib/backup.mjs";

const argv = process.argv.slice(2);
const DRY_RUN = !argv.includes("--confirm");
const SRC = (argv.includes("--src") && argv[argv.indexOf("--src") + 1]) || resolve(homedir(), "Downloads", "pacientes_export.json");
const LUGARES = (argv.includes("--lugares") && argv[argv.indexOf("--lugares") + 1]) || resolve(homedir(), "Downloads", "lugares_nuevos.json");
const NOTE = "Persona a salvo reportada en refugio/centro de acopio. Dato de lista consolidada, no verificado con familiar.";

await loadEnv();
const sql = getSql();
console.log(`\n${DRY_RUN ? "🟡 DRY-RUN (no escribe)" : "🔴 ESCRITURA REAL"}\nFuente: ${SRC}\n`);

// refugios curados + creados (solo facility_type=refugio)
const places = (await resolvePlaces(sql, await loadPlaces(LUGARES))).filter((p) => (p.type || "").toLowerCase() === "refugio");
const created = places.filter((p) => p.hosp);
const readyUncreated = places.filter((p) => !p.hosp && validatePlace(p).ok); // curado completo, falta crear
console.log(`Refugios curados: ${places.length} · ya creados en BD: ${created.length}`);
if (!created.length) console.log("⚠️ No hay refugios creados. Corre detectar-lugares.mjs → rellena → crear-lugares.mjs primero.\n");
const aliasHit = (p, hn) => p._aliases.some((a) => a && (hn === a || hn.includes(a)));
const matchRefugio = (hn) => created.find((p) => aliasHit(p, hn)) || null;
const matchReady = (hn) => readyUncreated.find((p) => aliasHit(p, hn)) || null;

// existentes (dedup global)
const db = await sql`SELECT name, notes FROM hospital_patients`;
const dbCi = new Set(), dbN = new Set();
for (const r of db) { const c = ciFromNotes(r.notes); if (c.length >= 6) dbCi.add(c); dbN.add(sortN(r.name)); }

const rows = await readInput(SRC);
const F = guessFieldMap(Object.keys(rows[0] || {}));
console.log(`Entrada: ${rows.length} · columna lugar: "${F.hospital}"\n`);

const byPlace = new Map(); // hospital_id -> {place, people:[]}
const uncuratedPending = new Map(); // refugio sin curar (texto -> count)
let excludedHosp = 0, badName = 0, already = 0, internalDup = 0, uncurated = 0, faltaCrear = 0;
const seen = new Set();
for (const r of rows) {
  const placeRaw = fixMojibake(r[F.hospital]);
  const hn = normHosp(placeRaw);
  if (!isNonHospital(hn, r[F.tipo])) { excludedHosp++; continue; } // es hospital, no refugio
  const name = cleanName(`${r[F.nombre] || ""} ${r[F.apellido] || ""}`);
  if (!validName(name) || isDamaged(name)) { badName++; continue; } // inválido o encoding dañado
  const ci = normCedula(r[F.cedula]); const ciOk = validCedula(ci);
  const bk = ciOk ? "ci:" + ci : "n:" + sortN(name);
  if (seen.has(bk)) { internalDup++; continue; } seen.add(bk);
  if ((ciOk && dbCi.has(ci)) || dbN.has(sortN(name))) { already++; continue; } // ya findable en la BD
  const place = matchRefugio(hn);
  if (!place) { // no creado: curado-completo (falta crear) o sin curar (investiga)
    if (matchReady(hn)) faltaCrear++;
    else { const key = placeRaw.trim() || "(vacío)"; uncuratedPending.set(key, (uncuratedPending.get(key) || 0) + 1); uncurated++; }
    continue;
  }
  if (!byPlace.has(place.hosp.id)) byPlace.set(place.hosp.id, { place, people: [] });
  byPlace.get(place.hosp.id).people.push({ name, age: parseAge(r[F.edad]), ci: ciOk ? ci : "" });
}

const totalNew = [...byPlace.values()].reduce((a, p) => a + p.people.length, 0);
const line = "─".repeat(56);
console.log(line);
console.log(`Excluidos (son hospital, no refugio): ${excludedHosp}`);
console.log(`Nombre inválido / dañado: ${badName} · dup interno: ${internalDup}`);
console.log(`Ya en la BD (findables): ${already}`);
console.log(`Pendientes (curados, falta correr crear-lugares): ${faltaCrear}`);
console.log(`Pendientes (refugio sin curar, investiga en web): ${uncurated}`);
console.log(`➜ NUEVOS a insertar (en refugios ya creados): ${totalNew}`);
console.log(line + "\nPor refugio:");
[...byPlace.values()].sort((a, b) => b.people.length - a.people.length).forEach((p) => console.log(`  ${String(p.people.length).padStart(4)}  ${p.place.name.slice(0, 40)} [${p.place.municipality}, ${p.place.state}]`));
if (uncuratedPending.size) {
  console.log("\nRefugios sin curar (corre detectar-lugares.mjs e investiga su ubicación):");
  [...uncuratedPending].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([h, n]) => console.log(`  ${String(n).padStart(4)}  ${h.slice(0, 50)}`));
}

if (DRY_RUN) { console.log(`\n🟡 DRY-RUN: nada escrito. Aplicar: --confirm\n`); process.exit(0); }
if (!totalNew) { console.log("\nNada que insertar.\n"); process.exit(0); }

const now = Date.now();
const dir = await backupDir();
console.log(`\n🔴 Insertando ${totalNew} personas en refugios... (lote admitted_at=${now})`);
console.log(`   rollback: DELETE FROM hospital_patients WHERE admitted_at=${now};`);
const antes = resolve(dir, `backup_pacientes_antes_${now}.csv`);
const despues = resolve(dir, `backup_pacientes_despues_${now}.csv`);
console.log(`📦 Respaldo ANTES: ${antes} (${await snapshotPatients(sql, antes)} personas)`);
await writeFile(resolve(dir, "refugios_backup.csv"),
  ["refugio,name,age,ci"].concat([...byPlace.values()].flatMap((p) => p.people.map((x) => [p.place.name, x.name, x.age ?? "", x.ci].map(csvCell).join(",")))).join("\n"), "utf8");
let okP = 0, err = 0;
for (const p of byPlace.values()) {
  for (const x of p.people) {
    const notes = [NOTE, `Refugio: ${p.place.name}.`, x.ci ? `CI: ${x.ci}.` : ""].filter(Boolean).join(" ").slice(0, 600);
    try { await sql`INSERT INTO hospital_patients (id, hospital_id, name, age, condition, status, notes, contact, admitted_at, updated_at)
      VALUES (${randomUUID()}, ${p.place.hosp.id}, ${x.name.slice(0, 120)}, ${x.age}, ${"unknown"}, ${"sheltered"}, ${notes}, ${""}, ${now}, ${now})`; okP++; if (okP % 100 === 0) console.log(`  ... ${okP}/${totalNew}`); }
    catch (e) { err++; console.error("  ❌", x.name, e?.message ?? e); }
  }
}
console.log(`📦 Respaldo DESPUÉS: ${despues} (${await snapshotPatients(sql, despues)} personas)`);
console.log(`\n✅ Personas insertadas en refugios: ${okP} · Errores: ${err}\n`);
process.exit(0);
