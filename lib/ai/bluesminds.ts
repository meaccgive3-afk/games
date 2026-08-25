/**
 * عميل BluesMinds (متوافق مع OpenAI).
 * يُستخدم فقط على السيرفر — المفتاح لا يُسرَّب للعميل أبداً.
 */

const BASE_URL = process.env.BLUESMINDS_BASE_URL || "https://api.bluesminds.com/v1"

/**
 * ترتيب الموديلات: الأقوى أولاً ثم بدائل عند الفشل.
 * تم التحقق منها فعلياً مقابل /v1/models و /v1/chat/completions.
 */
const MODEL_CHAIN = ["gpt-5.5", "gpt-4o", "unlimited/claude-sonnet-5", "meta/llama-3.3-70b-instruct"]

export class AiUnavailableError extends Error {}

interface ChatOptions {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
  /** عدد محاولات إعادة التوليد عند رجوع JSON غير صالح */
  attempts?: number
}

function extractJson(raw: string): unknown {
  let text = raw.trim()

  // إزالة أسوار الكود ```json ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()

  try {
    return JSON.parse(text)
  } catch {
    // محاولة أخيرة: أول كائن أو مصفوفة متزنة داخل النص
    const start = text.search(/[{[]/)
    if (start === -1) throw new Error("لا يوجد JSON في الرد")
    const open = text[start]
    const close = open === "{" ? "}" : "]"
    let depth = 0
    let inStr = false
    let esc = false
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      if (esc) {
        esc = false
        continue
      }
      if (ch === "\\") {
        esc = true
        continue
      }
      if (ch === '"') {
        inStr = !inStr
        continue
      }
      if (inStr) continue
      if (ch === open) depth++
      else if (ch === close) {
        depth--
        if (depth === 0) return JSON.parse(text.slice(start, i + 1))
      }
    }
    throw new Error("JSON غير مكتمل في الرد")
  }
}

async function callOnce(model: string, opts: ChatOptions, signal: AbortSignal): Promise<string> {
  const key = process.env.BLUESMINDS_API_KEY
  if (!key) throw new AiUnavailableError("مفتاح BLUESMINDS_API_KEY غير مضبوط")

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 900,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
    signal,
    cache: "no-store",
  })

  const body = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)

  let parsed: any
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new Error("رد غير صالح من المزود")
  }
  if (parsed?.error) throw new Error(String(parsed.error?.message ?? "خطأ من المزود"))

  const content = parsed?.choices?.[0]?.message?.content
  if (typeof content !== "string" || !content.trim()) throw new Error("رد فارغ من الموديل")
  return content
}

/**
 * يطلب JSON من الموديل ويتحقق منه عبر `validate`.
 * يجرّب سلسلة الموديلات ويعيد المحاولة عند فشل التحقق.
 */
export async function chatJson<T>(
  opts: ChatOptions,
  validate: (value: unknown) => T,
): Promise<{ data: T; model: string }> {
  const attempts = opts.attempts ?? 2
  const errors: string[] = []

  for (const model of MODEL_CHAIN) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45_000)
      try {
        const raw = await callOnce(model, opts, controller.signal)
        return { data: validate(extractJson(raw)), model }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`${model}#${attempt + 1}: ${msg}`)
        console.log("[v0] bluesminds failed", model, msg)
        // مفتاح مفقود → لا فائدة من المحاولة مع موديل آخر
        if (e instanceof AiUnavailableError) throw e
      } finally {
        clearTimeout(timer)
      }
    }
  }

  throw new AiUnavailableError(`تعذّر الوصول لحكم BluesMinds — ${errors.slice(-2).join(" | ")}`)
}

export const AI_MODELS = MODEL_CHAIN
