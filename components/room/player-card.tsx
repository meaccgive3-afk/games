import { cn } from "@/lib/utils"
import type { Player } from "@/lib/game/types"

const GROUP_TONE: Record<string, string> = {
  GK: "text-accent",
  DEF: "text-foreground",
  MID: "text-foreground",
  ATT: "text-primary",
}

export function PlayerCard({
  player,
  size = "md",
  price,
  free,
  swapped,
  className,
}: {
  player: Player
  size?: "sm" | "md" | "lg"
  price?: number
  free?: boolean
  swapped?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-card/80 p-2",
        size === "lg" && "gap-4 p-4",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-sm bg-secondary font-mono font-bold",
          size === "sm" && "size-9 text-sm",
          size === "md" && "size-11 text-base",
          size === "lg" && "size-16 text-2xl",
          GROUP_TONE[player.group],
        )}
        aria-hidden="true"
      >
        {player.rating}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-bold leading-tight",
            size === "lg" ? "font-serif text-2xl" : "text-sm",
          )}
        >
          {player.name}
        </p>
        <p
          className={cn(
            "truncate text-muted-foreground",
            size === "lg" ? "text-sm" : "text-xs",
          )}
        >
          {player.club} · {player.nation}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {typeof price === "number" ? (
          <span
            className={cn(
              "font-mono text-xs font-bold",
              free ? "text-accent" : "text-primary",
            )}
          >
            {free ? "هدية" : `${price} م`}
          </span>
        ) : (
          <span className="font-mono text-xs text-muted-foreground">{player.value} م</span>
        )}
        {swapped ? <span className="text-[10px] font-bold text-accent">كرت</span> : null}
      </div>
    </div>
  )
}
