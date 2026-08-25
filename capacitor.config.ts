import type { CapacitorConfig } from "@capacitor/cli"

/**
 * اللعبة تعمل على السيرفر (Next.js + Postgres)، فالتطبيق يفتح واجهة اللعبة
 * داخل التطبيق نفسه (WebView) ولا يفتح متصفح خارجي أبداً.
 *
 * مهم: لا تستخدم رابط Deployment محمي بـ Vercel Deployment Protection،
 * لأنه يعمل تحويل إلى vercel.com/login وهو نطاق خارجي — وهذا هو السبب
 * الذي كان يفتح المتصفح ويطلع صفحة موقع بدل اللعبة.
 *
 * غيّر الرابط وقت البناء بـ CAP_SERVER_URL إذا احتجت نشر ثاني.
 */
const DEFAULT_APP_URL = "https://games-three-lac.vercel.app"

const serverUrl = (process.env.CAP_SERVER_URL || DEFAULT_APP_URL).replace(/\/+$/, "")
const appHost = new URL(serverUrl).hostname

const config: CapacitorConfig = {
  appId: "app.vercel.mzad",
  appName: "مزاد",
  // شاشة انتظار محلية داخل التطبيق تظهر ريثما تُحمّل الواجهة.
  webDir: "www",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
    // نسمح بالتنقل داخل نطاق اللعبة فقط، فيبقى كل شيء داخل التطبيق.
    allowNavigation: [appHost],
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: true,
  },
}

export default config
