import { planTimedItemsForCalendar } from './dailyPlan'
import { formatDuration } from './dates'
import type { DayPlanItem, TimeBlock } from '../types'

/** Alert offsets before each plan block start (minutes). */
export const PLAN_ALERT_MINUTES_BEFORE = [5, 0] as const

export interface PlanAlarmTrigger {
  id: string
  planItemId: string
  startMinutes: number
  minutesBefore: number
  label: string
  body: string
}

export function getPlanAlarmTriggers(
  dailyPlan: DayPlanItem[],
  timeBlocks: TimeBlock[],
  forDate: Date,
): PlanAlarmTrigger[] {
  const triggers: PlanAlarmTrigger[] = []

  for (const item of planTimedItemsForCalendar(dailyPlan, timeBlocks, forDate)) {
    for (const minutesBefore of PLAN_ALERT_MINUTES_BEFORE) {
      const triggerMinutes = item.startMinutes - minutesBefore
      if (triggerMinutes < 0) continue

      triggers.push({
        id: `plan-${item.id}-${minutesBefore}`,
        planItemId: item.id,
        startMinutes: triggerMinutes,
        minutesBefore,
        label:
          minutesBefore === 0
            ? `Rhythm — ${item.label}`
            : `Rhythm — ${item.label} in 5 min`,
        body:
          minutesBefore === 0
            ? `Starting now · ${formatDuration(item.durationMinutes)}`
            : `Get ready — ${item.label} starts in 5 minutes.`,
      })
    }
  }

  return triggers.sort((a, b) => a.startMinutes - b.startMinutes)
}

export function shouldFirePlanAlarmTrigger(
  trigger: PlanAlarmTrigger,
  now: Date,
): boolean {
  const hour = Math.floor(trigger.startMinutes / 60)
  const minute = trigger.startMinutes % 60
  return now.getHours() === hour && now.getMinutes() === minute
}
