import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const globalForDb = globalThis as unknown as { __mzadPool?: Pool }

export const pool =
  globalForDb.__mzadPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  })

if (process.env.NODE_ENV !== "production") globalForDb.__mzadPool = pool

export const db = drizzle(pool, { schema })
