import { buildPlanDisplayEntries, type PlanDisplayEntry } from './dailyPlan'
import { formatDuration } from './dates'
import type { ActivityCategory, DayLog, TimeBlock } from '../types'

/** Work, study, and gym blocks count toward burnout — not meals, rest, social, etc. */
export function isBurnoutCountableCategory(category: ActivityCategory, label: string): boolean {
  if (category === 'work' || category === 'study') return true
  if (category === 'health' && /gym/i.test(label)) return true
  return false
}

export function isBurnoutCountableBlock(block: TimeBlock): boolean {
  return isBurnoutCountableCategory(block.category, block.label)
}

function isBurnoutCountableEntry(entry: PlanDisplayEntry): boolean {
  if (entry.kind === 'block') return isBurnoutCountableBlock(entry.block)
  return isBurnoutCountableCategory(entry.item.category, entry.item.label)
}

export function scheduledMinutesForDay(log: DayLog | undefined, dayBlocks: TimeBlock[]): number {
  const plan = buildPlanDisplayEntries(log, dayBlocks)
  if (plan.length > 0) {
    return plan
      .filter(isBurnoutCountableEntry)
      .reduce((sum, entry) => sum + entry.durationMinutes, 0)
  }
  return dayBlocks
    .filter(isBurnoutCountableBlock)
    .reduce((sum, block) => sum + block.durationMinutes, 0)
}

export function burnoutWarning(scheduledMinutes: number): { level: 'burnout'; message: string } | null {
  const hours = scheduledMinutes / 60
  if (hours >= 16) {
    return {
      level: 'burnout',
      message: `You scheduled ${formatDuration(scheduledMinutes)} of work, study, and gym today — that's burnout territory (16h+). Cut something or mark a recovery day.`,
    }
  }
  return null
}
