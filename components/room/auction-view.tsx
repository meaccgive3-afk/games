"use client"

import { useMemo, useState, useTransition } from "react"
import { Gavel, Gift, Loader2, Search, Sparkles } from "lucide-react"
import {
  aiGiftAction,
  aiOpenLotAction,
  bidAction,
  closeLotAction,
  finishAuctionAction,
  giftAction,
  openLotAction,
  skipGiftsAction,
} from "@/app/actions"
import { Badge, Button, Card, Input, SectionTitle, Select } from "@/components/ui/primitives"
import { PlayerCard } from "./player-card"
import { SquadPanel } from "./squad-panel"
import { LogPanel } from "./log-panel"
import { availablePlayers, maxAffordable, remainingBudget, topBid } from "@/lib/game/engine"
import { getPlayer } from "@/lib/game/players"
import { POSITION_LABELS, SLOT_GROUP } from "@/lib/game/types"
import type { PositionKey, RoomState } from "@/lib/game/types"

export function AuctionView({
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
  const lot = state.currentLot
  const lotPlayer = lot ? getPlayer(lot.playerId) : null
  const top = topBid(state)
  const topName = top ? state.participants.find((p) => p.id === top.participantId)?.name : null
  const giftQueue = lot?.giftPendingFor ?? []
  const allDone = bidders.every((p) => state.settings.slots.every((s) => Boolean(p.squad[s])))

  return (
    <div className="grid gap-4 pt-4 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        {/* منصة المزاد */}
        <Card className="relative overflow-hidden">
          {lot && lotPlayer && lot.status === "open" ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Gavel className="size-4 text-primary" aria-hidden="true" />
                <span className="text-sm font-bold text-primary">
                  مزاد مفتوح · {POSITION_LABELS[lot.slot]}
                </span>
                <span className="live-ring ms-auto size-2.5 rounded-full bg-primary" aria-hidden="true" />
              </div>

              <PlayerCard player={lotPlayer} size="lg" />

              <div className="flex items-end justify-between gap-4 rounded-md bg-secondary/50 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">أعلى مزايدة</p>
                  <p className="font-mono text-3xl font-bold text-primary">
                    {top ? `${top.amount} م` : "—"}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {topName ? `صاحبها: ${topName}` : "لا مزايدات بعد"}
                </p>
              </div>

              {isHost ? (
                <Button
                  variant="accent"
                  disabled={pending}
                  onClick={() => run(() => closeLotAction(state.code))}
                >
                  أغلق المزاد ({top ? `بيع بـ ${top.amount} م` : "بدون بيع"})
                </Button>
              ) : (
                <BidBar state={state} me={me} pending={pending} run={run} />
              )}
            </div>
          ) : giftQueue.length > 0 ? (
            <GiftPanel state={state} isHost={isHost} pending={pending} run={run} refresh={refresh} />
          ) : isHost ? (
            <OpenLotPanel state={state} pending={pending} run={run} refresh={refresh} />
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Gavel className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-muted-foreground">في انتظار الحكم يفتح اللاعب القادم…</p>
            </div>
          )}
        </Card>

        {error ? (
          <p className="rounded-sm bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </p>
        ) : null}

        {/* تشكيلات المزايدين */}
        <div className="grid gap-4 md:grid-cols-2">
          {bidders.map((p) => (
            <SquadPanel
              key={p.id}
              state={state}
              participant={p}
              highlight={p.id === me}
              compact
            />
          ))}
        </div>

        {isHost ? (
          <Button
            size="lg"
            variant={allDone ? "primary" : "outline"}
            disabled={pending || !allDone}
            onClick={() => run(() => finishAuctionAction(state.code))}
          >
            {allDone ? "أنهِ المزاد وعيّن المدربين" : "المزاد ما خلص — في مراكز ناقصة"}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <SectionTitle hint="المتبقي">الميزانيات</SectionTitle>
          <ul className="mt-3 flex flex-col gap-2">
            {bidders.map((p) => {
              const rem = remainingBudget(p)
              const pct = Math.max(0, Math.min(100, (rem / p.budget) * 100))
              return (
                <li key={p.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold">{p.name}</span>
                    {p.id === me ? <Badge tone="green">أنت</Badge> : null}
                    <span className="ms-auto font-mono font-bold text-primary">{rem} م</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Object.keys(p.squad).length} / {state.settings.slots.length} مركز
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        <LogPanel state={state} />
      </div>
    </div>
  )
}

function BidBar({
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
  const lot = state.currentLot!
  const p = state.participants.find((x) => x.id === me)!
  const top = topBid(state)
  const minNext = top ? top.amount + lot.minIncrement : lot.minIncrement
  const cap = maxAffordable(state, p)
  const [amount, setAmount] = useState(minNext)
  const iAmTop = top?.participantId === me
  const hasSlot = Boolean(p.squad[lot.slot])

  const val = Math.max(minNext, Math.min(cap, amount || minNext))

  if (hasSlot) {
    return (
      <p className="rounded-md bg-secondary/60 px-3 py-3 text-center text-sm text-muted-foreground">
        عندك لاعب في هذا المركز — ما تحتاج تزايد.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={amount}
          min={minNext}
          max={cap}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="font-mono text-center text-lg"
          aria-label="مبلغ المزايدة"
        />
        <Button
          className="shrink-0"
          disabled={pending || iAmTop || cap < minNext}
          onClick={() => run(() => bidAction(state.code, me, val))}
        >
          زايد {val} م
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[minNext, minNext + 5, minNext + 10, minNext + 20].map((v) =>
          v <= cap ? (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className="rounded-sm border border-border px-2 py-1 font-mono text-xs text-muted-foreground transition hover:bg-secondary"
            >
              {v}
            </button>
          ) : null,
        )}
        {cap >= minNext ? (
          <button
            onClick={() => setAmount(cap)}
            className="rounded-sm border border-primary/50 px-2 py-1 font-mono text-xs font-bold text-primary transition hover:bg-primary/10"
          >
            الأقصى {cap}
          </button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {iAmTop
          ? "أنت صاحب أعلى مزايدة حالياً"
          : cap < minNext
            ? "ميزانيتك ما تكفي لهذا المزاد"
            : `أقل مزايدة ${minNext} م · أقصى ما تقدر ${cap} م`}
      </p>
    </div>
  )
}

/** زر تفويض القرار لحكم BluesMinds */
function AiRefereeButton({
  label,
  hint,
  disabled,
  action,
  refresh,
}: {
  label: string
  hint: string
  disabled?: boolean
  action: () => Promise<{ ok: boolean; error?: string; data?: { reason: string } }>
  refresh: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function go() {
    setBusy(true)
    setErr(null)
    setReason(null)
    try {
      const res = await action()
      if (res.ok) setReason(res.data?.reason ?? null)
      else setErr(res.error ?? "تعذّر قرار الحكم")
    } catch {
      setErr("تعذّر الاتصال بحكم BluesMinds")
    } finally {
      setBusy(false)
      refresh()
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
      <Button variant="primary" disabled={busy || disabled} onClick={go}>
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            حكم BluesMinds يفكّر…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="size-4" aria-hidden="true" />
            {label}
          </span>
        )}
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      {reason ? (
        <p className="rounded-sm bg-primary/10 px-2 py-1.5 text-xs leading-relaxed text-primary">
          تعليل الحكم: {reason}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-sm bg-destructive/15 px-2 py-1.5 text-xs text-destructive-foreground">{err}</p>
      ) : null}
    </div>
  )
}

function OpenLotPanel({
  state,
  pending,
  run,
  refresh,
}: {
  state: RoomState
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
  refresh: () => void
}) {
  const openSlots = useMemo(() => {
    const bidders = state.participants.filter((p) => p.id !== state.hostId)
    return state.settings.slots.filter((s) => bidders.some((p) => !p.squad[s]))
  }, [state])

  const [slot, setSlot] = useState<PositionKey>(openSlots[0] ?? state.settings.slots[0])
  const [q, setQ] = useState("")

  const pool = useMemo(() => {
    const list = availablePlayers(state, slot)
    const needle = q.trim()
    const filtered = needle
      ? list.filter((p) => p.name.includes(needle) || p.club.includes(needle))
      : list
    return filtered.sort((a, b) => b.rating - a.rating).slice(0, 40)
  }, [state, slot, q])

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle hint="الحكم الذكي أو اختيار يدوي">افتح مزاداً جديداً</SectionTitle>

      <AiRefereeButton
        label="دع حكم BluesMinds يختار اللاعب"
        hint="يقرأ الميزانيات والمراكز الناقصة ويطرح لاعباً لم يُؤخذ من قبل."
        disabled={pending || openSlots.length === 0}
        action={() => aiOpenLotAction(state.code)}
        refresh={refresh}
      />

      <p className="text-center text-xs text-muted-foreground">أو اختر يدوياً</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={slot}
          onChange={(e) => setSlot(e.target.value as PositionKey)}
          aria-label="المركز"
        >
          {state.settings.slots.map((s) => (
            <option key={s} value={s} disabled={!openSlots.includes(s)}>
              {POSITION_LABELS[s]}
              {openSlots.includes(s) ? "" : " — مكتمل"}
            </option>
          ))}
        </Select>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم اللاعب أو النادي"
            className="pe-9"
          />
        </div>
      </div>

      <div className="no-scrollbar flex max-h-96 flex-col gap-2 overflow-y-auto">
        {pool.map((pl) => (
          <button
            key={pl.id}
            disabled={pending}
            onClick={() => run(() => openLotAction(state.code, slot, pl.id))}
            className="text-start transition hover:brightness-125 disabled:opacity-50"
          >
            <PlayerCard player={pl} />
          </button>
        ))}
        {pool.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">ما في لاعبين متاحين هنا</p>
        ) : null}
      </div>
    </div>
  )
}

function GiftPanel({
  state,
  isHost,
  pending,
  run,
  refresh,
}: {
  state: RoomState
  isHost: boolean
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
  refresh: () => void
}) {
  const lot = state.currentLot!
  const queue = lot.giftPendingFor ?? []
  const targetId = queue[0]
  const target = state.participants.find((p) => p.id === targetId)
  const emptySlots = target
    ? state.settings.slots.filter((s) => !target.squad[s])
    : []
  const [slot, setSlot] = useState<PositionKey>(emptySlots[0] ?? lot.slot)
  const [q, setQ] = useState("")

  const activeSlot = emptySlots.includes(slot) ? slot : (emptySlots[0] ?? lot.slot)

  const pool = useMemo(() => {
    const list = availablePlayers(state, activeSlot)
    const needle = q.trim()
    const filtered = needle
      ? list.filter((p) => p.name.includes(needle) || p.club.includes(needle))
      : list
    return filtered.sort((a, b) => b.rating - a.rating).slice(0, 40)
  }, [state, activeSlot, q])

  if (!target) return null

  if (!isHost) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Gift className="size-8 text-accent" aria-hidden="true" />
        <p className="text-muted-foreground">
          الحكم يختار هدية لـ <span className="font-bold text-foreground">{target.name}</span>…
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Gift className="size-4 text-accent" aria-hidden="true" />
        <SectionTitle hint={`متبقي ${queue.length}`}>
          هدية لـ {target.name}
        </SectionTitle>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        لاعب مجاني لمركز فاضي عنده — بدون خصم من ميزانيته.
      </p>

      <AiRefereeButton
        key={target.id}
        label={`دع حكم BluesMinds يختار هدية ${target.name}`}
        hint="يوازن التعويض حسب تشكيلته وميزانيته، ولا يمنح لاعباً مأخوذاً."
        disabled={pending || emptySlots.length === 0}
        action={() => aiGiftAction(state.code, target.id)}
        refresh={refresh}
      />

      <p className="text-center text-xs text-muted-foreground">أو اختر يدوياً</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={activeSlot}
          onChange={(e) => setSlot(e.target.value as PositionKey)}
          aria-label="المركز"
        >
          {emptySlots.map((s) => (
            <option key={s} value={s}>
              {POSITION_LABELS[s]} · {SLOT_GROUP[s]}
            </option>
          ))}
        </Select>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث…"
          className="flex-1"
        />
      </div>

      <div className="no-scrollbar flex max-h-80 flex-col gap-2 overflow-y-auto">
        {pool.map((pl) => (
          <button
            key={pl.id}
            disabled={pending}
            onClick={() => run(() => giftAction(state.code, target.id, pl.id, activeSlot))}
            className="text-start transition hover:brightness-125 disabled:opacity-50"
          >
            <PlayerCard player={pl} />
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        disabled={pending}
        onClick={() => run(() => skipGiftsAction(state.code))}
      >
        تخطَّ الهدايا
      </Button>
    </div>
  )
}
