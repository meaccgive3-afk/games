"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Player } from "@/lib/game/types"

const GROUP_TONE: Record<string, string> = {
  GK: "text-accent",
  DEF: "text-foreground",
  MID: "text-foreground",
  ATT: "text-primary",
}

const AVATAR_SIZE = {
  sm: "size-9 text-sm",
  md: "size-11 text-base",
  lg: "size-16 text-2xl",
} as const

/**
 * الصورة تُحمّل مباشرة من R2 CDN في المتصفح (بدون مرور على السيرفر).
 * لو صورة اللاعب غير مرفوعة بعد نرجع تلقائيًا إلى التقييم الرقمي،
 * فلا تظهر أبدًا صورة مكسورة.
 */
function PlayerAvatar({ player, size }: { player: Player; size: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(player.img) && !failed

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-secondary font-mono font-bold",
        AVATAR_SIZE[size],
        GROUP_TONE[player.group],
      )}
    >
      {showImage ? (
        <img
          src={player.img}
          alt={player.name}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{player.rating}</span>
      )}
    </div>
  )
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
      <PlayerAvatar player={player} size={size} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-bold leading-tight", size === "lg" ? "font-serif text-2xl" : "text-sm")}>
          {player.name}
        </p>
        <p className={cn("truncate text-muted-foreground", size === "lg" ? "text-sm" : "text-xs")}>
          {player.club} · {player.nation}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={cn("font-mono font-bold", size === "lg" ? "text-base" : "text-xs", GROUP_TONE[player.group])}>
          {player.rating}
        </span>
        {typeof price === "number" ? (
          <span className={cn("font-mono text-xs font-bold", free ? "text-accent" : "text-primary")}>
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
