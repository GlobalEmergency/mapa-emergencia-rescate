import { eq, sql } from "drizzle-orm";
import { getDb, hasDbEnv, schema } from "./drizzle";

const { clickCounters, clickCounterDedup } = schema;

const PSYCHOLOGY_HELP_KEY = "psychology_help";

let memoryCount = 0;
const memoryDedup = new Set<string>();

export async function getPsychologyHelpClickCount(): Promise<number> {
  if (hasDbEnv()) {
    const rows = await getDb()
      .select({ count: clickCounters.count })
      .from(clickCounters)
      .where(eq(clickCounters.key, PSYCHOLOGY_HELP_KEY));
    return Number(rows[0]?.count ?? 0);
  }
  return memoryCount;
}

/** Incrementa el contador una vez por IP (aprox. una persona). */
export async function incrementPsychologyHelpClick(
  ipKey: string,
): Promise<number> {
  if (hasDbEnv()) {
    const db = getDb();
    // Aseguramos primero que la fila base del contador exista (igual que el
    // antiguo ensureSchema, ahora que el CREATE TABLE lo gestiona drizzle-kit).
    await db
      .insert(clickCounters)
      .values({ key: PSYCHOLOGY_HELP_KEY, count: 0 })
      .onConflictDoNothing({ target: clickCounters.key });

    // Dedup por IP + incremento + lectura del total en UNA sentencia:
    //  - si la IP es nueva, `ins` trae fila → `upd` incrementa y devuelve el
    //    nuevo total.
    //  - si la IP repite, `ins` queda vacío → `upd` no corre → caemos al total
    //    actual sin incrementar.
    // CTE atómico con escape `sql`: la query builder no expresa
    // INSERT...RETURNING encadenado a un UPDATE condicional en una sentencia.
    const result = await db.execute(sql`
      WITH ins AS (
        INSERT INTO ${clickCounterDedup} (${clickCounterDedup.counterKey}, ${clickCounterDedup.ipHash}, ${clickCounterDedup.createdAt})
        VALUES (${PSYCHOLOGY_HELP_KEY}, ${ipKey}, ${Date.now()})
        ON CONFLICT DO NOTHING
        RETURNING ${clickCounterDedup.counterKey}
      ),
      upd AS (
        UPDATE ${clickCounters} SET ${clickCounters.count} = ${clickCounters.count} + 1
        WHERE ${clickCounters.key} = ${PSYCHOLOGY_HELP_KEY} AND EXISTS (SELECT 1 FROM ins)
        RETURNING ${clickCounters.count}
      )
      SELECT COALESCE(
        (SELECT count FROM upd),
        (SELECT ${clickCounters.count} FROM ${clickCounters} WHERE ${clickCounters.key} = ${PSYCHOLOGY_HELP_KEY})
      ) AS count
    `);
    const rows = (Array.isArray(result) ? result : result.rows) as {
      count: number;
    }[];
    return Number(rows[0]?.count ?? 0);
  }
  if (memoryDedup.has(ipKey)) return memoryCount;
  memoryDedup.add(ipKey);
  memoryCount += 1;
  return memoryCount;
}
