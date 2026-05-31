import type { AppSettings, ScheduleMode } from '../types'
import { Card, SectionTitle } from './ui/Card'

interface Props {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}

const MODES: { id: ScheduleMode; label: string }[] = [
  { id: 'weekday', label: 'Weekdays' },
  { id: 'weekend', label: 'Weekend' },
  { id: 'exam', label: 'Exam mode' },
  { id: 'gym', label: 'Gym days' },
]

export function RoutineSettingsPanel({ settings, onChange }: Props) {
  return (
    <Card glow="#3dd68c">
      <SectionTitle title="Routine modes" subtitle="Adaptive · realistic · persistent" />
      <div className="space-y-3">
        <label className="flex items-center justify-between rounded-xl bg-inset px-3 py-2.5">
          <span className="text-sm text-muted">Realistic mode</span>
          <input
            type="checkbox"
            checked={settings.realisticMode}
            onChange={(e) => onChange({ realisticMode: e.target.checked })}
            className="size-4 accent-[#3dd68c]"
          />
        </label>
        <p className="px-1 text-[11px] text-faint">Adds scroll time, breaks, and social blocks — not a robot schedule.</p>
        <label className="flex items-center justify-between rounded-xl bg-inset px-3 py-2.5">
          <span className="text-sm text-muted">Adaptive scheduling</span>
          <input
            type="checkbox"
            checked={settings.adaptiveScheduling}
            onChange={(e) => onChange({ adaptiveScheduling: e.target.checked })}
            className="size-4 accent-[#3dd68c]"
          />
        </label>
        <p className="px-1 text-[11px] text-faint">Shifts your plan when you wake late — protects sleep & wind-down.</p>
        <label className="flex items-center justify-between rounded-xl bg-inset px-3 py-2.5">
          <span className="text-sm text-muted">Persistent reminders</span>
          <input
            type="checkbox"
            checked={settings.persistentReminders}
            onChange={(e) => onChange({ persistentReminders: e.target.checked })}
            className="size-4 accent-[#3dd68c]"
          />
        </label>
        <p className="px-1 text-[11px] text-faint">Keeps nudging until you mark the task done on Home.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ scheduleMode: m.id })}
              className={`rounded-full px-3 py-1.5 text-sm ${settings.scheduleMode === m.id ? 'bg-accent-soft text-accent' : 'bg-inset text-muted'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
