import { bootstrapAppUpdate } from './lib/appUpdate'
import { enforceForceLoginGate } from './lib/auth/forceLoginGate'
import { bootstrapBrowserCompat } from './lib/browserCompat'
import { bootstrapTheme } from './lib/theme'

export async function bootstrapApp(): Promise<void> {
  bootstrapBrowserCompat()
  bootstrapTheme()

  if (import.meta.env.PROD && !import.meta.env.SSR) {
    const redirected = await enforceForceLoginGate()
    if (redirected) return

    const reloaded = await bootstrapAppUpdate()
    if (reloaded) return

    const { registerSW } = await import('virtual:pwa-register')
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        void updateSW(true)
      },
    })
  }
}
