import { useEffect, useMemo, useState, useCallback } from 'react'
import { MorningPlanOverlay } from '../components/MorningPlanOverlay'
import { PageHeader } from '../components/layout/Shell'
import { DurationAdjustInput, TimeAdjustInput } from '../components/PlanTimeControls'
import { PlanDayEntriesList } from '../components/PlanDayEntriesList'
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
import { formatSleepBlockTimes, getRawBlocksForDate } from '../lib/blockCascade'
import { createId } from '../lib/id'
import {
  buildPlanDisplayEntries,
  buildRecurringPlanItems,
  getDailyPlan,
  hasUserPickedPlan,
  syncPlanItemsForBlock,
  toggleCustomPlanItemDone,
} from '../lib/dailyPlan'
import {
  isSleepBlock,
} from '../lib/sleepSchedule'
import { burnoutWarning, scheduledMinutesForDay } from '../lib/burnout'
import { detectPlanConflicts, formatConflictMessage } from '../lib/scheduleConflicts'
import { CATEGORY_COLORS, CATEGORY_LABELS, type ActivityCategory, type Recurring, type TimeBlock } from '../types'
import { getAppState, useStore } from '../store/useStore'

export function SchedulePage() {
  const {
    state,
    todayKey,
    getLog,
    toggleBlockComplete,
    updateTimeBlock,
    swapDayBlockStarts,
    addTimeBlock,
    removeTimeBlock,
    setPlanDate,
    setPlanFocus,
    updateDay,
  } = useStore()
  const selectedDate = useMemo(() => parseDateKey(state.planDateKey), [state.planDateKey])
  const [editing, setEditing] = useState<TimeBlock | null>(null)
  const [editingPlan, setEditingPlan] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const dateKey = state.planDateKey
  const dayLog = getLog(dateKey)
  const dailyPlan = getDailyPlan(dayLog)
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
  const planIsPicked = hasUserPickedPlan(dayLog)
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

  const selectBlock = (block: TimeBlock) => {
    setPlanFocus(dateKey, block.id)
  }

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = rawDayBlocks.findIndex((b) => b.id === id)
    const swapIdx = idx + dir
    if (idx < 0 || swapIdx < 0 || swapIdx >= rawDayBlocks.length) return
    const current = rawDayBlocks[idx]
    const neighbor = rawDayBlocks[swapIdx]
    swapDayBlockStarts(dateKey, current.id, neighbor.id)
  }

  const swapBlockTimes = (idA: string, idB: string) => {
    swapDayBlockStarts(dateKey, idA, idB)
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

  const syncPlanForBlock = useCallback(
    (block: TimeBlock) => {
      const { days } = getAppState()
      const plan = days[dateKey]?.dailyPlan ?? []
      if (!plan.some((item) => item.kind === 'block' && item.blockId === block.id)) return
      updateDay(dateKey, {
        dailyPlan: syncPlanItemsForBlock(plan, block.id, {
          label: block.label,
          category: block.category,
        }),
      })
    },
    [dateKey, selectedDate, updateDay],
  )

  const applyBlockEdit = useCallback(
    (block: TimeBlock, patch?: Partial<TimeBlock>) => {
      const merged = patch ? { ...block, ...patch } : block
      updateTimeBlock(block.id, patch ?? block, dateKey)
      syncPlanForBlock(merged)
    },
    [dateKey, syncPlanForBlock, updateTimeBlock],
  )

  const patchEditing = (patch: Partial<TimeBlock>) => {
    if (!editing) return
    applyBlockEdit(editing, patch)
  }

  useEffect(() => {
    if (!editing) return
    const fresh = dayBlocks.find((b) => b.id === editing.id)
    if (!fresh) return
    if (
      fresh.startMinutes === editing.startMinutes &&
      fresh.durationMinutes === editing.durationMinutes
    ) {
      return
    }
    setEditing((prev) =>
      prev && prev.id === fresh.id
        ? { ...prev, startMinutes: fresh.startMinutes, durationMinutes: fresh.durationMinutes }
        : prev,
    )
  }, [dayBlocks, editing])

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
    addTimeBlock(defaults, id)
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

        {hasDaySchedule && (
          <>
            <p className="text-xs text-faint">
              {planIsPicked
                ? 'Picked last night · tap to mark done'
                : 'Weekly schedule · plan tonight to customize tomorrow'}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {planIsPicked ? 'Your picked plan' : 'Today from weekly schedule'}
              </p>
              {planIsPicked && (
                <button
                  type="button"
                  onClick={() => setEditingPlan(true)}
                  className="text-xs font-medium text-accent"
                >
                  Edit plan
                </button>
              )}
            </div>
            <PlanDayEntriesList
              entries={planEntries}
              nowMinutes={dateKey === todayKey ? nowMinutes : undefined}
              isToday={dateKey === todayKey}
              onCompleteBlock={(blockId, _label, _done) => toggleBlockComplete(dateKey, blockId)}
              onCompleteCustom={
                planIsPicked
                  ? (itemId, _label, _category, _done) => {
                      updateDay(dateKey, {
                        dailyPlan: toggleCustomPlanItemDone(dailyPlan, itemId),
                      })
                    }
                  : () => {}
              }
            />
          </>
        )}

        {!planIsPicked && (
        <>
        <p className="text-xs text-faint">
          Editing start or duration updates the next blocks automatically · use arrows in the editor
        </p>
        <p className="text-sm font-semibold">Weekly schedule blocks</p>
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
                      {isSleepBlock(block)
                        ? formatSleepBlockTimes(block)
                        : `${formatTime(block.startMinutes)} · ${formatDuration(block.durationMinutes)}`}
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
        </>
        )}
      </div>

      {editingPlan && (
        <MorningPlanOverlay
          key={`schedule-plan-${dateKey}`}
          variant="tomorrow"
          planDate={selectedDate}
          blocks={dayBlocks}
          initialPlan={dailyPlan.length > 0 ? dailyPlan : buildRecurringPlanItems(dayBlocks)}
          scheduleMode={state.settings.scheduleMode}
          realisticMode={state.settings.realisticMode}
          onContinue={(items) => {
            updateDay(dateKey, { dailyPlan: items, morningPlanDone: true })
            setEditingPlan(false)
            const firstBlock = items.find((item) => item.kind === 'block')
            if (firstBlock?.kind === 'block') setPlanFocus(dateKey, firstBlock.blockId ?? null)
          }}
        />
      )}

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
                <div className="space-y-3">
                  <label className="block text-xs text-subtle">
                    Start time
                    <div className="mt-1">
                      <TimeAdjustInput
                        minutes={editing.startMinutes}
                        onChange={(startMinutes) => patchEditing({ startMinutes })}
                        step={5}
                      />
                    </div>
                    <span className="mt-1 block text-[10px] text-faint">
                      Type a time or use arrows · later blocks follow automatically
                    </span>
                  </label>
                  <label className="block text-xs text-subtle">
                    Duration
                    <div className="mt-1">
                      <DurationAdjustInput
                        minutes={editing.durationMinutes}
                        onChange={(durationMinutes) => patchEditing({ durationMinutes })}
                        step={isSleepBlock(editing) ? 15 : 5}
                        max={isSleepBlock(editing) ? 8 * 60 : 12 * 60}
                      />
                    </div>
                    <span className="mt-1 block text-[10px] text-faint">
                      Minutes or hours (e.g. 90 · 1h30) · next block shifts when this ends
                      {isSleepBlock(editing) && (
                        <span className="block">{formatSleepBlockTimes(editing)}</span>
                      )}
                    </span>
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
