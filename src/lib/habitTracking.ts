import type { ActivityCategory, DayLog, Habit, TimeBlock } from '../types'
import { formatDateKey, parseDateKey } from './dates'

function completedBlocks(log: DayLog, blocks: TimeBlock[]) {
  return blocks.filter((b) => log.completedBlockIds.includes(b.id))
}

function hasCategoryBlock(log: DayLog, blocks: TimeBlock[], category: ActivityCategory) {
  return completedBlocks(log, blocks).some((b) => b.category === category)
}

function hasBlockMatching(log: DayLog, blocks: TimeBlock[], pattern: RegExp) {
  return completedBlocks(log, blocks).some((b) => pattern.test(b.label))
}

function studyActivity(log: DayLog, blocks: TimeBlock[]) {
  return (
    log.studyMinutes >= 15 ||
    Object.values(log.studyBlocks).some(Boolean) ||
    hasCategoryBlock(log, blocks, 'study')
  )
}

function gymActivity(log: DayLog, blocks: TimeBlock[]) {
  return (
    log.workoutDone ||
    hasBlockMatching(log, blocks, /gym|movement|walk|stretch/i)
  )
}

function workActivity(log: DayLog, blocks: TimeBlock[]) {
  return log.focusMinutes >= 25 || hasCategoryBlock(log, blocks, 'work')
}

function socialActivity(log: DayLog, blocks: TimeBlock[]) {
  return log.funMinutes >= 15 || hasCategoryBlock(log, blocks, 'social')
}

function sleepActivity(log: DayLog) {
  return log.sleepHours != null && log.wakeCompleted
}

function hydrateActivity(log: DayLog, blocks: TimeBlock[]) {
  return (
    log.mood != null ||
    hasBlockMatching(log, blocks, /walk|stretch|hydrate|water/i) ||
    completedBlocks(log, blocks).some(
      (b) => b.category === 'health' && !/gym|movement/i.test(b.label),
    )
  )
}

export function isHabitComplete(habit: Habit, log: DayLog, blocks: TimeBlock[]): boolean {
  switch (habit.id) {
    case 'h1':
      return studyActivity(log, blocks)
    case 'h2':
      return gymActivity(log, blocks)
    case 'h3':
      return workActivity(log, blocks)
    case 'h4':
      return socialActivity(log, blocks)
    case 'h5':
      return sleepActivity(log)
    case 'h6':
      return hydrateActivity(log, blocks)
    default:
      return hasCategoryBlock(log, blocks, habit.category)
  }
}

export function computeAutoCompletedHabitIds(
  habits: Habit[],
  log: DayLog,
  blocks: TimeBlock[],
): string[] {
  return habits.filter((habit) => isHabitComplete(habit, log, blocks)).map((h) => h.id)
}

export function applyAutoHabitsToLog(
  habits: Habit[],
  log: DayLog,
  blocks: TimeBlock[],
): DayLog {
  const completedHabitIds = computeAutoCompletedHabitIds(habits, log, blocks)
  const workoutDone = gymActivity(log, blocks)
  return { ...log, completedHabitIds, workoutDone }
}

export function computeHabitStreak(
  days: Record<string, DayLog>,
  habit: Habit,
  blocksByDate: (dateKey: string) => TimeBlock[],
  fromKey: string,
  windowDays = 90,
): number {
  if (Object.keys(days).length === 0) return 0

  const cursor = parseDateKey(fromKey)
  cursor.setHours(12, 0, 0, 0)

  let streak = 0
  for (let i = 0; i < windowDays; i++) {
    const key = formatDateKey(cursor)
    const log = days[key]
    if (!log) break
    const blocks = blocksByDate(key)
    if (isHabitComplete(habit, log, blocks)) streak++
    else break
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function habitAutoTrackHint(habit: Habit): string {
  switch (habit.id) {
    case 'h1':
      return 'Study block, study timer, or study checklist'
    case 'h2':
      return 'Gym block or movement in your plan'
    case 'h3':
      return 'Work block or 25+ focus minutes'
    case 'h4':
      return 'Social block or fun time logged'
    case 'h5':
      return 'Log sleep when you wake up'
    case 'h6':
      return 'Log mood or complete a health block'
    default:
      return `Complete a ${habit.category} block in your plan`
  }
}
