import { FORCE_LOGIN_LOCAL_KEY } from './gateVersion'
import { hasStoredFirebaseSession } from './hasFirebaseSession'

export function loginPath(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') || ''
  return `${base}/login`
}

function isLoginPath(pathname: string): boolean {
  return pathname === '/login' || pathname.endsWith('/login')
}

/**
 * One-time per AUTH_GATE_GENERATION: send guests to /login (signed-in users stay logged in).
 */
export function enforceForceLoginGate(): boolean {
  if (!import.meta.env.PROD || typeof window === 'undefined') return false
  if (localStorage.getItem(FORCE_LOGIN_LOCAL_KEY) === 'done') return false

  localStorage.setItem(FORCE_LOGIN_LOCAL_KEY, 'done')
  return redirectToLoginIfGuest()
}

/** Safari bfcache / stale bundles: send guests to /login on every load. */
export function redirectToLoginIfGuest(): boolean {
  if (!import.meta.env.PROD || typeof window === 'undefined') return false
  if (hasStoredFirebaseSession()) return false
  if (isLoginPath(window.location.pathname)) return false

  const suffix = `${window.location.search}${window.location.hash}`
  window.location.replace(`${loginPath()}${suffix}`)
  return true
}
