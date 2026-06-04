import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { CompletionCelebration } from '../components/CompletionCelebration'
import { TimelineDayView } from '../components/TimelineDayView'
import { Card, SectionTitle } from '../components/ui/Card'
import { MoodSelector } from '../components/ui/MoodSelector'
import { ProgressRing } from '../components/ui/ProgressRing'
import { MOTIVATION_QUOTES } from '../data/defaults'
import {
  getMoodMessage,
  getOutageMessage,
  messageCount,
  MOOD_CONFIG,
  nextMessageIndex,
  OUTAGE_MESSAGES,
  randomMessageIndex,
} from '../data/moods'
import { computeConsistencyStats, computeDayProgress } from '../lib/consistency'
import { burnoutWarning, scheduledMinutesForDay } from '../lib/burnout'
import {
  buildPlanDisplayEntries,
  formatPlanItemMeta,
  getDailyPlan,
  getHomePlanDisplayEntries,
  planSummarySubtitle,
  toggleCustomPlanItemDone,
} from '../lib/dailyPlan'
import {
  formatDuration,
  formatTime,
  getBlocksForDate,
  getCurrentBlock,
  getPlanUpcomingBlocks,
  parseDateKey,
  UPCOMING_LIMIT,
} from '../lib/dates'
import type { ActivityCategory, Mood } from '../types'
import { CATEGORY_COLORS } from '../types'
import { useStore } from '../store/useStore'
import { xpForCategory } from '../lib/gamification'

export function DashboardPage() {
  const {
    state,
    todayKey,
    todayLog,
    getLog,
    toggleBlockComplete,
    toggleTaskToday,
    addTask,
    updateDay,
    awardXp,
  } = useStore()
  const [taskInput, setTaskInput] = useState('')
  const [clockTick, setClockTick] = useState(0)
  const [celebrate, setCelebrate] = useState<{ show: boolean; label?: string }>({ show: false })
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const planViewKey = state.planDateKey
  const planViewDate = useMemo(() => parseDateKey(planViewKey), [planViewKey])
  const planIsToday = planViewKey === todayKey

  const todayBlocks = useMemo(
    () => getBlocksForDate(state.timeBlocks, now),
    [state.timeBlocks, todayKey],
  )
  const currentBlock = getCurrentBlock(state.timeBlocks, now)
  const planLog = getLog(planViewKey)
  const planDayBlocks = useMemo(
    () => getBlocksForDate(state.timeBlocks, planViewDate),
    [state.timeBlocks, planViewDate],
  )
  const dailyPlan = getDailyPlan(planLog)
  const planEntries = useMemo(
    () => buildPlanDisplayEntries(planLog, planDayBlocks),
    [planLog, planDayBlocks],
  )
  const visiblePlanEntries = useMemo(
    () =>
      getHomePlanDisplayEntries(planEntries, {
        limit: UPCOMING_LIMIT,
        isToday: planIsToday,
        nowMinutes: now.getHours() * 60 + now.getMinutes(),
      }),
    [planEntries, planIsToday, clockTick],
  )
  const upcoming = useMemo(
    () =>
      dailyPlan.length > 0
        ? []
        : getPlanUpcomingBlocks(
            state.timeBlocks,
            planViewDate,
            state.planFocusBlockId,
            UPCOMING_LIMIT,
            new Date(),
            planLog.completedBlockIds,
          ),
    [
      state.timeBlocks,
      state.planFocusBlockId,
      planLog.completedBlockIds,
      dailyPlan.length,
      planViewDate,
      clockTick,
    ],
  )
  const focusedBlock = state.planFocusBlockId
    ? state.timeBlocks.find((b) => b.id === state.planFocusBlockId)
    : null
  const openTasks = state.tasks.filter((t) => !t.done)
  const activeTask = openTasks[0]

  const progress = computeDayProgress(todayLog, state.timeBlocks, now)

  const stats = computeConsistencyStats(
    state.days,
    todayBlocks.length,
    state.habits.length,
    todayKey,
    state.settings.gentleStreakSince,
  )

  const hasOutage = todayLog.powerOutage || todayLog.internetOutage
  const burnout = useMemo(
    () => burnoutWarning(scheduledMinutesForDay(todayLog, todayBlocks)),
    [todayLog, todayBlocks],
  )

  const showAdaptiveBanner =
    state.settings.adaptiveScheduling && (todayLog.wakeDelayMinutes ?? 0) > 0

  const handleCompleteBlock = useCallback(
    (dateKey: string, blockId: string, label: string, wasDone: boolean) => {
      if (!wasDone) {
        setCelebrate({ show: true, label })
      }
      toggleBlockComplete(dateKey, blockId)
    },
    [toggleBlockComplete],
  )

  const handleCompleteCustom = useCallback(
    (itemId: string, label: string, category: ActivityCategory, wasDone: boolean) => {
      if (!wasDone) {
        setCelebrate({ show: true, label })
        awardXp(xpForCategory(category))
      }
      updateDay(planViewKey, {
        dailyPlan: toggleCustomPlanItemDone(dailyPlan, itemId),
      })
    },
    [awardXp, dailyPlan, planViewKey, updateDay],
  )

  const dismissCelebration = useCallback(() => setCelebrate({ show: false }), [])
  const messagePoolSize = useMemo(() => {
    if (hasOutage) return OUTAGE_MESSAGES.length
    if (todayLog.mood) return messageCount(todayLog.mood)
    return MOTIVATION_QUOTES.length
  }, [hasOutage, todayLog.mood])

  const messageIndex = todayLog.homeMessageIndex ?? 0

  const persistMessageIndex = useCallback(
    (index: number) => {
      const normalized =
        messagePoolSize > 0 ? ((index % messagePoolSize) + messagePoolSize) % messagePoolSize : 0
      if (todayLog.homeMessageIndex === normalized) return
      updateDay(todayKey, { homeMessageIndex: normalized })
    },
    [messagePoolSize, todayKey, todayLog.homeMessageIndex, updateDay],
  )

  useEffect(() => {
    if (todayLog.homeMessageIndex != null || messagePoolSize === 0) return
    updateDay(todayKey, { homeMessageIndex: randomMessageIndex(messagePoolSize) })
  }, [messagePoolSize, todayKey, todayLog.homeMessageIndex, updateDay])

  useEffect(() => {
    const interval = setInterval(() => setClockTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  const handleMoodSelect = (mood: Mood) => {
    updateDay(todayKey, {
      mood,
      homeMessageIndex: randomMessageIndex(messageCount(mood)),
    })
  }

  const cycleMessage = () => {
    persistMessageIndex(nextMessageIndex(messageIndex, messagePoolSize))
  }

  const displayMessage = (() => {
    if (hasOutage) {
      return { text: getOutageMessage(messageIndex), author: 'Rhythm', accent: MOOD_CONFIG.rough.color }
    }
    if (todayLog.mood) {
      return {
        text: getMoodMessage(todayLog.mood, messageIndex),
        author: 'Rhythm',
        accent: MOOD_CONFIG[todayLog.mood].color,
      }
    }
    const q = MOTIVATION_QUOTES[messageIndex % MOTIVATION_QUOTES.length]
    return { text: q.text, author: q.author, accent: undefined }
  })()

  const handleAddTask = () => {
    if (!taskInput.trim()) return
    addTask(taskInput.trim())
    setTaskInput('')
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <CompletionCelebration show={celebrate.show} label={celebrate.label} onDone={dismissCelebration} />

      <div className="animate-slide-up">
        <h1 className="text-[26px] font-bold tracking-tight">
          {currentBlock ? currentBlock.label : 'Your day'}
        </h1>
      </div>

      <Card glow="#3dd68c" className="flex items-center gap-4">
        <ProgressRing value={progress} color="#3dd68c" />
        <div className="flex-1">
          <div className="text-sm text-subtle">Today&apos;s progress</div>
          <div className="text-2xl font-bold">{progress}%</div>
          <div className="mt-1 text-xs text-faint">
            Gentle streak: {stats.gentleStreak} · 7-day: {stats.score7}%
          </div>
        </div>
      </Card>

      <Card
        glow={displayMessage.accent}
        className="transition-all duration-300 cursor-pointer active:scale-[0.99]"
        onClick={cycleMessage}
      >
        {todayLog.mood && (
          <p className="mb-2 text-xs font-medium" style={{ color: displayMessage.accent }}>
            {MOOD_CONFIG[todayLog.mood].emoji} Feeling {MOOD_CONFIG[todayLog.mood].label.toLowerCase()}
          </p>
        )}
        {hasOutage && (
          <p className="mb-2 text-xs font-medium text-[#e76f6f]">
            ⚡ Infrastructure rough today
          </p>
        )}
        <p className="text-[15px] leading-relaxed text-fg">&ldquo;{displayMessage.text}&rdquo;</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-faint">— {displayMessage.author}</p>
          <p className="text-[10px] text-faint">
            Tap for another · {(messageIndex % messagePoolSize) + 1}/{messagePoolSize}
          </p>
        </div>
      </Card>

      {activeTask && (
        <Card glow="#6ea8fe">
          <SectionTitle title="Active task" subtitle="Tap to complete" />
          <button
            type="button"
            onClick={() => toggleTaskToday(todayKey, activeTask.id)}
            className="flex w-full items-center gap-3 rounded-2xl bg-inset p-3 text-left"
          >
            <div className="size-5 rounded-full border-2 border-[#6ea8fe]" />
            <span className="text-[15px] font-medium">{activeTask.text}</span>
          </button>
        </Card>
      )}

      {showAdaptiveBanner && (
        <Card glow="#f4d35e">
          <p className="text-sm text-muted">
            Plan shifted — you&apos;re {formatDuration(todayLog.wakeDelayMinutes ?? 0)} late today.
            Wind-down and sleep stay protected.
          </p>
        </Card>
      )}

      {burnout && (
        <Card glow="#e76f6f">
          <p className="text-sm text-[#e76f6f]">{burnout.message}</p>
        </Card>
      )}

      {planEntries.length > 0 && (
        <Card>
          <SectionTitle
            title="Timeline"
            subtitle={planIsToday ? 'Your day at a glance' : `Plan for ${planViewDate.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}`}
          />
          <TimelineDayView
            entries={planEntries}
            nowMinutes={planIsToday ? nowMinutes : 12 * 60}
          />
        </Card>
      )}

      <Card>
        <SectionTitle title="Mood" subtitle="Adjusts what counts today" />
        <MoodSelector value={todayLog.mood} onChange={handleMoodSelect} compact />
      </Card>

      <Card>
        <SectionTitle
          title="Your plan"
          subtitle={
            dailyPlan.length > 0
              ? `Next ${UPCOMING_LIMIT} · ${planSummarySubtitle(dailyPlan, planViewKey, todayKey)}`
              : focusedBlock
                ? `Next ${UPCOMING_LIMIT} · from ${focusedBlock.label}`
                : `Next ${UPCOMING_LIMIT} · plan tonight after your last event`
          }
        />
        {visiblePlanEntries.length > 0 ? (
          <div className="space-y-2">
            {visiblePlanEntries.map((entry) => {
              if (entry.kind === 'block') {
                return (
                  <button
                    key={entry.planItemId}
                    type="button"
                    onClick={() =>
                      handleCompleteBlock(
                        planViewKey,
                        entry.block.id,
                        entry.block.label,
                        entry.done,
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98]"
                    style={{ background: `${CATEGORY_COLORS[entry.block.category]}12` }}
                  >
                    <div
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: CATEGORY_COLORS[entry.block.category] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{entry.block.label}</div>
                      <div className="text-xs text-faint">{formatPlanItemMeta(entry)}</div>
                    </div>
                    <div
                      className="size-5 shrink-0 rounded-full border-2 transition-all"
                      style={{
                        borderColor: entry.done ? CATEGORY_COLORS[entry.block.category] : 'rgba(255,255,255,0.15)',
                        background: entry.done ? CATEGORY_COLORS[entry.block.category] : 'transparent',
                      }}
                    />
                  </button>
                )
              }

              return (
                <button
                  key={entry.item.id}
                  type="button"
                  onClick={() =>
                    handleCompleteCustom(entry.item.id, entry.item.label, entry.item.category, entry.done)
                  }
                  className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98]"
                  style={{ background: `${CATEGORY_COLORS[entry.item.category]}12` }}
                >
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: CATEGORY_COLORS[entry.item.category] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{entry.item.label}</div>
                    <div className="text-xs text-faint">{formatPlanItemMeta(entry)}</div>
                  </div>
                  <div
                    className="size-5 shrink-0 rounded-full border-2 transition-all"
                    style={{
                      borderColor: entry.done ? CATEGORY_COLORS[entry.item.category] : 'rgba(255,255,255,0.15)',
                      background: entry.done ? CATEGORY_COLORS[entry.item.category] : 'transparent',
                    }}
                  />
                </button>
              )
            })}
          </div>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-subtle">
            {dailyPlan.length > 0 ? (
              'All done for now — nice work.'
            ) : (
              <>
                No blocks left.{' '}
                <Link to="/schedule" className="text-accent">
                  Pick one in Plan →
                </Link>
              </>
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((block) => {
              const isFocused = block.id === state.planFocusBlockId
              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() =>
                    handleCompleteBlock(
                      planViewKey,
                      block.id,
                      block.label,
                      planLog.completedBlockIds.includes(block.id),
                    )
                  }
                  className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98]"
                  style={{
                    background: isFocused ? `${CATEGORY_COLORS[block.category]}12` : 'rgba(255,255,255,0.03)',
                    boxShadow: isFocused ? `inset 0 0 0 1px ${CATEGORY_COLORS[block.category]}40` : undefined,
                  }}
                >
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: CATEGORY_COLORS[block.category] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{block.label}</div>
                    <div className="text-xs text-faint">
                      {formatTime(block.startMinutes)} · {formatDuration(block.durationMinutes)}
                    </div>
                  </div>
                  <div
                    className="size-5 shrink-0 rounded-full border-2 border-[rgba(255,255,255,0.15)]"
                  />
                </button>
              )
            })}
          </div>
        )}
        <Link
          to="/schedule"
          className="mt-3 block text-center text-xs text-accent/80"
        >
          Edit in Plan →
        </Link>
      </Card>

      <Card>
        <SectionTitle title="Quick tasks" />
        <div className="flex gap-2">
          <input
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add a task…"
            className="flex-1 rounded-2xl border border-border bg-inset px-4 py-3 text-sm outline-none focus:border-accent/50"
          />
          <button
            type="button"
            onClick={handleAddTask}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-text"
          >
            Add
          </button>
        </div>
        <div className="mt-3 space-y-1">
          {openTasks.slice(0, 5).map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => toggleTaskToday(todayKey, task.id)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-muted"
            >
              <div className="size-4 rounded border border-border" />
              {task.text}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
