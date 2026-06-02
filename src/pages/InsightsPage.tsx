import { useMemo, useState } from 'react'
import { AlarmSyncPanel } from '../components/AlarmSyncPanel'
import { ResetAppDataPanel } from '../components/ResetAppDataPanel'
import { RoutineSettingsPanel } from '../components/RoutineSettingsPanel'
import { AccountPanel } from '../components/AccountPanel'
import { ShareRoutinePanel } from '../components/ShareRoutinePanel'
import { ThemeSettingsPanel } from '../components/ThemeSettingsPanel'
import { BarChart, LineChart, StatGrid } from '../components/charts/Charts'
import { Card, SectionTitle } from '../components/ui/Card'
import { PageHeader } from '../components/layout/Shell'
import { computeMonthStats, computeWeekStats } from '../lib/analytics'
import { burnoutWarning, scheduledMinutesForDay } from '../lib/burnout'
import { compareIdealVsActual } from '../lib/idealVsActual'
import { formatEventStat } from '../lib/homeAnalytics'
import { isDayFullyComplete } from '../lib/dailyPlan'
import { computeConsistencyStats } from '../lib/consistency'
import { levelFromXp, petStage } from '../lib/gamification'
import {
  formatDateKey,
  formatShortDate,
  formatTime,
  getBlocksForDate,
  getMonthDays,
  parseDateKey,
} from '../lib/dates'
import { useStore } from '../store/useStore'

type InsightsTab = 'analytics' | 'settings'

interface InsightsPageProps {
  testScheduledAt?: number | null
}

export function InsightsPage({ testScheduledAt = null }: InsightsPageProps) {
  const { state, todayKey, todayLog, setSleep, updateSettings, updateDay, importFriendRoutine } = useStore()
  const [tab, setTab] = useState<InsightsTab>('analytics')
  const [calMonth, setCalMonth] = useState(() => new Date())
  const now = new Date()

  const todayBlocks = useMemo(() => getBlocksForDate(state.timeBlocks, now), [state.timeBlocks])
  const weekStats = computeWeekStats(state.days, state.timeBlocks, now)
  const monthStats = computeMonthStats(state.days, state.timeBlocks, calMonth.getFullYear(), calMonth.getMonth())
  const consistency = computeConsistencyStats(state.days, todayBlocks.length, state.habits.length, todayKey)
  const gamification = state.gamification ?? { xp: 0, totalXp: 0, level: 1 }
  const xpInfo = levelFromXp(gamification.totalXp)
  const pet = petStage(consistency.gentleStreak)
  const idealActual = compareIdealVsActual(todayLog, todayBlocks)
  const burnout = burnoutWarning(scheduledMinutesForDay(todayLog, todayBlocks))

  const monthDays = getMonthDays(calMonth.getFullYear(), calMonth.getMonth())

  const tabs: { id: InsightsTab; label: string }[] = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      <PageHeader title="Insights" />

      <div className="flex gap-2 px-4 pt-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${tab === t.id ? 'bg-accent text-accent-text' : 'bg-inset text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 px-4 py-4">
        {tab === 'analytics' && (
          <>
            <StatGrid
              stats={[
                {
                  label: 'Study',
                  value: formatEventStat(weekStats.studySessions, weekStats.studyHours * 60),
                  sub: 'programming sessions',
                },
                {
                  label: 'Focus',
                  value: formatEventStat(weekStats.focusSessions, weekStats.focusHours * 60),
                  sub: 'remote work',
                },
                {
                  label: 'Workouts',
                  value: formatEventStat(weekStats.workoutSessions, weekStats.workoutHours * 60),
                  sub: 'gym',
                },
                { label: 'Recovery', value: String(weekStats.recoveryDays), sub: 'days' },
              ]}
            />

            <Card glow="#c4a1ff">
              <SectionTitle title="Rhythm pet" subtitle={pet.label} />
              <div className="flex items-center gap-4">
                <span className="text-4xl">{pet.emoji}</span>
                <div>
                  <div className="text-sm text-muted">Level {xpInfo.level}</div>
                  <div className="mt-1 h-2 w-40 overflow-hidden rounded-full bg-inset">
                    <div className="h-full bg-accent" style={{ width: `${xpInfo.progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-faint">{xpInfo.nextIn} XP to next level · {gamification.totalXp} total</p>
                </div>
              </div>
            </Card>

            {burnout && (
              <Card glow="#e76f6f">
                <SectionTitle title="Burnout check" />
                <p className="text-sm text-[#e76f6f]">{burnout.message}</p>
              </Card>
            )}

            <Card>
              <SectionTitle
                title="Ideal vs actual"
                subtitle={`${idealActual.onTimeCount} on time · ${idealActual.lateCount} running late`}
              />
              {idealActual.rows.length === 0 ? (
                <p className="text-sm text-subtle">Build your morning plan to compare schedule vs reality.</p>
              ) : (
                <div className="space-y-2">
                  {idealActual.rows.slice(0, 6).map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-xl bg-inset px-3 py-2 text-xs">
                      <span className="truncate font-medium">{row.label}</span>
                      <span className="shrink-0 text-faint">
                        {row.done ? (
                          <>
                            {formatTime(row.idealStart)} → {formatTime(row.actualStart ?? row.idealStart)}
                            {(row.deltaMinutes ?? 0) > 15 && ` (+${row.deltaMinutes}m)`}
                          </>
                        ) : (
                          <>planned {formatTime(row.idealStart)}</>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle title="Weekly review" subtitle="Reflect on what worked" />
              <textarea
                value={todayLog.weeklyReviewNote ?? ''}
                onChange={(e) => updateDay(todayKey, { weeklyReviewNote: e.target.value })}
                placeholder="What went well this week? What should change?"
                rows={3}
                className="w-full rounded-xl bg-inset px-3 py-2 text-sm outline-none"
              />
            </Card>

            <Card>
              <SectionTitle title="Weekly productivity" />
              <BarChart
                data={weekStats.productivityByDay.map((d) => ({
                  label: formatShortDate(parseDateKey(d.date)).slice(0, 3),
                  value: d.score,
                  color: '#3dd68c',
                }))}
              />
            </Card>

            <Card>
              <SectionTitle title="Mood vs productivity" subtitle="Green = productivity · Blue = mood" />
              <LineChart
                data={weekStats.productivityByDay.map((d) => {
                  const log = state.days[d.date]
                  const mood = log?.mood ? { great: 5, good: 4, okay: 3, tired: 2, rough: 1 }[log.mood] : null
                  return { label: d.date, value: d.score, value2: mood }
                })}
              />
            </Card>

            <Card>
              <SectionTitle title="Monthly overview" />
              <StatGrid
                stats={[
                  {
                    label: 'Study',
                    value: formatEventStat(monthStats.studySessions, monthStats.studyHours * 60),
                    sub: 'programming sessions',
                  },
                  {
                    label: 'Focus',
                    value: formatEventStat(monthStats.focusSessions, monthStats.focusHours * 60),
                    sub: 'remote work',
                  },
                  {
                    label: 'Workouts',
                    value: formatEventStat(monthStats.workoutSessions, monthStats.workoutHours * 60),
                    sub: 'gym',
                  },
                  { label: 'Consistency', value: `${consistency.score30}%` },
                ]}
              />
            </Card>

            <Card>
              <SectionTitle title="Sleep tracking" subtitle="Log last night&apos;s sleep" />
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={14}
                  step={0.5}
                  value={todayLog.sleepHours ?? ''}
                  onChange={(e) => setSleep(todayKey, e.target.value ? Number(e.target.value) : null)}
                  placeholder="Hours"
                  className="flex-1 rounded-2xl bg-inset px-4 py-3 text-sm outline-none"
                />
                <span className="text-sm text-subtle">hours</span>
              </div>
              {weekStats.avgSleep && (
                <p className="mt-2 text-xs text-faint">Weekly avg: {weekStats.avgSleep}h</p>
              )}
            </Card>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                className="rounded-xl bg-inset px-3 py-2 text-sm"
              >
                ←
              </button>
              <span className="font-semibold">
                {calMonth.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                className="rounded-xl bg-inset px-3 py-2 text-sm"
              >
                →
              </button>
            </div>

            <Card>
              <SectionTitle title="Calendar" subtitle="✓ when all events are completed · dot = mood logged" />
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-faint">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {monthDays.map((day) => {
                  const key = formatDateKey(day)
                  const log = state.days[key]
                  const blocks = getBlocksForDate(state.timeBlocks, day).length
                  const done = log?.completedBlockIds.length ?? 0
                  const pct = blocks ? Math.round((done / blocks) * 100) : 0
                  const allComplete = isDayFullyComplete(log, state.timeBlocks, day)
                  const isToday = key === todayKey
                  const hasMood = Boolean(log?.mood)

                  return (
                    <button
                      key={key}
                      type="button"
                      className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs transition-all ${isToday ? 'ring-2 ring-accent/50' : ''} ${allComplete ? 'ring-1 ring-accent/70' : ''}`}
                      style={{
                        background: allComplete
                          ? 'rgba(61,214,140,0.35)'
                          : log?.isRecoveryDay
                            ? 'rgba(124,156,191,0.2)'
                            : pct > 50
                              ? 'rgba(61,214,140,0.15)'
                              : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <span className="font-medium">{day.getDate()}</span>
                      {allComplete ? (
                        <span className="text-[10px] font-bold text-accent" aria-label="All events completed">
                          ✓
                        </span>
                      ) : hasMood ? (
                        <span className="text-[8px]">●</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </Card>

            <Card>
              <SectionTitle title="Today" subtitle={formatDateKey(now)} />
              <div className="text-sm text-muted">
                {getBlocksForDate(state.timeBlocks, now).length} blocks scheduled ·{' '}
                {todayLog.completedBlockIds.length} done · {todayLog.focusMinutes}m focus
                {isDayFullyComplete(todayLog, state.timeBlocks, now) && (
                  <span className="ml-1 font-medium text-accent">· All complete ✓</span>
                )}
              </div>
            </Card>
          </>
        )}

        {tab === 'settings' && (
          <>
            <RoutineSettingsPanel settings={state.settings} onChange={updateSettings} />

            <ShareRoutinePanel state={state} onImport={importFriendRoutine} />

            <AlarmSyncPanel
              state={state}
              onUpdateSettings={updateSettings}
              testScheduledAt={testScheduledAt}
            />

            <ThemeSettingsPanel
              theme={state.settings.theme}
              onChange={(theme) => updateSettings({ theme })}
            />

            <AccountPanel />

            <ResetAppDataPanel />
          </>
        )}
      </div>
    </div>
  )
}
