import { stopAlarmLoop } from '../lib/alarmSound'
import type { ActiveAlarm } from '../hooks/useAlarmScheduler'
import { formatDeviceTime } from '../lib/deviceTime'
import { snoozeLabel, snoozeUntilForPreset, type SnoozePreset } from '../lib/smartSnooze'
import type { PlanSnooze } from '../types'

const SNOOZE_PRESETS: SnoozePreset[] = ['10m', 'after-work', 'tomorrow']

interface Props {
  alarm: ActiveAlarm
  persistentReminders?: boolean
  planSnoozes?: PlanSnooze[]
  onDismiss: () => void
  onSnooze?: (planItemId: string, until: number) => void
}

function planItemIdFromAlarm(alarmId: string): string | null {
  const match = alarmId.match(/^plan-(.+)-\d+$/)
  return match?.[1] ?? null
}

export function AlarmOverlay({ alarm, persistentReminders, onDismiss, onSnooze }: Props) {
  const planItemId = planItemIdFromAlarm(alarm.id)

  const handleDismiss = () => {
    if (persistentReminders && planItemId && onSnooze) {
      onSnooze(planItemId, snoozeUntilForPreset('10m'))
    }
    stopAlarmLoop()
    onDismiss()
  }

  const handleSnooze = (preset: SnoozePreset) => {
    if (!planItemId || !onSnooze) {
      handleDismiss()
      return
    }
    stopAlarmLoop()
    onSnooze(planItemId, snoozeUntilForPreset(preset))
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0e14]/95 px-6 backdrop-blur-md animate-fade-in">
      <div className="text-center">
        <div className="text-5xl">⏰</div>
        <h2 className="mt-4 text-2xl font-bold">{alarm.label.replace('Rhythm — ', '')}</h2>
        <p className="mt-2 text-white/60">{alarm.body}</p>
        <p className="mt-4 font-mono text-4xl tabular-nums text-[#3dd68c]">
          {formatDeviceTime(new Date(alarm.firedAt))}
        </p>
        <p className="mt-1 text-xs text-white/35">Device local time</p>
        {persistentReminders && (
          <p className="mt-3 text-xs text-white/45">
            Keeps reminding until you mark this done on Home.
          </p>
        )}
      </div>

      {onSnooze && planItemId && (
        <div className="mt-6 w-full max-w-xs space-y-2">
          {SNOOZE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleSnooze(preset)}
              className="w-full rounded-xl bg-white/10 py-3 text-sm text-white/80"
            >
              {snoozeLabel(preset)}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleDismiss}
        className="mt-6 w-full max-w-xs rounded-2xl bg-[#3dd68c] py-4 text-lg font-bold text-[#0a0e14] active:scale-95 transition-transform"
      >
        Dismiss
      </button>
    </div>
  )
}
