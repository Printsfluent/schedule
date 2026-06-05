import type { TimeBlock } from '../types'
import { getBlocksForDate } from './dates'

/** Minutes after the day's expected wake block that the user logged morning sleep. */
export function computeWakeDelayMinutes(
  now: Date = new Date(),
  timeBlocks: TimeBlock[],
): number {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const dayBlocks = getBlocksForDate(timeBlocks, now)
  const wake = dayBlocks.find((b) => /wake|freshen/i.test(b.label))
  const expectedWake = wake?.startMinutes ?? 7 * 60

  if (nowMin <= expectedWake + 30) return 0
  return nowMin - expectedWake
}
