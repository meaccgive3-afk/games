import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
} from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "ghost" | "outline" | "danger" | "accent"

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:brightness-110",
  accent: "bg-accent text-accent-foreground hover:brightness-110",
  outline: "border border-border bg-transparent text-foreground hover:bg-secondary",
  ghost: "bg-secondary text-secondary-foreground hover:brightness-125",
  danger: "bg-destructive text-destructive-foreground hover:brightness-110",
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition disabled:opacity-40",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-base",
        size === "lg" && "h-13 px-6 text-lg",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card text-card-foreground p-4", className)}
      {...props}
    />
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-border bg-input px-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-ring",
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-md border border-border bg-input px-3 text-base text-foreground outline-none focus:border-ring",
        className,
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium text-muted-foreground", className)} {...props} />
  )
}

export function Badge({
  className,
  tone = "muted",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "muted" | "gold" | "green" | "red" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-bold",
        tone === "muted" && "bg-secondary text-muted-foreground",
        tone === "gold" && "bg-primary text-primary-foreground",
        tone === "green" && "bg-accent text-accent-foreground",
        tone === "red" && "bg-destructive text-destructive-foreground",
        className,
      )}
      {...props}
    />
  )
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-serif text-xl text-foreground">{children}</h2>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  )
}
