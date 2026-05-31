import { buildPlanDisplayEntries } from './dailyPlan'
import type { DayLog, TimeBlock } from '../types'

export type HomeAnalyticsBucket = 'study' | 'focus' | 'workout'

/** Maps home plan / schedule labels to analytics buckets. */
export function classifyHomeEventLabel(label: string): HomeAnalyticsBucket | null {
  const normalized = label.toLowerCase().trim()
  if (/gym/.test(normalized)) return 'workout'
  if (/remote work/.test(normalized)) return 'focus'
  if (/programming|project building|light coding|coding review|coding/.test(normalized)) return 'study'
  return null
}

export interface HomeEventDayStats {
  studySessions: number
  studyMinutes: number
  focusSessions: number
  focusMinutes: number
  workoutSessions: number
  workoutMinutes: number
}

export function computeHomeEventStatsForDay(
  log: DayLog | undefined,
  dayBlocks: TimeBlock[],
): HomeEventDayStats {
  const stats: HomeEventDayStats = {
    studySessions: 0,
    studyMinutes: 0,
    focusSessions: 0,
    focusMinutes: 0,
    workoutSessions: 0,
    workoutMinutes: 0,
  }

  if (!log) return stats

  const seen = new Set<string>()

  const addEvent = (key: string, label: string, durationMinutes: number) => {
    if (seen.has(key)) return
    const bucket = classifyHomeEventLabel(label)
    if (!bucket) return
    seen.add(key)
    if (bucket === 'study') {
      stats.studySessions += 1
      stats.studyMinutes += durationMinutes
    } else if (bucket === 'focus') {
      stats.focusSessions += 1
      stats.focusMinutes += durationMinutes
    } else {
      stats.workoutSessions += 1
      stats.workoutMinutes += durationMinutes
    }
  }

  for (const block of dayBlocks) {
    if (!log.completedBlockIds.includes(block.id)) continue
    addEvent(`block:${block.id}`, block.label, block.durationMinutes)
  }

  for (const entry of buildPlanDisplayEntries(log, dayBlocks)) {
    if (!entry.done) continue
    if (entry.kind === 'block') {
      addEvent(`block:${entry.block.id}`, entry.block.label, entry.durationMinutes)
    } else {
      addEvent(`custom:${entry.item.id}`, entry.item.label, entry.durationMinutes)
    }
  }

  return stats
}

export function hasHomeWorkoutDay(stats: HomeEventDayStats): boolean {
  return stats.workoutSessions > 0
}

export function minutesToStatHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10
}

/** e.g. "3× · 4.5h" */
export function formatEventStat(sessions: number, minutes: number): string {
  return `${sessions}× · ${minutesToStatHours(minutes)}h`
}
