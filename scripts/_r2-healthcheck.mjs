/**
 * فحص اتصال R2: يكتب ملفًا صغيرًا ثم يقرأه ثم يسرد المفاتيح.
 *
 * التشغيل:
 *   node --env-file-if-exists=.env.local scripts/_r2-healthcheck.mjs
 */
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_BUCKET

const missing = Object.entries({ R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET: bucket })
  .filter(([, v]) => !v)
  .map(([k]) => k)

if (missing.length > 0) {
  console.error("[v0] متغيرات بيئة ناقصة:", missing.join(", "))
  process.exit(1)
}

// طول المفتاح السري في R2 هو ٦٤ حرفًا — نتحقق مبكرًا حتى لا نخطئ في تشخيص
// SignatureDoesNotMatch الناتج عن مفتاح مقطوع.
if (secretAccessKey.length !== 64) {
  console.error(`[v0] طول R2_SECRET_ACCESS_KEY = ${secretAccessKey.length}، والمتوقع 64. المفتاح مقطوع.`)
  process.exit(1)
}

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_S3_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
})

console.log("[v0] bucket:", bucket)

try {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: "_healthcheck.txt", Body: "ok", ContentType: "text/plain" }),
  )
  console.log("[v0] PUT ok")

  const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: "_healthcheck.txt" }))
  console.log("[v0] GET ok:", await got.Body.transformToString())

  const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }))
  console.log("[v0] LIST ok, keys:", (listed.Contents || []).map((o) => o.Key))
  console.log("[v0] R2 جاهز.")
} catch (error) {
  console.error("[v0] FAIL:", error.name, "-", error.message)
  if (error.name === "SignatureDoesNotMatch") {
    console.error("[v0] السبب الأرجح: المفتاح السري خاطئ أو مقطوع.")
  }
  if (error.name === "NoSuchBucket") {
    console.error(`[v0] السبب: لا يوجد bucket باسم "${bucket}". أنشئه في لوحة Cloudflare R2.`)
  }
  process.exit(1)
}
