/**
 * Cloudflare R2 upload helper for the **request path** (app-side).
 *
 * New photos uploaded through the public forms go straight to R2 here, instead
 * of accumulating as base64 in Postgres. The `worker/` migration system moves
 * the historical base64/external backlog; this keeps NEW uploads off the DB.
 *
 * Same env + bucket + key scheme as `worker/r2.ts` (so both write to the same
 * place): `images/<table>/<id>.<ext>`, served from the Cloudflare CDN domain.
 *
 * Env (shared R2 token):
 *   R2_ENDPOINT, R2_STATIC_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 *   R2_PUBLIC_BASE   public CDN base, e.g. https://bucket-vzla-terremoto.dreamit.software
 *
 * Policy: if R2 is configured, uploads MUST succeed — a failure throws (the
 * endpoint surfaces it; we never silently fall back to base64-in-DB). When R2
 * is NOT configured (local dev / memory store), `isR2Configured()` is false and
 * callers keep the legacy base64 path.
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

let _s3: S3Client | null = null;

/** True only when every R2 var is set — gates the whole R2 write path. */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_STATIC_BUCKET &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_PUBLIC_BASE,
  );
}

function s3(): S3Client {
  if (_s3) return _s3;
  _s3 = new S3Client({
    region: "auto", // R2 ignores region but the SDK requires one ("auto" is conventional)
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
    forcePathStyle: true,
  });
  return _s3;
}

/** Public CDN URL for a stored object key. */
function publicUrl(key: string): string {
  const base = (process.env.R2_PUBLIC_BASE || "").replace(/\/$/, "");
  return `${base}/${key}`;
}

/** Parse a `data:image/<mime>;base64,<payload>` URI into validated bytes. */
function parseDataUri(
  uri: string,
): { bytes: Buffer; contentType: string; ext: string } | null {
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(uri);
  if (!m) return null;
  const contentType = m[1];
  if (!ALLOWED_MIME.has(contentType)) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0) return null;
  const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  return { bytes, contentType, ext };
}

/**
 * Upload a base64 image data URL to R2 under `images/<table>/<id>.<ext>` and
 * return its public CDN URL. Throws if R2 is misconfigured, the data URL is
 * invalid, or the PUT fails — callers must not swallow this (hard-fail policy).
 *
 * Caller must check `isR2Configured()` first; if false, use the base64 path.
 */
export async function uploadPhotoDataUrl(
  dataUrl: string,
  table: string,
  id: string,
): Promise<string> {
  const parsed = parseDataUri(dataUrl);
  if (!parsed) throw new Error("Foto inválida: se esperaba JPG, PNG o WebP en base64.");
  const key = `images/${table}/${id}.${parsed.ext}`;
  await s3().send(
    new PutObjectCommand({
      Bucket: process.env.R2_STATIC_BUCKET,
      Key: key,
      Body: parsed.bytes,
      ContentType: parsed.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return publicUrl(key);
}
