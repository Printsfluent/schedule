import { useCallback, useEffect, useRef, useState } from 'react'
import { SCHEDULE_REMINDERS } from '../data/notifications'
import type { AppSettings, DayLog } from '../types'
import { playAlarmSound, startAlarmLoop, stopAlarmLoop, vibrateAlarm } from '../lib/alarmSound'
import { formatDateKey } from '../lib/dates'
import { isSameLocalMinute } from '../lib/deviceTime'
import { getDeviceStorageKey } from '../lib/deviceStorage'
import { detectPlatform, isStandalonePwa, platformSettingsHint } from '../lib/devicePlatform'
import { requestNotificationPermissionCompat, safeStorage } from '../lib/browserCompat'
import {
  getBlockAlarmTriggers,
  getTimedScheduleItems,
  isBlockAlarmComplete,
  shouldFireBlockAlarmTrigger,
} from '../lib/scheduleAlerts'
import { isPlanItemSnoozed } from '../lib/smartSnooze'
import {
  canFireReminder,
  isDayStarted,
  needsWakePopup,
  WAKE_ALARM_ID,
} from '../lib/wakeFlow'
import type { TimeBlock } from '../types'

const FIRED_KEY = getDeviceStorageKey('rhythm-alarms-fired')

export interface ActiveAlarm {
  id: string
  label: string
  body: string
  firedAt: string
  kind: 'wake' | 'reminder'
}

function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext
}

export type NotificationStatus =
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported'
  | 'insecure'

export function getNotificationStatus(): NotificationStatus {
  if (!notificationsSupported()) return 'unsupported'
  if (!isSecureContext()) return 'insecure'
  return Notification.permission
}

export function getNotificationStatusMessage(status: NotificationStatus): string {
  const platform = detectPlatform()
  switch (status) {
    case 'granted':
      return 'Allowed — reminders can show on iPhone and Android when permitted.'
    case 'denied':
      return `Blocked. ${platformSettingsHint(platform, isStandalonePwa())}`
    case 'default':
      return 'Tap Allow on the prompt when the app opens, or use the button below.'
    case 'insecure':
      return 'Open Rhythm over https:// (not http). Restart with npm run dev and use the https:// link on your phone — accept the certificate warning once.'
    case 'unsupported':
      return 'Works in Safari, Chrome, Firefox, and Edge. Add to Home Screen on iPhone for notifications, or use Calendar export in Insights.'
  }
}

function getFiredToday(): Set<string> {
  try {
    const raw = safeStorage.getItem(FIRED_KEY)
    if (!raw) return new Set()
    const data = JSON.parse(raw) as { date: string; ids: string[] }
    if (data.date !== formatDateKey(new Date())) return new Set()
    return new Set(data.ids)
  } catch {
    return new Set()
  }
}

function markFired(id: string) {
  try {
    const fired = getFiredToday()
    fired.add(id)
    safeStorage.setItem(FIRED_KEY, JSON.stringify({ date: formatDateKey(new Date()), ids: [...fired] }))
  } catch {
    /* ignore */
  }
}

function unmarkFired(id: string) {
  try {
    const fired = getFiredToday()
    if (!fired.has(id)) return
    fired.delete(id)
    safeStorage.setItem(FIRED_KEY, JSON.stringify({ date: formatDateKey(new Date()), ids: [...fired] }))
  } catch {
    /* ignore */
  }
}

export function clearFiredRemindersToday() {
  safeStorage.removeItem(FIRED_KEY)
}

function shouldFireReminder(
  reminder: (typeof SCHEDULE_REMINDERS)[0],
  now: Date,
  settings: AppSettings['notifications'],
  todayLog: DayLog | undefined,
): boolean {
  if (!settings.reminderIds.includes(reminder.id)) return false
  if (!canFireReminder(reminder.id, todayLog)) return false
  const day = now.getDay()
  const isWeekend = day === 0 || day === 6
  if (reminder.weekdaysOnly && isWeekend && reminder.id !== 'sat-code') return false
  if (reminder.id === 'sat-code' && day !== 6) return false
  return isSameLocalMinute(now, reminder.hour, reminder.minute)
}

function showNotification(alarm: ActiveAlarm, alarmStyle: AppSettings['notifications']['alarmStyle']) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const n = new Notification(alarm.label, {
      body: alarm.body,
      icon: '/favicon.svg',
      tag: alarm.id,
      requireInteraction: alarmStyle !== 'gentle' || alarm.kind === 'wake',
      silent: false,
    } as NotificationOptions)
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    /* iOS limitations */
  }
}

interface UseAlarmSchedulerOptions {
  settings: AppSettings
  todayKey: string
  todayLog: DayLog
  timeBlocks: TimeBlock[]
}

export function useAlarmScheduler({ settings, todayKey, todayLog, timeBlocks }: UseAlarmSchedulerOptions) {
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null)
  const [showWakePopup, setShowWakePopup] = useState(false)
  const [testScheduledAt, setTestScheduledAt] = useState<number | null>(null)
  const settingsRef = useRef(settings)
  const todayLogRef = useRef(todayLog)
  settingsRef.current = settings
  todayLogRef.current = todayLog

  const dismissAlarm = useCallback(() => {
    stopAlarmLoop()
    setActiveAlarm((current) => {
      if (current && settingsRef.current.persistentReminders && current.id.startsWith('plan-')) {
        unmarkFired(current.id)
      }
      return null
    })
  }, [])

  const fireWakePopup = useCallback((withAlarm: boolean) => {
    const { notifications } = settingsRef.current
    if (withAlarm) {
      vibrateAlarm()
      const style = notifications.alarmStyle === 'off' ? 'gentle' : notifications.alarmStyle
      if (notifications.alarmStyle === 'urgent') startAlarmLoop('urgent')
      else playAlarmSound(style)
      if (notifications.enabled) {
        showNotification(
          {
            id: WAKE_ALARM_ID,
            label: 'Rhythm — Good morning',
            body: 'Log your sleep to start the day',
            firedAt: new Date().toISOString(),
            kind: 'wake',
          },
          notifications.alarmStyle,
        )
      }
      markFired(WAKE_ALARM_ID)
    }
    setShowWakePopup(true)
    setActiveAlarm(null)
  }, [])

  const fireAlarm = useCallback((id: string, label: string, body: string) => {
    if (id === WAKE_ALARM_ID) {
      fireWakePopup(true)
      return
    }

    const { notifications } = settingsRef.current
    if (id !== 'test' && getFiredToday().has(id)) return

    if (id !== 'test') markFired(id)
    vibrateAlarm()

    const style = notifications.alarmStyle === 'off' ? 'gentle' : notifications.alarmStyle
    if (notifications.alarmStyle === 'urgent') startAlarmLoop('urgent')
    else playAlarmSound(style)

    if (notifications.enabled) {
      showNotification(
        { id, label, body, firedAt: new Date().toISOString(), kind: 'reminder' },
        notifications.alarmStyle,
      )
    }

    setActiveAlarm({ id, label, body, firedAt: new Date().toISOString(), kind: 'reminder' })
  }, [fireWakePopup])

  const triggerTestAlarm = useCallback(() => {
    fireAlarm('test', 'Rhythm — Test alarm', 'If you see and hear this, in-app alarms work.')
  }, [fireAlarm])

  const scheduleTestAlarm = useCallback((delayMs = 60_000) => {
    setTestScheduledAt(Date.now() + delayMs)
  }, [])

  const dismissWakePopup = useCallback(() => {
    stopAlarmLoop()
    setShowWakePopup(false)
  }, [])

  useEffect(() => {
    if (needsWakePopup(todayLogRef.current)) {
      setShowWakePopup(true)
    }
  }, [todayKey])

  useEffect(() => {
    if (!needsWakePopup(todayLog)) {
      setShowWakePopup(false)
    }
  }, [todayLog.sleepHours, todayLog.wakeCompleted, todayKey])

  useEffect(() => {
    const alarmsOn =
      settings.notifications.enabled || settings.notifications.alarmStyle !== 'off'

    if (!alarmsOn && !needsWakePopup(todayLogRef.current)) return

    const tick = () => {
      const now = new Date()
      const log = todayLogRef.current
      const fired = getFiredToday()

      if (testScheduledAt !== null && Date.now() >= testScheduledAt) {
        setTestScheduledAt(null)
        triggerTestAlarm()
        return
      }

      if (needsWakePopup(log) && !showWakePopup) {
        const wakeReminder = SCHEDULE_REMINDERS.find((r) => r.id === WAKE_ALARM_ID)
        if (
          wakeReminder &&
          !fired.has(WAKE_ALARM_ID) &&
          shouldFireReminder(wakeReminder, now, settingsRef.current.notifications, log)
        ) {
          fireWakePopup(true)
          return
        }
      }

      const dailyPlan = log.dailyPlan ?? []
      const hasBlockSchedule = getTimedScheduleItems(dailyPlan, timeBlocks, now).length > 0

      for (const reminder of SCHEDULE_REMINDERS) {
        if (reminder.id === WAKE_ALARM_ID) continue
        if (hasBlockSchedule && reminder.id !== 'burnout' && reminder.id !== 'sat-code') continue
        if (fired.has(reminder.id)) continue
        if (!shouldFireReminder(reminder, now, settingsRef.current.notifications, log)) continue
        fireAlarm(reminder.id, reminder.label, reminder.body)
      }

      if (isDayStarted(log)) {
        const blockTriggers = getBlockAlarmTriggers(dailyPlan, timeBlocks, now)
        const persistent = settingsRef.current.persistentReminders
        for (const trigger of blockTriggers) {
          if (trigger.planItemId && isPlanItemSnoozed(log.planSnoozes, trigger.planItemId)) continue
          if (isBlockAlarmComplete(trigger, log)) {
            if (!fired.has(trigger.id)) markFired(trigger.id)
            continue
          }
          if (fired.has(trigger.id) && !persistent) continue
          if (!shouldFireBlockAlarmTrigger(trigger, now)) continue
          fireAlarm(trigger.id, trigger.label, trigger.body)
        }
      }
    }

    tick()
    const interval = setInterval(tick, document.hidden ? 5000 : 1000)
    return () => clearInterval(interval)
  }, [
    settings.notifications.enabled,
    settings.notifications.alarmStyle,
    fireAlarm,
    fireWakePopup,
    showWakePopup,
    testScheduledAt,
    triggerTestAlarm,
    timeBlocks,
  ])

  return {
    activeAlarm,
    showWakePopup,
    dismissAlarm,
    dismissWakePopup,
    triggerTestAlarm,
    scheduleTestAlarm,
    clearFiredToday: clearFiredRemindersToday,
    testScheduledAt,
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported' | 'insecure'> {
  return requestNotificationPermissionCompat()
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' | 'insecure' {
  return getNotificationStatus()
}
