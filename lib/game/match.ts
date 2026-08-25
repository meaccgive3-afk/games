import { getPlayer } from "./players"
import { SLOT_GROUP } from "./types"
import { teamStrength } from "./engine"
import type { MatchEvent, Participant, RoomState } from "./types"

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function attackerNames(state: RoomState, p: Participant) {
  const names: string[] = []
  for (const slot of state.settings.slots) {
    if (SLOT_GROUP[slot] === "ATT" || SLOT_GROUP[slot] === "MID") {
      const e = p.squad[slot]
      const pl = e ? getPlayer(e.playerId) : null
      if (pl) names.push(pl.name)
    }
  }
  return names.length ? names : ["أحد اللاعبين"]
}

function defenderNames(state: RoomState, p: Participant) {
  const names: string[] = []
  for (const slot of state.settings.slots) {
    if (SLOT_GROUP[slot] === "DEF") {
      const e = p.squad[slot]
      const pl = e ? getPlayer(e.playerId) : null
      if (pl) names.push(pl.name)
    }
  }
  return names.length ? names : ["الدفاع"]
}

function keeperName(state: RoomState, p: Participant) {
  const e = p.squad.GK
  const pl = e ? getPlayer(e.playerId) : null
  return pl?.name ?? "الحارس"
}

const GOAL_TEMPLATES = [
  (s: string, a: string) => `${a} يسكنها في الشباك! هدف رائع لفريق ${s}`,
  (s: string, a: string) => `تسديدة صاروخية من ${a} — لا شيء يوقفها! ${s} يتقدم`,
  (s: string, a: string) => `${a} يخترق الدفاع ويضعها في الزاوية البعيدة لصالح ${s}`,
  (s: string, a: string) => `رأسية مثالية من ${a}! ${s} يحتفل`,
  (s: string, a: string) => `${a} يستغل خطأ الدفاع ويسجل لـ ${s}`,
]

const CHANCE_TEMPLATES = [
  (a: string, k: string) => `${a} يسدد لكن ${k} يتصدى ببراعة`,
  (a: string) => `${a} يهدر فرصة محققة — الكرة تمر بجانب القائم`,
  (a: string) => `تمريرة بينية ذكية لـ ${a} لكن الراية ترفع للتسلل`,
  (a: string, k: string) => `${k} يخرج بشكل صحيح ويبعد الكرة قبل وصول ${a}`,
]

const FOUL_TEMPLATES = [
  (d: string) => `${d} يرتكب مخالفة في منتصف الملعب`,
  (d: string) => `تدخل قوي من ${d} — الحكم ينبهه`,
  (d: string) => `بطاقة صفراء لـ ${d} بعد إعاقة الهجمة`,
]

/**
 * محاكاة كاملة (٩٠ دقيقة) تُحسب مرة واحدة، ثم تُشغَّل في الواجهة دقيقة بدقيقة.
 */
export function simulateMatch(state: RoomState, aId: string, bId: string) {
  const a = state.participants.find((p) => p.id === aId)!
  const b = state.participants.find((p) => p.id === bId)!
  const sa = teamStrength(state, a)
  const sb = teamStrength(state, b)

  const events: MatchEvent[] = []
  let scoreA = 0
  let scoreB = 0

  events.push({
    minute: 0,
    type: "kickoff",
    side: "none",
    text: `انطلقت المباراة! ${a.name} ضد ${b.name}`,
    scoreA,
    scoreB,
  })

  // احتمالية الهجمة لكل دقيقة تعتمد على فرق القوة
  const powerA = sa.attack * 1.15 + sa.midfield
  const powerB = sb.attack * 1.15 + sb.midfield
  const resistA = sa.defense * 1.1 + sa.keeper * 0.9
  const resistB = sb.defense * 1.1 + sb.keeper * 0.9

  for (let minute = 1; minute <= 90; minute++) {
    if (minute === 45) {
      events.push({
        minute,
        type: "half",
        side: "none",
        text: `نهاية الشوط الأول — ${scoreA} : ${scoreB}`,
        scoreA,
        scoreB,
      })
      continue
    }

    const roll = Math.random()
    if (roll > 0.34) continue

    const aShare = powerA / (powerA + powerB)
    const attackingA = Math.random() < aShare
    const atk = attackingA ? powerA : powerB
    const def = attackingA ? resistB : resistA
    const side: "A" | "B" = attackingA ? "A" : "B"
    const team = attackingA ? a : b
    const oppo = attackingA ? b : a

    const goalChance = Math.max(0.05, Math.min(0.55, 0.22 + (atk - def) / 120))
    const outcome = Math.random()

    if (outcome < goalChance) {
      if (attackingA) scoreA++
      else scoreB++
      const scorer = pick(attackerNames(state, team))
      events.push({
        minute,
        type: "goal",
        side,
        text: pick(GOAL_TEMPLATES)(team.name, scorer),
        scoreA,
        scoreB,
      })
    } else if (outcome < goalChance + 0.32) {
      const atkName = pick(attackerNames(state, team))
      const gk = keeperName(state, oppo)
      const tpl = pick(CHANCE_TEMPLATES)
      events.push({
        minute,
        type: Math.random() < 0.5 ? "save" : "chance",
        side,
        text: tpl(atkName, gk),
        scoreA,
        scoreB,
      })
    } else if (outcome < goalChance + 0.46) {
      events.push({
        minute,
        type: "corner",
        side,
        text: `ركنية لصالح ${team.name} — الكرة تُبعد من منطقة الجزاء`,
        scoreA,
        scoreB,
      })
    } else if (outcome < goalChance + 0.58) {
      const d = pick(defenderNames(state, oppo))
      events.push({
        minute,
        type: Math.random() < 0.4 ? "card" : "foul",
        side: attackingA ? "B" : "A",
        text: pick(FOUL_TEMPLATES)(d),
        scoreA,
        scoreB,
      })
    }
  }

  let penalties: { a: number; b: number; text: string } | null = null
  if (scoreA === scoreB) {
    let pa = 0
    let pb = 0
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.5 + (sa.overall - sb.overall) / 100) pa++
      if (Math.random() < 0.5 + (sb.overall - sa.overall) / 100) pb++
    }
    while (pa === pb) {
      if (Math.random() < 0.5 + (sa.overall - sb.overall) / 100) pa++
      if (Math.random() < 0.5 + (sb.overall - sa.overall) / 100) pb++
    }
    penalties = { a: pa, b: pb, text: `ركلات الترجيح انتهت ${pa} - ${pb}` }
  }

  events.push({
    minute: 90,
    type: "end",
    side: "none",
    text: `صافرة النهاية! ${a.name} ${scoreA} - ${scoreB} ${b.name}`,
    scoreA,
    scoreB,
  })

  return { events, scoreA, scoreB, penalties, strengthA: sa, strengthB: sb }
}
