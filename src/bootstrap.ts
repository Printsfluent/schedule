import { bootstrapAppUpdate } from './lib/appUpdate'
import { enforceForceLoginGate, redirectToLoginIfGuest } from './lib/auth/forceLoginGate'
import { bootstrapBrowserCompat } from './lib/browserCompat'
import { bootstrapTheme } from './lib/theme'
import { deleteAllCaches, unregisterAllServiceWorkers } from './lib/unregisterServiceWorkers'

export async function bootstrapApp(): Promise<void> {
  bootstrapBrowserCompat()
  bootstrapTheme()

  if (import.meta.env.PROD && !import.meta.env.SSR) {
    await unregisterAllServiceWorkers()
    await deleteAllCaches()

    const redirected = await enforceForceLoginGate()
    if (redirected) return

    if (redirectToLoginIfGuest()) return

    const reloaded = await bootstrapAppUpdate()
    if (reloaded) return
  }
}
