import { HomeClient } from "@/components/home-client"
import { Gavel, Gift, IdCard, Radio } from "lucide-react"

const STEPS = [
  {
    icon: Gavel,
    title: "المزاد",
    text: "الحكم يفتح لاعباً لكل مركز، والمشتركون يتزايدون من ميزانيتهم. أعلى مزايدة تأخذ اللاعب.",
  },
  {
    icon: Gift,
    title: "هدية الخسارة",
    text: "اللي خسر المزاد ياخذ لاعب مجاناً يختاره له الحكم — بدون خصم من الميزانية.",
  },
  {
    icon: IdCard,
    title: "الكرت الخاص",
    text: "كرت واحد لكل مشترك: يشيل أي لاعب من تشكيلته ويستبدله بلاعب ثاني قبل المباراة.",
  },
  {
    icon: Radio,
    title: "المباراة",
    text: "المتبقي من ميزانيتك يحدد مدربك، وبعدها محاكاة حية دقيقة بدقيقة مع أهداف وأحداث.",
  },
]

export default function Home() {
  return (
    <main className="pitch-glow flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-5xl flex-col items-center gap-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-sm border border-primary/40 px-3 py-1 text-xs font-bold tracking-widest text-primary">
            نسخة الأصحاب
          </span>
          <h1 className="font-serif text-5xl leading-tight text-balance sm:text-7xl">المــزاد</h1>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            حكم واحد يدير المزاد، والباقي يتزايدون على أحد عشر مركزاً. من يبني أقوى تشكيلة بأقل صرف؟
            الجواب في محاكاة المباراة.
          </p>
        </header>

        <HomeClient />

        <section className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex flex-col gap-3 rounded-lg border border-border bg-card/60 p-4">
              <div className="flex items-center gap-2">
                <s.icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="font-serif text-lg">{s.title}</h3>
                <span className="ms-auto font-mono text-xs text-muted-foreground">{i + 1}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
