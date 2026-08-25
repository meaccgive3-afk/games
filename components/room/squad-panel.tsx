"use client"

import { Card, Badge } from "@/components/ui/primitives"
import { PlayerCard } from "./player-card"
import { remainingBudget, teamStrength } from "@/lib/game/engine"
import { getPlayer } from "@/lib/game/players"
import { POSITION_LABELS } from "@/lib/game/types"
import type { Participant, RoomState } from "@/lib/game/types"

export function SquadPanel({
  state,
  participant,
  highlight,
  compact,
  showStrength,
}: {
  state: RoomState
  participant: Participant
  highlight?: boolean
  compact?: boolean
  showStrength?: boolean
}) {
  const filled = Object.keys(participant.squad).length
  const coach = state.coaches[participant.id]
  const st = showStrength ? teamStrength(state, participant) : null

  return (
    <Card className={highlight ? "border-primary/60" : undefined}>
      <div className="flex items-center gap-2">
        <h3 className="font-serif text-lg">{participant.name}</h3>
        {highlight ? <Badge tone="green">أنت</Badge> : null}
        <span className="ms-auto font-mono text-sm font-bold text-primary">
          {remainingBudget(participant)} م
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {filled} / {state.settings.slots.length} مركز
        </span>
        {coach ? (
          <>
            <span aria-hidden="true">·</span>
            <span>
              المدرب: <span className="text-foreground">{coach.name}</span> ({coach.tier})
            </span>
          </>
        ) : null}
      </div>

      {st ? (
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <Stat label="هجوم" value={st.attack} />
          <Stat label="وسط" value={st.midfield} />
          <Stat label="دفاع" value={st.defense} />
          <Stat label="حراسة" value={st.keeper} />
        </div>
      ) : null}

      <ul className={`mt-3 flex flex-col gap-1.5 ${compact ? "max-h-72 overflow-y-auto no-scrollbar" : ""}`}>
        {state.settings.slots.map((slot) => {
          const entry = participant.squad[slot]
          const pl = entry ? getPlayer(entry.playerId) : null
          return (
            <li key={slot} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">
                {POSITION_LABELS[slot]}
              </span>
              {pl ? (
                <PlayerCard
                  player={pl}
                  size="sm"
                  price={entry!.price}
                  free={entry!.free}
                  swapped={entry!.swapped}
                  className="flex-1"
                />
              ) : (
                <span className="flex-1 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  فاضي
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-sm bg-secondary/60 py-1.5">
      <span className="font-mono text-base font-bold text-primary">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}
