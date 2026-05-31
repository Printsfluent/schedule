import { useState } from 'react'
import {
  type DurationUnit,
  secondsToUnitValue,
  unitInputConfig,
  unitValueToSeconds,
} from '../lib/duration'

const UNITS: { id: DurationUnit; label: string }[] = [
  { id: 'hours', label: 'hrs' },
  { id: 'minutes', label: 'min' },
  { id: 'seconds', label: 'sec' },
]

interface DurationFieldProps {
  label: string
  seconds: number
  onChange: (seconds: number) => void
}

export function DurationField({ label, seconds, onChange }: DurationFieldProps) {
  const [unit, setUnit] = useState<DurationUnit>('minutes')
  const { min, step } = unitInputConfig(unit)

  return (
    <div className="text-xs text-subtle">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span>{label}</span>
        <div className="flex rounded-lg bg-inset p-0.5">
          {UNITS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setUnit(u.id)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                unit === u.id ? 'bg-accent-soft text-accent' : 'text-faint hover:text-muted'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>
      <input
        type="number"
        min={min}
        step={step}
        value={secondsToUnitValue(seconds, unit)}
        onChange={(e) => onChange(unitValueToSeconds(Number(e.target.value), unit))}
        className="w-full rounded-xl bg-inset px-3 py-2 text-sm text-fg outline-none"
      />
    </div>
  )
}
