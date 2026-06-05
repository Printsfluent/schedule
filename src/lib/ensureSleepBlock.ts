import {
  appendChainedPlanItem,
  createBlockPlanItem,
  getDailyPlan,
  refreshBlockTimesInPlan,
} from './dailyPlan'
import { formatDateKey, getBlocksForDate } from './dates'
import { alignAllSchedulesToSleep, isSleepBlock } from './sleepSchedule'
import type { AppState, DayLog, DayPlanItem, TimeBlock } from '../types'

/** Recurring sleep blocks are no longer auto-installed — sleep lives in daily plan samples. */
export function ensureSleepBlocks(timeBlocks: TimeBlock[]): TimeBlock[] {
  return timeBlocks
}

function ensureSleepInPlan(
  plan: DayPlanItem[],
  timeBlocks: TimeBlock[],
  forDate: Date,
): DayPlanItem[] {
  const dayBlocks = getBlocksForDate(timeBlocks, forDate)
  const sleepBlock = dayBlocks.find(isSleepBlock)
  if (!sleepBlock || plan.length === 0) return plan
  if (plan.some((item) => item.kind === 'block' && item.blockId === sleepBlock.id)) return plan
  return appendChainedPlanItem(plan, createBlockPlanItem(sleepBlock))
}

function patchTodayPlan(days: Record<string, DayLog>, timeBlocks: TimeBlock[]): Record<string, DayLog> {
  const todayKey = formatDateKey(new Date())
  const log = days[todayKey]
  if (!log) return days
  const plan = getDailyPlan(log)
  let nextPlan = ensureSleepInPlan(plan, timeBlocks, new Date())
  if (nextPlan.length > 0) {
    nextPlan = refreshBlockTimesInPlan(nextPlan, timeBlocks, new Date())
  }
  if (nextPlan.length === plan.length && JSON.stringify(nextPlan) === JSON.stringify(plan)) {
    return days
  }
  return { ...days, [todayKey]: { ...log, dailyPlan: nextPlan } }
}

/** Align legacy block-linked plans; no new recurring blocks are added. */
export function applySleepScheduleMigration(state: AppState): [AppState, boolean] {
  const timeBlocks = alignAllSchedulesToSleep(ensureSleepBlocks(state.timeBlocks))
  const days = patchTodayPlan(state.days, timeBlocks)
  const todayKey = formatDateKey(new Date())
  const blocksChanged =
    timeBlocks.length !== state.timeBlocks.length ||
    JSON.stringify(timeBlocks) !== JSON.stringify(state.timeBlocks)
  const prevPlan = getDailyPlan(state.days[todayKey])
  const nextPlan = getDailyPlan(days[todayKey])
  const planChanged =
    nextPlan.length !== prevPlan.length || JSON.stringify(nextPlan) !== JSON.stringify(prevPlan)
  const changed = blocksChanged || planChanged
  if (!changed) return [state, false]
  return [{ ...state, timeBlocks, days }, true]
}
