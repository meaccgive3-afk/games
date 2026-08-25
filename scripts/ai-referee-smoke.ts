/**
 * فحص دخان لحكم BluesMinds: يتأكد أن الاختيارات صالحة ولا تتكرر،
 * وأن سيناريو المباراة يمرّ من كل حواجز التحقق.
 * التشغيل: npx tsx scripts/ai-referee-smoke.ts
 */
import { aiMatchScenario, aiPickGift, aiPickLot } from "../lib/game/ai-referee"
import { closeLot, finishAuction, giveGift, initialState, newParticipant, openLot, placeBid } from "../lib/game/engine"
import { getPlayer } from "../lib/game/players"
import type { RoomState } from "../lib/game/types"

function makeState(): RoomState {
  const s = initialState("الحكم", 200)
  s.phase = "auction"
  for (const name of ["فريق النخبة", "أسود الملعب"]) {
    s.participants.push(newParticipant(name, 200, false))
  }
  return s
}

async function main() {
  const s = makeState()
  const [, p1, p2] = s.participants
  const seen = new Set<string>()
  let repeats = 0

  console.log("=== ١) اختيار لاعبي المزاد ===")
  for (let round = 0; round < 11; round++) {
    const pick = await aiPickLot(s)
    const pl = getPlayer(pick.playerId)!
    if (seen.has(pick.playerId)) {
      repeats++
      console.log(`!! تكرار: ${pl.name}`)
    }
    seen.add(pick.playerId)
    console.log(`${round + 1}. ${pick.slot} → ${pl.name} (${pl.rating}) — ${pick.reason} [${pick.model}]`)

    openLot(s, pick.slot, pick.playerId)
    // مزايدة بسيطة بالتناوب لتوليد فائز وخاسر
    const bidder = round % 2 === 0 ? p1 : p2
    placeBid(s, bidder.id, Math.max(1, Math.min(12, Math.round(pl.value / 12))))
    closeLot(s)

    const pendingGift = s.currentLot?.giftPendingFor ?? []
    for (const id of [...pendingGift]) {
      const gift = await aiPickGift(s, id)
      const gp = getPlayer(gift.playerId)!
      if (seen.has(gift.playerId)) {
        repeats++
        console.log(`!! تكرار في الهدية: ${gp.name}`)
      }
      seen.add(gift.playerId)
      console.log(`   هدية ← ${s.participants.find((x) => x.id === id)!.name}: ${gp.name} (${gift.slot}) — ${gift.reason}`)
      giveGift(s, id, gift.playerId, gift.slot)
    }
  }

  const missing1 = s.settings.slots.filter((sl) => !p1.squad[sl])
  const missing2 = s.settings.slots.filter((sl) => !p2.squad[sl])
  console.log(`\nمراكز ناقصة: ${p1.name}=${missing1.length} · ${p2.name}=${missing2.length}`)
  console.log(`تكرارات لاعبين: ${repeats}`)

  if (missing1.length || missing2.length) {
    console.log("التشكيلتان غير مكتملتين — أكمل بالباقي المتاح لاختبار السيناريو")
    const { availablePlayers } = await import("../lib/game/engine")
    for (const p of [p1, p2]) {
      for (const slot of s.settings.slots) {
        if (p.squad[slot]) continue
        const pool = availablePlayers(s, slot)
        if (pool.length === 0) continue
        giveGift(s, p.id, pool[0].id, slot)
      }
    }
  }

  finishAuction(s)

  console.log("\n=== ٢) سيناريو المباراة ===")
  const scenario = await aiMatchScenario(s, p1.id, p2.id)
  console.log(`الموديل: ${scenario.model} · النتيجة ${scenario.scoreA}-${scenario.scoreB}`)
  if (scenario.penalties) console.log(scenario.penalties.text)
  for (const e of scenario.events) {
    console.log(`  ${String(e.minute).padStart(2, " ")}' [${e.type}/${e.side}] ${e.scoreA}-${e.scoreB} ${e.text}`)
  }

  // تحقق نهائي مستقل عن التوليد
  const goals = scenario.events.filter((e) => e.type === "goal")
  const gA = goals.filter((e) => e.side === "A").length
  const gB = goals.filter((e) => e.side === "B").length
  const minutes = scenario.events.map((e) => e.minute)
  const sorted = minutes.every((m, i) => i === 0 || m >= minutes[i - 1])
  console.log(`\nتحقق: الأهداف تطابق النتيجة=${gA === scenario.scoreA && gB === scenario.scoreB} · الدقائق تصاعدية=${sorted}`)
  if (repeats > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error("فشل:", e instanceof Error ? e.message : e)
  process.exitCode = 1
})
