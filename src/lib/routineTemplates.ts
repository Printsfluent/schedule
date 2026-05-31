import {
  appendChainedPlanItem,
  createBlockPlanItem,
  createCustomPlanItem,
  sortPlanByTime,
} from './dailyPlan'
import type { DayPlanItem, ScheduleMode, TimeBlock } from '../types'

export const REALISTIC_EXTRAS: Omit<DayPlanItem, 'id'>[] = [
  { kind: 'custom', label: 'Phone scroll / chill', category: 'rest', startMinutes: 0, durationMinutes: 20 },
  { kind: 'custom', label: 'Break + water', category: 'rest', startMinutes: 0, durationMinutes: 15 },
  { kind: 'custom', label: 'Social check-in', category: 'social', startMinutes: 0, durationMinutes: 30 },
]

const MODE_BLOCK_PATTERNS: Record<ScheduleMode, RegExp> = {
  weekday: /programming|remote work|gym|fun|wind down/i,
  weekend: /gym|project|social|laundry|fun/i,
  exam: /programming|study|remote work|wind down/i,
  gym: /gym|walk|stretch|remote work|programming/i,
}

export function blocksForMode(blocks: TimeBlock[], mode: ScheduleMode): TimeBlock[] {
  const pattern = MODE_BLOCK_PATTERNS[mode]
  return blocks.filter((b) => pattern.test(b.label))
}

export function buildMorningRoutineTemplate(blocks: TimeBlock[]): DayPlanItem[] {
  const picks = blocks.filter((b) => /wake|breakfast|walk|stretch/i.test(b.label)).slice(0, 3)
  let plan: DayPlanItem[] = []
  for (const block of picks) {
    plan = appendChainedPlanItem(plan, createBlockPlanItem(block))
  }
  return sortPlanByTime(plan)
}

export function buildNightRoutineTemplate(blocks: TimeBlock[]): DayPlanItem[] {
  const picks = blocks.filter((b) => /wind down|fun|dinner/i.test(b.label)).slice(0, 3)
  let plan: DayPlanItem[] = []
  for (const block of picks) {
    plan = appendChainedPlanItem(plan, createBlockPlanItem(block))
  }
  return sortPlanByTime(plan)
}

export function buildTemplatePlan(
  blocks: TimeBlock[],
  mode: ScheduleMode,
  realisticMode: boolean,
): DayPlanItem[] {
  let plan: DayPlanItem[] = []
  for (const block of blocksForMode(blocks, mode)) {
    plan = appendChainedPlanItem(plan, createBlockPlanItem(block))
  }
  if (realisticMode) {
    for (const extra of REALISTIC_EXTRAS) {
      plan = appendChainedPlanItem(
        plan,
        createCustomPlanItem(extra.label, extra.category, extra.startMinutes, extra.durationMinutes),
      )
    }
  }
  return sortPlanByTime(plan)
}
