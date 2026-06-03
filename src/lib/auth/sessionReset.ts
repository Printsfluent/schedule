import { signOut, type Auth } from 'firebase/auth'
import { clearAuthStorage } from './clearAuthStorage'

/** Bump to sign out every client on their next visit (e.g. when auth provider changes). */
export const AUTH_SESSION_RESET_VERSION = 4

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
