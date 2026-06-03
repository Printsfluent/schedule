import { deleteAllCaches, unregisterAllServiceWorkers } from './unregisterServiceWorkers'

declare const __APP_BUILD_ID__: string

const BUILD_KEY = 'rhythm-app-build-id'

async function clearPwaCaches(): Promise<void> {
  await unregisterAllServiceWorkers()
  await deleteAllCaches()
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

  const reloadKey = `rhythm-build-reload-${buildId}`
  if (sessionStorage.getItem(reloadKey)) return false

  sessionStorage.setItem(reloadKey, '1')
  await clearPwaCaches()
  window.location.reload()
  return true
}
