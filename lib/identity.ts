const KEY = (code: string) => `mzad:${code.toUpperCase()}`

export function saveIdentity(code: string, participantId: string) {
  try {
    window.localStorage.setItem(KEY(code), participantId)
  } catch {
    // تجاهل
  }
}

export function readIdentity(code: string): string | null {
  try {
    return window.localStorage.getItem(KEY(code))
  } catch {
    return null
  }
}

export function clearIdentity(code: string) {
  try {
    window.localStorage.removeItem(KEY(code))
  } catch {
    // تجاهل
  }
}
