import { loadRoom } from "@/lib/game/store"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const row = await loadRoom(code)
  if (!row) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }
  return Response.json(
    { state: row.state, version: row.version },
    { headers: { "cache-control": "no-store" } },
  )
}
