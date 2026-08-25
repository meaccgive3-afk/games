import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { rooms } from "@/lib/db/schema"
import type { RoomState } from "./types"

export async function loadRoom(code: string) {
  const rows = await db
    .select()
    .from(rooms)
    .where(eq(rooms.code, code.toUpperCase()))
    .limit(1)
  return rows[0] ?? null
}

export async function createRoom(state: RoomState) {
  const [row] = await db.insert(rooms).values({ code: state.code, state, version: 1 }).returning()
  return row
}

export async function saveRoom(code: string, state: RoomState) {
  const [row] = await db
    .update(rooms)
    .set({ state, version: sql`${rooms.version} + 1`, updatedAt: new Date() })
    .where(eq(rooms.code, code.toUpperCase()))
    .returning()
  return row
}

/** يقرأ الغرفة، يطبق التحويل، ثم يحفظ. */
export async function mutateRoom(code: string, fn: (state: RoomState) => void) {
  const row = await loadRoom(code)
  if (!row) throw new Error("الغرفة غير موجودة")
  const state = row.state as RoomState
  fn(state)
  const saved = await saveRoom(code, state)
  return { state: saved.state as RoomState, version: saved.version }
}
