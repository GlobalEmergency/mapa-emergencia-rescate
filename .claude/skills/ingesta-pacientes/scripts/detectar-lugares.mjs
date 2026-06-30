#!/usr/bin/env node
/**
 * Detecta LUGARES NUEVOS en una lista de entrada: hospitales/clínicas y refugios
 * que NO están en la BD ni en el mapa curado (`lib/hospitals.mjs`) ni en
 * `lugares_nuevos.json`. Los clasifica en *probable hospital* vs *probable refugio*
 * y genera una PLANTILLA `lugares_nuevos.TEMPLATE.json` para que el agente la
 * rellene investigando en la web (estado, municipio, dirección, fuente).
 *
 * NO escribe en la BD. NO inventa datos: solo lista lo que falta investigar.
 *
 * Uso (desde la raíz del repo):
 *   node .claude/skills/ingesta-pacientes/scripts/detectar-lugares.mjs [--src <archivo>] [--lugares <archivo.json>]
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { getSql } from "../lib/db.mjs";
import { loadEnv, readInput, fixMojibake, normHosp, guessFieldMap } from "../lib/normalize.mjs";
import { HOSPITAL_RULES, isNonHospital, resolveRules, loadPlaces, resolvePlaces, matchHospital } from "../lib/hospitals.mjs";

const argv = process.argv.slice(2);
const SRC = (argv.includes("--src") && argv[argv.indexOf("--src") + 1]) || resolve(homedir(), "Downloads", "pacientes_export.json");
const LUGARES = (argv.includes("--lugares") && argv[argv.indexOf("--lugares") + 1]) || resolve(homedir(), "Downloads", "lugares_nuevos.json");
const TEMPLATE = resolve(homedir(), "Downloads", "lugares_nuevos.TEMPLATE.json");

await loadEnv();
const sql = getSql();
const rules = await resolveRules(sql);
const places = await resolvePlaces(sql, await loadPlaces(LUGARES));

const rows = await readInput(SRC);
const F = guessFieldMap(Object.keys(rows[0] || {}));
console.log(`\nFuente: ${SRC}\nRegistros: ${rows.length} · columna lugar: "${F.hospital}" · tipo: "${F.tipo || "(ninguna)"}"`);
console.log(`Curados ya cargados (${LUGARES}): ${places.length}\n`);

// Agrupa los lugares NO resueltos (ni regla, ni curado-en-BD) por texto crudo.
const newHosp = new Map(), newRef = new Map();
for (const r of rows) {
  const raw = fixMojibake(r[F.hospital]);
  const hn = normHosp(raw);
  if (!hn) continue;
  const refugio = isNonHospital(hn, r[F.tipo]);
  if (!refugio && matchHospital(hn, rules, places)) continue; // hospital ya mapeado → no es nuevo
  // ¿ya está curado (aunque aún no creado en BD)? entonces no hace falta investigarlo otra vez
  if (places.some((p) => p._aliases.some((a) => a && (hn === a || hn.includes(a))))) continue;
  const bucket = refugio ? newRef : newHosp;
  const key = raw.trim() || "(vacío)";
  bucket.set(key, (bucket.get(key) || 0) + 1);
}

const show = (title, m) => {
  const arr = [...m].sort((a, b) => b[1] - a[1]);
  console.log(`\n${title}: ${arr.length} lugares · ${arr.reduce((a, b) => a + b[1], 0)} personas`);
  arr.slice(0, 30).forEach(([k, n]) => console.log(`  ${String(n).padStart(4)}  ${k.slice(0, 60)}`));
  if (arr.length > 30) console.log(`  ... y ${arr.length - 30} más`);
  return arr;
};
const hosps = show("🏥 PROBABLES HOSPITALES/CLÍNICAS nuevos (a investigar)", newHosp);
const refs = show("⛺ PROBABLES REFUGIOS/centros nuevos (a investigar)", newRef);

// Plantilla a rellenar investigando en la web. type: hospital|clinica|refugio.
// Campos obligatorios para crear: name, type, state, municipality, address, source.
const blank = (k, type) => ({ match: k, type, name: "", state: "", municipality: "", address: "", source: "" });
const tmpl = [
  ...hosps.map(([k]) => blank(k, "hospital")),
  ...refs.map(([k]) => blank(k, "refugio")),
];
const blocked = [...newHosp.values(), ...newRef.values()].reduce((a, b) => a + b, 0);
await writeFile(TEMPLATE, JSON.stringify(tmpl, null, 2), "utf8");
console.log(`\n📝 Plantilla escrita: ${TEMPLATE} (${tmpl.length} lugares)`);
console.log(`   Investiga cada uno en la web, rellena name/state/municipality/address/source,`);
console.log(`   guárdalo como ${LUGARES} y luego corre crear-lugares.mjs.`);
console.log(`   ⚠️ Sin ubicación real + source NO se crea el lugar (no inventes).`);
console.log(`\n⏱️  AVISO DE TIEMPO (díselo al usuario antes de que decida):`);
console.log(`   Crear estos ${tmpl.length} lugares exige investigarlos en la web uno por uno`);
console.log(`   → toma VARIOS MINUTOS EXTRA. Desbloquearía ~${blocked} personas.`);
console.log(`   Los pacientes ya mapeados NO dependen de esto: puedes ingerirlos sin esperar.\n`);
process.exit(0);
