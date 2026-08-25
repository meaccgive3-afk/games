/**
 * رفع صور اللاعبين إلى Cloudflare R2.
 *
 * الاستخدام:
 *   node --env-file-if-exists=.env.local scripts/upload-player-images.mjs ./incoming
 *
 * السلوك:
 *   - كل ملف اسمه {playerId}.{png|jpg|jpeg|webp} يُرفع إلى players/{playerId}.png-style key
 *   - يتخطّى أي صورة موجودة مسبقًا في الـbucket (استكمال آمن بعد التوقّف)
 *   - Content-Type صحيح، تقدّم مباشر، وتقرير أخطاء في النهاية
 *   - يعمل مع ٤٨ أو ١٠٠٠+ لاعبًا بدون أي تغيير في الكود
 *
 * الخيارات:
 *   --force        أعِد الرفع حتى لو الصورة موجودة
 *   --concurrency  عدد الرفعات المتزامنة (افتراضي ٨)
 */
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

const BUCKET = process.env.R2_BUCKET ?? "mzad-players"
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY

if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error("[upload] missing R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in the environment")
  process.exit(1)
}

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith("--")) ?? "./incoming"
const force = args.includes("--force")
const concurrency = Number(args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] ?? 8)

const CONTENT_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
}

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_S3_ENDPOINT ?? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
})

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

async function main() {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    console.error(`[upload] cannot read directory: ${dir}`)
    process.exit(1)
  }

  const files = entries
    .filter((e) => e.isFile() && CONTENT_TYPES[path.extname(e.name).toLowerCase()])
    .map((e) => e.name)

  if (files.length === 0) {
    console.log(`[upload] no image files found in ${dir}`)
    return
  }

  console.log(`[upload] ${files.length} image(s) found in ${dir} -> r2://${BUCKET}/players/`)

  const stats = { uploaded: 0, skipped: 0, failed: 0 }
  const errors = []
  let cursor = 0

  async function worker() {
    while (cursor < files.length) {
      const file = files[cursor++]
      const ext = path.extname(file).toLowerCase()
      // اسم الملف النهائي ثابت بناءً على playerId، مع الحفاظ على الامتداد الأصلي
      const playerId = path.basename(file, ext)
      const key = `players/${playerId}${ext}`

      try {
        if (!force && (await exists(key))) {
          stats.skipped++
          continue
        }
        const body = await readFile(path.join(dir, file))
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: body,
            ContentType: CONTENT_TYPES[ext],
            CacheControl: "public, max-age=31536000, immutable",
          }),
        )
        stats.uploaded++
      } catch (err) {
        stats.failed++
        errors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`)
      }

      const done = stats.uploaded + stats.skipped + stats.failed
      if (done % 10 === 0 || done === files.length) {
        console.log(`[upload] ${done}/${files.length} — uploaded ${stats.uploaded}, skipped ${stats.skipped}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker))

  console.log(`\n[upload] done — uploaded ${stats.uploaded}, skipped ${stats.skipped}, failed ${stats.failed}`)
  if (errors.length) {
    console.log("[upload] errors:")
    for (const e of errors.slice(0, 20)) console.log("  - " + e)
    process.exitCode = 1
  }
}

main()
