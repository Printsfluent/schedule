import { useMemo } from 'react'
import { assignTimelineLanes, timelineRangeForEntries, type PlanDisplayEntry } from '../lib/dailyPlan'
import { formatTime } from '../lib/dates'
import { CATEGORY_COLORS } from '../types'

interface Props {
  entries: PlanDisplayEntry[]
  nowMinutes: number
}

function formatHourLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  if (h === 0) return '12 AM'
  if (h === 12) return '12 PM'
  if (h < 12) return `${h} AM`
  return `${h - 12} PM`
}

export function TimelineDayView({ entries, nowMinutes }: Props) {
  const { dayStart, dayEnd } = useMemo(() => timelineRangeForEntries(entries), [entries])
  const lanes = useMemo(() => assignTimelineLanes(entries), [entries])
  const span = Math.max(dayEnd - dayStart, 60)
  const laneCount = lanes[0]?.laneCount ?? 1
  const rowHeight = 28
  const trackHeight = Math.max(64, laneCount * rowHeight + 16)

  const markers = useMemo(() => {
    const count = 4
    return Array.from({ length: count }, (_, i) => dayStart + Math.round((span * i) / (count - 1)))
  }, [dayStart, span])

  return (
    <div className="relative rounded-2xl border border-border bg-inset p-3">
      <div className="mb-2 flex justify-between text-[10px] text-faint">
        {markers.map((m) => (
          <span key={m}>{formatHourLabel(m)}</span>
        ))}
      </div>
      <div
        className="relative overflow-hidden rounded-xl bg-inset-2"
        style={{ height: trackHeight }}
      >
        {lanes.map(({ entry, lane }) => {
          const label = entry.kind === 'block' ? entry.block.label : entry.item.label
          const category = entry.kind === 'block' ? entry.block.category : entry.item.category
          const color = CATEGORY_COLORS[category]
          const left = ((entry.startMinutes - dayStart) / span) * 100
          const width = Math.max(3, (entry.durationMinutes / span) * 100)
          const done = entry.done
          const top = 8 + lane * rowHeight
          return (
            <div
              key={entry.kind === 'block' ? entry.planItemId : entry.item.id}
              title={`${label} · ${formatTime(entry.startMinutes)} · ${entry.durationMinutes}m`}
              className="absolute rounded-lg px-1.5 py-1 text-[9px] font-medium leading-tight truncate transition-opacity"
              style={{
                top,
                height: rowHeight - 4,
                left: `${Math.max(0, Math.min(98, left))}%`,
                width: `${Math.min(96, width)}%`,
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
      <p className="mt-2 text-[10px] text-faint">
        Your picked plan for this day · green line = now
      </p>
    </div>
  )
}
