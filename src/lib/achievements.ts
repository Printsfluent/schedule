import type { AppState } from '../types'
import { computeConsistencyStats, computeDayProgress } from './consistency'
import { getBlocksForDate } from './dates'
import { levelFromXp } from './gamification'

export type Achievement = {
  id: string
  title: string
  description: string
  emoji: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'onboarding', title: 'Real life starts', description: 'Completed setup', emoji: '🌅' },
  { id: 'first_plan', title: 'First plan', description: 'Built a daily plan', emoji: '📋' },
  { id: 'day_complete', title: 'Day done', description: '100% progress in a day', emoji: '✨' },
  { id: 'streak_3', title: 'Three-day rhythm', description: '3-day gentle streak', emoji: '🌱' },
  { id: 'streak_7', title: 'Week strong', description: '7-day gentle streak', emoji: '🔥' },
  { id: 'streak_30', title: 'Monthly master', description: '30-day gentle streak', emoji: '🏆' },
  { id: 'level_5', title: 'Level 5', description: 'Reached level 5', emoji: '⭐' },
  { id: 'evening_planner', title: 'Night owl planner', description: 'Planned tomorrow', emoji: '🌙' },
]

export function computeUnlockedAchievements(state: AppState, todayKey: string): string[] {
  const unlocked = new Set(state.unlockedAchievements ?? [])
  const today = new Date()
  const todayBlocks = getBlocksForDate(state.timeBlocks, today)
  const todayLog = state.days[todayKey]
  const stats = computeConsistencyStats(
    state.days,
    todayBlocks.length,
    state.habits.length,
    todayKey,
    state.settings.gentleStreakSince,
  )
  const progress = todayLog ? computeDayProgress(todayLog, state.timeBlocks, today) : 0
  const { level } = levelFromXp(state.gamification.totalXp)

  if (state.onboardingDone) unlocked.add('onboarding')
  if (Object.values(state.days).some((d) => (d.dailyPlan?.length ?? 0) > 0)) unlocked.add('first_plan')
  if (progress >= 100) unlocked.add('day_complete')
  if (stats.gentleStreak >= 3) unlocked.add('streak_3')
  if (stats.gentleStreak >= 7) unlocked.add('streak_7')
  if (stats.gentleStreak >= 30) unlocked.add('streak_30')
  if (level >= 5) unlocked.add('level_5')
  if (Object.values(state.days).some((d) => d.eveningPlanPrompt === 'planned')) unlocked.add('evening_planner')

  return [...unlocked]
}

export function newlyUnlockedAchievements(prev: string[], next: string[]): Achievement[] {
  const added = next.filter((id) => !prev.includes(id))
  return ACHIEVEMENTS.filter((a) => added.includes(a.id))
}
