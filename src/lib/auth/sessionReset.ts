import { signOut, type Auth } from 'firebase/auth'
import { clearAuthStorage } from './clearAuthStorage'
import { AUTH_GATE_GENERATION } from './gateVersion'

/** Bump AUTH_GATE_GENERATION to sign out every client on their next visit. */
export const AUTH_SESSION_RESET_VERSION = AUTH_GATE_GENERATION

const VERSION_KEY = 'rhythm-auth-reset-version'

export async function applyAuthSessionResetIfNeeded(auth: Auth): Promise<void> {
  if (typeof localStorage === 'undefined') return

  const current = String(AUTH_SESSION_RESET_VERSION)
  if (localStorage.getItem(VERSION_KEY) === current) return

  clearAuthStorage()
  try {
    await signOut(auth)
  } catch {
    /* no session */
  }
  localStorage.setItem(VERSION_KEY, current)
}
