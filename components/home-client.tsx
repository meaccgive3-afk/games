"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createRoomAction, joinRoomAction } from "@/app/actions"
import { Button, Card, Input, Label } from "@/components/ui/primitives"
import { saveIdentity } from "@/lib/identity"

export function HomeClient() {
  const router = useRouter()
  const [tab, setTab] = useState<"create" | "join">("create")
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [budget, setBudget] = useState(100)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function go() {
    setError(null)
    start(async () => {
      const res =
        tab === "create" ? await createRoomAction(name, budget) : await joinRoomAction(code, name)
      if (!res.ok) {
        setError(res.error)
        return
      }
      const data = res.data!
      saveIdentity(data.code, data.participantId)
      router.push(`/room/${data.code}`)
    })
  }

  return (
    <Card className="w-full max-w-md p-5">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
        <button
          onClick={() => setTab("create")}
          className={`h-10 rounded-sm text-sm font-bold transition ${
            tab === "create" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          أنا الحكم — أنشئ غرفة
        </button>
        <button
          onClick={() => setTab("join")}
          className={`h-10 rounded-sm text-sm font-bold transition ${
            tab === "join" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          انضم بكود
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">اسمك</Label>
          <Input
            id="name"
            value={name}
            maxLength={24}
            placeholder="مثال: عبدالله"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {tab === "create" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget">ميزانية كل مشترك (بالمليون)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="budget"
                type="number"
                min={20}
                max={500}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
              <div className="flex gap-1">
                {[100, 150, 200].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className="h-9 rounded-sm border border-border px-2 text-xs font-bold text-muted-foreground hover:bg-secondary"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              الحكم يدير المزاد ولا يزايد. تحتاج مشتركين اثنين على الأقل غير الحكم.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">كود الغرفة</Label>
            <Input
              id="code"
              value={code}
              maxLength={5}
              placeholder="ABC12"
              className="font-mono text-center text-2xl tracking-[0.4em]"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>
        )}

        {error ? (
          <p className="rounded-sm bg-destructive/15 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </p>
        ) : null}

        <Button size="lg" disabled={pending || !name.trim() || (tab === "join" && code.length < 5)} onClick={go}>
          {pending ? "لحظة…" : tab === "create" ? "أنشئ الغرفة" : "دخول"}
        </Button>
      </div>
    </Card>
  )
}
