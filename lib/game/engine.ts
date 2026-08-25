import { PLAYERS, getPlayer } from "./players"
import { coachForRemaining } from "./coaches"
import { DEFAULT_SLOTS, SLOT_GROUP, POSITION_LABELS } from "./types"
import type { LogEntry, Participant, PositionKey, RoomState } from "./types"

export function makeCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 5; i++) out += letters[Math.floor(Math.random() * letters.length)]
  return out
}

export function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

export function newParticipant(name: string, budget: number, isHost: boolean): Participant {
  return {
    id: makeId(),
    name: name.trim().slice(0, 24) || "لاعب",
    isHost,
    budget,
    spent: 0,
    squad: {},
    cardUsed: false,
    lastSeen: Date.now(),
  }
}

export function initialState(hostName: string, budget: number): RoomState {
  const host = newParticipant(hostName, budget, true)
  return {
    code: makeCode(),
    phase: "lobby",
    hostId: host.id,
    createdAt: Date.now(),
    settings: {
      budget,
      minIncrement: 1,
      timerSeconds: 20,
      giftEnabled: true,
      cardEnabled: true,
      slots: [...DEFAULT_SLOTS],
    },
    participants: [host],
    taken: [],
    currentLot: null,
    log: [{ at: Date.now(), text: `تم إنشاء الغرفة بواسطة ${host.name}`, kind: "info" }],
    coaches: {},
    match: null,
  }
}

export function pushLog(state: RoomState, text: string, kind: LogEntry["kind"] = "info") {
  state.log.push({ at: Date.now(), text, kind })
  if (state.log.length > 400) state.log = state.log.slice(-400)
}

export function remainingBudget(p: Participant) {
  return p.budget - p.spent
}

/** أعلى مزايدة حالية */
export function topBid(state: RoomState) {
  const lot = state.currentLot
  if (!lot || lot.bids.length === 0) return null
  return lot.bids[lot.bids.length - 1]
}

/** الحد الأقصى الذي يمكن للمشترك دفعه مع ترك مليون لكل مركز فاضي */
export function maxAffordable(state: RoomState, p: Participant) {
  const slots = state.settings.slots
  const filled = Object.keys(p.squad).length
  const remainingSlotsAfterThis = Math.max(0, slots.length - filled - 1)
  return Math.max(0, remainingBudget(p) - remainingSlotsAfterThis * state.settings.minIncrement)
}

export function nextEmptySlot(state: RoomState, p: Participant): PositionKey | null {
  for (const s of state.settings.slots) if (!p.squad[s]) return s
  return null
}

export function availablePlayers(state: RoomState, slot: PositionKey) {
  const group = SLOT_GROUP[slot]
  return PLAYERS.filter((p) => p.group === group && !state.taken.includes(p.id))
}

/** بدء مزاد على لاعب في مركز */
export function openLot(state: RoomState, slot: PositionKey, playerId: string) {
  const player = getPlayer(playerId)
  if (!player) throw new Error("لاعب غير موجود")
  state.currentLot = {
    slot,
    playerId,
    bids: [],
    minIncrement: state.settings.minIncrement,
    status: "open",
  }
  pushLog(state, `المزاد مفتوح على ${player.name} لمركز ${POSITION_LABELS[slot]}`, "info")
}

export function placeBid(state: RoomState, participantId: string, amount: number) {
  const lot = state.currentLot
  if (!lot || lot.status !== "open") throw new Error("لا يوجد مزاد مفتوح")
  const p = state.participants.find((x) => x.id === participantId)
  if (!p) throw new Error("مشترك غير موجود")
  if (p.id === state.hostId) throw new Error("الحكم لا يزايد")
  if (p.squad[lot.slot]) throw new Error("عندك لاعب في هذا المركز")

  const top = topBid(state)
  const minNext = top ? top.amount + lot.minIncrement : lot.minIncrement
  if (amount < minNext) throw new Error(`أقل مزايدة مسموحة ${minNext} مليون`)
  const cap = maxAffordable(state, p)
  if (amount > cap) throw new Error(`ميزانيتك لا تسمح — أقصى مبلغ ${cap} مليون`)
  if (top && top.participantId === participantId) throw new Error("أنت صاحب أعلى مزايدة")

  lot.bids.push({ participantId, amount, at: Date.now() })
  pushLog(state, `${p.name} زايد بـ ${amount} مليون`, "info")
}

/** إغلاق المزاد: الفائز يأخذ اللاعب، والباقي ينتظر هدية من الحكم */
export function closeLot(state: RoomState) {
  const lot = state.currentLot
  if (!lot || lot.status !== "open") throw new Error("لا يوجد مزاد مفتوح")
  const player = getPlayer(lot.playerId)!
  const top = topBid(state)

  if (!top) {
    lot.status = "closed"
    pushLog(state, `لم يزايد أحد على ${player.name} — سُحب من المزاد`, "warn")
    state.taken.push(lot.playerId)
    state.currentLot = null
    return
  }

  const winner = state.participants.find((x) => x.id === top.participantId)!
  winner.squad[lot.slot] = { playerId: lot.playerId, price: top.amount }
  winner.spent += top.amount
  state.taken.push(lot.playerId)

  lot.status = "closed"
  lot.winnerId = winner.id
  lot.price = top.amount
  pushLog(state, `${player.name} من نصيب ${winner.name} بـ ${top.amount} مليون`, "sold")

  const losers = state.participants.filter(
    (p) => p.id !== winner.id && p.id !== state.hostId && !p.squad[lot.slot],
  )
  if (state.settings.giftEnabled && losers.length > 0) {
    lot.giftPendingFor = losers.map((p) => p.id)
  } else {
    state.currentLot = null
  }
}

/** الحكم يعطي لاعباً مجانياً لمن خسر المزاد */
export function giveGift(state: RoomState, participantId: string, playerId: string, slot: PositionKey) {
  const p = state.participants.find((x) => x.id === participantId)
  if (!p) throw new Error("مشترك غير موجود")
  if (p.squad[slot]) throw new Error("المركز مشغول")
  if (state.taken.includes(playerId)) throw new Error("اللاعب مأخوذ")
  const player = getPlayer(playerId)
  if (!player) throw new Error("لاعب غير موجود")
  if (player.group !== SLOT_GROUP[slot]) throw new Error("اللاعب لا يناسب المركز")

  p.squad[slot] = { playerId, price: 0, free: true }
  state.taken.push(playerId)
  pushLog(state, `الحكم منح ${p.name} اللاعب ${player.name} مجاناً لمركز ${POSITION_LABELS[slot]}`, "gift")

  const lot = state.currentLot
  if (lot?.giftPendingFor) {
    lot.giftPendingFor = lot.giftPendingFor.filter((id) => id !== participantId)
    if (lot.giftPendingFor.length === 0) state.currentLot = null
  }
}

export function skipGifts(state: RoomState) {
  if (state.currentLot) state.currentLot = null
}

export function squadComplete(state: RoomState, p: Participant) {
  return state.settings.slots.every((s) => Boolean(p.squad[s]))
}

export function allSquadsComplete(state: RoomState) {
  return state.participants.every((p) => squadComplete(state, p))
}

/** انتهاء المزاد → تعيين المدربين والدخول لمرحلة الكروت */
export function finishAuction(state: RoomState) {
  state.coaches = {}
  for (const p of state.participants) {
    if (p.id === state.hostId) continue
    const coach = coachForRemaining(remainingBudget(p))
    state.coaches[p.id] = { name: coach.name, tier: coach.tier, boost: coach.boost }
    pushLog(state, `${p.name} حصل على المدرب ${coach.name} (${coach.tier})`, "info")
  }
  state.currentLot = null
  state.phase = state.settings.cardEnabled ? "cards" : "match"
}

/** الكرت الخاص: حذف لاعب واستبداله بلاعب يختاره الحكم */
export function useCard(
  state: RoomState,
  participantId: string,
  slot: PositionKey,
  newPlayerId: string,
) {
  const p = state.participants.find((x) => x.id === participantId)
  if (!p) throw new Error("مشترك غير موجود")
  if (p.cardUsed) throw new Error("الكرت مستخدم")
  const entry = p.squad[slot]
  if (!entry) throw new Error("لا يوجد لاع�� في هذا المركز")
  if (state.taken.includes(newPlayerId)) throw new Error("اللاعب مأخوذ")
  const incoming = getPlayer(newPlayerId)
  if (!incoming) throw new Error("لاعب غير موجود")
  if (incoming.group !== SLOT_GROUP[slot]) throw new Error("اللاعب لا يناسب المركز")

  const outgoing = getPlayer(entry.playerId)
  state.taken = state.taken.filter((id) => id !== entry.playerId)
  state.taken.push(newPlayerId)
  p.squad[slot] = { playerId: newPlayerId, price: entry.price, free: entry.free, swapped: true }
  p.cardUsed = true
  pushLog(
    state,
    `${p.name} استخدم الكرت الخاص: خرج ${outgoing?.name ?? "لاعب"} ودخل ${incoming.name}`,
    "card",
  )
}

export function skipCard(state: RoomState, participantId: string) {
  const p = state.participants.find((x) => x.id === participantId)
  if (!p) throw new Error("مشترك غير موجود")
  p.cardUsed = true
  pushLog(state, `${p.name} احتفظ بفريقه ولم يستخدم الكرت`, "card")
}

// ===================== قوة الفريق =====================

export interface TeamStrength {
  attack: number
  midfield: number
  defense: number
  keeper: number
  overall: number
  chemistry: number
}

export function teamStrength(state: RoomState, p: Participant): TeamStrength {
  const groups = { GK: [] as number[], DEF: [] as number[], MID: [] as number[], ATT: [] as number[] }
  const clubs: Record<string, number> = {}
  for (const slot of state.settings.slots) {
    const entry = p.squad[slot]
    const pl = entry ? getPlayer(entry.playerId) : null
    const rating = pl?.rating ?? 62
    groups[SLOT_GROUP[slot]].push(rating)
    if (pl) clubs[pl.club] = (clubs[pl.club] ?? 0) + 1
  }
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 62)
  const chemistry = Math.min(8, Math.max(0, Object.values(clubs).reduce((acc, n) => acc + (n > 1 ? n - 1 : 0), 0)))
  const boost = state.coaches[p.id]?.boost ?? 0
  const keeper = avg(groups.GK) + boost * 0.4
  const defense = avg(groups.DEF) + boost * 0.6 + chemistry * 0.3
  const midfield = avg(groups.MID) + boost * 0.8 + chemistry * 0.3
  const attack = avg(groups.ATT) + boost * 0.8 + chemistry * 0.3
  const overall = (keeper + defense * 1.4 + midfield * 1.3 + attack * 1.3) / 5
  return {
    attack: round1(attack),
    midfield: round1(midfield),
    defense: round1(defense),
    keeper: round1(keeper),
    overall: round1(overall),
    chemistry,
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export function participantById(state: RoomState, id: string) {
  return state.participants.find((p) => p.id === id) ?? null
}
