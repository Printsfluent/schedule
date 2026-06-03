import { useMemo, useState } from 'react'
import {
  generateDailyCalendarIcs,
  getDailyCalendarEventPreview,
} from '../lib/calendarExport'
import { countUpcomingDeviceAlarms } from '../lib/deviceAlarms'
import { exportPlanToCalendarAndAlarms, formatPlanExportStatus } from '../lib/planScheduleExport'
import { formatDisplayDate, formatDuration, formatTime } from '../lib/dates'
import type { AppSettings, DayLog, DayPlanItem, TimeBlock } from '../types'

interface Props {
  forDate: Date
  planDateKey: string
  planLog: DayLog
  timeBlocks: TimeBlock[]
  notificationSettings: AppSettings['notifications']
  dailyPlan: DayPlanItem[]
  /** Evening flow plans tomorrow; morning reminds after a skipped export. */
  variant?: 'tomorrow' | 'today'
  onComplete: (result: 'exported' | 'skipped') => void
}

export function MorningCalendarOverlay({
  forDate,
  planDateKey,
  planLog,
  timeBlocks,
  notificationSettings,
  dailyPlan,
  variant = 'tomorrow',
  onComplete,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const events = useMemo(
    () => getDailyCalendarEventPreview(forDate, timeBlocks, notificationSettings, dailyPlan),
    [forDate, timeBlocks, notificationSettings, dailyPlan],
  )

  const eventCount = events.length

  const ics = useMemo(
    () => generateDailyCalendarIcs(forDate, timeBlocks, notificationSettings, dailyPlan),
    [forDate, timeBlocks, notificationSettings, dailyPlan],
  )

  const planSyncContext = useMemo(
    () => ({ todayKey: planDateKey, todayLog: planLog, timeBlocks }),
    [planDateKey, planLog, timeBlocks],
  )

  const upcomingDeviceAlarms = useMemo(
    () => countUpcomingDeviceAlarms(planSyncContext),
    [planSyncContext],
  )

  const handleExport = async () => {
    setBusy(true)
    setStatus(null)
    const result = await exportPlanToCalendarAndAlarms(
      forDate,
      ics,
      notificationSettings,
      planSyncContext,
    )
    setStatus(formatPlanExportStatus(result))
    setBusy(false)
    onComplete('exported')
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-base px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] animate-slide-up">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="text-center">
          <div className="text-5xl">📅</div>
          <p className="mt-4 text-sm font-medium text-accent">Calendar & alarms</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {variant === 'today' ? "Today's plan" : 'Tomorrow only'}
          </h1>
          <p className="mt-2 text-sm text-subtle">{formatDisplayDate(forDate)}</p>
          <p className="mt-2 text-xs leading-relaxed text-subtle">
            {variant === 'today'
              ? 'Your first block is starting — add today to Calendar & Alarms if you skipped last night.'
              : dailyPlan.length > 0
                ? `${upcomingDeviceAlarms} alarm${upcomingDeviceAlarms === 1 ? '' : 's'} · calendar alerts at start and 5 min before.`
                : `Adds ${eventCount} event${eventCount === 1 ? '' : 's'} for tomorrow (start + 5 min before).`}
          </p>
        </div>

        <div className="mt-6 max-h-48 space-y-2 overflow-y-auto overscroll-contain touch-pan-y rounded-2xl border border-border bg-inset p-3">
          {events.map((event) => (
            <div
              key={event.uid}
              className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                event.source === 'plan' ? 'bg-accent-soft' : 'px-2 py-1.5 text-muted'
              }`}
            >
              <span>
                {event.source === 'plan' && <span className="text-accent">Plan · </span>}
                {event.label}
              </span>
              <span className="shrink-0 text-right font-mono text-xs text-faint">
                {formatTime(event.startMinutes)}
                {event.durationMinutes > 0 && (
                  <span className="block text-[10px] text-faint">
                    {formatDuration(event.durationMinutes)}
                  </span>
                )}
              </span>
            </div>
          ))}
          {eventCount === 0 && (
            <p className="px-2 py-2 text-sm text-subtle">No timed reminders for tomorrow.</p>
          )}
        </div>

        {status && <p className="mt-4 text-center text-xs text-accent">{status}</p>}

        <div className="mt-6 space-y-2">
          <button
            type="button"
            disabled={busy || eventCount === 0}
            onClick={() => void handleExport()}
            className="w-full rounded-2xl bg-accent py-4 text-base font-bold text-accent-text disabled:opacity-40"
          >
            {busy ? 'Exporting…' : 'Add to Calendar & Alarms'}
          </button>
          <button
            type="button"
            onClick={() => onComplete('skipped')}
            className="w-full py-3 text-sm text-faint"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
