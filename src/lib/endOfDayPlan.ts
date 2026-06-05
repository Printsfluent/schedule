import { buildPlanDisplayEntries, getDailyPlan, isDayFullyComplete, type PlanDisplayEntry } from './dailyPlan'
import type { DayLog, TimeBlock } from '../types'

export function getLastPlanEventEndMinutes(entries: PlanDisplayEntry[]): number | null {
  if (entries.length === 0) return null
  return Math.max(...entries.map((e) => e.startMinutes + e.durationMinutes))
}

function getLastBlockEndMinutes(blocks: TimeBlock[]): number | null {
  if (blocks.length === 0) return null
  return Math.max(...blocks.map((b) => b.startMinutes + b.durationMinutes))
}

/** True when today's plan or schedule has ended (last item's end time has passed). */
export function hasTodayPlanEnded(
  log: DayLog | undefined,
  blocks: TimeBlock[],
  now: Date = new Date(),
): boolean {
  const plan = getDailyPlan(log)
  const entries = plan.length > 0 ? buildPlanDisplayEntries(log, blocks) : []
  const end =
    entries.length > 0 ? getLastPlanEventEndMinutes(entries) : getLastBlockEndMinutes(blocks)
  if (end == null) return false
  const nowMins = now.getHours() * 60 + now.getMinutes()
  return nowMins >= end
}

export function shouldOfferEveningPlan(
  log: DayLog | undefined,
  blocks: TimeBlock[],
  now: Date = new Date(),
): boolean {
  if (log?.eveningPlanPrompt === 'declined' || log?.eveningPlanPrompt === 'planned') return false
  if (getDailyPlan(log).length === 0 && blocks.length === 0) {
    const hour = now.getHours()
    if (hour < 18) return false
  }
  if (isDayFullyComplete(log, blocks, now)) return true
  return hasTodayPlanEnded(log, blocks, now)
}
