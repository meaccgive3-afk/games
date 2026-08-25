import type { PositionGroup } from "./types"

/**
 * روابط صور اللاعبين من Cloudflare R2.
 *
 * الرابط العام ليس سرًّا (CDN عام) لكنه يختلف لكل bucket، فلا يجوز تخمينه:
 * رابط مخمَّن يعني ١٧٠ طلبًا فاشلًا في كل عرض للقائمة. لذلك إن لم يُضبط
 * NEXT_PUBLIC_R2_PUBLIC_URL نُعيد سلسلة فارغة، فتعرض الكروت التقييم الرقمي
 * فورًا وبدون أي طلب شبكة. عند ضبطه يحمّل المتصفح الصور مباشرة من R2 CDN.
 */
export const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "")

/** هل الصور مُهيّأة؟ تُستعمل لتفادي إنشاء روابط ناقصة */
export const IMAGES_ENABLED = R2_PUBLIC_URL.length > 0

/** صورة اللاعب المخصّصة: players/{playerId}.png */
export function playerImageKey(playerId: string) {
  return `players/${playerId}.png`
}

export function playerImageUrl(playerId: string) {
  return IMAGES_ENABLED ? `${R2_PUBLIC_URL}/${playerImageKey(playerId)}` : ""
}

/** صورة احتياطية لكل خط، تُستعمل تلقائيًا لو صورة اللاعب غير مرفوعة بعد */
export function groupImageKey(group: PositionGroup) {
  return `players/_group-${group.toLowerCase()}.png`
}

export function groupImageUrl(group: PositionGroup) {
  return IMAGES_ENABLED ? `${R2_PUBLIC_URL}/${groupImageKey(group)}` : ""
}
