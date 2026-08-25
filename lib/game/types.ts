export type PositionKey = "GK" | "RB" | "CB1" | "CB2" | "LB" | "CM1" | "CM2" | "CM3" | "RW" | "ST" | "LW"

export type PositionGroup = "GK" | "DEF" | "MID" | "ATT"

export type Phase = "lobby" | "auction" | "cards" | "match" | "result"

export interface Player {
  id: string
  name: string
  club: string
  nation: string
  group: PositionGroup
  rating: number
  /** base market value in millions */
  value: number
  img: string
}

export interface Participant {
  id: string
  name: string
  isHost: boolean
  budget: number
  spent: number
  squad: Record<string, { playerId: string; price: number; free?: boolean; swapped?: boolean }>
  cardUsed: boolean
  lastSeen: number
}

export interface Bid {
  participantId: string
  amount: number
  at: number
}

export interface LogEntry {
  at: number
  text: string
  kind: "info" | "sold" | "gift" | "card" | "goal" | "warn"
}

export interface AuctionLot {
  slot: PositionKey
  playerId: string
  bids: Bid[]
  minIncrement: number
  status: "open" | "closed"
  winnerId?: string
  price?: number
  /** participant who lost and must receive a gift */
  giftPendingFor?: string[]
}

export interface MatchEvent {
  minute: number
  type: "kickoff" | "goal" | "chance" | "save" | "card" | "sub" | "half" | "end" | "foul" | "corner"
  side: "A" | "B" | "none"
  text: string
  scoreA: number
  scoreB: number
}

export interface MatchState {
  running: boolean
  minute: number
  scoreA: number
  scoreB: number
  events: MatchEvent[]
  aId: string
  bId: string
  finished: boolean
  penalties?: { a: number; b: number; text: string } | null
}

export interface RoomState {
  code: string
  phase: Phase
  hostId: string
  createdAt: number
  settings: {
    budget: number
    minIncrement: number
    timerSeconds: number
    giftEnabled: boolean
    cardEnabled: boolean
    slots: PositionKey[]
  }
  participants: Participant[]
  /** player ids already taken/removed from pool */
  taken: string[]
  currentLot: AuctionLot | null
  log: LogEntry[]
  coaches: Record<string, { name: string; tier: string; boost: number }>
  match: MatchState | null
}

export const POSITION_LABELS: Record<PositionKey, string> = {
  GK: "حارس مرمى",
  RB: "ظهير أيمن",
  CB1: "قلب دفاع (١)",
  CB2: "قلب دفاع (٢)",
  LB: "ظهير أيسر",
  CM1: "وسط (١)",
  CM2: "وسط (٢)",
  CM3: "وسط (٣)",
  RW: "جناح أيمن",
  ST: "مهاجم صريح",
  LW: "جناح أيسر",
}

export const SLOT_GROUP: Record<PositionKey, PositionGroup> = {
  GK: "GK",
  RB: "DEF",
  CB1: "DEF",
  CB2: "DEF",
  LB: "DEF",
  CM1: "MID",
  CM2: "MID",
  CM3: "MID",
  RW: "ATT",
  ST: "ATT",
  LW: "ATT",
}

export const GROUP_LABELS: Record<PositionGroup, string> = {
  GK: "حراسة",
  DEF: "دفاع",
  MID: "وسط",
  ATT: "هجوم",
}

export const DEFAULT_SLOTS: PositionKey[] = ["GK", "RB", "CB1", "CB2", "LB", "CM1", "CM2", "CM3", "RW", "ST", "LW"]
