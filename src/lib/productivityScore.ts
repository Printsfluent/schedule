import type { DayLog, TimeBlock } from '../types'
import { computeHomeEventStatsForDay } from './homeAnalytics'
import { computeDayProgress } from './consistency'

/** 0–100 score for how the day is going (blocks, habits, focus, study). */
export function computeTodayProductivityScore(
  log: DayLog | undefined,
  timeBlocks: TimeBlock[],
  now: Date = new Date(),
): number {
  if (!log) return 0
  if (log.isRecoveryDay) return 72
  const progress = computeDayProgress(log, timeBlocks, now)
  const home = computeHomeEventStatsForDay(log, timeBlocks)
  const focusBoost = Math.min(home.focusMinutes / 5, 15)
  const studyBoost = Math.min(home.studyMinutes / 6, 10)
  return Math.round(Math.min(100, progress * 0.75 + focusBoost + studyBoost))
}

export function minutesRemainingInDay(now: Date = new Date()): number {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return Math.max(0, 24 * 60 - nowMin)
}
