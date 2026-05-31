import type { ConsistencyStats, DayLog, Mood } from '../types'
import { formatDateKey, getRecentDateKeys, parseDateKey } from './dates'

const GRACE_DAYS_PER_WEEK = 2

function studyBlockCount(log: DayLog): number {
  return Object.values(log.studyBlocks).filter(Boolean).length
}

function hasOutage(log: DayLog): boolean {
  return log.powerOutage || log.internetOutage
}

function effectiveMood(log: DayLog): Mood | null {
  if (hasOutage(log) && (!log.mood || log.mood === 'great' || log.mood === 'good')) return 'rough'
  return log.mood
}

function moodThreshold(mood: Mood | null, total: number): number {
  switch (mood) {
    case 'great':
    case 'good':
      return Math.ceil(total * 0.35)
    case 'okay':
      return Math.ceil(total * 0.25)
    case 'tired':
      return Math.max(2, Math.ceil(total * 0.15))
    case 'rough':
      return 1
    default:
      return Math.ceil(total * 0.3)
  }
}

export function dayCounts(log: DayLog | undefined, totalBlocks: number, habitCount: number): boolean {
  if (!log) return false
  if (log.isRecoveryDay) return true

  const mood = effectiveMood(log)
  const blocks = log.completedBlockIds.length
  const habits = log.completedHabitIds.length
  const study = studyBlockCount(log)
  const threshold = moodThreshold(mood, totalBlocks)

  if (hasOutage(log) || mood === 'rough') {
    return blocks >= 1 || habits >= 1 || study >= 1 || log.focusMinutes >= 15
  }
  if (mood === 'tired') {
    return blocks >= threshold || habits >= 2 || study >= 1
  }
  return blocks >= threshold || habits >= Math.ceil(habitCount * 0.4) || study >= 2
}

export function dayPartialCredit(log: DayLog | undefined): number {
  if (!log) return 0
  if (log.isRecoveryDay) return 1
  const blockScore = Math.min(log.completedBlockIds.length / 5, 0.4)
  const habitScore = Math.min(log.completedHabitIds.length / 4, 0.3)
  const studyScore = Math.min(studyBlockCount(log) / 4, 0.2)
  const focusScore = Math.min(log.focusMinutes / 60, 0.1)
  return Math.min(blockScore + habitScore + studyScore + focusScore, 1)
}

function scoreWindow(
  days: Record<string, DayLog>,
  windowDays: number,
  totalBlocks: number,
  habitCount: number,
  from: Date,
): number {
  const keys = getRecentDateKeys(windowDays, from)
  let counted = 0
  for (const key of keys) {
    if (dayCounts(days[key], totalBlocks, habitCount)) counted++
  }
  return Math.round((counted / windowDays) * 100)
}

export function computeGentleStreak(
  days: Record<string, DayLog>,
  totalBlocks: number,
  habitCount: number,
  from: Date = new Date(),
): number {
  if (Object.keys(days).length === 0) return 0

  let streak = 0
  let grace = GRACE_DAYS_PER_WEEK
  const cursor = new Date(from)
  cursor.setHours(12, 0, 0, 0)

  for (let i = 0; i < 90; i++) {
    const key = formatDateKey(cursor)
    const log = days[key]

    if (!log) break

    const counts = dayCounts(log, totalBlocks, habitCount)
    const partial = dayPartialCredit(log)

    if (i > 0 && cursor.getDay() === 1) grace = GRACE_DAYS_PER_WEEK

    if (counts || partial >= 0.5) {
      streak++
    } else if (grace > 0 && i > 0) {
      grace--
      streak++
    } else if (i === 0 && partial >= 0.25) {
      streak++
    } else {
      break
    }

    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function computeConsistencyStats(
  days: Record<string, DayLog>,
  totalBlocks: number,
  habitCount: number,
  todayKey: string,
): ConsistencyStats {
  const today = parseDateKey(todayKey)
  const log = days[todayKey]
  const todayCounts = dayCounts(log, totalBlocks, habitCount)

  let message = 'Consistency beats perfection. One small win today helps.'
  if (log?.isRecoveryDay) message = 'Recovery day — rest is productive.'
  else if (log && hasOutage(log)) message = 'Infrastructure rough today. Lower bar, still counts.'
  else if (todayCounts) message = 'Today counts. Keep stacking small wins.'
  else if (log?.mood === 'rough') message = 'Rough day? Showing up at all is a win.'

  return {
    score7: scoreWindow(days, 7, totalBlocks, habitCount, today),
    score14: scoreWindow(days, 14, totalBlocks, habitCount, today),
    score30: scoreWindow(days, 30, totalBlocks, habitCount, today),
    gentleStreak: computeGentleStreak(days, totalBlocks, habitCount, today),
    graceDaysUsed: 0,
    graceDaysAvailable: GRACE_DAYS_PER_WEEK,
    todayCounts,
    message,
  }
}

export function computeDayProgress(
  log: DayLog | undefined,
  blockIds: string[],
  taskIds: string[],
  habitIds: string[],
): number {
  if (!log) return 0
  if (log.isRecoveryDay) return 100
  const total = blockIds.length + taskIds.length + habitIds.length
  if (!total) return 0
  const done =
    log.completedBlockIds.filter((id) => blockIds.includes(id)).length +
    log.completedTaskIds.filter((id) => taskIds.includes(id)).length +
    log.completedHabitIds.filter((id) => habitIds.includes(id)).length
  return Math.round((done / total) * 100)
}

export function moodToScore(mood: Mood | null): number | null {
  if (!mood) return null
  const map: Record<Mood, number> = { great: 5, good: 4, okay: 3, tired: 2, rough: 1 }
  return map[mood]
}
