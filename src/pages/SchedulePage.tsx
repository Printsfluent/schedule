import { useMemo, useState } from 'react'
import { MorningPlanOverlay } from '../components/MorningPlanOverlay'
import { PageHeader } from '../components/layout/Shell'
import { PlanDayEntriesList } from '../components/PlanDayEntriesList'
import { TimelineDayView } from '../components/TimelineDayView'
import { formatDateKey, getBlocksForDate, parseDateKey } from '../lib/dates'
import {
  buildPlanDisplayEntries,
  getDailyPlan,
  toggleCustomPlanItemDone,
} from '../lib/dailyPlan'
import { burnoutWarning, scheduledMinutesForDay } from '../lib/burnout'
import { detectPlanConflicts, formatConflictMessage } from '../lib/scheduleConflicts'
import { useStore } from '../store/useStore'

export function SchedulePage() {
  const { state, todayKey, getLog, toggleBlockComplete, setPlanDate, setPlanFocus, updateDay } =
    useStore()
  const selectedDate = useMemo(() => parseDateKey(state.planDateKey), [state.planDateKey])
  const [editingPlan, setEditingPlan] = useState(false)
  const dateKey = state.planDateKey
  const dayLog = getLog(dateKey)
  const dailyPlan = getDailyPlan(dayLog)

  const dayBlocks = useMemo(
    () => getBlocksForDate(state.timeBlocks, selectedDate),
    [state.timeBlocks, selectedDate],
  )
  const planEntries = useMemo(
    () => buildPlanDisplayEntries(dayLog, dayBlocks),
    [dayLog, dayBlocks],
  )
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  const hasDaySchedule = planEntries.length > 0
  const burnout = burnoutWarning(scheduledMinutesForDay(dayLog, dayBlocks))
  const conflicts = useMemo(
    () => detectPlanConflicts(dayLog, state.timeBlocks, selectedDate),
    [dayLog, state.timeBlocks, selectedDate],
  )

  const shiftDay = (n: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + n)
    setPlanDate(formatDateKey(d))
  }

  return (
    <div>
      <PageHeader title="Schedule" />

      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => shiftDay(-1)} className="rounded-xl bg-inset px-3 py-2 text-sm">←</button>
          <button
            type="button"
            onClick={() => setPlanDate(todayKey)}
            className="text-sm font-medium text-accent"
          >
            {dateKey === todayKey ? 'Today' : selectedDate.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
          </button>
          <button type="button" onClick={() => shiftDay(1)} className="rounded-xl bg-inset px-3 py-2 text-sm">→</button>
        </div>

        {hasDaySchedule && (
          <TimelineDayView entries={planEntries} nowMinutes={dateKey === todayKey ? nowMinutes : 12 * 60} />
        )}

        {conflicts.length > 0 && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
            <p className="font-medium">Plan overlap</p>
            <ul className="mt-1 space-y-1 text-xs">
              {conflicts.slice(0, 3).map((c, i) => (
                <li key={i}>{formatConflictMessage(c)}</li>
              ))}
            </ul>
          </div>
        )}

        {burnout && (
          <div className="rounded-2xl border border-[#e76f6f]/40 bg-[#e76f6f]/10 px-4 py-3 text-sm text-[#e76f6f]">
            {burnout.message}
          </div>
        )}

        {hasDaySchedule ? (
          <>
            <p className="text-xs text-faint">Your plan for this day · tap to mark done</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Daily plan</p>
              <button
                type="button"
                onClick={() => setEditingPlan(true)}
                className="text-xs font-medium text-accent"
              >
                Edit plan
              </button>
            </div>
            <PlanDayEntriesList
              entries={planEntries}
              nowMinutes={dateKey === todayKey ? nowMinutes : undefined}
              isToday={dateKey === todayKey}
              onCompleteBlock={(blockId, _label, _done) => toggleBlockComplete(dateKey, blockId)}
              onCompleteCustom={(itemId, _label, _category, _done) => {
                updateDay(dateKey, {
                  dailyPlan: toggleCustomPlanItemDone(dailyPlan, itemId),
                })
              }}
            />
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-subtle">No plan for this day yet.</p>
            <p className="mt-1 text-xs text-faint">Pick a sample when you plan tonight, or build one now.</p>
            <button
              type="button"
              onClick={() => setEditingPlan(true)}
              className="mt-4 rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-text"
            >
              Build plan
            </button>
          </div>
        )}
      </div>

      {editingPlan && (
        <MorningPlanOverlay
          key={`schedule-plan-${dateKey}`}
          variant={dateKey === todayKey ? 'today' : 'tomorrow'}
          planDate={selectedDate}
          initialPlan={dailyPlan}
          realisticMode={state.settings.realisticMode}
          onContinue={(items) => {
            updateDay(dateKey, { dailyPlan: items, morningPlanDone: true })
            setEditingPlan(false)
            setPlanFocus(dateKey, null)
          }}
        />
      )}
    </div>
  )
}
