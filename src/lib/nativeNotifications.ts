import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { SCHEDULE_REMINDERS } from '../data/notifications'
import { parseDateKey } from './dates'
import { minutesToLocalDate } from './deviceTime'
import { getBlockAlarmTriggers } from './scheduleAlerts'
import type { AppSettings, DayLog, TimeBlock } from '../types'

const REMINDER_ID_BASE = 1000
const PLAN_ID_BASE = 2000
const ALARM_CHANNEL_ID = 'rhythm-alarms'

async function ensureAlarmChannel() {
  if (Capacitor.getPlatform() !== 'android') return
  try {
    await LocalNotifications.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Rhythm alarms',
      description: 'Plan block alerts at start and 5 minutes before',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
    })
  } catch {
    /* channel may already exist */
  }
}

function reminderNumericId(index: number) {
  return REMINDER_ID_BASE + index
}

function planNumericId(index: number) {
  return PLAN_ID_BASE + index
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const result = await LocalNotifications.requestPermissions()
    return result.display === 'granted'
  } catch {
    return false
  }
}

export interface NativeSyncContext {
  todayKey: string
  todayLog: DayLog
  timeBlocks: TimeBlock[]
}

export async function syncNativeScheduleReminders(
  settings: AppSettings['notifications'],
  context?: NativeSyncContext,
): Promise<{ ok: boolean; message: string }> {
  if (!isNativeApp()) {
    return { ok: false, message: 'Native alarms run in the App Store / Play Store build only.' }
  }

  const hasTimedItems =
    context &&
    getBlockAlarmTriggers(
      context.todayLog.dailyPlan ?? [],
      context.timeBlocks,
      parseDateKey(context.todayKey),
    ).length > 0

  if (!settings.enabled && !hasTimedItems) {
    await cancelNativeReminders()
    return { ok: true, message: 'Native reminders turned off.' }
  }

  const granted = await requestNativeNotificationPermission()
  if (!granted) {
    return { ok: false, message: 'Notification permission denied on this device.' }
  }

  await cancelNativeReminders()
  await ensureAlarmChannel()

  const dailyPlan = context?.todayLog.dailyPlan ?? []
  const sound = settings.alarmStyle === 'off' ? undefined : 'default'
  const channelId = Capacitor.getPlatform() === 'android' ? ALARM_CHANNEL_ID : undefined

  if (context) {
    const now = Date.now()
    const forDate = parseDateKey(context.todayKey)
    const triggers = getBlockAlarmTriggers(dailyPlan, context.timeBlocks, forDate)
    if (triggers.length > 0) {
      const notifications = triggers
        .map((trigger, index) => {
          const at = minutesToLocalDate(trigger.startMinutes, forDate)
          if (at.getTime() <= now) return null
          return {
            id: planNumericId(index),
            title: trigger.label.replace('Rhythm — ', ''),
            body: trigger.body,
            schedule: { at, allowWhileIdle: true },
            sound,
            channelId,
            extra: { planAlarmId: trigger.id },
          }
        })
        .filter((n): n is NonNullable<typeof n> => n !== null)

      if (notifications.length === 0) {
        return { ok: true, message: 'No upcoming block alerts left for today.' }
      }

      await LocalNotifications.schedule({ notifications })
      return {
        ok: true,
        message: `Scheduled ${notifications.length} block alerts (5 min before + start) for today.`,
      }
    }
  }

  const active = SCHEDULE_REMINDERS.filter((r) => settings.reminderIds.includes(r.id))
  const notifications = active.map((reminder, index) => ({
    id: reminderNumericId(index),
    title: reminder.label.replace('Rhythm — ', ''),
    body: reminder.body,
    schedule: {
      on: {
        hour: reminder.hour,
        minute: reminder.minute,
      },
      repeats: true,
      allowWhileIdle: true,
    },
    sound,
    channelId,
    extra: { reminderId: reminder.id },
  }))

  if (notifications.length === 0) {
    return { ok: true, message: 'No reminders selected to schedule.' }
  }

  await LocalNotifications.schedule({ notifications })
  return {
    ok: true,
    message: `Scheduled ${notifications.length} daily native alarms on this device.`,
  }
}

export async function cancelNativeReminders() {
  if (!isNativeApp()) return
  try {
    const pending = await LocalNotifications.getPending()
    const ids = pending.notifications.map((n) => ({ id: n.id }))
    if (ids.length > 0) await LocalNotifications.cancel({ notifications: ids })
  } catch {
    /* ignore */
  }
}

export async function scheduleNativeTestNotification(delaySeconds = 5) {
  if (!isNativeApp()) return false
  const granted = await requestNativeNotificationPermission()
  if (!granted) return false

  await LocalNotifications.schedule({
    notifications: [
      {
        id: 9999,
        title: 'Rhythm test',
        body: 'Native notifications are working on this device.',
        schedule: { at: new Date(Date.now() + delaySeconds * 1000) },
        sound: 'default',
      },
    ],
  })
  return true
}

export function registerNativeNotificationListeners() {
  if (!isNativeApp()) return () => {}

  const received = LocalNotifications.addListener('localNotificationReceived', () => {
    void import('../lib/alarmSound').then(({ playAlarmSound, vibrateAlarm }) => {
      playAlarmSound('classic')
      vibrateAlarm()
    })
  })

  const action = LocalNotifications.addListener('localNotificationActionPerformed', () => {
    void import('../lib/alarmSound').then(({ stopAlarmLoop }) => stopAlarmLoop())
  })

  return () => {
    void received.then((h) => h.remove())
    void action.then((h) => h.remove())
  }
}
