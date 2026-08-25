import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const bucket = process.env.R2_BUCKET

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
} catch (error) {
  console.log("[v0] FAIL:", error.name, "-", error.message)
}
