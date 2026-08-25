import type { Metadata, Viewport } from "next"
import { Cairo, Reem_Kufi } from "next/font/google"
import "./globals.css"

const _cairo = Cairo({ subsets: ["arabic", "latin"] })
const _reemKufi = Reem_Kufi({ subsets: ["arabic", "latin"] })

export const metadata: Metadata = {
  title: "المزاد | مزاد اللاعبين",
  description:
    "لعبة المزاد: كل مشترك معه ميزانية، تزايدوا على اللاعبين في ١١ مركز، والحكم يدير المزاد ثم تُحاكى المباراة دقيقة بدقيقة.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#132a22",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="bg-background h-full">
      <body className="font-sans antialiased min-h-full flex flex-col">{children}</body>
    </html>
  )
}
