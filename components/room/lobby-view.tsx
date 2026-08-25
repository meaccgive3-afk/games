"use client"

import { useState, useTransition } from "react"
import { UserMinus, Users } from "lucide-react"
import { kickAction, startAuctionAction, updateSettingsAction } from "@/app/actions"
import { Badge, Button, Card, Input, Label, SectionTitle } from "@/components/ui/primitives"
import { POSITION_LABELS } from "@/lib/game/types"
import type { RoomState } from "@/lib/game/types"

export function LobbyView({
  state,
  me,
  isHost,
  refresh,
}: {
  state: RoomState
  me: string
  isHost: boolean
  refresh: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [budget, setBudget] = useState(state.settings.budget)
  const [inc, setInc] = useState(state.settings.minIncrement)

  const bidders = state.participants.filter((p) => p.id !== state.hostId)

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    start(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error ?? "خطأ")
      refresh()
    })
  }

  return (
    <div className="grid gap-4 pt-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <Card>
          <SectionTitle hint={`${state.participants.length} في الغرفة`}>المشتركون</SectionTitle>
          <ul className="mt-3 flex flex-col gap-2">
            {state.participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-md border border-border bg-secondary/40 px-3 py-2"
              >
                <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-bold">{p.name}</span>
                {p.id === state.hostId ? <Badge tone="gold">الحكم</Badge> : null}
                {p.id === me ? <Badge tone="green">أنت</Badge> : null}
                <span className="ms-auto font-mono text-sm text-muted-foreground">
                  {p.id === state.hostId ? "—" : `${p.budget} م`}
                </span>
                {isHost && p.id !== state.hostId ? (
                  <button
                    onClick={() => run(() => kickAction(state.code, p.id))}
                    className="text-muted-foreground transition hover:text-destructive"
                    aria-label={`اطرد ${p.name}`}
                  >
                    <UserMinus className="size-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          {bidders.length < 2 ? (
            <p className="mt-3 rounded-sm bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              محتاجين مزايدين اثنين على الأقل غير الحكم. شارك الكود{" "}
              <span className="font-mono font-bold text-primary">{state.code}</span> مع أصحابك.
            </p>
          ) : null}
        </Card>

        <Card>
          <SectionTitle hint="١١ مركز">التشكيلة المطلوبة</SectionTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.settings.slots.map((s) => (
              <span
                key={s}
                className="rounded-sm border border-border bg-secondary/40 px-2 py-1 text-xs text-muted-foreground"
              >
                {POSITION_LABELS[s]}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <SectionTitle>الإعدادات</SectionTitle>
          {isHost ? (
            <div className="mt-3 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="lb">الميزانية لكل مشترك</Label>
                <div className="flex gap-2">
                  <Input
                    id="lb"
                    type="number"
                    min={20}
                    max={500}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  />
                  <Button
                    size="md"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => updateSettingsAction(state.code, { budget }))}
                  >
                    حفظ
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="li">أقل زيادة في المزايدة</Label>
                <div className="flex gap-2">
                  <Input
                    id="li"
                    type="number"
                    min={1}
                    max={10}
                    value={inc}
                    onChange={(e) => setInc(Number(e.target.value))}
                  />
                  <Button
                    size="md"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => updateSettingsAction(state.code, { minIncrement: inc }))}
                  >
                    حفظ
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Toggle
                  label="هدية لمن يخسر المزاد"
                  value={state.settings.giftEnabled}
                  onChange={(v) => run(() => updateSettingsAction(state.code, { giftEnabled: v }))}
                />
                <Toggle
                  label="الكرت الخاص قبل المباراة"
                  value={state.settings.cardEnabled}
                  onChange={(v) => run(() => updateSettingsAction(state.code, { cardEnabled: v }))}
                />
              </div>
            </div>
          ) : (
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <Row k="الميزانية" v={`${state.settings.budget} م`} />
              <Row k="أقل زيادة" v={`${state.settings.minIncrement} م`} />
              <Row k="الهدية" v={state.settings.giftEnabled ? "مفعّلة" : "معطّلة"} />
              <Row k="الكرت الخاص" v={state.settings.cardEnabled ? "مفعّل" : "معطّل"} />
            </dl>
          )}
        </Card>

        {error ? (
          <p className="rounded-sm bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </p>
        ) : null}

        {isHost ? (
          <Button
            size="lg"
            disabled={pending || bidders.length < 2}
            onClick={() => run(() => startAuctionAction(state.code))}
          >
            ابدأ المزاد
          </Button>
        ) : (
          <p className="rounded-md border border-border bg-card/60 px-3 py-3 text-center text-sm text-muted-foreground">
            في انتظار الحكم يبدأ المزاد…
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono font-bold">{v}</dd>
    </div>
  )
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm transition hover:bg-secondary"
      role="switch"
      aria-checked={value}
    >
      <span>{label}</span>
      <span
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${
          value ? "bg-accent" : "bg-muted"
        }`}
      >
        <span
          className={`size-5 rounded-full bg-background transition ${value ? "-translate-x-5" : ""}`}
        />
      </span>
    </button>
  )
}
