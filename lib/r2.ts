/**
 * Cloudflare R2 (S3-compatible) — server-side only.
 *
 * لا تستورد هذا الملف في أي مكوّن عميل. المفاتيح تُقرأ من متغيرات البيئة فقط
 * ولا تُرسل أبدًا إلى المتصفح. اللعبة نفسها لا تحتاج هذا الملف أثناء اللعب —
 * الواجهة تستعمل روابط CDN العامة الجاهزة (انظر lib/game/images.ts).
 */
import { PutObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3"

export const R2_BUCKET = process.env.R2_BUCKET ?? "mzad-players"

let client: S3Client | null = null

export function r2(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials are missing (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)")
  }

  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_S3_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return client
}

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
}

export function contentTypeFor(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? ""
  return CONTENT_TYPES[ext] ?? "application/octet-stream"
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await r2().send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

export async function putObject(key: string, body: Uint8Array | Buffer): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentTypeFor(key),
      CacheControl: "public, max-age=31536000, immutable",
    }),
  )
}
