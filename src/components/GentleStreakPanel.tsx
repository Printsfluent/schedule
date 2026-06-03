import { computeGentleStreak } from '../lib/consistency'
import { parseDateKey } from '../lib/dates'
import type { AppState } from '../types'
import { Card, SectionTitle } from './ui/Card'

interface Props {
  state: AppState
  todayKey: string
  totalBlocks: number
  onReset: () => void
}

export function GentleStreakPanel({ state, todayKey, totalBlocks, onReset }: Props) {
  const since = state.settings.gentleStreakSince
  const streak = computeGentleStreak(
    state.days,
    totalBlocks,
    state.habits.length,
    parseDateKey(todayKey),
    since,
  )

  const handleReset = () => {
    const ok = window.confirm(
      'Reset your gentle streak to zero? Past days will not count until you earn today again.',
    )
    if (!ok) return
    onReset()
  }

  return (
    <Card glow="#3dd68c">
      <SectionTitle title="Gentle streak" subtitle="Counts across days until you reset" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-bold text-accent">{streak}</div>
          <div className="text-xs text-subtle">day{streak === 1 ? '' : 's'} in a row</div>
          {since && (
            <p className="mt-2 text-[11px] text-faint">
              Counting from {parseDateKey(since).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 rounded-xl bg-inset px-4 py-2.5 text-sm text-subtle"
        >
          Reset streak
        </button>
      </div>
      <p className="mt-3 text-[11px] text-faint">
        Skips days with no log. Today in progress does not break your streak.
      </p>
    </Card>
  )
}

export function gentleStreakResetPatch(todayKey: string): { gentleStreakSince: string } {
  return { gentleStreakSince: todayKey }
}
