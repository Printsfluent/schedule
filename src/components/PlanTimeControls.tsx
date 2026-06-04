import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { clampDayMinutes, minutesToTimeInput, parseDurationMinutes, parseTimeInput } from '../lib/dates'

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-inset-3 hover:text-fg active:scale-95"
    >
      {children}
    </button>
  )
}

interface FlexibleTimeFieldProps {
  minutes: number
  onChange: (minutes: number) => void
  className?: string
}

/** Free-form start time — type any format, commits on blur or Enter. */
export function FlexibleTimeField({ minutes, onChange, className }: FlexibleTimeFieldProps) {
  const [draft, setDraft] = useState(() => minutesToTimeInput(minutes))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(minutesToTimeInput(minutes))
  }, [minutes, focused])

  const commit = () => {
    const parsed = parseTimeInput(draft)
    if (parsed !== null) {
      onChange(parsed)
      setDraft(minutesToTimeInput(parsed))
      return
    }
    setDraft(minutesToTimeInput(minutes))
  }

  return (
    <input
      type="text"
      inputMode="text"
      autoComplete="off"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        commit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
          e.currentTarget.blur()
        }
      }}
      placeholder="9:30 AM, 14:30, 930"
      aria-label="Start time"
      className={className}
    />
  )
}

interface FlexibleDurationFieldProps {
  minutes: number
  onChange: (minutes: number) => void
  className?: string
  min?: number
  max?: number
}

/** Free-form duration — type any minutes, commits on blur or Enter. */
export function FlexibleDurationField({
  minutes,
  onChange,
  className,
  min = 1,
  max = 24 * 60,
}: FlexibleDurationFieldProps) {
  const [draft, setDraft] = useState(String(minutes))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(minutes))
  }, [minutes, focused])

  const commit = () => {
    const parsed = parseDurationMinutes(draft)
    if (parsed !== null) {
      const clamped = Math.max(min, Math.min(max, parsed))
      onChange(clamped)
      setDraft(String(clamped))
      return
    }
    setDraft(String(minutes))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^\dh\s]/gi, ''))}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        commit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
          e.currentTarget.blur()
        }
      }}
      placeholder="45 · 1h · 1h30"
      aria-label="Duration in minutes or hours"
      className={className}
    />
  )
}

interface TimeAdjustInputProps {
  minutes: number
  onChange: (minutes: number) => void
  step?: number
  compact?: boolean
}

export function TimeAdjustInput({ minutes, onChange, step = 15, compact = false }: TimeAdjustInputProps) {
  const [draft, setDraft] = useState(() => minutesToTimeInput(minutes))

  useEffect(() => {
    setDraft(minutesToTimeInput(minutes))
  }, [minutes])

  const applyMinutes = (next: number) => {
    const clamped = clampDayMinutes(next)
    onChange(clamped)
    setDraft(minutesToTimeInput(clamped))
  }

  const commitDraft = () => {
    const parsed = parseTimeInput(draft)
    if (parsed !== null) {
      applyMinutes(parsed)
      return
    }
    setDraft(minutesToTimeInput(minutes))
  }

  return (
    <div
      className={`inline-flex items-center rounded-lg bg-inset-3 ${compact ? 'gap-0' : 'gap-0.5'}`}
    >
      <StepButton label={`Decrease time by ${step} minutes`} onClick={() => applyMinutes(minutes - step)}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
          <path d="M2 4.5 6 8.5l4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </StepButton>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitDraft()
          }
        }}
        placeholder="9:30 · 2pm"
        aria-label="Time"
        className={`border-0 bg-transparent text-center font-mono tabular-nums text-fg outline-none placeholder:text-faint ${
          compact ? 'w-[4.5rem] py-1 text-xs' : 'w-[5.25rem] py-1.5 text-sm'
        }`}
      />
      <StepButton label={`Increase time by ${step} minutes`} onClick={() => applyMinutes(minutes + step)}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
          <path d="M2 7.5 6 3.5l4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </StepButton>
    </div>
  )
}

interface DurationAdjustInputProps {
  minutes: number
  onChange: (minutes: number) => void
  min?: number
  max?: number
  step?: number
  compact?: boolean
}

export function DurationAdjustInput({
  minutes,
  onChange,
  min = 5,
  max = 480,
  step = 5,
  compact = false,
}: DurationAdjustInputProps) {
  const [draft, setDraft] = useState(String(minutes))

  useEffect(() => {
    setDraft(String(minutes))
  }, [minutes])

  const clamp = (value: number) => Math.max(min, Math.min(max, Math.round(value)))

  const apply = (next: number) => {
    const clamped = clamp(next)
    onChange(clamped)
    setDraft(String(clamped))
  }

  const commitDraft = () => {
    const parsed = parseDurationMinutes(draft)
    if (parsed !== null) {
      apply(parsed)
      return
    }
    const n = Number(draft)
    if (Number.isFinite(n) && n >= min) {
      apply(n)
      return
    }
    setDraft(String(minutes))
  }

  return (
    <div className={`inline-flex items-center rounded-lg bg-inset-3 ${compact ? 'gap-0' : 'gap-0.5'}`}>
      <StepButton label={`Decrease duration by ${step} minutes`} onClick={() => apply(minutes - step)}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
          <path d="M2 4.5 6 8.5l4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </StepButton>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\dh\s]/gi, ''))}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitDraft()
          }
        }}
        placeholder="45 · 1h30"
        aria-label="Duration in minutes or hours"
        className={`border-0 bg-transparent text-center font-mono tabular-nums text-fg outline-none placeholder:text-faint ${
          compact ? 'w-10 py-1 text-xs' : 'w-12 py-1.5 text-sm'
        }`}
      />
      <StepButton label={`Increase duration by ${step} minutes`} onClick={() => apply(minutes + step)}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
          <path d="M2 7.5 6 3.5l4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </StepButton>
    </div>
  )
}

interface PlanTimeControlsProps {
  startMinutes: number
  durationMinutes: number
  onStartChange: (minutes: number) => void
  onDurationChange: (minutes: number) => void
  compact?: boolean
}

export function PlanTimeControls({
  startMinutes,
  durationMinutes,
  onStartChange,
  onDurationChange,
  compact = false,
}: PlanTimeControlsProps) {
  return (
    <div
      className={`flex flex-nowrap items-center gap-2 overflow-x-auto ${compact ? 'mt-1.5' : 'gap-3'}`}
    >
      <label
        className={`flex shrink-0 items-center gap-1 ${compact ? 'text-[10px] text-subtle' : 'text-xs text-subtle'}`}
      >
        <span className="shrink-0">Time</span>
        <TimeAdjustInput minutes={startMinutes} onChange={onStartChange} compact={compact} />
      </label>
      <label
        className={`flex shrink-0 items-center gap-1 ${compact ? 'text-[10px] text-subtle' : 'text-xs text-subtle'}`}
      >
        <span className="shrink-0">Duration</span>
        <DurationAdjustInput minutes={durationMinutes} onChange={onDurationChange} compact={compact} />
      </label>
    </div>
  )
}
