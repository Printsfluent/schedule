import {
  SLEEP_BLOCK_SATURDAY,
  SLEEP_BLOCK_SUNDAY,
  SLEEP_BLOCK_WEEKDAY,
} from '../data/defaults'
import { appendChainedPlanItem, createBlockPlanItem, getDailyPlan } from './dailyPlan'
import { formatDateKey, getBlocksForDate } from './dates'
import { createId } from './id'
import type { AppState, DayLog, DayPlanItem, Recurring, TimeBlock } from '../types'

const SLEEP_TEMPLATES: Record<'weekday' | 'saturday' | 'sunday', Omit<TimeBlock, 'id'>> = {
  weekday: SLEEP_BLOCK_WEEKDAY,
  saturday: SLEEP_BLOCK_SATURDAY,
  sunday: SLEEP_BLOCK_SUNDAY,
}

function isSleepBlock(block: TimeBlock): boolean {
  return /^sleep$/i.test(block.label.trim())
}

function hasSleepForRecurring(blocks: TimeBlock[], recurring: Recurring): boolean {
  return blocks.some((b) => b.enabled && b.recurring === recurring && isSleepBlock(b))
}

function createSleepBlock(recurring: 'weekday' | 'saturday' | 'sunday'): TimeBlock {
  return { ...SLEEP_TEMPLATES[recurring], id: createId() }
}

/** Append missing Sleep blocks so every day type ends with Sleep (idempotent). */
export function ensureSleepBlocks(timeBlocks: TimeBlock[]): TimeBlock[] {
  let next = [...timeBlocks]
  for (const recurring of ['weekday', 'saturday', 'sunday'] as const) {
    if (!hasSleepForRecurring(next, recurring)) {
      next.push(createSleepBlock(recurring))
    }
  }
  return next
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
  const nextPlan = ensureSleepInPlan(plan, timeBlocks, new Date())
  if (nextPlan.length === plan.length) return days
  return { ...days, [todayKey]: { ...log, dailyPlan: nextPlan } }
}

/** Apply Sleep block + today's plan patch for existing saved schedules. */
export function applySleepScheduleMigration(state: AppState): [AppState, boolean] {
  const timeBlocks = ensureSleepBlocks(state.timeBlocks)
  const days = patchTodayPlan(state.days, timeBlocks)
  const todayKey = formatDateKey(new Date())
  const blocksChanged = timeBlocks.length !== state.timeBlocks.length
  const planChanged = getDailyPlan(days[todayKey]).length !== getDailyPlan(state.days[todayKey]).length
  const changed = blocksChanged || planChanged
  if (!changed) return [state, false]
  return [{ ...state, timeBlocks, days }, true]
}
