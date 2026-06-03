import { useMemo } from 'react'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/layout/Shell'
import { ProgressRing } from '../components/ui/ProgressRing'
import { computeConsistencyStats } from '../lib/consistency'
import { emptyDayLog, getBlocksForDate, getRecentDateKeys, parseDateKey } from '../lib/dates'
import {
  computeHabitStreak,
  habitAutoTrackHint,
  isHabitComplete,
} from '../lib/habitTracking'
import { CATEGORY_COLORS } from '../types'
import { useStore } from '../store/useStore'

export function HabitsPage() {
  const { state, todayKey, todayLog, toggleRecovery, toggleOutage } = useStore()
  const now = new Date()

  const todayBlocks = useMemo(() => getBlocksForDate(state.timeBlocks, now), [state.timeBlocks])
  const stats = computeConsistencyStats(
    state.days,
    todayBlocks.length,
    state.habits.length,
    todayKey,
    state.settings.gentleStreakSince,
  )
  const recentKeys = getRecentDateKeys(14, now)

  const blocksForKey = (key: string) =>
    getBlocksForDate(state.timeBlocks, parseDateKey(key))

  const habitHistory = (habitId: string) => {
    const habit = state.habits.find((h) => h.id === habitId)
    if (!habit) return []
    return recentKeys.map((key) => {
      const log = state.days[key] ?? emptyDayLog(key)
      return {
        key,
        done: isHabitComplete(habit, log, blocksForKey(key)),
        recovery: log.isRecoveryDay,
      }
    })
  }

  return (
    <div>
      <PageHeader title="Habits" />

      <div className="space-y-4 px-4 py-4">
        <Card className="flex items-center justify-around py-4">
          <ProgressRing value={stats.score7} label="7-day" color="#3dd68c" />
          <div className="text-center">
            <div className="text-4xl font-bold text-accent">{stats.gentleStreak}</div>
            <div className="text-xs text-subtle">day streak</div>
            <div className="mt-1 text-[11px] text-faint">{stats.graceDaysAvailable} grace days/week</div>
          </div>
          <ProgressRing value={stats.score30} label="30-day" color="#6ea8fe" />
        </Card>

        <p className="text-center text-sm text-subtle">{stats.message}</p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleRecovery(todayKey)}
            className={`flex-1 rounded-2xl border py-3 text-sm font-medium transition-all ${todayLog.isRecoveryDay ? 'border-[#7c9cbf] bg-[#7c9cbf]/15' : 'border-border bg-inset'}`}
          >
            🛏️ Recovery day
          </button>
          <button
            type="button"
            onClick={() => toggleOutage(todayKey, 'power')}
            className={`rounded-2xl border px-4 py-3 text-sm ${todayLog.powerOutage ? 'border-red-400/40 bg-red-400/10' : 'border-border'}`}
          >
            ⚡
          </button>
          <button
            type="button"
            onClick={() => toggleOutage(todayKey, 'internet')}
            className={`rounded-2xl border px-4 py-3 text-sm ${todayLog.internetOutage ? 'border-red-400/40 bg-red-400/10' : 'border-border'}`}
          >
            📶
          </button>
        </div>

        <div className="space-y-3">
          {state.habits.length === 0 && (
            <Card>
              <p className="text-center text-sm text-subtle">
                No habits yet. Refresh the page or reset app data in Insights if this looks wrong.
              </p>
            </Card>
          )}
          {state.habits.map((habit) => {
            const done = isHabitComplete(habit, todayLog, todayBlocks)
            const history = habitHistory(habit.id)
            const streak = computeHabitStreak(state.days, habit, blocksForKey, todayKey)

            return (
              <Card key={habit.id} glow={done ? CATEGORY_COLORS[habit.category] : undefined}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-[2rem] leading-none"
                    style={{
                      background: done ? `${CATEGORY_COLORS[habit.category]}25` : 'rgba(255,255,255,0.04)',
                    }}
                    aria-hidden
                  >
                    {habit.emoji || '✓'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{habit.name}</div>
                    <div className="text-xs text-subtle">
                      {streak} day streak · {done ? 'Done today' : 'In progress'}
                    </div>
                    <div className="mt-0.5 text-[11px] text-faint">{habitAutoTrackHint(habit)}</div>
                  </div>
                  <div
                    className="size-7 rounded-full border-2 transition-all"
                    style={{
                      borderColor: done ? CATEGORY_COLORS[habit.category] : 'rgba(255,255,255,0.15)',
                      background: done ? CATEGORY_COLORS[habit.category] : 'transparent',
                    }}
                  />
                </div>

                <div className="mt-3 flex gap-1.5">
                  {history.map((d) => (
                    <div
                      key={d.key}
                      title={d.key}
                      className="h-3.5 min-w-[6px] flex-1 rounded-full transition-all"
                      style={{
                        background: d.done
                          ? CATEGORY_COLORS[habit.category]
                          : d.recovery
                            ? '#7c9cbf'
                            : 'rgba(255,255,255,0.06)',
                      }}
                    />
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
