"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Badge } from "@/components/ui/primitives"
import { remainingBudget } from "@/lib/game/engine"
import type { Phase, RoomState } from "@/lib/game/types"

const PHASE_LABEL: Record<Phase, string> = {
  lobby: "غرفة الانتظار",
  auction: "المزاد جارٍ",
  cards: "الكرت الخاص",
  match: "المباراة",
  result: "النتيجة",
}

export function RoomHeader({ state, me }: { state: RoomState; me: string }) {
  const [copied, setCopied] = useState(false)
  const meP = state.participants.find((p) => p.id === me)
  const isHost = me === state.hostId

  async function copy() {
    try {
      await navigator.clipboard.writeText(state.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // تجاهل
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-3 sm:px-4">
        <span className="font-serif text-xl text-primary">المزاد</span>

        <button
          onClick={copy}
          className="flex items-center gap-2 rounded-sm border border-border bg-card px-2 py-1 transition hover:bg-secondary"
          aria-label="انسخ كود الغرفة"
        >
          <span className="font-mono text-sm font-bold tracking-[0.2em]">{state.code}</span>
          {copied ? (
            <Check className="size-3.5 text-accent" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5 text-muted-foreground" aria-hidden="true" />
          )}
        </button>

        <Badge tone={state.phase === "match" ? "green" : "muted"}>{PHASE_LABEL[state.phase]}</Badge>

        <div className="ms-auto flex items-center gap-2">
          {isHost ? (
            <Badge tone="gold">الحكم</Badge>
          ) : meP ? (
            <div className="flex items-center gap-2 rounded-sm bg-card px-2 py-1">
              <span className="text-xs text-muted-foreground">{meP.name}</span>
              <span className="font-mono text-sm font-bold text-primary">
                {remainingBudget(meP)} م
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
