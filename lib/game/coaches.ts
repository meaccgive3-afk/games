/**
 * المدرب يُمنح في نهاية المزاد حسب الميزانية المتبقية:
 * كل ما بقي معك أكثر، كل ما كان المدرب أقوى.
 */
export interface Coach {
  name: string
  tier: string
  /** نسبة تعزيز على قوة الفريق */
  boost: number
  minRemaining: number
  style: string
}

export const COACHES: Coach[] = [
  {
    name: "بيب غوارديولا",
    tier: "أسطوري",
    boost: 6,
    minRemaining: 60,
    style: "سيطرة تامة واستحواذ قاتل",
  },
  {
    name: "كارلو أنشيلوتي",
    tier: "أسطوري",
    boost: 5,
    minRemaining: 45,
    style: "هدوء وخبرة في اللحظات الكبيرة",
  },
  {
    name: "يورغن كلوب",
    tier: "ممتاز",
    boost: 4,
    minRemaining: 32,
    style: "ضغط عالٍ وسرعة انتقالات",
  },
  {
    name: "أنطونيو كونتي",
    tier: "ممتاز",
    boost: 3,
    minRemaining: 22,
    style: "تنظيم دفاعي صارم",
  },
  {
    name: "أوناي إيمري",
    tier: "جيد",
    boost: 2,
    minRemaining: 14,
    style: "خطط مدروسة لكل مباراة",
  },
  {
    name: "روبن أموريم",
    tier: "جيد",
    boost: 1,
    minRemaining: 7,
    style: "ثلاثي دفاعي وأجنحة مندفعة",
  },
  {
    name: "مدرب الفريق الرصيف",
    tier: "متوسط",
    boost: 0,
    minRemaining: 2,
    style: "يحاول ترتيب الفوضى",
  },
  {
    name: "مدرب متطوع من الجمهور",
    tier: "ضعيف",
    boost: -3,
    minRemaining: 0,
    style: "لا يعرف أسماء لاعبيه",
  },
]

export function coachForRemaining(remaining: number): Coach {
  return COACHES.find((c) => remaining >= c.minRemaining) ?? COACHES[COACHES.length - 1]
}
