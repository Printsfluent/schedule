import { applyMandatoryDataReset } from './lib/dataResetEpoch'
import { bootstrapAppUpdate } from './lib/appUpdate'
import { redirectToLoginIfGuest } from './lib/auth/forceLoginGate'
import {
  applyMandatoryLoginEpoch,
  redirectToMandatoryLogin,
} from './lib/auth/mandatoryLoginEpoch'
import { hasStoredFirebaseSession } from './lib/auth/hasFirebaseSession'
import { getFirebaseAuth, waitForAuthPersistence } from './lib/firebase'
import { bootstrapBrowserCompat } from './lib/browserCompat'
import { bootstrapTheme } from './lib/theme'
import { deleteAllCaches, unregisterAllServiceWorkers } from './lib/unregisterServiceWorkers'

export async function bootstrapApp(): Promise<void> {
  bootstrapBrowserCompat()
  bootstrapTheme()
  applyMandatoryDataReset()

  if (import.meta.env.PROD && !import.meta.env.SSR) {
    const auth = getFirebaseAuth()
    const epochApplied = await applyMandatoryLoginEpoch(auth)
    if (epochApplied) {
      await unregisterAllServiceWorkers()
      await deleteAllCaches()
      redirectToMandatoryLogin()
      return
    }

    if (auth) await waitForAuthPersistence()
    if (!auth?.currentUser && !hasStoredFirebaseSession()) {
      await unregisterAllServiceWorkers()
      await deleteAllCaches()
      if (redirectToLoginIfGuest()) return
    }

    const reloaded = await bootstrapAppUpdate()
    if (reloaded) return
  }
}
