import { signOut, type Auth } from 'firebase/auth'
import { clearAuthStorage } from './clearAuthStorage'
import { loginPath } from './forceLoginGate'
import { AUTH_LOGIN_REQUIRED_EPOCH } from './gateVersion'

const EPOCH_KEY = 'rhythm-auth-epoch'

function clearUsernameLoginMaps(): void {
  if (typeof localStorage === 'undefined') return
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('rhythm-login:')) toRemove.push(key)
  }
  toRemove.forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  })
}

/** True when this device has not yet accepted the mandatory-login requirement. */
export function needsMandatoryLoginEpoch(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(EPOCH_KEY) !== String(AUTH_LOGIN_REQUIRED_EPOCH)
}

/**
 * One-time per epoch: wipe every saved auth session so pre-login testers must sign in.
 * Returns true when callers should send the user to /login.
 */
export async function applyMandatoryLoginEpoch(auth: Auth | null): Promise<boolean> {
  if (!needsMandatoryLoginEpoch()) return false

  clearAuthStorage()
  clearUsernameLoginMaps()
  localStorage.setItem(EPOCH_KEY, String(AUTH_LOGIN_REQUIRED_EPOCH))

  if (auth) {
    try {
      await signOut(auth)
    } catch {
      /* no session */
    }
  }

  return true
}

export function redirectToMandatoryLogin(): void {
  const base = loginPath()
  const sep = base.includes('?') ? '&' : '?'
  window.location.replace(`${base}${sep}auth=required`)
}
