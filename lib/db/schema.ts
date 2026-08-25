import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"
import type { RoomState } from "@/lib/game/types"

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  state: jsonb("state").$type<RoomState>().notNull(),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
