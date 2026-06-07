import {
  appendChainedPlanItem,
  createCustomPlanItem,
  isSleepPlanItem,
  recascadeEntirePlan,
  sortPlanByTime,
} from './dailyPlan'
import type { ActivityCategory, DayPlanItem, ScheduleMode } from '../types'

export const REALISTIC_EXTRAS: Omit<DayPlanItem, 'id'>[] = [
  { kind: 'custom', label: 'Phone scroll / chill', category: 'rest', startMinutes: 0, durationMinutes: 20 },
  { kind: 'custom', label: 'Break + water', category: 'rest', startMinutes: 0, durationMinutes: 15 },
  { kind: 'custom', label: 'Social check-in', category: 'social', startMinutes: 0, durationMinutes: 30 },
]

export type PlanSampleId = 'weekday' | 'weekend' | 'exam' | 'gym' | 'morning' | 'night'

type SampleEntry = {
  label: string
  category: ActivityCategory
  durationMinutes: number
}

const WEEKDAY_SAMPLE: SampleEntry[] = [
  { label: 'Wake up + freshen up', category: 'health', durationMinutes: 30 },
  { label: 'Walk / stretch / music', category: 'health', durationMinutes: 30 },
  { label: 'Breakfast + messages', category: 'life', durationMinutes: 30 },
  { label: 'Programming study', category: 'study', durationMinutes: 120 },
  { label: 'Work', category: 'work', durationMinutes: 240 },
  { label: 'Lunch + rest', category: 'rest', durationMinutes: 30 },
  { label: 'Work', category: 'work', durationMinutes: 120 },
  { label: 'Relax / reset', category: 'rest', durationMinutes: 30 },
  { label: 'Gym', category: 'health', durationMinutes: 90 },
  { label: 'Dinner', category: 'life', durationMinutes: 30 },
  { label: 'Fun / social time', category: 'social', durationMinutes: 120 },
  { label: 'Light coding / review', category: 'study', durationMinutes: 60 },
  { label: 'Wind down', category: 'rest', durationMinutes: 60 },
  { label: 'Sleep', category: 'rest', durationMinutes: 480 },
]

const WEEKEND_SAMPLE: SampleEntry[] = [
  { label: 'Gym', category: 'health', durationMinutes: 90 },
  { label: 'Project building', category: 'study', durationMinutes: 180 },
  { label: 'Laundry / cleaning', category: 'life', durationMinutes: 120 },
  { label: 'Social / night out', category: 'social', durationMinutes: 240 },
  { label: 'Sleep', category: 'rest', durationMinutes: 480 },
]

const EXAM_SAMPLE: SampleEntry[] = [
  { label: 'Wake up + freshen up', category: 'health', durationMinutes: 30 },
  { label: 'Programming study', category: 'study', durationMinutes: 180 },
  { label: 'Work', category: 'work', durationMinutes: 180 },
  { label: 'Lunch + rest', category: 'rest', durationMinutes: 45 },
  { label: 'Programming study', category: 'study', durationMinutes: 120 },
  { label: 'Wind down', category: 'rest', durationMinutes: 60 },
  { label: 'Sleep', category: 'rest', durationMinutes: 480 },
]

const GYM_SAMPLE: SampleEntry[] = [
  { label: 'Wake up + freshen up', category: 'health', durationMinutes: 30 },
  { label: 'Walk / stretch', category: 'health', durationMinutes: 30 },
  { label: 'Work', category: 'work', durationMinutes: 240 },
  { label: 'Gym', category: 'health', durationMinutes: 90 },
  { label: 'Dinner', category: 'life', durationMinutes: 30 },
  { label: 'Fun / social time', category: 'social', durationMinutes: 90 },
  { label: 'Sleep', category: 'rest', durationMinutes: 480 },
]

const MORNING_SAMPLE: SampleEntry[] = [
  { label: 'Wake up + freshen up', category: 'health', durationMinutes: 30 },
  { label: 'Walk / stretch / music', category: 'health', durationMinutes: 30 },
  { label: 'Breakfast + messages', category: 'life', durationMinutes: 30 },
]

const NIGHT_SAMPLE: SampleEntry[] = [
  { label: 'Dinner', category: 'life', durationMinutes: 30 },
  { label: 'Fun / social time', category: 'social', durationMinutes: 120 },
  { label: 'Wind down', category: 'rest', durationMinutes: 60 },
  { label: 'Sleep', category: 'rest', durationMinutes: 480 },
]

const SAMPLE_BY_ID: Record<PlanSampleId, SampleEntry[]> = {
  weekday: WEEKDAY_SAMPLE,
  weekend: WEEKEND_SAMPLE,
  exam: EXAM_SAMPLE,
  gym: GYM_SAMPLE,
  morning: MORNING_SAMPLE,
  night: NIGHT_SAMPLE,
}

/** Individual activities users can add one-by-one while planning. */
export const PLAN_ACTIVITY_SAMPLES: SampleEntry[] = [
  ...MORNING_SAMPLE,
  { label: 'Programming study', category: 'study', durationMinutes: 120 },
  { label: 'Work', category: 'work', durationMinutes: 120 },
  { label: 'Lunch + rest', category: 'rest', durationMinutes: 30 },
  { label: 'Gym', category: 'health', durationMinutes: 90 },
  { label: 'Fun / social time', category: 'social', durationMinutes: 120 },
  { label: 'Wind down', category: 'rest', durationMinutes: 60 },
  { label: 'Sleep', category: 'rest', durationMinutes: 480 },
]

function buildFromEntries(entries: SampleEntry[], startMinutes = 6 * 60 + 30): DayPlanItem[] {
  let plan: DayPlanItem[] = []
  for (const [index, entry] of entries.entries()) {
    const start = index === 0 ? startMinutes : 0
    plan = appendChainedPlanItem(
      plan,
      createCustomPlanItem(entry.label, entry.category, start, entry.durationMinutes),
    )
  }
  return sortPlanByTime(plan)
}

export function getPlanSample(
  id: PlanSampleId,
  options: { realisticMode?: boolean; wakeMinutes?: number } = {},
): DayPlanItem[] {
  const entries = [...(SAMPLE_BY_ID[id] ?? WEEKDAY_SAMPLE)]
  let plan = buildFromEntries(entries, options.wakeMinutes ?? 6 * 60 + 30)
  if (options.realisticMode && (id === 'weekday' || id === 'exam' || id === 'gym')) {
    const sleepIdx = plan.findIndex(isSleepPlanItem)
    const beforeSleep = sleepIdx >= 0 ? plan.slice(0, sleepIdx) : plan
    const sleepTail = sleepIdx >= 0 ? plan.slice(sleepIdx) : []
    let next = beforeSleep
    for (const extra of REALISTIC_EXTRAS) {
      next = appendChainedPlanItem(
        next,
        createCustomPlanItem(extra.label, extra.category, 0, extra.durationMinutes),
      )
    }
    for (const item of sleepTail) {
      next = appendChainedPlanItem(next, item)
    }
    plan = recascadeEntirePlan(next)
  }
  return plan
}

export function samplePlanForMode(mode: ScheduleMode, realisticMode: boolean, wakeMinutes?: number): DayPlanItem[] {
  const id: PlanSampleId =
    mode === 'weekend' ? 'weekend' : mode === 'exam' ? 'exam' : mode === 'gym' ? 'gym' : 'weekday'
  return getPlanSample(id, { realisticMode, wakeMinutes })
}

export function sampleActivityToPlanItem(
  entry: SampleEntry,
  startMinutes: number,
): DayPlanItem {
  return createCustomPlanItem(entry.label, entry.category, startMinutes, entry.durationMinutes)
}
