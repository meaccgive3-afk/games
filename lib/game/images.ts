import type { PositionGroup } from "./types"

/**
 * روابط صور اللاعبين من Cloudflare R2.
 *
 * الرابط العام ليس سرًّا (CDN عام)، لذلك نضع قيمة افتراضية في الكود حتى يعمل
 * الإنتاج بدون إعداد إضافي، مع إمكانية تجاوزها عبر NEXT_PUBLIC_R2_PUBLIC_URL.
 * المتصفح يحمّل الصور مباشرة من R2 — لا يمرّ أي طلب على السيرفر.
 */
export const R2_PUBLIC_URL = (
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "https://pub-1a1630472f19400d92c511fb570588f2.r2.dev"
).replace(/\/$/, "")

/** صورة اللاعب المخصّصة: players/{playerId}.png */
export function playerImageKey(playerId: string) {
  return `players/${playerId}.png`
}

export function playerImageUrl(playerId: string) {
  return `${R2_PUBLIC_URL}/${playerImageKey(playerId)}`
}

/** صورة احتياطية لكل خط، تُستعمل تلقائيًا لو صورة اللاعب غير مرفوعة بعد */
export function groupImageKey(group: PositionGroup) {
  return `players/_group-${group.toLowerCase()}.png`
}

export function groupImageUrl(group: PositionGroup) {
  return `${R2_PUBLIC_URL}/${groupImageKey(group)}`
}
