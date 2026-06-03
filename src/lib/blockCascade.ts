import type { TimeBlock } from '../types'
import { blockAppliesToday, clampDayMinutes, formatDateKey } from './dates'
import {
  clampSleepDuration,
  isSleepBlock,
  sleepDurationForWake,
  sleepEndMinutes,
} from './sleepSchedule'

function sortDayBlocks(blocks: TimeBlock[]): TimeBlock[] {
  return [...blocks].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.id.localeCompare(b.id),
  )
}

export function previousCalendarDate(date: Date): Date {
  const prev = new Date(date)
  prev.setDate(prev.getDate() - 1)
  return prev
}

/** Prior night's sleep block with cascaded start time (no recursive wake lookup). */
export function findPriorNightSleepBlock(allBlocks: TimeBlock[], date: Date): TimeBlock | null {
  const prevDay = cascadeBlocksForDate(allBlocks, previousCalendarDate(date), null)
  return [...prevDay].reverse().find(isSleepBlock) ?? null
}

/** Sleep duration so last night ends at the given wake time. */
export function sleepDurationForPriorNightWake(
  allBlocks: TimeBlock[],
  date: Date,
  wakeMinutes: number,
): number | null {
  const sleep = findPriorNightSleepBlock(allBlocks, date)
  if (!sleep) return null
  return clampSleepDuration(sleepDurationForWake(sleep.startMinutes, wakeMinutes))
}

/** Raw blocks for a date (no time chaining). */
export function getRawBlocksForDate(blocks: TimeBlock[], date: Date): TimeBlock[] {
  return sortDayBlocks(blocks.filter((b) => blockAppliesToday(b, date)))
}

/** Wake time from the previous calendar night's sleep block (one-day cascade only). */
export function getPriorDaySleepWakeMinutes(
  allBlocks: TimeBlock[],
  date: Date,
): number | null {
  const prevDay = cascadeBlocksForDate(allBlocks, previousCalendarDate(date), null)
  const sleep = [...prevDay].reverse().find(isSleepBlock)
  if (!sleep) return null
  return sleepEndMinutes(sleep.startMinutes, sleep.durationMinutes)
}

/**
 * Chain blocks so each starts when the previous ends.
 * First block starts at prior night's sleep end when available.
 * @param wakeAnchor Pass `null` to skip prior-night lookup (used internally for yesterday only).
 */
export function cascadeBlocksForDate(
  allBlocks: TimeBlock[],
  date: Date,
  wakeAnchor?: number | null,
): TimeBlock[] {
  const ordered = getRawBlocksForDate(allBlocks, date)
  if (ordered.length === 0) return []

  const wake =
    wakeAnchor === undefined ? getPriorDaySleepWakeMinutes(allBlocks, date) : wakeAnchor
  const out = ordered.map((block) => ({ ...block }))

  if (wake != null) {
    out[0].startMinutes = clampDayMinutes(wake)
  }

  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1]
    out[i].startMinutes = clampDayMinutes(prev.startMinutes + prev.durationMinutes)
  }

  return out
}

/** Apply cascaded starts back to stored blocks (one-off blocks only). */
export function persistOneOffCascadeStarts(blocks: TimeBlock[], date: Date): TimeBlock[] {
  const dateKey = formatDateKey(date)
  const cascaded = cascadeBlocksForDate(blocks, date)
  const byId = new Map(cascaded.map((b) => [b.id, b.startMinutes]))
  return blocks.map((block) =>
    block.dateKey === dateKey && byId.has(block.id)
      ? { ...block, startMinutes: byId.get(block.id)! }
      : block,
  )
}
