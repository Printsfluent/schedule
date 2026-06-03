import type { TimeBlock } from '../types'

export const SLEEP_DURATION_MINUTES = 8 * 60
export const MIN_SLEEP_MINUTES = 4 * 60

export function clampSleepDuration(minutes: number): number {
  return Math.min(SLEEP_DURATION_MINUTES, Math.max(MIN_SLEEP_MINUTES, Math.round(minutes)))
}

/** Minutes of sleep from bedtime start until wake (handles crossing midnight). */
export function sleepDurationForWake(sleepStartMinutes: number, wakeMinutes: number): number {
  if (wakeMinutes >= sleepStartMinutes) {
    return wakeMinutes - sleepStartMinutes
  }
  return 24 * 60 - sleepStartMinutes + wakeMinutes
}

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

export function formatWakeTimeLabel(wakeMinutes: number): string {
  const h = Math.floor(wakeMinutes / 60)
  const m = wakeMinutes % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `Wake ~${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function formatSleepWakeHint(
  sleepStartMinutes: number,
  durationMinutes: number = SLEEP_DURATION_MINUTES,
): string {
  return formatWakeTimeLabel(sleepEndMinutes(sleepStartMinutes, durationMinutes))
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
