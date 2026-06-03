import { countDailyCalendarEvents } from './calendarExport'
import { buildPlanDisplayEntries, getDailyPlan } from './dailyPlan'
import { formatDateKey, getBlocksForDate } from './dates'
import type { AppSettings, DayLog, TimeBlock } from '../types'

export function getFirstBlockStartMinutes(
  log: DayLog | undefined,
  timeBlocks: TimeBlock[],
  forDate: Date,
): number | null {
  const dayBlocks = getBlocksForDate(timeBlocks, forDate)
  const plan = getDailyPlan(log)

  if (plan.length > 0) {
    const entries = buildPlanDisplayEntries(log, dayBlocks)
    if (entries.length === 0) return null
    return Math.min(...entries.map((entry) => entry.startMinutes))
  }

  if (dayBlocks.length === 0) return null
  return Math.min(...dayBlocks.map((block) => block.startMinutes))
}

export function hasExportableCalendarEvents(
  log: DayLog | undefined,
  timeBlocks: TimeBlock[],
  forDate: Date,
  notifications: AppSettings['notifications'],
): boolean {
  return (
    countDailyCalendarEvents(forDate, timeBlocks, notifications, log?.dailyPlan ?? []) > 0
  )
}

/** User exported calendar for this day (evening or manual) — skip first-block reminder. */
export function isCalendarExportedForDay(log: DayLog | undefined): boolean {
  return Boolean(log?.calendarExported)
}

/** User skipped export after planning — remind when the first block starts. */
export function shouldRemindCalendarAtFirstBlock(log: DayLog | undefined): boolean {
  return Boolean(log?.calendarExportSkipped && !log?.calendarExported)
}

export function calendarExportPatch(exported: boolean): Partial<DayLog> {
  if (exported) {
    return { calendarExported: true, calendarExportSkipped: false }
  }
  return { calendarExportSkipped: true }
}

export function isSameCalendarDay(dateKey: string, now: Date = new Date()): boolean {
  return formatDateKey(now) === dateKey
}
