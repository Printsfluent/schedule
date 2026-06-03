import { hasStoredFirebaseSession } from './hasFirebaseSession'
import { loginPath } from './forceLoginGate'

/** Pre-auth installs kept schedule data in localStorage without Firebase. */
export function hasLegacyAppDataWithoutAuth(): boolean {
  if (hasStoredFirebaseSession()) return false
  if (typeof localStorage === 'undefined') return false

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('rhythm-app-v2') || key === 'schedule-app-state') {
        return true
      }
    }
  } catch {
    /* Safari private mode */
  }
  return false
}

export function redirectToLoginWithCacheBust(): void {
  const base = loginPath()
  const sep = base.includes('?') ? '&' : '?'
  window.location.replace(`${base}${sep}refresh=${Date.now()}`)
}
