import { getDailyPlan, sanitizeDailyPlan } from './dailyPlan'
import { parseDateKey } from './dates'
import { alignAllSchedulesToSleep } from './sleepSchedule'
import type { AppState, DayLog, TimeBlock } from '../types'

/** Recurring sleep blocks are no longer auto-installed — sleep lives in daily plan samples. */
export function ensureSleepBlocks(timeBlocks: TimeBlock[]): TimeBlock[] {
  return timeBlocks
}

function patchAllDayPlans(days: Record<string, DayLog>, timeBlocks: AppState['timeBlocks']): Record<string, DayLog> {
  let changed = false
  const next: Record<string, DayLog> = { ...days }

  for (const [key, log] of Object.entries(days)) {
    const plan = getDailyPlan(log)
    if (plan.length === 0) continue

    const sanitized = sanitizeDailyPlan(plan, timeBlocks, parseDateKey(key))
    if (JSON.stringify(sanitized) === JSON.stringify(plan)) continue

    next[key] = { ...log, dailyPlan: sanitized }
    changed = true
  }

  return changed ? next : days
}

/** Clean legacy duplicate sleep rows; no new sleep blocks are added. */
export function applySleepScheduleMigration(state: AppState): [AppState, boolean] {
  const timeBlocks = alignAllSchedulesToSleep(ensureSleepBlocks(state.timeBlocks))
  const days = patchAllDayPlans(state.days, timeBlocks)

  const blocksChanged =
    timeBlocks.length !== state.timeBlocks.length ||
    JSON.stringify(timeBlocks) !== JSON.stringify(state.timeBlocks)
  const daysChanged = days !== state.days

  if (!blocksChanged && !daysChanged) return [state, false]
  return [{ ...state, timeBlocks, days }, true]
}
