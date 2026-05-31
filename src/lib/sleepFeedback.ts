import type { DayLog } from '../types'
import { formatDateKey, parseDateKey } from './dates'

export type SleepFeedbackTone = 'good' | 'low' | 'high'

export interface SleepFeedback {
  tone: SleepFeedbackTone
  title: string
  message: string
  tips: string[]
}

export function isHealthySleepHours(hours: number): boolean {
  return hours >= 7 && hours <= 8
}

export function formatSleepHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1)
}

export function countSleepDaysLogged(days: Record<string, DayLog>): number {
  return Object.values(days).filter((log) => log.sleepHours != null).length
}

/** Consecutive days with sleep logged, counting back from today. */
export function computeSleepLogStreak(days: Record<string, DayLog>, todayKey: string): number {
  let streak = 0
  const cursor = parseDateKey(todayKey)

  while (true) {
    const key = formatDateKey(cursor)
    const log = days[key]
    if (log?.sleepHours == null) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function getSleepFeedback(hours: number): SleepFeedback {
  if (isHealthySleepHours(hours)) {
    return {
      tone: 'good',
      title: 'Solid rest',
      message: `${formatSleepHours(hours)} hours is right in the sweet spot. Your brain and body are set up well for today.`,
      tips: [
        'Keep the same bedtime rhythm tonight if you can.',
        'Hydrate and move lightly before deep work.',
      ],
    }
  }

  if (hours < 7) {
    return {
      tone: 'low',
      title: 'A little short on sleep',
      message: `${formatSleepHours(hours)} hours is under the 7–8h range. Go gently today and protect tonight\u2019s rest.`,
      tips: [
        'Use your wind-down block tonight — screens off, lights low.',
        'Aim for 7–8 hours tomorrow; even 30 minutes earlier helps.',
        'Keep the morning light: walk, stretch, or music before heavy work.',
        'Skip stacking hard blocks back-to-back if energy feels low.',
      ],
    }
  }

  return {
    tone: 'high',
    title: 'Extra sleep today',
    message: `${formatSleepHours(hours)} hours is above your usual target. Fine for a catch-up day — just watch for sluggish starts.`,
    tips: [
      "Get daylight and movement early so you don't drift.",
      'Tonight, aim back toward a steady 7–8 hour window.',
      'If you feel groggy, start with lighter tasks before deep focus.',
    ],
  }
}
