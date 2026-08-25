"use client"

import { useMemo, useState, useTransition } from "react"
import { IdCard, Sparkles } from "lucide-react"
import { skipCardAction, startMatchAction, useCardAction } from "@/app/actions"
import { Badge, Button, Card, Input, SectionTitle, Select } from "@/components/ui/primitives"
import { PlayerCard } from "./player-card"
import { SquadPanel } from "./squad-panel"
import { LogPanel } from "./log-panel"
import { availablePlayers } from "@/lib/game/engine"
import { getPlayer } from "@/lib/game/players"
import { POSITION_LABELS } from "@/lib/game/types"
import type { PositionKey, RoomState } from "@/lib/game/types"

export function CardsView({
  state,
  me,
  isHost,
  refresh,
}: {
  state: RoomState
  me: string
  isHost: boolean
  refresh: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    start(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error ?? "خطأ")
      refresh()
    })
  }

  const bidders = state.participants.filter((p) => p.id !== state.hostId)
  const allSettled = bidders.every((p) => p.cardUsed)
  const meP = state.participants.find((p) => p.id === me)

  return (
    <div className="grid gap-4 pt-4 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <SectionTitle hint="آخر فرصة قبل المباراة">تم تعيين المدربين</SectionTitle>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {bidders.map((p) => {
              const c = state.coaches[p.id]
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2"
                >
                  <span className="font-bold">{p.name}</span>
                  <span className="ms-auto text-xs text-muted-foreground">{c?.name}</span>
                  <Badge tone={(c?.boost ?? 0) >= 4 ? "gold" : (c?.boost ?? 0) >= 0 ? "muted" : "red"}>
                    {c?.tier}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </Card>

        {error ? (
          <p className="rounded-sm bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </p>
        ) : null}

        {!isHost && meP && !meP.cardUsed ? (
          <CardPicker state={state} me={me} pending={pending} run={run} />
        ) : null}

        {!isHost && meP?.cardUsed ? (
          <Card>
            <p className="text-center text-sm text-muted-foreground">
              خلصت دورك — في انتظار الباقين والحكم يبدأ المباراة.
            </p>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {bidders.map((p) => (
            <SquadPanel key={p.id} state={state} participant={p} highlight={p.id === me} compact showStrength />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {isHost ? (
          <MatchStarter state={state} pending={pending} run={run} allSettled={allSettled} />
        ) : (
          <Card>
            <SectionTitle>الجاهزية</SectionTitle>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {bidders.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.name}</span>
                  <Badge tone={p.cardUsed ? "green" : "muted"}>
                    {p.cardUsed ? "جاهز" : "يفكّر…"}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <LogPanel state={state} />
      </div>
    </div>
  )
}

function CardPicker({
  state,
  me,
  pending,
  run,
}: {
  state: RoomState
  me: string
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
}) {
  const p = state.participants.find((x) => x.id === me)!
  const [slot, setSlot] = useState<PositionKey>(state.settings.slots[0])
  const [q, setQ] = useState("")

  const outgoing = p.squad[slot] ? getPlayer(p.squad[slot].playerId) : null

  const pool = useMemo(() => {
    const list = availablePlayers(state, slot)
    const needle = q.trim()
    const filtered = needle
      ? list.filter((x) => x.name.includes(needle) || x.club.includes(needle))
      : list
    return filtered.sort((a, b) => b.rating - a.rating).slice(0, 30)
  }, [state, slot, q])

  return (
    <Card className="border-accent/50">
      <div className="flex items-center gap-2">
        <IdCard className="size-4 text-accent" aria-hidden="true" />
        <SectionTitle hint="مرة واحدة فقط">الكرت الخاص</SectionTitle>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        شيّل أي لاعب من تشكيلتك واستبدله بلاعب متاح — الميزانية ما تتأثر.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Select value={slot} onChange={(e) => setSlot(e.target.value as PositionKey)} aria-label="المركز">
          {state.settings.slots.map((s) => {
            const e = p.squad[s]
            const pl = e ? getPlayer(e.playerId) : null
            return (
              <option key={s} value={s}>
                {POSITION_LABELS[s]} — {pl?.name ?? "فاضي"}
              </option>
            )
          })}
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث…" className="flex-1" />
      </div>

      {outgoing ? (
        <div className="mt-3 rounded-md bg-destructive/10 p-2">
          <p className="mb-1.5 text-xs text-muted-foreground">سيخرج</p>
          <PlayerCard player={outgoing} size="sm" />
        </div>
      ) : null}

      <div className="no-scrollbar mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {pool.map((pl) => (
          <button
            key={pl.id}
            disabled={pending || !outgoing}
            onClick={() => run(() => useCardAction(state.code, me, slot, pl.id))}
            className="text-start transition hover:brightness-125 disabled:opacity-50"
          >
            <PlayerCard player={pl} />
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        className="mt-3 w-full"
        disabled={pending}
        onClick={() => run(() => skipCardAction(state.code, me))}
      >
        احتفظ بفريقي كما هو
      </Button>
    </Card>
  )
}

function MatchStarter({
  state,
  pending,
  run,
  allSettled,
}: {
  state: RoomState
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
  allSettled: boolean
}) {
  const bidders = state.participants.filter((p) => p.id !== state.hostId)
  const [a, setA] = useState(bidders[0]?.id ?? "")
  const [b, setB] = useState(bidders[1]?.id ?? "")
  const [speed, setSpeed] = useState(650)

  return (
    <Card>
      <SectionTitle hint="أنت الحكم">ابدأ المباراة</SectionTitle>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Select value={a} onChange={(e) => setA(e.target.value)} aria-label="الفريق الأول">
            {bidders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <span className="text-center text-xs text-muted-foreground">ضد</span>
          <Select value={b} onChange={(e) => setB(e.target.value)} aria-label="الفريق الثاني">
            {bidders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">سرعة المحاكاة</span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { v: 1100, l: "هادية" },
              { v: 650, l: "عادية" },
              { v: 250, l: "سريعة" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setSpeed(o.v)}
                className={`h-9 rounded-sm text-xs font-bold transition ${
                  speed === o.v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {!allSettled ? (
          <p className="text-xs text-muted-foreground">
            في مشتركين ما حسموا كرتهم — تقدر تبدأ على أي حال.
          </p>
        ) : null}

        <Button
          size="lg"
          disabled={pending || !a || !b || a === b}
          onClick={() => run(() => startMatchAction(state.code, a, b, speed))}
        >
          صافرة البداية
        </Button>
      </div>
    </Card>
  )
}
