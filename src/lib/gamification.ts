import type { ActivityCategory, Gamification } from '../types'

const XP_BY_CATEGORY: Record<ActivityCategory, number> = {
  study: 25,
  work: 20,
  health: 30,
  social: 15,
  rest: 10,
  life: 10,
}

export function xpForCategory(category: ActivityCategory): number {
  return XP_BY_CATEGORY[category] ?? 15
}

export function xpToNextLevel(level: number): number {
  return 100 + level * 50
}

export function levelFromXp(totalXp: number): { level: number; progress: number; nextIn: number } {
  let level = 1
  let remaining = totalXp
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level)
    level++
  }
  const nextIn = xpToNextLevel(level)
  return { level, progress: Math.round((remaining / nextIn) * 100), nextIn: nextIn - remaining }
}

export function addXp(g: Gamification, amount: number): Gamification {
  const totalXp = g.totalXp + amount
  const { level } = levelFromXp(totalXp)
  return { xp: g.xp + amount, totalXp, level }
}

export function defaultGamification(): Gamification {
  return { xp: 0, totalXp: 0, level: 1 }
}

export function petStage(streak: number): { emoji: string; label: string } {
  if (streak >= 30) return { emoji: '🌳', label: 'Thriving' }
  if (streak >= 14) return { emoji: '🌿', label: 'Growing strong' }
  if (streak >= 7) return { emoji: '🌱', label: 'Sprouting' }
  if (streak >= 3) return { emoji: '🥚', label: 'Hatching' }
  return { emoji: '💤', label: 'Resting — start a streak!' }
}
