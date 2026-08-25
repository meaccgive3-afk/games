"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { readIdentity } from "@/lib/identity"
import type { RoomState } from "@/lib/game/types"
import { LobbyView } from "./lobby-view"
import { AuctionView } from "./auction-view"
import { CardsView } from "./cards-view"
import { MatchView } from "./match-view"
import { ResultView } from "./result-view"
import { RoomHeader } from "./room-header"
import { JoinPrompt } from "./join-prompt"

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("fetch_failed")
  return res.json() as Promise<{ state: RoomState; version: number }>
}

export function RoomClient({ code, initial }: { code: string; initial: RoomState }) {
  const [me, setMe] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setMe(readIdentity(code))
    setReady(true)
  }, [code])

  const { data, mutate } = useSWR(`/api/room/${code}`, fetcher, {
    fallbackData: { state: initial, version: 0 },
    refreshInterval: 1200,
    revalidateOnFocus: true,
    keepPreviousData: true,
  })

  const state = data?.state ?? initial
  const refresh = () => void mutate()

  const meExists = Boolean(me && state.participants.some((p) => p.id === me))

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">جاري التحميل…</p>
      </main>
    )
  }

  if (!meExists) {
    return <JoinPrompt code={code} state={state} onJoined={(id) => { setMe(id); refresh() }} />
  }

  const isHost = me === state.hostId

  return (
    <main className="pitch-glow flex flex-1 flex-col">
      <RoomHeader state={state} me={me!} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 pb-10 sm:px-4">
        {state.phase === "lobby" ? (
          <LobbyView state={state} me={me!} isHost={isHost} refresh={refresh} />
        ) : null}
        {state.phase === "auction" ? (
          <AuctionView state={state} me={me!} isHost={isHost} refresh={refresh} />
        ) : null}
        {state.phase === "cards" ? (
          <CardsView state={state} me={me!} isHost={isHost} refresh={refresh} />
        ) : null}
        {state.phase === "match" ? (
          <MatchView state={state} isHost={isHost} refresh={refresh} />
        ) : null}
        {state.phase === "result" ? (
          <ResultView state={state} isHost={isHost} refresh={refresh} />
        ) : null}
      </div>
    </main>
  )
}
