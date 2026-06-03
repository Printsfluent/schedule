import { clearAuthStorage } from './auth/clearAuthStorage'

declare const __APP_BUILD_ID__: string

const BUILD_KEY = 'rhythm-app-build-id'

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
 * After a new deploy, drop stale PWA caches once and reload so phones pick up the login gate.
 * Returns true if a reload was started (callers should not mount React).
 */
export async function bootstrapAppUpdate(): Promise<boolean> {
  if (!import.meta.env.PROD || typeof window === 'undefined') return false

  const buildId = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev'
  const previous = localStorage.getItem(BUILD_KEY)

  if (previous === buildId) return false

  localStorage.setItem(BUILD_KEY, buildId)
  clearAuthStorage()

  const reloadKey = `rhythm-build-reload-${buildId}`
  if (sessionStorage.getItem(reloadKey)) return false

  sessionStorage.setItem(reloadKey, '1')
  await clearPwaCaches()
  window.location.reload()
  return true
}
