import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import {
  isNativeApp,
  registerNativeNotificationListeners,
  syncNativeScheduleReminders,
  type NativeSyncContext,
} from '../lib/nativeNotifications'
import type { AppSettings } from '../types'

interface Options extends NativeSyncContext {
  settings: AppSettings['notifications']
}

export function useNativeNotifications({ settings, todayKey, todayLog, timeBlocks }: Options) {
  const context: NativeSyncContext = { todayKey, todayLog, timeBlocks }
  const planKey = (todayLog.dailyPlan ?? []).map((item) => item.id).join(',')

  useEffect(() => {
    if (!isNativeApp()) return
    const cleanup = registerNativeNotificationListeners()
    return cleanup
  }, [])

  useEffect(() => {
    if (!isNativeApp() || !settings.enabled) return
    void syncNativeScheduleReminders(settings, context)
  }, [settings.enabled, settings.reminderIds, settings.alarmStyle, todayKey, planKey])

  useEffect(() => {
    if (!isNativeApp()) return
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && settings.enabled) {
        void syncNativeScheduleReminders(settings, context)
      }
    })
    return () => {
      void sub.then((h) => h.remove())
    }
  }, [settings.enabled, settings.reminderIds, settings.alarmStyle, todayKey, planKey])
}

export async function refreshNativeReminders(
  settings: AppSettings['notifications'],
  context: NativeSyncContext,
) {
  return syncNativeScheduleReminders(settings, context)
}
