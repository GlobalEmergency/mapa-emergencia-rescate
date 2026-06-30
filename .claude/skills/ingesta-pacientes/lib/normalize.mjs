// Helpers de normalización reutilizables para ingesta de pacientes.
import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const DIAC = /[̀-ͯ]/g;

// Mapa inverso CP1252 (chars 0x80-0x9F) para revertir mojibake Windows-1252.
// (Latin-1 NO sirve: rompe mayúsculas acentuadas cuyo 2º byte UTF-8 cae en 0x80-0x9F.)
const CP1252_REV = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };

/** Repara mojibake Windows-1252→UTF-8 ("Ã±→ñ", "PÃ‰REZ→PÉREZ"). Re-codifica a
 *  bytes CP1252 y decodifica UTF-8. Si el resultado introduce `�` (cadena
 *  mezclada limpio+mojibake), conserva el original (mejor que empeorarlo). */
export function fixMojibake(s) {
  s = String(s ?? "");
  if (!/\u00c3|\u00c2|\u00e2\u20ac|[\u0080-\u009F\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/.test(s)) return s;
  const bytes = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp <= 0xff) bytes.push(cp);
    else if (CP1252_REV[cp] != null) bytes.push(CP1252_REV[cp]);
    else return s; // carácter no mapeable → no es mojibake CP1252 puro
  }
  const fixed = Buffer.from(bytes).toString("utf8");
  return fixed.includes("�") && !s.includes("�") ? s : fixed;
}

/** ¿El texto quedó con daño de codificación residual (irrecuperable o mezclado)?
 *  Para cuarentena: estos NO se insertan, van a revisión humana. */
export function isDamaged(s) { return /\uFFFD|\u00e2\u20ac|[\u0080-\u009F\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/.test(fixMojibake(s)); }

export function normHosp(s) {
  return fixMojibake(s).toLowerCase().normalize("NFD").replace(DIAC, "")
    .replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
export function normName(s) {
  return fixMojibake(s).toLowerCase().normalize("NFD").replace(DIAC, "")
    .replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
}
/** Nombre con palabras ORDENADAS (dedup orden-insensible). */
export function sortN(s) { return normName(s).split(" ").filter(Boolean).sort().join(" "); }

/** Combina/limpia un nombre: dedupe de tokens repetidos + Title Case. */
export function cleanName(s) {
  const toks = fixMojibake(s).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const seen = new Set(), u = [];
  for (const t of toks) { const k = t.toLowerCase(); if (seen.has(k)) continue; seen.add(k); u.push(t); }
  return u.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
/** Válido si hay ≥2 tokens de ≥2 letras (descarta "Parra R", monotoken, basura). */
export function validName(name) {
  return normName(name).split(" ").filter((t) => t.length >= 2).length >= 2;
}

export function normCedula(s) { return String(s ?? "").replace(/\D/g, ""); }
export function validCedula(s, min = 500000, max = 40000000) {
  const d = normCedula(s); if (d.length < 6) return false; const n = +d; return n >= min && n <= max;
}
export function ciFromNotes(notes) {
  const m = String(notes || "").match(/(?:ci|c[eé]dula)\s*:?\s*([\d.]+)/i);
  return m ? normCedula(m[1]) : "";
}
export function parseAge(v) {
  const n = parseInt(String(v ?? "").replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 && n <= 120 ? n : null;
}

export function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
export function fuzzySim(a, b) { return (!a.length || !b.length) ? 0 : 1 - lev(a, b) / Math.max(a.length, b.length); }

/** estado de salud de origen → nuestro `condition`. */
export function mapCondition(s) {
  const k = fixMojibake(s).toLowerCase().normalize("NFD").replace(DIAC, "");
  return ({ estable: "stable", delicado: "serious", critico: "critical" })[k] || "unknown";
}
export function isDeceased(s) { return /fallecid/i.test(fixMojibake(s)); }

export function csvCell(s) { const v = String(s ?? ""); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

export function parseCsv(text) {
  const out = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1 || row[0] !== "") out.push(row); row = []; }
    else f += c;
  }
  if (f !== "" || row.length) { row.push(f); out.push(row); }
  return out;
}

// ── XLSX (un .xlsx es un zip de XML; se descomprime con `unzip`, sin deps npm) ──
function xmlUnesc(s) { return String(s).replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"); }
async function xlsxShared(dir) { let xml; try { xml = await readFile(`${dir}/xl/sharedStrings.xml`, "utf8"); } catch { return []; } const out = []; for (const si of xml.split("</si>")) { if (!si.includes("<si")) continue; out.push([...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => xmlUnesc(m[1])).join("")); } return out; }
async function xlsxFirstSheetFile(dir) { const wb = await readFile(`${dir}/xl/workbook.xml`, "utf8"); const rels = await readFile(`${dir}/xl/_rels/workbook.xml.rels`, "utf8"); const rid = {}; for (const m of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rid[m[1]] = m[2]; for (const m of rels.matchAll(/<Relationship[^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g)) if (!rid[m[2]]) rid[m[2]] = m[1]; const m = wb.match(/<sheet [^>]*r:id="([^"]+)"/); const t = (rid[m[1]] || "worksheets/sheet1.xml").replace(/^\/?xl\//, ""); return `${dir}/xl/${t}`; }
function xlsxCol(ref) { const m = ref.match(/^([A-Z]+)/); let n = 0; for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }
async function xlsxRows(file, shared) { const xml = await readFile(file, "utf8"); const rows = []; for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) { const cells = []; for (const cm of rm[1].matchAll(/<c [^>]*r="([A-Z]+\d+)"([^>]*)\/?>(?:([\s\S]*?)<\/c>)?/g)) { const ci = xlsxCol(cm[1]); const at = cm[2] || "", body = cm[3] || ""; const t = (at.match(/t="([^"]+)"/) || [])[1]; let v = ""; if (t === "s") { const idx = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1]; v = shared[parseInt(idx, 10)] ?? ""; } else if (t === "inlineStr") { v = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => xmlUnesc(m[1])).join(""); } else { const raw = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1]; v = raw != null ? xmlUnesc(raw) : ""; } cells[ci] = v; } rows.push(cells); } return rows; }

/** Lee la PRIMERA hoja de un .xlsx → array de objetos por cabecera.
 *  Workbooks MULTI-HOJA (varias pestañas) necesitan un adaptador propio: esto
 *  solo lee la primera hoja. Requiere el CLI `unzip`. */
export async function readXlsx(path) {
  const dir = mkdtempSync(join(tmpdir(), "xlsx-"));
  execFileSync("unzip", ["-o", "-d", dir, path], { stdio: "ignore" });
  const rows = await xlsxRows(await xlsxFirstSheetFile(dir), await xlsxShared(dir));
  if (!rows.length) return [];
  const header = (rows[0] || []).map((h) => fixMojibake(h).trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

/** Lee JSON / CSV / XLSX (1a hoja) → array de objetos.
 *  Para foto/PDF/texto, el AGENTE transcribe primero a JSON/CSV: estos scripts NO hacen OCR. */
export async function readInput(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".json")) {
    const j = JSON.parse(await readFile(path, "utf8"));
    return Array.isArray(j) ? j : (j.data || j.records || j.pacientes || j.patients || []);
  }
  if (lower.endsWith(".xlsx")) return readXlsx(path);
  if (lower.endsWith(".xls")) throw new Error(".xls (formato viejo) no soportado: expórtalo a .xlsx o .csv");
  const rows = parseCsv(await readFile(path, "utf8")); const header = (rows.shift() || []).map((h) => fixMojibake(h).trim());
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

/** Auto-detecta el mapeo de columnas de una fuente nueva por sinónimos (por token,
 *  no substring, para evitar falsos positivos). Devuelve
 *  {nombre,apellido,cedula,edad,hospital,tipo,estado,diag}; "" si no halla.
 *  El agente DEBE verificar el resultado (con inspect) y corregir si hace falta. */
export function guessFieldMap(columns) {
  const toks = (c) => fixMojibake(c).toLowerCase().normalize("NFD").replace(DIAC, "").split(/[^a-z0-9]+/).filter(Boolean);
  const find = (...syn) => columns.find((c) => toks(c).some((t) => syn.includes(t))) || "";
  const m = {
    nombre: find("nombre", "nombres", "name"),
    apellido: find("apellido", "apellidos", "surname"),
    cedula: find("cedula", "ci", "documento", "dni"),
    edad: find("edad", "age", "anos"),
    hospital: find("hospital", "albergue", "lugar", "centro", "ubicacion"),
    tipo: find("tipo", "type"),
    estado: find("estado", "salud", "status", "condicion"),
    diag: find("diagnostico", "observaciones", "notas", "notes", "obs"),
  };
  // nombre+apellido combinados en una sola columna ("Apellidos y Nombres", "Nombre completo")
  const combined = columns.find((c) => { const t = toks(c); return (t.includes("apellidos") && t.includes("nombres")) || (t.includes("nombre") && t.includes("completo")); });
  if (combined) { m.nombre = combined; m.apellido = ""; }
  return m;
}

export async function loadEnv() {
  try {
    const t = await readFile(resolve(".env.local"), "utf8");
    for (const l of t.split("\n")) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (!m) continue;
      let v = m[2]; if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch { /* sin .env.local */ }
}
