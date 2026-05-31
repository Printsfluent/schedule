import { buildPlanDisplayEntries } from './dailyPlan'
import { formatDuration } from './dates'
import type { DayLog, TimeBlock } from '../types'

export function scheduledMinutesForDay(log: DayLog | undefined, dayBlocks: TimeBlock[]): number {
  if (!log) return dayBlocks.reduce((sum, b) => sum + b.durationMinutes, 0)
  const plan = buildPlanDisplayEntries(log, dayBlocks)
  if (plan.length > 0) {
    return plan.reduce((sum, e) => sum + e.durationMinutes, 0)
  }
  return dayBlocks.reduce((sum, b) => sum + b.durationMinutes, 0)
}

export function burnoutWarning(scheduledMinutes: number): { level: 'burnout'; message: string } | null {
  const hours = scheduledMinutes / 60
  if (hours >= 16) {
    return {
      level: 'burnout',
      message: `You scheduled ${formatDuration(scheduledMinutes)} today — that's burnout territory (16h+). Cut something or mark a recovery day.`,
    }
  }
  return null
}
