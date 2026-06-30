#!/usr/bin/env node
/**
 * Perfila una entrada (JSON o CSV) sin tocar la BD: columnas, conteos, valores
 * distintos de campos clave y cobertura de cédula. Paso 1 de la ingesta.
 *
 * Uso: node .claude/skills/ingesta-pacientes/scripts/inspect.mjs <archivo>
 */
import { readInput, fixMojibake, validCedula, guessFieldMap } from "../lib/normalize.mjs";

const path = process.argv[2];
if (!path) { console.error("Uso: inspect.mjs <archivo.json|csv>"); process.exit(1); }

const rows = await readInput(path);
console.log(`\nArchivo: ${path}\nRegistros: ${rows.length}`);
if (!rows.length) process.exit(0);

const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
console.log("Columnas:", cols.join(", "));
console.log("Mapeo de columnas detectado:", JSON.stringify(guessFieldMap(cols)));

const tally = (field) => {
  const m = new Map();
  for (const r of rows) { const k = fixMojibake(r[field] ?? "") || "(vacío)"; m.set(k, (m.get(k) || 0) + 1); }
  return [...m].sort((a, b) => b[1] - a[1]);
};

// campos típicos a perfilar si existen
for (const f of ["tipo", "estado_salud", "status", "genero", "sexo"]) {
  if (!cols.includes(f)) continue;
  console.log(`\n[${f}]`);
  tally(f).slice(0, 10).forEach(([k, n]) => console.log(`  ${String(n).padStart(5)}  ${k}`));
}

// hospital / lugar
const hf = cols.find((c) => /hospital|albergue|lugar/i.test(c));
if (hf) {
  console.log(`\n[${hf}] (top 20)`);
  tally(hf).slice(0, 20).forEach(([k, n]) => console.log(`  ${String(n).padStart(5)}  ${k.slice(0, 55)}`));
  console.log("  ... distintos:", tally(hf).length);
}

// cédula
const cf = cols.find((c) => /cedula|cédula|^ci$|documento/i.test(c));
if (cf) {
  let con = 0, val = 0;
  for (const r of rows) { const v = String(r[cf] || "").replace(/\D/g, ""); if (v) { con++; if (validCedula(v)) val++; } }
  console.log(`\nCédula (${cf}): con valor ${con} · válida (500k-40M) ${val}`);
}
// muestra REDACTADA: oculta cédula/teléfono/contacto (PII) en stdout
const redact = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => /cedula|cédula|^ci$|documento|dni|tel|contact/i.test(k) ? [k, v ? "***" : ""] : [k, v]));
console.log("\nMuestra redactada (1er registro):", JSON.stringify(redact(rows[0])).slice(0, 400));
