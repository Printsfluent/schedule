import type { DayLog, TimeBlock } from '../types'
import { formatDateKey, getBlocksForDate, getRecentDateKeys, parseDateKey } from './dates'
import { computeHomeEventStatsForDay, hasHomeWorkoutDay } from './homeAnalytics'
import { moodToScore } from './consistency'

export interface WeekStats {
  studySessions: number
  studyHours: number
  focusSessions: number
  focusHours: number
  workoutSessions: number
  workoutHours: number
  workoutDays: number
  avgMood: number | null
  avgSleep: number | null
  recoveryDays: number
  productivityByDay: { date: string; score: number }[]
}

export interface MonthStats {
  studySessions: number
  studyHours: number
  focusSessions: number
  focusHours: number
  workoutSessions: number
  workoutHours: number
  workoutDays: number
  recoveryDays: number
  moodTrend: { date: string; mood: number | null; productivity: number }[]
}

function dayProductivity(log: DayLog | undefined, dayBlocks: TimeBlock[]): number {
  if (!log) return 0
  if (log.isRecoveryDay) return 60
  const home = computeHomeEventStatsForDay(log, dayBlocks)
  const blocks = Math.min(log.completedBlockIds.length * 8, 40)
  const habits = Math.min(log.completedHabitIds.length * 10, 30)
  const focus = Math.min(home.focusMinutes / 2, 20)
  const study = Math.min(home.studyMinutes / 3, 10)
  return Math.round(Math.min(blocks + habits + focus + study, 100))
}

export function computeWeekStats(
  days: Record<string, DayLog>,
  timeBlocks: TimeBlock[],
  from: Date = new Date(),
): WeekStats {
  const keys = getRecentDateKeys(7, from)
  let studySessions = 0
  let studyMinutes = 0
  let focusSessions = 0
  let focusMinutes = 0
  let workoutSessions = 0
  let workoutMinutes = 0
  let workoutDays = 0
  let recoveryDays = 0
  let moodSum = 0
  let moodCount = 0
  let sleepSum = 0
  let sleepCount = 0
  const productivityByDay: WeekStats['productivityByDay'] = []

  for (const key of keys) {
    const log = days[key]
    const dayBlocks = getBlocksForDate(timeBlocks, parseDateKey(key))
    if (!log) {
      productivityByDay.push({ date: key, score: 0 })
      continue
    }

    const home = computeHomeEventStatsForDay(log, dayBlocks)
    studySessions += home.studySessions
    studyMinutes += home.studyMinutes
    focusSessions += home.focusSessions
    focusMinutes += home.focusMinutes
    workoutSessions += home.workoutSessions
    workoutMinutes += home.workoutMinutes
    if (hasHomeWorkoutDay(home)) workoutDays++
    if (log.isRecoveryDay) recoveryDays++

    const ms = moodToScore(log.mood)
    if (ms) {
      moodSum += ms
      moodCount++
    }
    if (log.sleepHours) {
      sleepSum += log.sleepHours
      sleepCount++
    }
    productivityByDay.push({ date: key, score: dayProductivity(log, dayBlocks) })
  }

  return {
    studySessions,
    studyHours: Math.round((studyMinutes / 60) * 10) / 10,
    focusSessions,
    focusHours: Math.round((focusMinutes / 60) * 10) / 10,
    workoutSessions,
    workoutHours: Math.round((workoutMinutes / 60) * 10) / 10,
    workoutDays,
    avgMood: moodCount ? Math.round((moodSum / moodCount) * 10) / 10 : null,
    avgSleep: sleepCount ? Math.round((sleepSum / sleepCount) * 10) / 10 : null,
    recoveryDays,
    productivityByDay,
  }
}

export function computeMonthStats(
  days: Record<string, DayLog>,
  timeBlocks: TimeBlock[],
  year: number,
  month: number,
): MonthStats {
  const moodTrend: MonthStats['moodTrend'] = []
  let studySessions = 0
  let studyMinutes = 0
  let focusSessions = 0
  let focusMinutes = 0
  let workoutSessions = 0
  let workoutMinutes = 0
  let workoutDays = 0
  let recoveryDays = 0

  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    const key = formatDateKey(d)
    const log = days[key]
    const dayBlocks = getBlocksForDate(timeBlocks, d)
    if (log) {
      const home = computeHomeEventStatsForDay(log, dayBlocks)
      studySessions += home.studySessions
      studyMinutes += home.studyMinutes
      focusSessions += home.focusSessions
      focusMinutes += home.focusMinutes
      workoutSessions += home.workoutSessions
      workoutMinutes += home.workoutMinutes
      if (hasHomeWorkoutDay(home)) workoutDays++
      if (log.isRecoveryDay) recoveryDays++
      moodTrend.push({
        date: key,
        mood: moodToScore(log.mood),
        productivity: dayProductivity(log, dayBlocks),
      })
    } else {
      moodTrend.push({ date: key, mood: null, productivity: 0 })
    }
    d.setDate(d.getDate() + 1)
  }

  return {
    studySessions,
    studyHours: Math.round((studyMinutes / 60) * 10) / 10,
    focusSessions,
    focusHours: Math.round((focusMinutes / 60) * 10) / 10,
    workoutSessions,
    workoutHours: Math.round((workoutMinutes / 60) * 10) / 10,
    workoutDays,
    recoveryDays,
    moodTrend,
  }
}

export function getQuoteIndex(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const day = Math.floor(diff / 86400000)
  return day % 8
}
