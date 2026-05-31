import type { ActivityCategory, Habit, TimeBlock } from '../types'
import { createId } from '../lib/id'

function block(
  start: string,
  duration: number,
  label: string,
  category: ActivityCategory,
  recurring: TimeBlock['recurring'] = 'weekday',
): TimeBlock {
  const [h, m] = start.split(':').map(Number)
  return {
    id: createId(),
    startMinutes: h * 60 + m,
    durationMinutes: duration,
    label,
    category,
    recurring,
    enabled: true,
  }
}

export const DEFAULT_WEEKDAY_BLOCKS: Omit<TimeBlock, 'id'>[] = [
  { startMinutes: 6 * 60 + 30, durationMinutes: 30, label: 'Wake up + freshen up', category: 'health', recurring: 'weekday', enabled: true },
  { startMinutes: 7 * 60, durationMinutes: 30, label: 'Walk / stretch / music', category: 'health', recurring: 'weekday', enabled: true },
  { startMinutes: 7 * 60 + 30, durationMinutes: 30, label: 'Breakfast + messages', category: 'life', recurring: 'weekday', enabled: true },
  { startMinutes: 8 * 60, durationMinutes: 120, label: 'Programming study', category: 'study', recurring: 'weekday', enabled: true },
  { startMinutes: 10 * 60 + 30, durationMinutes: 240, label: 'Remote work', category: 'work', recurring: 'weekday', enabled: true },
  { startMinutes: 14 * 60 + 30, durationMinutes: 30, label: 'Lunch + rest', category: 'rest', recurring: 'weekday', enabled: true },
  { startMinutes: 15 * 60, durationMinutes: 120, label: 'Remote work', category: 'work', recurring: 'weekday', enabled: true },
  { startMinutes: 17 * 60, durationMinutes: 30, label: 'Relax / reset', category: 'rest', recurring: 'weekday', enabled: true },
  { startMinutes: 17 * 60 + 30, durationMinutes: 90, label: 'Gym', category: 'health', recurring: 'weekday', enabled: true },
  { startMinutes: 19 * 60 + 30, durationMinutes: 30, label: 'Dinner', category: 'life', recurring: 'weekday', enabled: true },
  { startMinutes: 20 * 60, durationMinutes: 120, label: 'Fun / social time', category: 'social', recurring: 'weekday', enabled: true },
  { startMinutes: 22 * 60, durationMinutes: 60, label: 'Light coding / review', category: 'study', recurring: 'weekday', enabled: true },
  { startMinutes: 23 * 60, durationMinutes: 60, label: 'Wind down', category: 'rest', recurring: 'weekday', enabled: true },
]

export const DEFAULT_SATURDAY_BLOCKS: Omit<TimeBlock, 'id'>[] = [
  { startMinutes: 9 * 60, durationMinutes: 90, label: 'Gym', category: 'health', recurring: 'saturday', enabled: true },
  { startMinutes: 11 * 60, durationMinutes: 180, label: 'Project building', category: 'study', recurring: 'saturday', enabled: true },
  { startMinutes: 14 * 60, durationMinutes: 120, label: 'Laundry / cleaning', category: 'life', recurring: 'saturday', enabled: true },
  { startMinutes: 19 * 60, durationMinutes: 240, label: 'Social / night out', category: 'social', recurring: 'saturday', enabled: true },
]

export const DEFAULT_SUNDAY_BLOCKS: Omit<TimeBlock, 'id'>[] = [
  { startMinutes: 10 * 60, durationMinutes: 60, label: 'Light reset', category: 'rest', recurring: 'sunday', enabled: true },
  { startMinutes: 12 * 60, durationMinutes: 90, label: 'Meal prep', category: 'life', recurring: 'sunday', enabled: true },
  { startMinutes: 14 * 60, durationMinutes: 60, label: 'Weekly planning', category: 'life', recurring: 'sunday', enabled: true },
  { startMinutes: 16 * 60, durationMinutes: 60, label: 'Minimal work', category: 'work', recurring: 'sunday', enabled: true },
  { startMinutes: 21 * 60, durationMinutes: 60, label: 'Early wind down', category: 'rest', recurring: 'sunday', enabled: true },
]

export function createDefaultBlocks(): TimeBlock[] {
  return [...DEFAULT_WEEKDAY_BLOCKS, ...DEFAULT_SATURDAY_BLOCKS, ...DEFAULT_SUNDAY_BLOCKS].map(
    (b) => ({ ...b, id: createId() }),
  )
}

export const DEFAULT_HABITS: Habit[] = [
  { id: 'h1', name: 'Morning study', emoji: '📚', category: 'study' },
  { id: 'h2', name: 'Gym / movement', emoji: '💪', category: 'health' },
  { id: 'h3', name: 'Deep work block', emoji: '💻', category: 'work' },
  { id: 'h4', name: 'Social time', emoji: '🎉', category: 'social' },
  { id: 'h5', name: 'Sleep by midnight', emoji: '😴', category: 'rest' },
  { id: 'h6', name: 'Hydrate', emoji: '💧', category: 'health' },
]

export const MOTIVATION_QUOTES = [
  { text: 'Consistency beats perfection.', author: 'Rhythm' },
  { text: 'Rest is part of the plan, not a reward.', author: 'Rhythm' },
  { text: 'Study before work — your brain is freshest now.', author: 'Rhythm' },
  { text: 'Fun on the calendar isn\'t lazy. It\'s sustainable.', author: 'Rhythm' },
  { text: 'Power out? Show up anyway. One win is enough.', author: 'Rhythm' },
  { text: 'Gym after work — leave the stress at the desk.', author: 'Rhythm' },
  { text: 'You don\'t need a perfect day. You need a real one.', author: 'Rhythm' },
  { text: 'Remote work is freedom. Structure makes it work.', author: 'Rhythm' },
]

export { block }
