import type { TimeBlock } from '../types'
import { blockAppliesToday, clampDayMinutes, formatDateKey } from './dates'
import { isSleepBlock, sleepEndMinutes } from './sleepSchedule'

function sortDayBlocks(blocks: TimeBlock[]): TimeBlock[] {
  return [...blocks].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.id.localeCompare(b.id),
  )
}

/** Raw blocks for a date (no time chaining). */
export function getRawBlocksForDate(blocks: TimeBlock[], date: Date): TimeBlock[] {
  return sortDayBlocks(blocks.filter((b) => blockAppliesToday(b, date)))
}

/** Wake time from the previous calendar night's sleep block. */
export function getPriorDaySleepWakeMinutes(
  allBlocks: TimeBlock[],
  date: Date,
): number | null {
  const prev = new Date(date)
  prev.setDate(prev.getDate() - 1)
  const prevDay = cascadeBlocksForDate(allBlocks, prev)
  const sleep = [...prevDay].reverse().find(isSleepBlock)
  if (!sleep) return null
  return sleepEndMinutes(sleep.startMinutes, sleep.durationMinutes)
}

/**
 * Chain blocks so each starts when the previous ends.
 * First block starts at prior night's sleep end when available.
 */
export function cascadeBlocksForDate(allBlocks: TimeBlock[], date: Date): TimeBlock[] {
  const ordered = getRawBlocksForDate(allBlocks, date)
  if (ordered.length === 0) return []

  const wakeAnchor = getPriorDaySleepWakeMinutes(allBlocks, date)
  const out = ordered.map((block) => ({ ...block }))

  if (wakeAnchor != null) {
    out[0].startMinutes = clampDayMinutes(Math.max(wakeAnchor, ordered[0].startMinutes))
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
