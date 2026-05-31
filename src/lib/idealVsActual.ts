import { buildPlanDisplayEntries } from './dailyPlan'
import { formatTime } from './dates'
import type { DayLog, TimeBlock } from '../types'

export interface IdealVsActualRow {
  label: string
  idealStart: number
  actualStart: number | null
  idealMinutes: number
  actualMinutes: number
  done: boolean
  deltaMinutes: number | null
}

export function compareIdealVsActual(
  log: DayLog | undefined,
  dayBlocks: TimeBlock[],
): { rows: IdealVsActualRow[]; onTimeCount: number; lateCount: number } {
  const entries = buildPlanDisplayEntries(log, dayBlocks)
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()

  const rows: IdealVsActualRow[] = entries.map((entry) => {
    const label = entry.kind === 'block' ? entry.block.label : entry.item.label
    const idealStart = entry.kind === 'block' ? entry.block.startMinutes : entry.item.startMinutes ?? entry.startMinutes
    const idealMinutes = entry.durationMinutes
    const done = entry.done
    const actualStart = done ? entry.startMinutes : null
    const actualMinutes = done ? entry.durationMinutes : 0
    let deltaMinutes: number | null = null
    if (done && actualStart != null) {
      deltaMinutes = actualStart - idealStart
    } else if (!done && idealStart < nowMins) {
      deltaMinutes = nowMins - idealStart
    }
    return { label, idealStart, actualStart, idealMinutes, actualMinutes, done, deltaMinutes }
  })

  const onTimeCount = rows.filter((r) => r.done && (r.deltaMinutes ?? 0) <= 15).length
  const lateCount = rows.filter((r) => (r.deltaMinutes ?? 0) > 15).length

  return { rows, onTimeCount, lateCount }
}

export function formatIdealVsActualSummary(rows: IdealVsActualRow[]): string {
  if (rows.length === 0) return 'No plan yet — build your morning plan to compare ideal vs actual.'
  const done = rows.filter((r) => r.done).length
  return `${done}/${rows.length} blocks done · ${rows.filter((r) => r.done).map((r) => `${r.label} @ ${formatTime(r.actualStart ?? r.idealStart)}`).join(', ') || 'nothing completed yet'}`
}
