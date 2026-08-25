"use server"

import {
  allSquadsComplete,
  closeLot as closeLotFn,
  finishAuction as finishAuctionFn,
  giveGift as giveGiftFn,
  initialState,
  newParticipant,
  openLot as openLotFn,
  placeBid as placeBidFn,
  pushLog,
  skipCard as skipCardFn,
  skipGifts as skipGiftsFn,
  useCard as useCardFn,
} from "@/lib/game/engine"
import { simulateMatch } from "@/lib/game/match"
import { createRoom, loadRoom, mutateRoom } from "@/lib/game/store"
import type { PositionKey, RoomState } from "@/lib/game/types"

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

function fail(e: unknown): { ok: false; error: string } {
  const msg = e instanceof Error ? e.message : "صار خطأ غير متوقع"
  return { ok: false, error: msg }
}

export async function createRoomAction(
  name: string,
  budget: number,
): Promise<Result<{ code: string; participantId: string }>> {
  try {
    const safeBudget = Math.min(500, Math.max(20, Math.round(budget) || 100))
    const state = initialState(name, safeBudget)
    await createRoom(state)
    return { ok: true, data: { code: state.code, participantId: state.hostId } }
  } catch (e) {
    return fail(e)
  }
}

export async function joinRoomAction(
  code: string,
  name: string,
): Promise<Result<{ code: string; participantId: string }>> {
  try {
    const row = await loadRoom(code)
    if (!row) return { ok: false, error: "ما في غرفة بهذا الكود" }
    const state = row.state as RoomState
    if (state.phase !== "lobby") return { ok: false, error: "اللعبة بدأت — ما تقدر تنضم الآن" }
    if (state.participants.length >= 6) return { ok: false, error: "الغرفة كاملة" }

    let participantId = ""
    await mutateRoom(code, (s) => {
      const p = newParticipant(name, s.settings.budget, false)
      participantId = p.id
      s.participants.push(p)
      pushLog(s, `${p.name} انضم للغرفة`, "info")
    })
    return { ok: true, data: { code: code.toUpperCase(), participantId } }
  } catch (e) {
    return fail(e)
  }
}

export async function updateSettingsAction(
  code: string,
  patch: { budget?: number; minIncrement?: number; giftEnabled?: boolean; cardEnabled?: boolean },
): Promise<Result> {
  try {
    await mutateRoom(code, (s) => {
      if (s.phase !== "lobby") throw new Error("ما تقدر تعدل الإعدادات بعد البداية")
      if (typeof patch.budget === "number") {
        const b = Math.min(500, Math.max(20, Math.round(patch.budget)))
        s.settings.budget = b
        for (const p of s.participants) p.budget = b
      }
      if (typeof patch.minIncrement === "number") {
        s.settings.minIncrement = Math.min(10, Math.max(1, Math.round(patch.minIncrement)))
      }
      if (typeof patch.giftEnabled === "boolean") s.settings.giftEnabled = patch.giftEnabled
      if (typeof patch.cardEnabled === "boolean") s.settings.cardEnabled = patch.cardEnabled
    })
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function kickAction(code: string, participantId: string): Promise<Result> {
  try {
    await mutateRoom(code, (s) => {
      if (participantId === s.hostId) throw new Error("ما تقدر تطرد الحكم")
      const p = s.participants.find((x) => x.id === participantId)
      s.participants = s.participants.filter((x) => x.id !== participantId)
      if (p) pushLog(s, `${p.name} خرج من الغرفة`, "warn")
    })
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function startAuctionAction(code: string): Promise<Result> {
  try {
    await mutateRoom(code, (s) => {
      const bidders = s.participants.filter((p) => p.id !== s.hostId)
      if (bidders.length < 2) throw new Error("محتاجين مشتركين اثنين على الأقل غير الحكم")
      s.phase = "auction"
      pushLog(s, "بدأ المزاد! الحكم يفتح اللاعبين واحداً واحداً", "info")
    })
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function openLotAction(code: string, slot: PositionKey, playerId: string): Promise<Result> {
  try {
    await mutateRoom(code, (s) => {
      if (s.phase !== "auction") throw new Error("مو وقت المزاد")
      if (s.currentLot) throw new Error("في مزاد مفتوح حالياً")
      openLotFn(s, slot, playerId)
    })
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function bidAction(code: string, participantId: string, amount: number): Promise<Result> {
  try {
    await mutateRoom(code, (s) => placeBidFn(s, participantId, Math.round(amount)))
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function closeLotAction(code: string): Promise<Result> {
  try {
    await mutateRoom(code, (s) => closeLotFn(s))
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function giftAction(
  code: string,
  participantId: string,
  playerId: string,
  slot: PositionKey,
): Promise<Result> {
  try {
    await mutateRoom(code, (s) => giveGiftFn(s, participantId, playerId, slot))
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function skipGiftsAction(code: string): Promise<Result> {
  try {
    await mutateRoom(code, (s) => skipGiftsFn(s))
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function finishAuctionAction(code: string): Promise<Result> {
  try {
    await mutateRoom(code, (s) => {
      const bidders = s.participants.filter((p) => p.id !== s.hostId)
      const done = bidders.every((p) => s.settings.slots.every((slot) => Boolean(p.squad[slot])))
      if (!done && !allSquadsComplete(s)) throw new Error("في مراكز ناقصة عند بعض المشتركين")
      finishAuctionFn(s)
      pushLog(s, "انتهى المزاد — تم تعيين المدربين حسب المتبقي من الميزانية", "info")
    })
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function useCardAction(
  code: string,
  participantId: string,
  slot: PositionKey,
  newPlayerId: string,
): Promise<Result> {
  try {
    await mutateRoom(code, (s) => useCardFn(s, participantId, slot, newPlayerId))
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function skipCardAction(code: string, participantId: string): Promise<Result> {
  try {
    await mutateRoom(code, (s) => skipCardFn(s, participantId))
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function startMatchAction(
  code: string,
  aId: string,
  bId: string,
  speedMs = 650,
): Promise<Result> {
  try {
    await mutateRoom(code, (s) => {
      const a = s.participants.find((p) => p.id === aId)
      const b = s.participants.find((p) => p.id === bId)
      if (!a || !b || aId === bId) throw new Error("اختر فريقين مختلفين")
      const sim = simulateMatch(s, aId, bId)
      s.phase = "match"
      s.match = {
        running: true,
        minute: 0,
        scoreA: sim.scoreA,
        scoreB: sim.scoreB,
        events: sim.events,
        aId,
        bId,
        finished: false,
        penalties: sim.penalties,
        startedAt: Date.now() + 1500,
        speedMs: Math.min(2000, Math.max(120, Math.round(speedMs))),
      }
      pushLog(s, `انطلقت المباراة: ${a.name} ضد ${b.name}`, "info")
    })
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function endMatchAction(code: string): Promise<Result> {
  try {
    await mutateRoom(code, (s) => {
      if (!s.match) throw new Error("ما في مباراة")
      s.match.finished = true
      s.match.running = false
      s.phase = "result"
      const a = s.participants.find((p) => p.id === s.match!.aId)
      const b = s.participants.find((p) => p.id === s.match!.bId)
      const { scoreA, scoreB, penalties } = s.match
      let text = `النتيجة النهائية: ${a?.name} ${scoreA} - ${scoreB} ${b?.name}`
      if (penalties) text += ` — ${penalties.text}`
      pushLog(s, text, "sold")
    })
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function backToLobbyAction(code: string): Promise<Result> {
  try {
    await mutateRoom(code, (s) => {
      s.phase = "lobby"
      s.match = null
      s.currentLot = null
      s.taken = []
      s.coaches = {}
      for (const p of s.participants) {
        p.squad = {}
        p.spent = 0
        p.cardUsed = false
        p.budget = s.settings.budget
      }
      pushLog(s, "جولة جديدة — رجعنا لغرفة الانتظار", "info")
    })
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
