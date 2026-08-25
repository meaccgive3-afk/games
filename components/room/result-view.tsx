"use client"

import { useState, useTransition } from "react"
import { Trophy } from "lucide-react"
import { backToLobbyAction } from "@/app/actions"
import { Badge, Button, Card, SectionTitle } from "@/components/ui/primitives"
import { SquadPanel } from "./squad-panel"
import { LogPanel } from "./log-panel"
import { remainingBudget } from "@/lib/game/engine"
import type { RoomState } from "@/lib/game/types"

export function ResultView({
  state,
  isHost,
  refresh,
}: {
  state: RoomState
  isHost: boolean
  refresh: () => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const match = state.match
  if (!match) return null

  const a = state.participants.find((p) => p.id === match.aId)!
  const b = state.participants.find((p) => p.id === match.bId)!
  const { scoreA, scoreB, penalties } = match

  let winner = ""
  if (scoreA > scoreB) winner = a.name
  else if (scoreB > scoreA) winner = b.name
  else if (penalties) winner = penalties.a > penalties.b ? a.name : b.name

  return (
    <div className="flex flex-col gap-4 pt-4">
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <Trophy className="size-10 text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">الفائز</p>
        <h2 className="font-serif text-4xl text-balance">{winner || "تعادل"}</h2>
        <p className="font-mono text-2xl font-bold">
          {a.name} {scoreA} - {scoreB} {b.name}
        </p>
        {penalties ? (
          <Badge tone="gold">ركلات ترجيح {penalties.a} - {penalties.b}</Badge>
        ) : null}
      </Card>

      <Card>
        <SectionTitle hint="من صرف أقل؟">ملخص الصرف</SectionTitle>
        <ul className="mt-3 flex flex-col gap-2">
          {state.participants
            .filter((p) => p.id !== state.hostId)
            .map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm"
              >
                <span className="font-bold">{p.name}</span>
                <span className="text-xs text-muted-foreground">{state.coaches[p.id]?.name}</span>
                <span className="ms-auto font-mono text-muted-foreground">صرف {p.spent} م</span>
                <span className="font-mono font-bold text-primary">باقي {remainingBudget(p)} م</span>
              </li>
            ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 md:grid-cols-2">
          <SquadPanel state={state} participant={a} showStrength />
          <SquadPanel state={state} participant={b} showStrength />
        </div>
        <div className="flex flex-col gap-4">
          {isHost ? (
            <Button
              size="lg"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await backToLobbyAction(state.code)
                  if (!res.ok) setError(res.error)
                  refresh()
                })
              }
            >
              جولة جديدة
            </Button>
          ) : (
            <Card>
              <p className="text-center text-sm text-muted-foreground">
                في انتظار الحكم يبدأ جولة جديدة…
              </p>
            </Card>
          )}
          {error ? (
            <p className="rounded-sm bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground">
              {error}
            </p>
          ) : null}
          <LogPanel state={state} />
        </div>
      </div>
    </div>
  )
}
