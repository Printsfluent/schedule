import type { PlanSnooze } from '../types'

export type SnoozePreset = '10m' | 'after-work' | 'tomorrow'

export function snoozeUntilForPreset(preset: SnoozePreset, now = new Date()): number {
  const d = new Date(now)
  switch (preset) {
    case '10m':
      return d.getTime() + 10 * 60_000
    case 'after-work':
      d.setHours(17, 0, 0, 0)
      if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1)
      return d.getTime()
    case 'tomorrow':
      d.setDate(d.getDate() + 1)
      d.setHours(7, 0, 0, 0)
      return d.getTime()
  }
}

export function snoozeLabel(preset: SnoozePreset): string {
  switch (preset) {
    case '10m':
      return 'Remind in 10 min'
    case 'after-work':
      return 'After work'
    case 'tomorrow':
      return 'Tomorrow morning'
  }
}

export function upsertPlanSnooze(snoozes: PlanSnooze[] | undefined, planItemId: string, until: number): PlanSnooze[] {
  const list = [...(snoozes ?? [])].filter((s) => s.planItemId !== planItemId)
  list.push({ planItemId, until })
  return list
}

export function activeSnoozes(snoozes: PlanSnooze[] | undefined, now = Date.now()): PlanSnooze[] {
  return (snoozes ?? []).filter((s) => s.until > now)
}

export function isPlanItemSnoozed(snoozes: PlanSnooze[] | undefined, planItemId: string, now = Date.now()): boolean {
  return (snoozes ?? []).some((s) => s.planItemId === planItemId && s.until > now)
}
