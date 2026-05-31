import { clearFiredRemindersToday } from '../hooks/useAlarmScheduler'
import { clearRhythmSessionStorage, clearRhythmStorage } from './browserCompat'
import { cancelNativeReminders, isNativeApp } from './nativeNotifications'
import { persistFactoryDefaults } from '../store/useStore'

/** Clear all saved Rhythm data on this device and reload with factory defaults. */
export async function resetAllAppData() {
  clearRhythmStorage()
  clearRhythmSessionStorage()
  clearFiredRemindersToday()
  persistFactoryDefaults()
  if (isNativeApp()) {
    await cancelNativeReminders()
  }
  window.location.href = `${window.location.pathname}?reset=${Date.now()}`
}
