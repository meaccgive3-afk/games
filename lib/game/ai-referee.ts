import { chatJson } from "@/lib/ai/bluesminds"
import { availablePlayers, remainingBudget, teamStrength } from "./engine"
import { getPlayer } from "./players"
import { POSITION_LABELS, SLOT_GROUP } from "./types"
import type { MatchEvent, Participant, Player, PositionKey, RoomState } from "./types"

/* ------------------------------------------------------------------ */
/* أدوات مساعدة                                                        */
/* ------------------------------------------------------------------ */

const SYSTEM_REFEREE = `أنت "الحكم" في لعبة مزاد كرة قدم عربية.
مهمتك اتخاذ قرارات عادلة ومتنوعة ومسلية.
قواعد صارمة لا تخالفها أبداً:
1. لا تختر إلا من قائمة المرشحين المعطاة لك، وباستخدام الحقل id حرفياً كما هو.
2. لا تخترع لاعباً أو معرّفاً غير موجود في القائمة.
3. لا تكرر لاعباً سبق أخذه — القائمة المعطاة لك أصلاً منظّفة، فالتزم بها.
4. أجب بـ JSON فقط بدون أي شرح خارج الـ JSON وبدون أسوار كود.
5. كل النصوص العربية تكون فصحى مبسطة وقصيرة.`

/** قائمة مرشحين مضغوطة لتقليل التوكِنز */
function candidateLines(list: Player[], limit: number) {
  return list
    .slice(0, limit)
    .map((p) => `${p.id}|${p.name}|${p.club}|تقييم ${p.rating}|قيمة ${p.value}م`)
    .join("\n")
}

/** خلط + ترتيب متنوع حتى لا يقترح الموديل نفس النجوم كل مرة */
function diversePool(list: Player[], limit: number) {
  const sorted = [...list].sort((a, b) => b.rating - a.rating)
  const top = sorted.slice(0, Math.ceil(limit * 0.45))
  const rest = sorted.slice(Math.ceil(limit * 0.45))
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return [...top, ...rest.slice(0, limit - top.length)]
}

function bidders(state: RoomState) {
  return state.participants.filter((p) => p.id !== state.hostId)
}

/** المراكز التي ما زال أحد المزايدين يحتاجها */
export function openSlots(state: RoomState): PositionKey[] {
  const list = bidders(state)
  return state.settings.slots.filter((s) => list.some((p) => !p.squad[s]))
}

function squadLines(state: RoomState, p: Participant) {
  return state.settings.slots
    .map((slot) => {
      const entry = p.squad[slot]
      const pl = entry ? getPlayer(entry.playerId) : null
      if (!pl) return `${POSITION_LABELS[slot]}: (فارغ)`
      return `${POSITION_LABELS[slot]}: ${pl.name} (${pl.club}, تقييم ${pl.rating})`
    })
    .join("\n")
}

function squadNames(state: RoomState, p: Participant) {
  const out: string[] = []
  for (const slot of state.settings.slots) {
    const entry = p.squad[slot]
    const pl = entry ? getPlayer(entry.playerId) : null
    if (pl) out.push(pl.name)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* ١) اختيار لاعب المزاد القادم                                        */
/* ------------------------------------------------------------------ */

export interface LotPick {
  slot: PositionKey
  playerId: string
  reason: string
  model: string
}

export async function aiPickLot(state: RoomState, forcedSlot?: PositionKey): Promise<LotPick> {
  const slots = forcedSlot ? [forcedSlot] : openSlots(state)
  if (slots.length === 0) throw new Error("ما في مراكز ناقصة — المزاد اكتمل")

  // نبني مرشحين لكل مركز مفتوح (بعد استبعاد المأخوذين)
  const perSlot = new Map<PositionKey, Player[]>()
  for (const slot of slots) {
    const pool = availablePlayers(state, slot)
    if (pool.length > 0) perSlot.set(slot, diversePool(pool, 26))
  }
  if (perSlot.size === 0) throw new Error("ما في لاعبين متاحين في المراكز الناقصة")

  const budgetLines = bidders(state)
    .map(
      (p) =>
        `${p.name}: متبقي ${remainingBudget(p)}م، مكتمل ${Object.keys(p.squad).length}/${state.settings.slots.length}` +
        `، ناقص: ${state.settings.slots.filter((s) => !p.squad[s]).map((s) => POSITION_LABELS[s]).join("، ") || "لا شيء"}`,
    )
    .join("\n")

  const slotBlocks = [...perSlot.entries()]
    .map(([slot, list]) => `### المركز ${slot} (${POSITION_LABELS[slot]})\n${candidateLines(list, 26)}`)
    .join("\n\n")

  const recent = state.log
    .filter((l) => l.kind === "sold" || l.kind === "gift")
    .slice(-8)
    .map((l) => `- ${l.text}`)
    .join("\n")

  const user = `اختر اللاعب القادم الذي يُطرح في المزاد.

## ميزانيات المزايدين
${budgetLines}

## آخر ما حصل
${recent || "- لا شيء بعد"}

## المرشحون المتاحون (اختر واحداً فقط من هذه القوائم)
${slotBlocks}

## معايير القرار
- فضّل مركزاً ما زال ناقصاً عند أكبر عدد من المزايدين ليكون المزاد تنافسياً.
- نوّع بين النجوم واللاعبين المتوسطين حسب الميزانيات المتبقية؛ لا تطرح نجماً بقيمة 150م إذا كانت الميزانيات المتبقية صغيرة.
- لا تعطِ نفس النادي مراراً في الطروحات المتتابعة.

أعد JSON بهذا الشكل بالضبط:
{"slot":"<مفتاح المركز مثل GK أو CM1>","playerId":"<id من القائمة>","reason":"<سبب قصير بالعربية لا يزيد عن 12 كلمة>"}`

  const { data, model } = await chatJson(
    { system: SYSTEM_REFEREE, user, maxTokens: 300, temperature: 0.9 },
    (value) => {
      const v = value as Record<string, unknown>
      const slot = String(v?.slot ?? "") as PositionKey
      const playerId = String(v?.playerId ?? "").trim()
      const list = perSlot.get(slot)
      if (!list) throw new Error(`مركز غير مسموح: ${slot}`)
      const chosen = list.find((p) => p.id === playerId)
      if (!chosen) throw new Error(`معرّف لاعب غير موجود في قائمة ${slot}: ${playerId}`)
      // حواجز أمان مزدوجة ضد التكرار
      if (state.taken.includes(playerId)) throw new Error("اللاعب مأخوذ مسبقاً")
      if (chosen.group !== SLOT_GROUP[slot]) throw new Error("اللاعب لا يناسب المركز")
      const reason = String(v?.reason ?? "").slice(0, 120) || "قرار الحكم"
      return { slot, playerId, reason }
    },
  )

  return { ...data, model }
}

/* ------------------------------------------------------------------ */
/* ٢) اختيار هدية لمن خسر المزاد                                       */
/* ------------------------------------------------------------------ */

export interface GiftPick {
  slot: PositionKey
  playerId: string
  reason: string
  model: string
}

export async function aiPickGift(state: RoomState, participantId: string): Promise<GiftPick> {
  const target = state.participants.find((p) => p.id === participantId)
  if (!target) throw new Error("مشترك غير موجود")

  const emptySlots = state.settings.slots.filter((s) => !target.squad[s])
  if (emptySlots.length === 0) throw new Error(`${target.name} تشكيلته مكتملة`)

  const perSlot = new Map<PositionKey, Player[]>()
  for (const slot of emptySlots) {
    const pool = availablePlayers(state, slot)
    // الهدية مجانية — نستبعد أعلى ٪١٥ قيمةً حتى لا تكون الهدية أقوى من المزاد نفسه
    const trimmed = [...pool].sort((a, b) => a.value - b.value).slice(0, Math.max(6, Math.floor(pool.length * 0.85)))
    if (trimmed.length > 0) perSlot.set(slot, diversePool(trimmed, 22))
  }
  if (perSlot.size === 0) throw new Error("ما في لاعبين متاحين للهدية")

  const lot = state.currentLot
  const lostPlayer = lot ? getPlayer(lot.playerId) : null

  const slotBlocks = [...perSlot.entries()]
    .map(([slot, list]) => `### المركز ${slot} (${POSITION_LABELS[slot]})\n${candidateLines(list, 22)}`)
    .join("\n\n")

  const user = `أنت الحكم. ${target.name} خسر المزاد على ${lostPlayer?.name ?? "اللاعب السابق"}، فيستحق لاعباً مجانياً كتعويض.

## تشكيلة ${target.name} الحالية
${squadLines(state, target)}

## ميزانيته
متبقي ${remainingBudget(target)}م من ${target.budget}م

## المرشحون المتاحون (اختر واحداً فقط)
${slotBlocks}

## معايير القرار
- التعويض عادل: لاعب جيد يسدّ ثغرة حقيقية في تشكيلته، وليس نجماً يقلب التوازن.
- فضّل مركزاً فارغاً يصعب عليه شراؤه بميزانيته المتبقية.
- راعِ الانسجام: لاعب من نادٍ موجود في تشكيلته ميزة إضافية.

أعد JSON بهذا الشكل بالضبط:
{"slot":"<مفتاح المركز>","playerId":"<id من القائمة>","reason":"<سبب قصير بالعربية لا يزيد عن 14 كلمة>"}`

  const { data, model } = await chatJson(
    { system: SYSTEM_REFEREE, user, maxTokens: 300, temperature: 0.85 },
    (value) => {
      const v = value as Record<string, unknown>
      const slot = String(v?.slot ?? "") as PositionKey
      const playerId = String(v?.playerId ?? "").trim()
      const list = perSlot.get(slot)
      if (!list) throw new Error(`مركز غير مسموح للهدية: ${slot}`)
      const chosen = list.find((p) => p.id === playerId)
      if (!chosen) throw new Error(`معرّف غير موجود: ${playerId}`)
      if (state.taken.includes(playerId)) throw new Error("اللاعب مأخوذ مسبقاً")
      if (target.squad[slot]) throw new Error("المركز مشغول")
      if (chosen.group !== SLOT_GROUP[slot]) throw new Error("اللاعب لا يناسب المركز")
      const reason = String(v?.reason ?? "").slice(0, 140) || "تعويض من الحكم"
      return { slot, playerId, reason }
    },
  )

  return { ...data, model }
}

/* ------------------------------------------------------------------ */
/* ٣) سيناريو المباراة                                                 */
/* ------------------------------------------------------------------ */

const ALLOWED_TYPES = new Set(["goal", "chance", "save", "card", "foul", "corner", "sub"])

export interface AiScenario {
  events: MatchEvent[]
  scoreA: number
  scoreB: number
  penalties: { a: number; b: number; text: string } | null
  model: string
}

export async function aiMatchScenario(state: RoomState, aId: string, bId: string): Promise<AiScenario> {
  const a = state.participants.find((p) => p.id === aId)
  const b = state.participants.find((p) => p.id === bId)
  if (!a || !b || aId === bId) throw new Error("اختر فريقين مختلفين")

  const sa = teamStrength(state, a)
  const sb = teamStrength(state, b)
  const namesA = squadNames(state, a)
  const namesB = squadNames(state, b)
  if (namesA.length === 0 || namesB.length === 0) throw new Error("في تشكيلة فاضية")

  const setA = new Set(namesA)
  const setB = new Set(namesB)
  const coachA = state.coaches[a.id]?.name ?? "بدون مدرب"
  const coachB = state.coaches[b.id]?.name ?? "بدون مدرب"

  const system = `أنت معلّق ومحلل كرة قدم عربي، وأنت من يكتب سيناريو المباراة كاملاً.
قواعد صارمة لا تخالفها أبداً:
1. لا تذكر في الحقل player إلا اسماً موجوداً حرفياً في تشكيلة الفريق نفسه.
2. لا تخترع أسماء لاعبين، ولا تنقل لاعباً من فريق لفريق.
3. الدقائق أعداد صحيحة بين 1 و 90، تصاعدية، ولا تتكرر دقيقة مرتين.
4. لا يسجل نفس اللاعب أكثر من ثلاثة أهداف.
5. النتيجة يجب أن تكون منطقية مقارنة بقوة الفريقين، ومجموع الأهداف لا يزيد عن 7.
6. أجب بـ JSON فقط بدون أي نص خارج الـ JSON وبدون أسوار كود.`

  const user = `اكتب سيناريو مباراة بين فريقين.

## الفريق A — ${a.name} (المدرب: ${coachA})
${squadLines(state, a)}
القوة: هجوم ${sa.attack} · وسط ${sa.midfield} · دفاع ${sa.defense} · حراسة ${sa.keeper} · عام ${sa.overall} · انسجام ${sa.chemistry}

## الفريق B — ${b.name} (المدرب: ${coachB})
${squadLines(state, b)}
القوة: هجوم ${sb.attack} · وسط ${sb.midfield} · دفاع ${sb.defense} · حراسة ${sb.keeper} · عام ${sb.overall} · انسجام ${sb.chemistry}

## أسماء مسموحة للفريق A فقط
${namesA.join(" · ")}

## أسماء مسموحة للفريق B فقط
${namesB.join(" · ")}

## المطلوب
من 14 إلى 24 حدثاً موزعة على الشوطين (لا تكتب حدث البداية ولا صافرة النهاية، سنضيفهما نحن).
الأنواع المسموحة: goal (هدف) · chance (فرصة مهدرة) · save (تصدٍّ) · corner (ركنية) · foul (مخالفة) · card (بطاقة) · sub (تبديل).
- side يكون "A" أو "B" ويعني الفريق صاحب الحدث.
- في حدث goal يكون player هو المسجّل من نفس الفريق صاحب side.
- في حدث save يكون player هو حارس الفريق صاحب side (أي الفريق المدافع).
- في foul و card يكون player من الفريق صاحب side.
- text تعليق عربي حيّ من 6 إلى 18 كلمة يذكر اسم اللاعب.
- الفريق الأقوى هجوماً يجب أن تكون فرصه وأهدافه أكثر، لكن اسمح بمفاجأة معقولة.
- إذا تعادل الفريقان في الأهداف، أضف penalties بنتيجة ركلات ترجيح غير متعادلة.

أعد JSON بهذا الشكل بالضبط:
{"headline":"<عنوان قصير للمباراة>","events":[{"minute":7,"type":"goal","side":"A","player":"<اسم من تشكيلة A>","text":"<تعليق>"}],"penalties":{"a":4,"b":3}}
إذا لم يكن هناك تعادل، اجعل penalties هي null.`

  const { data, model } = await chatJson(
    { system, user, maxTokens: 2600, temperature: 0.95, attempts: 2 },
    (value) => {
      const v = value as Record<string, unknown>
      const rawEvents = v?.events
      if (!Array.isArray(rawEvents)) throw new Error("events ليست مصفوفة")
      if (rawEvents.length < 8) throw new Error(`عدد الأحداث قليل: ${rawEvents.length}`)

      interface Raw {
        minute: number
        type: string
        side: "A" | "B"
        player: string
        text: string
      }

      const cleaned: Raw[] = []
      for (const item of rawEvents) {
        const e = item as Record<string, unknown>
        const minute = Math.round(Number(e?.minute))
        const type = String(e?.type ?? "").trim()
        const side = String(e?.side ?? "").trim().toUpperCase()
        const player = String(e?.player ?? "").trim()
        const text = String(e?.text ?? "").trim()

        if (!Number.isFinite(minute) || minute < 1 || minute > 90) throw new Error(`دقيقة غير صالحة: ${e?.minute}`)
        if (!ALLOWED_TYPES.has(type)) throw new Error(`نوع حدث غير مسموح: ${type}`)
        if (side !== "A" && side !== "B") throw new Error(`side غير صالح: ${e?.side}`)
        if (!text || text.length < 8) throw new Error("تعليق قصير جداً أو فارغ")

        // الاسم يجب أن يكون من الفريق الصحيح
        const own = side === "A" ? setA : setB
        if (!player) throw new Error(`حدث بلا اسم لاعب في الدقيقة ${minute}`)
        if (!own.has(player)) {
          const other = side === "A" ? setB : setA
          throw new Error(
            other.has(player)
              ? `اللاعب ${player} ليس في الفريق ${side}`
              : `اللاعب ${player} غير موجود في أي تشكيلة`,
          )
        }
        if (!text.includes(player)) throw new Error(`التعليق لا يذكر ${player}`)

        cleaned.push({ minute, type, side: side as "A" | "B", player, text })
      }

      // ترتيب زمني + منع تكرار الدقيقة
      cleaned.sort((x, y) => x.minute - y.minute)
      const usedMinutes = new Set<number>()
      for (const e of cleaned) {
        while (usedMinutes.has(e.minute) && e.minute < 90) e.minute++
        if (usedMinutes.has(e.minute)) throw new Error("تعذّر فضّ تكرار الدقائق")
        usedMinutes.add(e.minute)
      }
      cleaned.sort((x, y) => x.minute - y.minute)

      // تحقق من الأهداف: العدّاد نحسبه نحن، لا نثق برد الموديل
      const goalsByPlayer = new Map<string, number>()
      let goals = 0
      for (const e of cleaned) {
        if (e.type !== "goal") continue
        goals++
        const n = (goalsByPlayer.get(e.player) ?? 0) + 1
        goalsByPlayer.set(e.player, n)
        if (n > 3) throw new Error(`${e.player} سجّل ${n} أهداف — غير منطقي`)
      }
      if (goals > 7) throw new Error(`أهداف كثيرة جداً: ${goals}`)

      let scoreA = 0
      let scoreB = 0
      const events: MatchEvent[] = [
        {
          minute: 0,
          type: "kickoff",
          side: "none",
          text: `انطلقت المباراة! ${a.name} ضد ${b.name}`,
          scoreA: 0,
          scoreB: 0,
        },
      ]

      let halfAdded = false
      for (const e of cleaned) {
        if (!halfAdded && e.minute > 45) {
          events.push({
            minute: 45,
            type: "half",
            side: "none",
            text: `نهاية الشوط الأول — ${scoreA} : ${scoreB}`,
            scoreA,
            scoreB,
          })
          halfAdded = true
        }
        if (e.type === "goal") {
          if (e.side === "A") scoreA++
          else scoreB++
        }
        events.push({
          minute: e.minute,
          type: e.type as MatchEvent["type"],
          side: e.side,
          text: e.text,
          scoreA,
          scoreB,
        })
      }
      if (!halfAdded) {
        events.push({
          minute: 45,
          type: "half",
          side: "none",
          text: `نهاية الشوط الأول — ${scoreA} : ${scoreB}`,
          scoreA,
          scoreB,
        })
      }

      // ركلات الترجيح — نضبطها بأنفسنا حتى لا تخرج نتيجة متعادلة
      let penalties: { a: number; b: number; text: string } | null = null
      if (scoreA === scoreB) {
        const raw = v?.penalties as Record<string, unknown> | null | undefined
        let pa = Math.round(Number(raw?.a))
        let pb = Math.round(Number(raw?.b))
        const valid = (n: number) => Number.isFinite(n) && n >= 0 && n <= 12
        if (!valid(pa) || !valid(pb) || pa === pb) {
          pa = 4
          pb = 3
          const strongerA = sa.overall >= sb.overall
          if (!strongerA) [pa, pb] = [pb, pa]
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

      return { events, scoreA, scoreB, penalties }
    },
  )

  return { ...data, model }
}
