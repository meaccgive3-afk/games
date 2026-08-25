import { notFound } from "next/navigation"
import { loadRoom } from "@/lib/game/store"
import { RoomClient } from "@/components/room/room-client"
import type { RoomState } from "@/lib/game/types"

export const dynamic = "force-dynamic"

export default async function RoomPage({ params }: PageProps<"/room/[code]">) {
  const { code } = await params
  const row = await loadRoom(code)
  if (!row) notFound()
  return <RoomClient code={code.toUpperCase()} initial={row.state as RoomState} />
}
