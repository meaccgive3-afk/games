"use client"

import { useState, useTransition } from "react"
import { joinRoomAction } from "@/app/actions"
import { Button, Card, Input, Label } from "@/components/ui/primitives"
import { saveIdentity } from "@/lib/identity"
import type { RoomState } from "@/lib/game/types"

export function JoinPrompt({
  code,
  state,
  onJoined,
}: {
  code: string
  state: RoomState
  onJoined: (participantId: string) => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const closed = state.phase !== "lobby"

  function join() {
    setError(null)
    start(async () => {
      const res = await joinRoomAction(code, name)
      if (!res.ok) {
        setError(res.error)
        return
      }
      saveIdentity(code, res.data!.participantId)
      onJoined(res.data!.participantId)
    })
  }

  return (
    <main className="pitch-glow flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <div className="mb-4 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">غرفة</p>
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-primary">{code}</p>
        </div>

        {closed ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            اللعبة بدأت في هذه الغرفة، ما تقدر تنضم الآن. انتظر جولة جديدة.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="jname">اسمك</Label>
              <Input
                id="jname"
                value={name}
                maxLength={24}
                placeholder="اكتب اسمك"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {error ? (
              <p className="rounded-sm bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground">
                {error}
              </p>
            ) : null}
            <Button disabled={pending || !name.trim()} onClick={join}>
              {pending ? "لحظة…" : "انضم للغرفة"}
            </Button>
            <p className="text-xs text-muted-foreground">
              في الغرفة حالياً {state.participants.length} أشخاص
            </p>
          </div>
        )}
      </Card>
    </main>
  )
}
