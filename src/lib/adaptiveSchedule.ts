import { clampDayMinutes, formatDuration, formatTime } from './dates'
import { recascadeEntirePlan, sortPlanByTime } from './dailyPlan'
import type { DayPlanItem, Mood } from '../types'

const PROTECTED = /wind down|sleep|bed/i
const STUDY = /programming|coding|study|project/i
const GYM = /gym/i
const WORK = /^work$/i

export function computeWakeDelayMinutes(
  now: Date = new Date(),
  expectedHour = 6,
  expectedMinute = 30,
): number {
  const expected = expectedHour * 60 + expectedMinute
  const current = now.getHours() * 60 + now.getMinutes()
  return Math.max(0, current - expected)
}

function shortenStudy(item: DayPlanItem, maxTrim = 30): DayPlanItem {
  if (!STUDY.test(item.label)) return item
  const trim = Math.min(maxTrim, Math.max(0, item.durationMinutes - 45))
  if (trim <= 0) return item
  return { ...item, durationMinutes: item.durationMinutes - trim }
}

export function adaptPlanToDelay(
  plan: DayPlanItem[],
  delayMinutes: number,
  mood?: Mood | null,
): { plan: DayPlanItem[]; messages: string[] } {
  if (delayMinutes <= 0 || plan.length === 0) {
    return { plan, messages: [] }
  }

  const messages: string[] = [`Running ${formatDuration(delayMinutes)} late — shifting your day.`]
  let adjusted = sortPlanByTime(plan.map((item) => ({ ...item })))
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  const startIdx = adjusted.findIndex(
    (item) => !PROTECTED.test(item.label) && item.startMinutes + item.durationMinutes > nowMins,
  )
  if (startIdx < 0) return { plan, messages: [] }

  const shift = mood === 'tired' || mood === 'rough' ? delayMinutes + 15 : delayMinutes

  for (let i = startIdx; i < adjusted.length; i++) {
    const item = adjusted[i]
    if (PROTECTED.test(item.label)) continue
    adjusted[i] = {
      ...item,
      startMinutes: clampDayMinutes(item.startMinutes + shift),
    }
  }

  adjusted = adjusted.map((item) => {
    if (PROTECTED.test(item.label)) return item
    if (STUDY.test(item.label)) return shortenStudy(item)
    return item
  })

  adjusted = recascadeEntirePlan(adjusted)

  const gym = adjusted.find((i) => GYM.test(i.label))
  const study = adjusted.find((i) => STUDY.test(i.label))
  const work = adjusted.find((i) => WORK.test(i.label))
  if (gym) messages.push(`Gym moved to ${formatTime(gym.startMinutes)}.`)
  if (study) messages.push(`Study shortened slightly — still on track.`)
  if (work) messages.push(`Work starts ${formatTime(work.startMinutes)}.`)
  messages.push('Wind-down & sleep stay protected.')

  return { plan: adjusted, messages }
}
