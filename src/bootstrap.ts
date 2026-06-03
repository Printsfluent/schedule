import { bootstrapAppUpdate } from './lib/appUpdate'
import { hasStoredFirebaseSession } from './lib/auth/hasFirebaseSession'
import { enforceForceLoginGate, redirectToLoginIfGuest } from './lib/auth/forceLoginGate'
import { bootstrapBrowserCompat } from './lib/browserCompat'
import { bootstrapTheme } from './lib/theme'
import { deleteAllCaches, unregisterAllServiceWorkers } from './lib/unregisterServiceWorkers'

export async function bootstrapApp(): Promise<void> {
  bootstrapBrowserCompat()
  bootstrapTheme()

  if (import.meta.env.PROD && !import.meta.env.SSR) {
    if (enforceForceLoginGate()) return

    const hasSession = hasStoredFirebaseSession()
    if (!hasSession) {
      await unregisterAllServiceWorkers()
      await deleteAllCaches()
      if (redirectToLoginIfGuest()) return
    }

    const reloaded = await bootstrapAppUpdate()
    if (reloaded) return
  }
}
