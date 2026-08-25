import type { CapacitorConfig } from "@capacitor/cli"

/**
 * The app is server-driven (Next.js Server Actions + Postgres + R2), so the
 * Android app is a native shell that loads the deployed site.
 *
 * Set CAP_SERVER_URL at build time to point the shell at a different deployment
 * (e.g. a preview URL). Defaults to the project's Vercel production URL.
 */
const serverUrl = process.env.CAP_SERVER_URL || "https://games-wine3660-3520.vercel.app"

const config: CapacitorConfig = {
  appId: "app.vercel.mzad",
  appName: "مزاد",
  // Only used as a local fallback bundle while the remote URL loads.
  webDir: "www",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: true,
  },
}

export default config
