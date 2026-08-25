"use client"

import { Card, SectionTitle } from "@/components/ui/primitives"
import type { LogEntry, RoomState } from "@/lib/game/types"

const TONE: Record<LogEntry["kind"], string> = {
  info: "text-muted-foreground",
  sold: "text-primary",
  gift: "text-accent",
  card: "text-accent",
  goal: "text-primary",
  warn: "text-destructive-foreground",
}

export function LogPanel({ state }: { state: RoomState }) {
  const entries = [...state.log].slice(-40).reverse()
  return (
    <Card>
      <SectionTitle hint="آخر الأحداث">السجل</SectionTitle>
      <ul className="no-scrollbar mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
        {entries.map((e, i) => (
          <li key={`${e.at}-${i}`} className="flex gap-2 text-xs leading-relaxed">
            <span className="shrink-0 font-mono text-muted-foreground/70">
              {new Date(e.at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className={TONE[e.kind]}>{e.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
