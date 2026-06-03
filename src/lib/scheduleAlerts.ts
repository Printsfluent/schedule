import { planTimedItemsForCalendar } from './dailyPlan'
import { formatDuration, getBlocksForDate } from './dates'
import type { DayLog, DayPlanItem, TimeBlock } from '../types'

/** Alert offsets before each block start (minutes). */
export const BLOCK_ALERT_MINUTES_BEFORE = [5, 0] as const

export type TimedScheduleItem = {
  id: string
  label: string
  startMinutes: number
  durationMinutes: number
  blockId?: string
  planItemId?: string
}

export interface BlockAlarmTrigger {
  id: string
  blockId?: string
  planItemId?: string
  startMinutes: number
  minutesBefore: number
  label: string
  body: string
}

/** Plan items when a daily plan exists; otherwise every schedule block for that day. */
export function getTimedScheduleItems(
  dailyPlan: DayPlanItem[],
  timeBlocks: TimeBlock[],
  forDate: Date,
): TimedScheduleItem[] {
  if (dailyPlan.length > 0) {
    return planTimedItemsForCalendar(dailyPlan, timeBlocks, forDate).map((item) => {
      const planItem = dailyPlan.find((p) => p.id === item.id)
      return {
        ...item,
        planItemId: item.id,
        blockId: planItem?.kind === 'block' ? planItem.blockId : undefined,
      }
    })
  }

  return getBlocksForDate(timeBlocks, forDate).map((block) => ({
    id: block.id,
    label: block.label,
    startMinutes: block.startMinutes,
    durationMinutes: block.durationMinutes,
    blockId: block.id,
  }))
}

export function getBlockAlarmTriggers(
  dailyPlan: DayPlanItem[],
  timeBlocks: TimeBlock[],
  forDate: Date,
): BlockAlarmTrigger[] {
  const triggers: BlockAlarmTrigger[] = []

  for (const item of getTimedScheduleItems(dailyPlan, timeBlocks, forDate)) {
    for (const minutesBefore of BLOCK_ALERT_MINUTES_BEFORE) {
      const triggerMinutes = item.startMinutes - minutesBefore
      if (triggerMinutes < 0) continue

      const prefix = item.planItemId ? 'plan' : 'block'
      const key = item.planItemId ?? item.blockId ?? item.id

      triggers.push({
        id: `${prefix}-${key}-${minutesBefore}`,
        blockId: item.blockId,
        planItemId: item.planItemId,
        startMinutes: triggerMinutes,
        minutesBefore,
        label:
          minutesBefore === 0
            ? `Rhythm — ${item.label}`
            : `Rhythm — ${item.label} in 5 min`,
        body:
          minutesBefore === 0
            ? `Starting now · ${formatDuration(item.durationMinutes)} — mark done when you finish`
            : `Get ready — ${item.label} starts in 5 minutes.`,
      })
    }
  }

  return triggers.sort((a, b) => a.startMinutes - b.startMinutes)
}

export function shouldFireBlockAlarmTrigger(trigger: BlockAlarmTrigger, now: Date): boolean {
  const hour = Math.floor(trigger.startMinutes / 60)
  const minute = trigger.startMinutes % 60
  return now.getHours() === hour && now.getMinutes() === minute
}

export function isBlockAlarmComplete(trigger: BlockAlarmTrigger, log: DayLog): boolean {
  if (trigger.planItemId) {
    const item = log.dailyPlan?.find((p) => p.id === trigger.planItemId)
    if (!item) return false
    if (item.kind === 'custom') return Boolean(item.done)
    if (item.blockId) return log.completedBlockIds.includes(item.blockId)
  }
  if (trigger.blockId) return log.completedBlockIds.includes(trigger.blockId)
  return log.completedBlockIds.includes(trigger.id)
}
