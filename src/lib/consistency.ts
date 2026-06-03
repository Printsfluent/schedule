import type { ConsistencyStats, DayLog, Mood, TimeBlock } from '../types'
import { buildPlanDisplayEntries, getDailyPlan } from './dailyPlan'
import { formatDateKey, getBlocksForDate, getRecentDateKeys, parseDateKey } from './dates'

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
  countFromKey: string | null = null,
): number {
  let streak = 0
  let grace = GRACE_DAYS_PER_WEEK
  const cursor = new Date(from)
  cursor.setHours(12, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const key = formatDateKey(cursor)

    if (countFromKey && key < countFromKey) break

    const log = days[key]

    if (!log) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }

    const counts = dayCounts(log, totalBlocks, habitCount)
    const partial = dayPartialCredit(log)
    const wins = counts || partial >= 0.5

    if (i > 0 && cursor.getDay() === 1) grace = GRACE_DAYS_PER_WEEK

    if (wins) {
      streak++
    } else if (i === 0) {
      // Today still in progress — keep yesterday's streak visible.
    } else if (grace > 0) {
      grace--
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
  gentleStreakSince: string | null = null,
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
    gentleStreak: computeGentleStreak(days, totalBlocks, habitCount, today, gentleStreakSince),
    graceDaysUsed: 0,
    graceDaysAvailable: GRACE_DAYS_PER_WEEK,
    todayCounts,
    message,
  }
}

/** Progress for today’s schedule blocks (and custom plan items when a daily plan exists). */
export function computeDayProgress(
  log: DayLog | undefined,
  timeBlocks: TimeBlock[],
  forDate: Date,
): number {
  if (!log) return 0
  if (log.isRecoveryDay) return 100

  const dayBlocks = getBlocksForDate(timeBlocks, forDate)
  const plan = getDailyPlan(log)

  if (plan.length > 0) {
    const entries = buildPlanDisplayEntries(log, dayBlocks)
    if (entries.length === 0) return 0
    if (entries.every((entry) => entry.done)) return 100
    const done = entries.filter((entry) => entry.done).length
    return Math.round((done / entries.length) * 100)
  }

  if (!dayBlocks.length) return 0
  const completed = new Set(log.completedBlockIds)
  const done = dayBlocks.filter((block) => completed.has(block.id)).length
  if (done >= dayBlocks.length) return 100
  return Math.round((done / dayBlocks.length) * 100)
}

export function moodToScore(mood: Mood | null): number | null {
  if (!mood) return null
  const map: Record<Mood, number> = { great: 5, good: 4, okay: 3, tired: 2, rough: 1 }
  return map[mood]
}
