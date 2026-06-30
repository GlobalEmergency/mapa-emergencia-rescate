// Mapa CURADO de hospital (texto libre) → hospital canónico de la tabla.
// Anclado por external_id (estable) o por nombre normalizado cuando no hay external_id.
// Editar/añadir reglas aquí cuando aparezcan hospitales nuevos. Lo NO mapeado
// cae a "pendientes": NUNCA inventar un hospital.
import { readFile } from "node:fs/promises";
import { normHosp } from "./normalize.mjs";

export const HOSPITAL_RULES = [
  { ext: "MANUAL-HOSP-079", label: "Vargas La Guaira", test: (n) => n.includes("vargas") && n.includes("guaira") },
  { ext: "MANUAL-HOSP-047", label: "Vargas Caracas", test: (n) => n.includes("vargas") && !n.includes("guaira") },
  { ext: "MANUAL-HOSP-117", label: "Domingo Luciani / El Llanito", test: (n) => n.includes("luciani") || n.includes("llanito") },
  { ext: "MANUAL-HOSP-057", label: "Pérez Carreño", test: (n) => n.includes("carreno") },
  { name: "h. periférico de catia", label: "Periférico de Catia", test: (n) => n.includes("periferico de catia") || (n.includes("catia") && !n.includes("oeste")) },
  { ext: "MANUAL-HOSP-056", label: "Militar (Carlos Arvelo)", test: (n) => n.includes("militar") || n.includes("arvelo") },
  { ext: "MANUAL-HOSP-185", label: "HUC", test: (n) => n.includes("clinico universitario") || n.includes("huc") || (n.includes("universitario") && n.includes("caracas")) },
  { ext: "MANUAL-HOSP-187", label: "Clínica El Ávila", test: (n) => n.includes("el avila") },
  { ext: "MANUAL-HOSP-115", label: "Pérez de León II", test: (n) => n.includes("ana francisca") || n.includes("perez de leon") },
  { ext: "MANUAL-HOSP-049", label: "J.M. de los Ríos", test: (n) => n.includes("de los rios") },
  { ext: "MANUAL-HOSP-186", label: "Cruz Roja", test: (n) => n.includes("cruz roja") },
  { ext: "MANUAL-HOSP-189", label: "Materno del Valle", test: (n) => (n.includes("del valle") && !n.includes("virgen")) || n.includes("hugo chavez") },
  { ext: "MANUAL-HOSP-190", label: "General del Oeste", test: (n) => n.includes("jose gregorio hernandez") || n.includes("general del oeste") || n.includes("magallanes") },
  { ext: "MANUAL-HOSP-188", label: "Pariata", test: (n) => n.includes("pariata") || n.includes("medina jimenez") },
  { ext: "MANUAL-HOSP-046", label: "Ricardo Baquero", test: (n) => n.includes("baquero") },
];

/** Lugares que NO son hospital (se excluyen aunque `tipo` diga "hospital"). */
export function isNonHospital(normalizedName, tipo) {
  const t = String(tipo || "").toLowerCase();
  if (t && t !== "hospital") return true;
  return /campo de golf|playa los cocos|punto de atencion|punto de concentracion|albergue|centro de acopio|residencias|alcaldia/.test(normalizedName);
}

/** Resuelve cada regla a su fila real de `hospitals`. Lanza si falta un ancla. */
export async function resolveRules(sql) {
  const hospitals = await sql`SELECT id, external_id, name FROM hospitals`;
  const byExt = new Map(hospitals.filter((h) => h.external_id).map((h) => [h.external_id, h]));
  const byNorm = new Map(hospitals.map((h) => [normHosp(h.name), h]));
  for (const r of HOSPITAL_RULES) {
    r.hosp = r.ext ? byExt.get(r.ext) : byNorm.get(normHosp(r.name));
    if (!r.hosp) throw new Error("Ancla de hospital no resuelta: " + (r.ext || r.name));
  }
  return HOSPITAL_RULES;
}

/** Devuelve la fila de hospital/lugar para un texto ya normalizado, o null.
 *  Busca primero en las reglas curadas (HOSPITAL_RULES) y luego en los lugares
 *  nuevos curados (`places`, de lugares_nuevos.json) que YA existen en la BD. */
export function matchHospital(normalizedName, rules, places = []) {
  const r = rules.find((x) => x.test(normalizedName));
  if (r) return r.hosp;
  for (const p of places) {
    if (!p.hosp) continue; // curado pero aún no creado en la BD
    if (p._aliases.some((a) => a && (normalizedName === a || normalizedName.includes(a)))) return p.hosp;
  }
  return null;
}

// ── Lugares nuevos curados (hospitales/clínicas/refugios) ─────────────────────
// Un agente NO inventa lugares. Cuando aparecen lugares nuevos en una lista, el
// agente los INVESTIGA en la web y rellena `lugares_nuevos.json` con ubicación
// real + fuente. Estas funciones cargan/validan/resuelven ese archivo. Sin
// ubicación verificada y `source`, el lugar NO se crea.
export const PLACE_REQUIRED = ["name", "type", "state", "municipality", "address", "source"];

/** Genera un external_id estable y determinista a partir del nombre (idempotente). */
export function placeExt(e) {
  if (e.external_id) return e.external_id;
  const base = normHosp(e.name || (Array.isArray(e.match) ? e.match[0] : e.match) || "");
  return "MANUAL-LUGAR-" + base.replace(/\s+/g, "-").slice(0, 36) || "MANUAL-LUGAR-sin-nombre";
}

/** Lee lugares_nuevos.json → array de entradas con `_aliases` y `ext`. [] si no existe. */
export async function loadPlaces(path) {
  let raw;
  try { raw = await readFile(path, "utf8"); } catch { return []; }
  let arr;
  try { arr = JSON.parse(raw); } catch (e) { throw new Error(`lugares_nuevos.json inválido: ${e.message}`); }
  if (!Array.isArray(arr)) arr = arr.lugares || arr.places || [];
  return arr.map((e) => {
    const matches = Array.isArray(e.match) ? e.match : [e.match || e.name || ""];
    return { ...e, _aliases: matches.map((m) => normHosp(m)).filter(Boolean), ext: placeExt(e) };
  });
}

/** ¿La entrada tiene todos los datos reales para crearse? Guarda anti-invención. */
export function validatePlace(e) {
  const missing = PLACE_REQUIRED.filter((k) => !String(e[k] ?? "").trim());
  return { ok: missing.length === 0, missing };
}

/** Marca en cada lugar curado su fila real en `hospitals` (`.hosp`) si ya existe. */
export async function resolvePlaces(sql, places) {
  if (!places.length) return places;
  const rows = await sql`SELECT id, external_id, name FROM hospitals`;
  const byExt = new Map(rows.filter((h) => h.external_id).map((h) => [h.external_id, h]));
  const byNorm = new Map(rows.map((h) => [normHosp(h.name), h]));
  for (const p of places) p.hosp = byExt.get(p.ext) || byNorm.get(normHosp(p.name)) || null;
  return places;
}
