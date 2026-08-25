"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Flag, Goal, ShieldAlert, Siren, Radio } from "lucide-react"
import { endMatchAction } from "@/app/actions"
import { Button, Card, SectionTitle } from "@/components/ui/primitives"
import { teamStrength } from "@/lib/game/engine"
import type { MatchEvent, RoomState } from "@/lib/game/types"

const ICONS = {
  goal: Goal,
  save: ShieldAlert,
  chance: Siren,
  corner: Flag,
  foul: ShieldAlert,
  card: ShieldAlert,
  kickoff: Radio,
  half: Flag,
  end: Flag,
  sub: Radio,
} as const

export function MatchView({
  state,
  isHost,
  refresh,
}: {
  state: RoomState
  isHost: boolean
  refresh: () => void
}) {
  const match = state.match!
  const a = state.participants.find((p) => p.id === match.aId)!
  const b = state.participants.find((p) => p.id === match.bId)!
  const sa = useMemo(() => teamStrength(state, a), [state, a])
  const sb = useMemo(() => teamStrength(state, b), [state, b])

  const [minute, setMinute] = useState(0)
  const [pending, start] = useTransition()
  const feedRef = useRef<HTMLDivElement>(null)

  // ساعة موحّدة لكل المشاهدين مبنية على startedAt
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - match.startedAt
      const m = Math.floor(elapsed / match.speedMs)
      setMinute(Math.max(0, Math.min(91, m)))
    }
    tick()
    const id = window.setInterval(tick, Math.min(400, match.speedMs))
    return () => window.clearInterval(id)
  }, [match.startedAt, match.speedMs])

  const shown = match.events.filter((e) => e.minute <= minute)
  const last = shown[shown.length - 1]
  const scoreA = last?.scoreA ?? 0
  const scoreB = last?.scoreB ?? 0
  const over = minute >= 91
  const clock = Math.min(90, minute)

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [shown.length])

  // الحكم يثبّت النتيجة تلقائياً عند النهاية
  useEffect(() => {
    if (!over || !isHost || match.finished) return
    start(async () => {
      await endMatchAction(state.code)
      refresh()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, isHost, match.finished])

  const waiting = minute === 0 && Date.now() < match.startedAt

  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* لوحة النتيجة */}
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-5">
          <TeamSide name={a.name} coach={state.coaches[a.id]?.name} strength={sa.overall} align="start" />
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3 font-mono text-5xl font-bold tabular-nums">
              <span className={scoreA > scoreB ? "text-primary" : ""}>{scoreA}</span>
              <span className="text-muted-foreground">-</span>
              <span className={scoreB > scoreA ? "text-primary" : ""}>{scoreB}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {!over ? (
                <span className="live-ring size-2 rounded-full bg-accent" aria-hidden="true" />
              ) : null}
              <span className="font-mono text-sm text-muted-foreground">
                {waiting ? "استعداد…" : over ? "انتهت" : `${clock}'`}
              </span>
            </div>
          </div>
          <TeamSide name={b.name} coach={state.coaches[b.id]?.name} strength={sb.overall} align="end" />
        </div>

        <div className="h-1.5 bg-secondary">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${(clock / 90) * 100}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* التعليق الحي */}
        <Card>
          <SectionTitle hint={match.narrator === "ai" ? "بقلم حكم BluesMinds" : "دقيقة بدقيقة"}>
            التعليق
          </SectionTitle>
          <div ref={feedRef} className="no-scrollbar mt-3 flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
            {[...shown].reverse().map((e, i) => (
              <EventRow key={`${e.minute}-${i}`} e={e} aName={a.name} bName={b.name} fresh={i === 0} />
            ))}
            {shown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                اللاعبون يدخلون أرض الملعب…
              </p>
            ) : null}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <SectionTitle>مقارنة القوة</SectionTitle>
            <div className="mt-3 flex flex-col gap-2.5">
              <Compare label="هجوم" a={sa.attack} b={sb.attack} />
              <Compare label="وسط" a={sa.midfield} b={sb.midfield} />
              <Compare label="دفاع" a={sa.defense} b={sb.defense} />
              <Compare label="حراسة" a={sa.keeper} b={sb.keeper} />
              <Compare label="انسجام" a={sa.chemistry} b={sb.chemistry} />
            </div>
          </Card>

          {over && match.penalties ? (
            <Card className="border-primary/60">
              <SectionTitle>ركلات الترجيح</SectionTitle>
              <p className="mt-2 font-mono text-2xl font-bold text-primary">
                {match.penalties.a} - {match.penalties.b}
              </p>
            </Card>
          ) : null}

          {isHost && over ? (
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await endMatchAction(state.code)
                  refresh()
                })
              }
            >
              اعرض النتيجة النهائية
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function TeamSide({
  name,
  coach,
  strength,
  align,
}: {
  name: string
  coach?: string
  strength: number
  align: "start" | "end"
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${align === "end" ? "items-end text-end" : "items-start"}`}>
      <p className="font-serif text-xl leading-tight text-balance">{name}</p>
      {coach ? <p className="text-xs text-muted-foreground">{coach}</p> : null}
      <p className="font-mono text-xs text-primary">قوة {strength}</p>
    </div>
  )
}

function Compare({ label, a, b }: { label: string; a: number; b: number }) {
  const total = a + b || 1
  const pa = (a / total) * 100
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono font-bold">{a}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-bold">{b}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="bg-primary" style={{ width: `${pa}%` }} />
        <div className="flex-1 bg-accent" />
      </div>
    </div>
  )
}

function EventRow({
  e,
  aName,
  bName,
  fresh,
}: {
  e: MatchEvent
  aName: string
  bName: string
  fresh: boolean
}) {
  const Icon = ICONS[e.type] ?? Radio
  const isGoal = e.type === "goal"
  const isBig = e.type === "kickoff" || e.type === "half" || e.type === "end"

  return (
    <div
      className={`flex items-start gap-3 rounded-md border px-3 py-2 ${fresh ? "rise-in" : ""} ${
        isGoal
          ? "border-primary/60 bg-primary/10"
          : isBig
            ? "border-border bg-secondary/50"
            : "border-border/60 bg-card/60"
      }`}
    >
      <span className="mt-0.5 w-8 shrink-0 font-mono text-xs font-bold text-muted-foreground">
        {e.minute}&apos;
      </span>
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${isGoal ? "text-primary" : "text-muted-foreground"}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-relaxed ${isGoal ? "font-bold text-foreground" : ""}`}>
          {e.text}
        </p>
        {e.side !== "none" ? (
          <p className="text-[11px] text-muted-foreground">{e.side === "A" ? aName : bName}</p>
        ) : null}
      </div>
      {isGoal ? (
        <span className="shrink-0 font-mono text-sm font-bold text-primary">
          {e.scoreA}-{e.scoreB}
        </span>
      ) : null}
    </div>
  )
}
