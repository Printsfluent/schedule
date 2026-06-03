import { useEffect, useMemo, useState, useCallback } from 'react'
import { PageHeader } from '../components/layout/Shell'
import { FlexibleDurationField, FlexibleTimeField } from '../components/PlanTimeControls'
import { TimelineDayView } from '../components/TimelineDayView'
import {
  defaultNewBlockForDay,
  formatDateKey,
  formatDuration,
  formatTime,
  getBlocksForDate,
  parseDateKey,
  blockScheduleLabel,
  isOneOffBlock,
  recurringLabel,
} from '../lib/dates'
import {
  cascadeBlocksForDate,
  findPriorNightSleepBlock,
  getRawBlocksForDate,
  previousCalendarDate,
  sleepDurationForPriorNightWake,
} from '../lib/blockCascade'
import { createId } from '../lib/id'
import { buildPlanDisplayEntries, getDailyPlan, syncPlanItemsForBlock } from '../lib/dailyPlan'
import {
  clampSleepDuration,
  formatSleepWakeHint,
  isSleepBlock,
} from '../lib/sleepSchedule'
import { burnoutWarning, scheduledMinutesForDay } from '../lib/burnout'
import { CATEGORY_COLORS, CATEGORY_LABELS, type ActivityCategory, type Recurring, type TimeBlock } from '../types'
import { useStore } from '../store/useStore'

export function SchedulePage() {
  const {
    state,
    todayKey,
    getLog,
    toggleBlockComplete,
    updateTimeBlock,
    addTimeBlock,
    removeTimeBlock,
    setPlanDate,
    setPlanFocus,
    updateDay,
  } = useStore()
  const selectedDate = useMemo(() => parseDateKey(state.planDateKey), [state.planDateKey])
  const [editing, setEditing] = useState<TimeBlock | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const dateKey = state.planDateKey
  const dayLog = getLog(dateKey)
  const focusBlockId = state.planFocusBlockId

  const dayBlocks = useMemo(
    () => getBlocksForDate(state.timeBlocks, selectedDate),
    [state.timeBlocks, selectedDate],
  )
  const rawDayBlocks = useMemo(
    () => getRawBlocksForDate(state.timeBlocks, selectedDate),
    [state.timeBlocks, selectedDate],
  )
  const planEntries = useMemo(
    () => buildPlanDisplayEntries(dayLog, dayBlocks),
    [dayLog, dayBlocks],
  )
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  const hasPlan = getDailyPlan(dayLog).length > 0
  const burnout = burnoutWarning(scheduledMinutesForDay(dayLog, dayBlocks))

  const shiftDay = (n: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + n)
    setPlanDate(formatDateKey(d))
  }

  const selectBlock = (block: TimeBlock) => {
    setPlanFocus(dateKey, block.id)
  }

  /** Swap list order (stored sort keys); displayed times re-chain after. */
  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = rawDayBlocks.findIndex((b) => b.id === id)
    const swapIdx = idx + dir
    if (idx < 0 || swapIdx < 0 || swapIdx >= rawDayBlocks.length) return
    const current = rawDayBlocks[idx]
    const neighbor = rawDayBlocks[swapIdx]
    updateTimeBlock(current.id, { startMinutes: neighbor.startMinutes }, dateKey)
    updateTimeBlock(neighbor.id, { startMinutes: current.startMinutes }, dateKey)
  }

  const swapBlockTimes = (idA: string, idB: string) => {
    const a = rawDayBlocks.find((b) => b.id === idA)
    const b = rawDayBlocks.find((b) => b.id === idB)
    if (!a || !b) return
    updateTimeBlock(a.id, { startMinutes: b.startMinutes }, dateKey)
    updateTimeBlock(b.id, { startMinutes: a.startMinutes }, dateKey)
  }

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    swapBlockTimes(dragId, targetId)
    setDragId(null)
  }

  const saveEdit = () => {
    if (!editing) return
    applyBlockEdit(editing)
    setEditing(null)
  }

  const applyBlockEdit = useCallback(
    (block: TimeBlock) => {
      const normalized = isSleepBlock(block)
        ? { ...block, durationMinutes: clampSleepDuration(block.durationMinutes) }
        : block
      let simulated = state.timeBlocks.map((b) =>
        b.id === normalized.id ? { ...b, ...normalized } : b,
      )
      const cascaded = cascadeBlocksForDate(simulated, selectedDate).find(
        (b) => b.id === normalized.id,
      )
      updateTimeBlock(normalized.id, normalized, dateKey)
      const plan = dayLog.dailyPlan ?? []
      if (plan.some((item) => item.kind === 'block' && item.blockId === block.id)) {
        updateDay(dateKey, {
          dailyPlan: syncPlanItemsForBlock(plan, normalized.id, {
            label: normalized.label,
            category: normalized.category,
            startMinutes: cascaded?.startMinutes ?? normalized.startMinutes,
            durationMinutes: cascaded?.durationMinutes ?? normalized.durationMinutes,
          }),
        })
      }
    },
    [dateKey, dayLog.dailyPlan, selectedDate, state.timeBlocks, updateDay, updateTimeBlock],
  )

  const patchEditing = (patch: Partial<TimeBlock>) => {
    if (!editing) return
    const next = { ...editing, ...patch }
    setEditing(next)
    if (patch.startMinutes != null) {
      const cascaded = getBlocksForDate(state.timeBlocks, selectedDate)
      const idx = cascaded.findIndex((b) => b.id === editing.id)
      if (idx === 0) {
        const newSleepDur = sleepDurationForPriorNightWake(
          state.timeBlocks,
          selectedDate,
          patch.startMinutes,
        )
        if (newSleepDur != null) {
          const priorSleep = findPriorNightSleepBlock(state.timeBlocks, selectedDate)
          if (priorSleep) {
            const prevKey = formatDateKey(previousCalendarDate(selectedDate))
            updateTimeBlock(priorSleep.id, { durationMinutes: newSleepDur }, prevKey)
          }
        }
      } else if (idx > 0) {
        const prev = cascaded[idx - 1]
        const newDur = patch.startMinutes - prev.startMinutes
        if (newDur >= 5) {
          let simulated = state.timeBlocks.map((b) =>
            b.id === prev.id ? { ...b, durationMinutes: newDur } : b,
          )
          const refreshed = cascadeBlocksForDate(simulated, selectedDate).find(
            (b) => b.id === editing.id,
          )
          updateTimeBlock(prev.id, { durationMinutes: newDur }, dateKey)
          setEditing({
            ...next,
            startMinutes: refreshed?.startMinutes ?? patch.startMinutes,
          })
          return
        }
      }
    }
    applyBlockEdit(next)
  }

  const handleDeleteBlock = (block: TimeBlock) => {
    const scope = isOneOffBlock(block)
      ? `only ${blockScheduleLabel(block)}`
      : 'your recurring schedule'
    const ok = window.confirm(`Delete "${block.label}" from ${scope}?`)
    if (!ok) return
    removeTimeBlock(block.id)
    if (editing?.id === block.id) setEditing(null)
  }

  const handleAddBlock = () => {
    const defaults = defaultNewBlockForDay(state.timeBlocks, selectedDate)
    const id = createId()
    addTimeBlock(defaults, id, dateKey)
    setEditing({ ...defaults, id })
  }

  useEffect(() => {
    if (!editing) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [editing])

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

        {hasPlan && (
          <TimelineDayView entries={planEntries} nowMinutes={dateKey === todayKey ? nowMinutes : 12 * 60} />
        )}

        {burnout && (
          <div className="rounded-2xl border border-[#e76f6f]/40 bg-[#e76f6f]/10 px-4 py-3 text-sm text-[#e76f6f]">
            {burnout.message}
          </div>
        )}

        <p className="text-xs text-faint">
          Move blocks up or down to swap their start times · drag onto another block to swap
        </p>

        <div className="space-y-2">
          {dayBlocks.map((block, i) => {
            const done = dayLog.completedBlockIds.includes(block.id)
            const focused = focusBlockId === block.id
            return (
              <div
                key={block.id}
                draggable
                onDragStart={() => setDragId(block.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(block.id)}
                className="animate-fade-in rounded-3xl border transition-all"
                style={{
                  background: `linear-gradient(135deg, ${CATEGORY_COLORS[block.category]}${focused ? '22' : '12'}, transparent)`,
                  borderColor: focused ? CATEGORY_COLORS[block.category] : `${CATEGORY_COLORS[block.category]}30`,
                  boxShadow: focused ? `0 0 0 2px ${CATEGORY_COLORS[block.category]}40` : undefined,
                }}
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => moveBlock(block.id, -1)}
                      disabled={i === 0}
                      aria-label={`Move ${block.label} earlier`}
                      className="flex size-9 items-center justify-center rounded-xl bg-inset-2 text-sm text-muted transition-opacity disabled:opacity-20 active:scale-95"
                    >
                      ↑
                    </button>
                    <span className="cursor-grab select-none px-1 py-1 text-faint" title="Drag to swap with another block">
                      ⠿
                    </span>
                    <button
                      type="button"
                      onClick={() => moveBlock(block.id, 1)}
                      disabled={i === dayBlocks.length - 1}
                      aria-label={`Move ${block.label} later`}
                      className="flex size-9 items-center justify-center rounded-xl bg-inset-2 text-sm text-muted transition-opacity disabled:opacity-20 active:scale-95"
                    >
                      ↓
                    </button>
                  </div>

                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => selectBlock(block)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                        style={{ background: `${CATEGORY_COLORS[block.category]}25`, color: CATEGORY_COLORS[block.category] }}
                      >
                        {CATEGORY_LABELS[block.category]}
                      </span>
                      <span className="text-xs text-faint">{blockScheduleLabel(block)}</span>
                      {focused && <span className="text-[10px] text-accent">· in Upcoming</span>}
                    </div>
                    <div className="mt-1 text-[15px] font-semibold">{block.label}</div>
                    <div className="mt-0.5 text-xs text-subtle">
                      {formatTime(block.startMinutes)} · {formatDuration(block.durationMinutes)}
                      {isSleepBlock(block) && (
                        <span className="text-faint"> · {formatSleepWakeHint(block.startMinutes)}</span>
                      )}
                    </div>
                  </button>

                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing({ ...block })}
                      className="rounded-lg bg-inset-2 px-2 py-1 text-[10px] text-subtle"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(block)}
                      className="rounded-lg bg-red-500/15 px-2 py-1 text-[10px] text-red-400"
                    >
                      Del
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBlockComplete(dateKey, block.id)}
                      className="size-7 rounded-full border-2 transition-all"
                      style={{
                        borderColor: done ? CATEGORY_COLORS[block.category] : 'rgba(255,255,255,0.15)',
                        background: done ? CATEGORY_COLORS[block.category] : 'transparent',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={handleAddBlock}
          className="w-full rounded-3xl border border-dashed border-border py-4 text-sm text-subtle"
        >
          + Add time block
        </button>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setEditing(null)}
        >
          <div
            className="flex max-h-[92dvh] flex-col rounded-t-3xl bg-panel animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-border px-5 pb-3 pt-5">
              <h3 className="text-lg font-bold">Edit block</h3>
              <p className="mt-1 text-xs text-faint">Changes apply immediately · scroll for all fields</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 touch-pan-y">
              <div className="space-y-3">
                <label className="block text-xs text-subtle">
                  Label
                  <input
                    value={editing.label}
                    onChange={(e) => patchEditing({ label: e.target.value })}
                    className="mt-1 w-full rounded-xl bg-inset px-3 py-2.5 text-sm outline-none"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs text-subtle">
                    Start
                    <FlexibleTimeField
                      minutes={editing.startMinutes}
                      onChange={(startMinutes) => patchEditing({ startMinutes })}
                      className="mt-1 w-full rounded-xl bg-inset px-3 py-2.5 text-sm outline-none"
                    />
                    <span className="mt-1 block text-[10px] text-faint">
                      Any format: 9:30 AM · 2 pm · 14:30 · 930 · 9
                    </span>
                    {editing &&
                      getBlocksForDate(state.timeBlocks, selectedDate)[0]?.id === editing.id &&
                      findPriorNightSleepBlock(state.timeBlocks, selectedDate) && (
                        <span className="mt-1 block text-[10px] text-faint">
                          Earlier wake shortens last night&apos;s sleep (4–8h).
                        </span>
                      )}
                  </label>
                  <label className="block text-xs text-subtle">
                    Duration (min)
                    {isSleepBlock(editing) ? (
                      <p className="mt-1 rounded-xl bg-inset px-3 py-2.5 text-sm text-subtle">
                        {formatDuration(editing.durationMinutes)} (4–8h) ·{' '}
                        {formatSleepWakeHint(editing.startMinutes, editing.durationMinutes)}
                      </p>
                    ) : (
                      <>
                        <FlexibleDurationField
                          minutes={editing.durationMinutes}
                          onChange={(durationMinutes) => patchEditing({ durationMinutes })}
                          className="mt-1 w-full rounded-xl bg-inset px-3 py-2.5 text-sm outline-none"
                        />
                        <span className="mt-1 block text-[10px] text-faint">
                          Any minutes: 45 · 90 · 120 · 1h30
                        </span>
                      </>
                    )}
                  </label>
                </div>
                <label className="block text-xs text-subtle">
                  Category
                  <select
                    value={editing.category}
                    onChange={(e) => patchEditing({ category: e.target.value as ActivityCategory })}
                    className="mt-1 w-full rounded-xl bg-inset px-3 py-2.5 text-sm outline-none"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-subtle">
                  Recurring
                  {isOneOffBlock(editing) ? (
                    <p className="mt-1 rounded-xl bg-inset px-3 py-2.5 text-sm text-subtle">
                      {blockScheduleLabel(editing)} — added for this day only
                    </p>
                  ) : (
                    <select
                      value={editing.recurring}
                      onChange={(e) => patchEditing({ recurring: e.target.value as Recurring })}
                      className="mt-1 w-full rounded-xl bg-inset px-3 py-2.5 text-sm outline-none"
                    >
                      {(['daily', 'weekday', 'weekend', 'saturday', 'sunday'] as Recurring[]).map((r) => (
                        <option key={r} value={r}>{recurringLabel(r)}</option>
                      ))}
                    </select>
                  )}
                </label>
                <label className="flex items-center justify-between rounded-xl bg-inset px-3 py-2.5">
                  <span className="text-sm text-muted">Enabled</span>
                  <input
                    type="checkbox"
                    checked={editing.enabled}
                    onChange={(e) => patchEditing({ enabled: e.target.checked })}
                    className="size-4 accent-[#3dd68c]"
                  />
                </label>
              </div>
            </div>

            <div className="shrink-0 border-t border-border px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(editing)}
                  className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-400"
                >
                  Del
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-2xl bg-inset-2 py-3 text-sm"
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="flex-1 rounded-2xl bg-accent py-3 text-sm font-semibold text-accent-text"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
