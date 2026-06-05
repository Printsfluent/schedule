import type { DayPlanItem, ScheduleMode } from '../types'
import { getPlanSample, samplePlanForMode, REALISTIC_EXTRAS } from './planSamples'

export { REALISTIC_EXTRAS }

export function buildMorningRoutineTemplate(): DayPlanItem[] {
  return getPlanSample('morning')
}

export function buildNightRoutineTemplate(): DayPlanItem[] {
  return getPlanSample('night')
}

export function buildTemplatePlan(mode: ScheduleMode, realisticMode: boolean): DayPlanItem[] {
  return samplePlanForMode(mode, realisticMode)
}
