import type { Auth } from 'firebase/auth'
import { AUTH_GATE_GENERATION } from './gateVersion'

/** Tracks deploy gate version only — does not sign users out. */
export const AUTH_SESSION_RESET_VERSION = AUTH_GATE_GENERATION

const VERSION_KEY = 'rhythm-auth-reset-version'

export async function applyAuthSessionResetIfNeeded(_auth: Auth): Promise<void> {
  if (typeof localStorage === 'undefined') return

  const current = String(AUTH_SESSION_RESET_VERSION)
  if (localStorage.getItem(VERSION_KEY) === current) return

  localStorage.setItem(VERSION_KEY, current)
}
