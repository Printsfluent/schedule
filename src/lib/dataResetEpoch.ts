import { persistFactoryDefaults } from '../store/useStore'

/**
 * Bump to force every device back to factory defaults on next app open.
 * Deploy, then each user gets a fresh schedule + onboarding on their next visit.
 * Local reset is pushed over their Firestore copy on next sign-in.
 */
export const APP_DATA_RESET_EPOCH = 1

const EPOCH_KEY = 'rhythm-data-reset-epoch'

/** Set after a mandatory reset — next cloud sync must push local state, not pull remote. */
export const FORCE_CLOUD_PUSH_AFTER_RESET_KEY = 'rhythm-force-cloud-push-after-reset'

export function needsMandatoryDataReset(): boolean {
  if (APP_DATA_RESET_EPOCH <= 0) return false
  try {
    return localStorage.getItem(EPOCH_KEY) !== String(APP_DATA_RESET_EPOCH)
  } catch {
    return false
  }
}

/** Wipe local Rhythm data once per APP_DATA_RESET_EPOCH. Returns true if reset ran. */
export function applyMandatoryDataReset(): boolean {
  if (!needsMandatoryDataReset()) return false
  persistFactoryDefaults()
  try {
    localStorage.setItem(EPOCH_KEY, String(APP_DATA_RESET_EPOCH))
    localStorage.setItem(FORCE_CLOUD_PUSH_AFTER_RESET_KEY, '1')
  } catch {
    /* private mode */
  }
  return true
}

export function consumeForceCloudPushAfterReset(): boolean {
  try {
    const flag = localStorage.getItem(FORCE_CLOUD_PUSH_AFTER_RESET_KEY)
    if (flag !== '1') return false
    localStorage.removeItem(FORCE_CLOUD_PUSH_AFTER_RESET_KEY)
    return true
  } catch {
    return false
  }
}
