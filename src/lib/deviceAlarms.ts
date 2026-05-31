import { parseDateKey } from './dates'
import { minutesToLocalDate } from './deviceTime'
import { isNativeApp, syncNativeScheduleReminders, type NativeSyncContext } from './nativeNotifications'
import { getPlanAlarmTriggers } from './planAlarms'
import { requestNotificationPermissionCompat } from './browserCompat'
import type { AppSettings } from '../types'

export type DeviceAlarmSyncResult = {
  ok: boolean
  message: string
  scheduled: number
}

function buildScheduledAlarms(context: NativeSyncContext) {
  const dailyPlan = context.todayLog.dailyPlan ?? []
  if (dailyPlan.length === 0) return []

  const forDate = parseDateKey(context.todayKey)
  const now = Date.now()
  return getPlanAlarmTriggers(dailyPlan, context.timeBlocks, forDate)
    .map((trigger) => ({
      id: trigger.id,
      at: minutesToLocalDate(trigger.startMinutes, forDate).getTime(),
      title: trigger.label.replace(/^Rhythm — /, ''),
      body: trigger.body,
    }))
    .filter((alarm) => alarm.at > now)
}

export function mergePlanAlarmContexts(...contexts: NativeSyncContext[]) {
  const map = new Map<string, ReturnType<typeof buildScheduledAlarms>[number]>()
  for (const context of contexts) {
    for (const alarm of buildScheduledAlarms(context)) {
      map.set(alarm.id, alarm)
    }
  }
  return [...map.values()].sort((a, b) => a.at - b.at)
}

async function syncWebPlanAlarms(
  _settings: AppSettings['notifications'],
  contexts: NativeSyncContext[],
): Promise<DeviceAlarmSyncResult> {
  const alarms = mergePlanAlarmContexts(...contexts)

  if (alarms.length === 0) {
    return { ok: true, message: 'No upcoming plan times left today.', scheduled: 0 }
  }

  if (!('Notification' in window)) {
    return {
      ok: false,
      message: 'This browser does not support notifications. Use Calendar export instead.',
      scheduled: 0,
    }
  }

  let permission: NotificationPermission | 'unsupported' | 'insecure' = Notification.permission
  if (permission === 'default') {
    permission = await requestNotificationPermissionCompat()
  }

  if (permission !== 'granted') {
    return {
      ok: false,
      message: 'Allow notifications to link Rhythm to your device alarm system.',
      scheduled: 0,
    }
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      registration.active?.postMessage({ type: 'SYNC_PLAN_ALARMS', alarms })
      return {
        ok: true,
        message: `Linked ${alarms.length} device alarm${alarms.length === 1 ? '' : 's'} (5 min before + start).`,
        scheduled: alarms.length,
      }
    } catch {
      /* fall through to in-app only */
    }
  }

  return {
    ok: true,
    message: `Alarms ready while Rhythm is open (${alarms.length} today). Add to Home Screen or export to Calendar for background alerts.`,
    scheduled: alarms.length,
  }
}

/** Link plan times to the device notification / alarm system. */
export async function syncDeviceAlarms(
  settings: AppSettings['notifications'],
  context: NativeSyncContext | NativeSyncContext[],
): Promise<DeviceAlarmSyncResult> {
  const contexts = Array.isArray(context) ? context : [context]
  const hasPlan = contexts.some((c) => (c.todayLog.dailyPlan ?? []).length > 0)

  if (!hasPlan) {
    if (isNativeApp()) {
      const result = await syncNativeScheduleReminders(settings, contexts[0])
      return { ...result, scheduled: 0 }
    }
    return { ok: true, message: 'No daily plan to schedule.', scheduled: 0 }
  }

  if (isNativeApp()) {
    const result = await syncNativeScheduleReminders(settings, contexts[0])
    const scheduled = mergePlanAlarmContexts(...contexts).length
    return {
      ok: result.ok,
      message: result.ok
        ? `${result.message} ${scheduled} plan alarm${scheduled === 1 ? '' : 's'} queued.`
        : result.message,
      scheduled,
    }
  }

  return syncWebPlanAlarms(settings, contexts)
}

export function countUpcomingDeviceAlarms(context: NativeSyncContext | NativeSyncContext[]): number {
  const contexts = Array.isArray(context) ? context : [context]
  return mergePlanAlarmContexts(...contexts).length
}
