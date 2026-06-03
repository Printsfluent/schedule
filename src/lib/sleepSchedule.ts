import type { Recurring, TimeBlock } from '../types'
import { clampDayMinutes } from './dates'

export const SLEEP_DURATION_MINUTES = 8 * 60

const DAY_TYPES: Recurring[] = ['weekday', 'saturday', 'sunday']

export function isSleepBlock(block: TimeBlock): boolean {
  return /^sleep$/i.test(block.label.trim())
}

/** Clock time (0–1439) when sleep ends — may be the next calendar morning. */
export function sleepEndMinutes(
  sleepStartMinutes: number,
  durationMinutes: number = SLEEP_DURATION_MINUTES,
): number {
  return (sleepStartMinutes + durationMinutes) % (24 * 60)
}

export function formatSleepWakeHint(sleepStartMinutes: number, durationMinutes: number = SLEEP_DURATION_MINUTES): string {
  const end = sleepEndMinutes(sleepStartMinutes, durationMinutes)
  const h = Math.floor(end / 60)
  const m = end % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `Wake ~${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function normalizeSleepDurations(timeBlocks: TimeBlock[]): TimeBlock[] {
  return timeBlocks.map((block) =>
    isSleepBlock(block) ? { ...block, durationMinutes: SLEEP_DURATION_MINUTES } : block,
  )
}

/**
 * Shift non-sleep blocks on this day type so the first block starts when sleep ends (next morning).
 */
export function alignDayTypeToSleepWake(timeBlocks: TimeBlock[], recurring: Recurring): TimeBlock[] {
  const sleep = timeBlocks.find((b) => b.recurring === recurring && b.enabled && isSleepBlock(b))
  if (!sleep) return timeBlocks

  const wakeAt = sleepEndMinutes(sleep.startMinutes, sleep.durationMinutes)
  const morningBlocks = timeBlocks
    .filter(
      (b) =>
        b.recurring === recurring && b.enabled && !isSleepBlock(b) && !b.dateKey,
    )
    .sort((a, b) => a.startMinutes - b.startMinutes)
  if (morningBlocks.length === 0) return timeBlocks

  const delta = wakeAt - morningBlocks[0].startMinutes
  if (delta === 0) return timeBlocks

  return timeBlocks.map((block) => {
    if (
      block.recurring !== recurring ||
      !block.enabled ||
      isSleepBlock(block) ||
      block.dateKey
    ) {
      return block
    }
    return { ...block, startMinutes: clampDayMinutes(block.startMinutes + delta) }
  })
}

export function alignAllSchedulesToSleep(timeBlocks: TimeBlock[]): TimeBlock[] {
  let next = normalizeSleepDurations(timeBlocks)
  for (const recurring of DAY_TYPES) {
    next = alignDayTypeToSleepWake(next, recurring)
  }
  return next
}
