import { hasStoredFirebaseSession } from './auth/hasFirebaseSession'

let registered = false

export function resetPwaRegistration(): void {
  registered = false
}

/** Register the service worker only after sign-in so Safari/Chrome never cache the app shell for guests. */
export async function registerProductionPwa(): Promise<void> {
  if (!import.meta.env.PROD || import.meta.env.SSR || registered) return
  if (!hasStoredFirebaseSession()) return

  registered = true
  const { registerSW } = await import('virtual:pwa-register')
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true)
    },
  })
}
