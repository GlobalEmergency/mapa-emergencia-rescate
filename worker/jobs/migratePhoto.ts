/**
 * Image migration jobs. One job = one row id. Moves the row's photo onto R2 and
 * rewrites the column to the public CDN URL, then stamps photo_migrated_at so
 * re-runs skip it (resumability).
 *
 * Two cases, same job:
 *  - base64: `photo` is a `data:image/...;base64,...` URI -> decode -> R2.
 *  - external: `photo_external_url` (or an http(s) `photo`) -> fetch -> R2.
 *
 * Multi-node safe: the row is claimed with SELECT ... FOR UPDATE SKIP LOCKED
 * inside a txn, so two workers never process the same row. Idempotent: if the
 * object already exists on R2 we reuse it; if already migrated we no-op.
 */
import type { PoolClient } from "pg";
import { targetPool } from "../db";
import { putObject, publicUrl, objectExists, parseDataUri } from "../r2";

export type PhotoTable = "missing_persons" | "reports";

interface ClaimedRow {
  id: string;
  photo: string | null;
  photo_external_url: string | null;
  already: boolean;
}

const MAX_BYTES = 15 * 1024 * 1024; // skip absurdly large fetches

/** Claim a single row for processing (row-locked, skips rows other workers hold). */
async function claim(
  client: PoolClient,
  table: PhotoTable,
  id: string,
): Promise<ClaimedRow | null> {
  const extCol = table === "missing_persons" ? ", photo_external_url" : "";
  const { rows } = await client.query(
    `SELECT id, photo${extCol}, photo_migrated_at
       FROM "${table}" WHERE id = $1 FOR UPDATE SKIP LOCKED`,
    [id],
  );
  if (rows.length === 0) return null; // locked by another worker — let them have it
  const r = rows[0] as Record<string, unknown>;
  return {
    id: r.id as string,
    photo: (r.photo as string) ?? null,
    photo_external_url: (r.photo_external_url as string) ?? null,
    already: r.photo_migrated_at != null,
  };
}

async function fetchExternal(url: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return null;
  const len = Number(res.headers.get("content-length") || 0);
  if (len && len > MAX_BYTES) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) return null;
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return { bytes: buf, contentType };
}

export interface MigratePhotoResult {
  id: string;
  status: "migrated" | "skipped" | "no-photo" | "fetch-failed" | "already";
  url?: string;
}

export async function migratePhoto(
  table: PhotoTable,
  id: string,
): Promise<MigratePhotoResult> {
  const pool = targetPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await claim(client, table, id);
    if (!row) {
      await client.query("ROLLBACK");
      return { id, status: "skipped" }; // held by another worker
    }
    if (row.already) {
      await client.query("ROLLBACK");
      return { id, status: "already" };
    }

    // Decide source bytes: base64 photo first, else external url.
    let bytes: Buffer | null = null;
    let contentType = "application/octet-stream";
    let ext = "bin";

    if (row.photo && row.photo.startsWith("data:")) {
      const parsed = parseDataUri(row.photo);
      if (parsed) ({ bytes, contentType, ext } = parsed);
    } else {
      const src =
        row.photo_external_url ||
        (row.photo && /^https?:\/\//.test(row.photo) ? row.photo : null);
      if (src) {
        const fetched = await fetchExternal(src);
        if (!fetched) {
          // Mark as migrated-with-no-change so we don't retry a dead URL forever?
          // No: leave photo_migrated_at NULL but return fetch-failed so the job
          // RETRIES per BullMQ backoff. Permanent 404s exhaust attempts -> stay
          // pending and are visible in a "still NULL" report.
          await client.query("ROLLBACK");
          return { id, status: "fetch-failed" };
        }
        bytes = fetched.bytes;
        contentType = fetched.contentType;
        ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
      }
    }

    if (!bytes) {
      // Nothing to migrate (no photo at all). Stamp it so it's not re-claimed.
      await client.query(
        `UPDATE "${table}" SET photo_migrated_at = $1 WHERE id = $2`,
        [Date.now(), id],
      );
      await client.query("COMMIT");
      return { id, status: "no-photo" };
    }

    const key = `images/${table}/${id}.${ext}`;
    const url = (await objectExists(key)) ? publicUrl(key) : await putObject(key, bytes, contentType);

    // Rewrite the column the app reads (`photo`) to the CDN URL + stamp done.
    await client.query(
      `UPDATE "${table}" SET photo = $1, photo_migrated_at = $2 WHERE id = $3`,
      [url, Date.now(), id],
    );
    await client.query("COMMIT");
    return { id, status: "migrated", url };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
