import { clearAuthStorage } from './clearAuthStorage'
import { FORCE_LOGIN_LOCAL_KEY } from './gateVersion'

function loginPath(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') || ''
  return `${base}/login`
}

function isLoginPath(pathname: string): boolean {
  return pathname === '/login' || pathname.endsWith('/login')
}

async function clearPwaCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    } catch {
      /* ignore */
    }
  }
  if ('caches' in window) {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {
      /* ignore */
    }
  }
}

/**
 * One-time per AUTH_GATE_GENERATION: clear auth tokens and send users to /login.
 * Returns true if navigation was started (callers should not mount React).
 */
export async function enforceForceLoginGate(): Promise<boolean> {
  if (!import.meta.env.PROD || typeof window === 'undefined') return false
  if (localStorage.getItem(FORCE_LOGIN_LOCAL_KEY) === 'done') return false

  clearAuthStorage()
  await clearPwaCaches()
  localStorage.setItem(FORCE_LOGIN_LOCAL_KEY, 'done')

  const target = loginPath()
  if (!isLoginPath(window.location.pathname)) {
    const suffix = `${window.location.search}${window.location.hash}`
    window.location.replace(`${target}${suffix}`)
    return true
  }

  return false
}
