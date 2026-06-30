// Respaldo completo de personas a CSV (snapshot de toda la BD), uniendo
// hospital_patients con su lugar. Se usa ANTES y DESPUÉS de cada escritura real
// para poder restaurar/auditar. El CSV lleva PII (cédula, notas): es LOCAL y
// restringido, NUNCA va a repos/issues/PRs (ver regla de oro #3).
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { ciFromNotes, csvCell } from "./normalize.mjs";

export const BACKUP_COLS = ["nombre", "edad", "lugar", "tipo_lugar", "estado", "municipio", "cedula", "notas"];

/** Carpeta de respaldos (fuera del repo): $INGESTA_BACKUP_DIR o ~/ingesta-backups/.
 *  Se crea si no existe. Aquí caen los CSV con PII; NUNCA dentro del repo. */
export async function backupDir() {
  const dir = process.env.INGESTA_BACKUP_DIR || resolve(homedir(), "ingesta-backups");
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Vuelca TODO hospital_patients (con su lugar) a un CSV. Devuelve nº de filas. */
export async function snapshotPatients(sql, outPath) {
  const rows = await sql`
    SELECT hp.name, hp.age, h.name AS lugar, h.facility_type, h.state, h.municipality, hp.notes
    FROM hospital_patients hp
    LEFT JOIN hospitals h ON h.id = hp.hospital_id
    ORDER BY h.name NULLS FIRST, hp.name`;
  const lines = [BACKUP_COLS.join(",")];
  for (const r of rows) {
    lines.push([
      r.name, r.age ?? "", r.lugar ?? "", r.facility_type ?? "", r.state ?? "",
      r.municipality ?? "", ciFromNotes(r.notes), r.notes ?? "",
    ].map(csvCell).join(","));
  }
  await writeFile(outPath, lines.join("\n"), "utf8");
  return rows.length;
}
