import { clearFiredRemindersToday } from '../hooks/useAlarmScheduler'
import { clearRhythmSessionStorage, clearRhythmStorage } from './browserCompat'
import { getFirebaseAuth } from './firebase'
import { cancelNativeReminders, isNativeApp } from './nativeNotifications'
import { pushAppStateNow } from './sync/appStateSync'
import { persistFactoryDefaults } from '../store/useStore'

/** Clear all saved Rhythm data on this device and reload with factory defaults. */
export async function resetAllAppData() {
  clearRhythmStorage()
  clearRhythmSessionStorage()
  clearFiredRemindersToday()
  persistFactoryDefaults()
  const uid = getFirebaseAuth()?.currentUser?.uid
  if (uid) {
    try {
      await pushAppStateNow(uid)
    } catch {
      /* offline */
    }
  }
  if (isNativeApp()) {
    await cancelNativeReminders()
  }
  window.location.href = `${window.location.pathname}?reset=${Date.now()}`
}
