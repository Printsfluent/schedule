import type { TimeBlock } from '../types'

export const SLEEP_DURATION_MINUTES = 8 * 60

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

/** Ensure sleep blocks are eight hours; day times chain via getBlocksForDate. */
export function alignAllSchedulesToSleep(timeBlocks: TimeBlock[]): TimeBlock[] {
  return normalizeSleepDurations(timeBlocks)
}
