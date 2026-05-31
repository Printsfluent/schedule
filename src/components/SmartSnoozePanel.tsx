import { snoozeLabel, type SnoozePreset } from '../lib/smartSnooze'
import { Card, SectionTitle } from './ui/Card'

const PRESETS: SnoozePreset[] = ['10m', 'after-work', 'tomorrow']

interface Props {
  onSnooze: (preset: SnoozePreset) => void
}

export function SmartSnoozePanel({ onSnooze }: Props) {
  return (
    <Card>
      <SectionTitle title="Smart snooze" />
      <div className="flex flex-col gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onSnooze(preset)}
            className="w-full rounded-xl bg-inset py-2.5 text-sm text-muted"
          >
            {snoozeLabel(preset)}
          </button>
        ))}
      </div>
    </Card>
  )
}
