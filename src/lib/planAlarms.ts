import type { DayPlanItem, TimeBlock } from '../types'
import {
  getBlockAlarmTriggers,
  shouldFireBlockAlarmTrigger,
  type BlockAlarmTrigger,
} from './scheduleAlerts'

/** @deprecated Use BLOCK_ALERT_MINUTES_BEFORE from scheduleAlerts */
export const PLAN_ALERT_MINUTES_BEFORE = [5, 0] as const

export type PlanAlarmTrigger = BlockAlarmTrigger

export function getPlanAlarmTriggers(
  dailyPlan: DayPlanItem[],
  timeBlocks: TimeBlock[],
  forDate: Date,
): PlanAlarmTrigger[] {
  return getBlockAlarmTriggers(dailyPlan, timeBlocks, forDate)
}

export function shouldFirePlanAlarmTrigger(trigger: PlanAlarmTrigger, now: Date): boolean {
  return shouldFireBlockAlarmTrigger(trigger, now)
}
