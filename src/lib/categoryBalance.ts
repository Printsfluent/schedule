import type { ActivityCategory, DayLog, TimeBlock } from '../types'
import { buildPlanDisplayEntries } from './dailyPlan'
import { formatDuration, getBlocksForDate, getRecentDateKeys, parseDateKey } from './dates'
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types'

const CATEGORIES: ActivityCategory[] = ['work', 'study', 'health', 'social', 'rest', 'life']

export type CategoryBalanceRow = {
  category: ActivityCategory
  label: string
  minutes: number
  color: string
  percent: number
}

export function computeCategoryBalance(
  days: Record<string, DayLog>,
  timeBlocks: TimeBlock[],
  from: Date = new Date(),
  dayCount = 7,
): CategoryBalanceRow[] {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<ActivityCategory, number>

  for (const key of getRecentDateKeys(dayCount, from)) {
    const log = days[key]
    const dayBlocks = getBlocksForDate(timeBlocks, parseDateKey(key))
    const entries = buildPlanDisplayEntries(log, dayBlocks)
    if (entries.length > 0) {
      for (const entry of entries) {
        const cat = entry.kind === 'block' ? entry.block.category : entry.item.category
        totals[cat] += entry.durationMinutes
      }
    } else {
      for (const block of dayBlocks) {
        totals[block.category] += block.durationMinutes
      }
    }
  }

  const total = CATEGORIES.reduce((s, c) => s + totals[c], 0) || 1

  return CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    minutes: totals[category],
    color: CATEGORY_COLORS[category],
    percent: Math.round((totals[category] / total) * 100),
  })).filter((r) => r.minutes > 0)
}

export function balanceInsight(rows: CategoryBalanceRow[]): string | null {
  if (rows.length === 0) return null
  const sorted = [...rows].sort((a, b) => b.percent - a.percent)
  const top = sorted[0]
  const low = sorted[sorted.length - 1]
  if (top.percent >= 50) {
    return `Heavy on ${top.label} (${top.percent}%) — consider more ${low.label.toLowerCase()} this week.`
  }
  return `Balanced week across ${rows.length} life areas.`
}

export function formatBalanceSubtitle(rows: CategoryBalanceRow[]): string {
  const total = rows.reduce((s, r) => s + r.minutes, 0)
  return `${formatDuration(total)} planned across ${rows.length} categories (7 days)`
}
