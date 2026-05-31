import { formatTime } from '../lib/dates'
import { CATEGORY_COLORS } from '../types'
import type { PlanDisplayEntry } from '../lib/dailyPlan'

interface Props {
  entries: PlanDisplayEntry[]
  nowMinutes: number
}

export function TimelineDayView({ entries, nowMinutes }: Props) {
  const dayStart = 6 * 60
  const dayEnd = 24 * 60
  const span = dayEnd - dayStart

  return (
    <div className="relative rounded-2xl border border-border bg-inset p-3">
      <div className="mb-2 flex justify-between text-[10px] text-faint">
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>12 AM</span>
      </div>
      <div className="relative h-32 overflow-hidden rounded-xl bg-inset-2">
        {entries.map((entry) => {
          const label = entry.kind === 'block' ? entry.block.label : entry.item.label
          const category = entry.kind === 'block' ? entry.block.category : entry.item.category
          const color = CATEGORY_COLORS[category]
          const left = ((entry.startMinutes - dayStart) / span) * 100
          const width = Math.max(4, (entry.durationMinutes / span) * 100)
          const done = entry.done
          return (
            <div
              key={entry.kind === 'block' ? entry.planItemId : entry.item.id}
              title={`${label} · ${formatTime(entry.startMinutes)}`}
              className="absolute top-2 h-10 rounded-lg px-1.5 py-1 text-[9px] font-medium leading-tight truncate transition-opacity"
              style={{
                left: `${Math.max(0, Math.min(96, left))}%`,
                width: `${Math.min(40, width)}%`,
                background: `${color}${done ? '55' : '33'}`,
                borderLeft: `3px solid ${color}`,
                opacity: done ? 0.7 : 1,
              }}
            >
              {label}
            </div>
          )
        })}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-accent/80"
          style={{ left: `${Math.max(0, Math.min(100, ((nowMinutes - dayStart) / span) * 100))}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] text-faint">Green line = now · drag blocks in Plan to reorder</p>
    </div>
  )
}
