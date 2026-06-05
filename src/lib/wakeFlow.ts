import type { DayLog } from '../types'
import { formatDateKey } from './dates'
import { SCHEDULE_REMINDERS, type ScheduleReminder } from '../data/notifications'

export const WAKE_ALARM_ID = 'wake'
export const WAKE_HOUR = 6
export const WAKE_MINUTE = 30

export type MorningFlowStep = 'sleep' | 'sleepFeedback'

/** Morning window: 1 hour before wake through noon */
export function isMorningWindow(now: Date = new Date()): boolean {
  const mins = now.getHours() * 60 + now.getMinutes()
  const wakeMins = WAKE_HOUR * 60 + WAKE_MINUTE
  return mins >= wakeMins - 60 && mins < 12 * 60
}

export function isWakeDay(now: Date = new Date()): boolean {
  const day = now.getDay()
  return day >= 1 && day <= 5
}

/** Day has started — sleep logged or wake flow completed */
export function isDayStarted(log: DayLog | undefined): boolean {
  if (!log) return false
  return log.sleepHours !== null || log.wakeCompleted
}

/** Should show wake popup (blocks other alarms & dashboard) */
export function needsWakePopup(log: DayLog | undefined, now: Date = new Date()): boolean {
  if (isDayStarted(log)) return false
  if (!isMorningWindow(now)) return false
  if (!isWakeDay(now)) {
    return isMorningWindow(now) && !isDayStarted(log)
  }
  return true
}

export function canFireReminder(
  reminderId: string,
  log: DayLog | undefined,
): boolean {
  if (reminderId === WAKE_ALARM_ID) return true
  return isDayStarted(log)
}

/** Next step in the post-sleep morning flow, or null when done. */
export function getMorningFlowStep(
  todayKey: string,
  log: DayLog | undefined,
  now: Date = new Date(),
): MorningFlowStep | null {
  if (formatDateKey(now) !== todayKey) return null
  if (needsWakePopup(log, now)) return 'sleep'
  if (!log || !isDayStarted(log)) return null
  if (log.morningFlowComplete) return null
  if (log.sleepHours != null && !log.morningSleepFeedbackDone) return 'sleepFeedback'
  return null
}

export function reminderAppliesOnDate(reminder: ScheduleReminder, date: Date): boolean {
  const day = date.getDay()
  if (reminder.id === 'sat-code') return day === 6
  if (reminder.weekdaysOnly) return day >= 1 && day <= 5
  return true
}

export function getDailyRemindersForDate(
  date: Date,
  enabledIds: string[],
  excludeWake = true,
): ScheduleReminder[] {
  return SCHEDULE_REMINDERS.filter((reminder) => {
    if (excludeWake && reminder.id === WAKE_ALARM_ID) return false
    if (!enabledIds.includes(reminder.id)) return false
    return reminderAppliesOnDate(reminder, date)
  })
}
