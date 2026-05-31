import { useState } from 'react'
import { stopAlarmLoop } from '../lib/alarmSound'
import { formatDeviceTime } from '../lib/deviceTime'
import { formatDisplayDate } from '../lib/dates'

const QUICK_HOURS = [5, 6, 6.5, 7, 7.5, 8, 9]

interface Props {
  onSaveSleep: (hours: number) => void
  onSkip: () => void
}

export function WakeAlarmOverlay({ onSaveSleep, onSkip }: Props) {
  const [hours, setHours] = useState<number | ''>('')
  const now = new Date()

  const handleSave = () => {
    if (hours === '' || hours <= 0) return
    stopAlarmLoop()
    onSaveSleep(hours)
  }

  const handleQuick = (h: number) => {
    stopAlarmLoop()
    onSaveSleep(h)
  }

  const handleSkip = () => {
    stopAlarmLoop()
    onSkip()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-base px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] animate-slide-up">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="text-center">
          <div className="text-6xl">🌅</div>
          <p className="mt-4 text-sm font-medium text-accent">Good morning</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Wake up</h1>
          <p className="mt-2 text-muted">{formatDisplayDate(now)}</p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-accent">
            {formatDeviceTime(now)}
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-accent/25 bg-accent/5 p-5">
          <h2 className="text-center text-lg font-semibold">How many hours did you sleep?</h2>
          <p className="mt-1 text-center text-xs text-subtle">
            Log this first — then your day begins
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {QUICK_HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => handleQuick(h)}
                className="rounded-2xl bg-inset-3 px-4 py-2.5 text-sm font-medium active:scale-95 transition-transform"
              >
                {h}h
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={14}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value ? Number(e.target.value) : '')}
              placeholder="Custom hours"
              className="flex-1 rounded-2xl border border-border bg-inset-2 px-4 py-3.5 text-center text-lg outline-none focus:border-accent/50"
            />
            <span className="text-sm text-subtle">hrs</span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={hours === '' || hours <= 0}
            className="mt-4 w-full rounded-2xl bg-accent py-4 text-base font-bold text-accent-text disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            Start my day
          </button>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-4 w-full py-3 text-sm text-faint"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
