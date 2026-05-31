import {
  computeSleepLogStreak,
  countSleepDaysLogged,
  formatSleepHours,
  getSleepFeedback,
} from '../lib/sleepFeedback'
import { formatDisplayDate } from '../lib/dates'
import type { DayLog } from '../types'

interface Props {
  sleepHours: number
  todayKey: string
  days: Record<string, DayLog>
  onContinue: () => void
}

const TONE_STYLES = {
  good: {
    glow: '#3dd68c',
    emoji: '✨',
    chip: 'bg-accent-soft text-accent',
  },
  low: {
    glow: '#f4a261',
    emoji: '🌙',
    chip: 'bg-[#f4a261]/15 text-[#f4a261]',
  },
  high: {
    glow: '#6ea8fe',
    emoji: '☁️',
    chip: 'bg-[#6ea8fe]/15 text-[#6ea8fe]',
  },
} as const

export function SleepFeedbackOverlay({ sleepHours, todayKey, days, onContinue }: Props) {
  const feedback = getSleepFeedback(sleepHours)
  const style = TONE_STYLES[feedback.tone]
  const streak = computeSleepLogStreak(days, todayKey)
  const totalLogged = countSleepDaysLogged(days)
  const now = new Date()

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-base px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] animate-slide-up">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="text-center">
          <div className="text-5xl">{style.emoji}</div>
          <p className="mt-4 text-sm font-medium text-accent">Sleep logged</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{feedback.title}</h1>
          <p className="mt-2 text-sm text-subtle">{formatDisplayDate(now)}</p>
        </div>

        <div
          className="mt-6 rounded-3xl border p-5"
          style={{ borderColor: `${style.glow}40`, background: `${style.glow}0d` }}
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${style.chip}`}>
              {formatSleepHours(sleepHours)}h last night
            </span>
            <span className="rounded-full bg-inset-2 px-3 py-1 text-xs text-muted">
              {streak} day{streak === 1 ? '' : 's'} in a row
            </span>
            <span className="rounded-full bg-inset-2 px-3 py-1 text-xs text-muted">
              {totalLogged} total logged
            </span>
          </div>

          <p className="mt-4 text-center text-sm leading-relaxed text-muted">{feedback.message}</p>

          {feedback.tips.length > 0 && (
            <ul className="mt-4 space-y-2 text-left text-xs leading-relaxed text-subtle">
              {feedback.tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="text-accent">·</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-2xl bg-accent py-4 text-base font-bold text-accent-text active:scale-[0.98] transition-transform"
        >
          Plan my day
        </button>
      </div>
    </div>
  )
}
