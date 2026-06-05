import type { ActivityCategory, DayPlanItem, OnboardingPreferences } from '../types'
import { sortPlanByTime } from './dailyPlan'
import { samplePlanForMode } from './planSamples'
import { clampDayMinutes } from './dates'

export const DEFAULT_ONBOARDING: OnboardingPreferences = {
  wakeMinutes: 7 * 60,
  sleepMinutes: 23 * 60 + 30,
  workStartMinutes: 9 * 60,
  workEndMinutes: 17 * 60,
  studyHoursDaily: 2,
  gymDaysPerWeek: 3,
  priorities: ['work', 'health', 'study'],
}

/** Parse natural-language goals into schedule preferences (no API). */
export function parseNaturalLanguageSchedule(text: string): Partial<OnboardingPreferences> {
  const t = text.toLowerCase()
  const patch: Partial<OnboardingPreferences> = {}

  const wake = t.match(/wake(?:\s*up)?\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am)?/i)
  if (wake) {
    let h = Number(wake[1])
    const m = Number(wake[2] ?? '0')
    if (wake[3] && h < 12) h += 0
    else if (!wake[3] && h <= 12 && !t.includes('pm')) {
      /* morning default */
    } else if (t.includes('pm') && h < 12) h += 12
    patch.wakeMinutes = clampDayMinutes(h * 60 + m)
  }

  const sleep = t.match(/sleep\s*(\d+)\s*h/i)
  if (sleep) {
    const hours = Number(sleep[1])
    const wakeMin = patch.wakeMinutes ?? DEFAULT_ONBOARDING.wakeMinutes
    patch.sleepMinutes = clampDayMinutes(wakeMin - hours * 60)
  }

  if (/9\s*[-–to]+\s*5|9\s*am.*5\s*pm|nine.*five/i.test(t)) {
    patch.workStartMinutes = 9 * 60
    patch.workEndMinutes = 17 * 60
  }

  const study = t.match(/study.*?(\d+)\s*h/i) ?? t.match(/(\d+)\s*h(?:our)?s?\s*(?:of\s*)?study/i)
  if (study) patch.studyHoursDaily = Math.min(8, Number(study[1]))

  const gym = t.match(/gym\s*(\d+)\s*(?:times|x)/i) ?? t.match(/(\d+)\s*(?:times|x)\s*(?:a\s*)?week/i)
  if (gym) patch.gymDaysPerWeek = Math.min(7, Number(gym[1]))

  const priorities: ActivityCategory[] = []
  if (/work|job|remote|office/i.test(t)) priorities.push('work')
  if (/gym|fitness|exercise|health/i.test(t)) priorities.push('health')
  if (/study|learn|program/i.test(t)) priorities.push('study')
  if (/social|friend/i.test(t)) priorities.push('social')
  if (/rest|recover/i.test(t)) priorities.push('rest')
  if (priorities.length) patch.priorities = priorities

  return patch
}

/** Onboarding no longer installs a recurring schedule — only today's sample plan. */
export function applyOnboardingToSchedule<T>(timeBlocks: T): T {
  return timeBlocks
}

/** Build today's daily plan from sample templates and stated priorities. */
export function buildOnboardingDayPlan(
  prefs: OnboardingPreferences,
  realisticMode = true,
): DayPlanItem[] {
  const mode =
    prefs.gymDaysPerWeek >= 4 ? 'gym' : prefs.studyHoursDaily >= 3 ? 'exam' : 'weekday'
  let plan = samplePlanForMode(mode, realisticMode, prefs.wakeMinutes)

  const prioritySet = new Set(prefs.priorities)
  plan = plan.filter((item) => prioritySet.has(item.category))

  if (plan.length < 3) {
    plan = samplePlanForMode(mode, realisticMode, prefs.wakeMinutes).slice(0, 5)
  }

  return sortPlanByTime(plan)
}

export function mergeOnboardingPrefs(
  base: OnboardingPreferences,
  patch: Partial<OnboardingPreferences>,
): OnboardingPreferences {
  return { ...base, ...patch, priorities: patch.priorities ?? base.priorities }
}
