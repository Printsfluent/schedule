import type { DayLog, TimeBlock } from '../types'
import { buildPlanDisplayEntries, hasUserPickedPlan } from './dailyPlan'
import { formatTime, getBlocksForDate } from './dates'

export type ScheduleConflict = {
  labelA: string
  labelB: string
  startA: number
  startB: number
  overlapMinutes: number
}

export function detectPlanConflicts(
  log: DayLog | undefined,
  timeBlocks: TimeBlock[],
  forDate: Date,
): ScheduleConflict[] {
  if (!hasUserPickedPlan(log)) return []
  const dayBlocks = getBlocksForDate(timeBlocks, forDate)
  const entries = buildPlanDisplayEntries(log, dayBlocks)
  if (entries.length < 2) return []

  const sorted = [...entries].sort((a, b) => a.startMinutes - b.startMinutes)
  const conflicts: ScheduleConflict[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    const endA = a.startMinutes + a.durationMinutes
    if (b.startMinutes < endA) {
      const labelA = a.kind === 'block' ? a.block.label : a.item.label
      const labelB = b.kind === 'block' ? b.block.label : b.item.label
      conflicts.push({
        labelA,
        labelB,
        startA: a.startMinutes,
        startB: b.startMinutes,
        overlapMinutes: endA - b.startMinutes,
      })
    }
  }

  return conflicts
}

export function formatConflictMessage(c: ScheduleConflict): string {
  return `${c.labelA} (${formatTime(c.startA)}) overlaps ${c.labelB} (${formatTime(c.startB)}) by ${c.overlapMinutes}m`
}
