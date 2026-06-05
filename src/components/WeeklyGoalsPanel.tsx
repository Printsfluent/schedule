import { getWeekKey, formatWeekRange } from '../lib/dates'
import type { WeeklyPlan } from '../types'

interface Props {
  weekKey: string
  plan: WeeklyPlan
  onChange: (patch: Partial<WeeklyPlan>) => void
}

const FIELDS: { key: keyof WeeklyPlan; label: string; placeholder: string }[] = [
  { key: 'workFocus', label: 'Work focus', placeholder: 'e.g. Ship client project' },
  { key: 'studyGoal', label: 'Study goal', placeholder: 'e.g. 10h programming' },
  { key: 'healthGoal', label: 'Health / gym', placeholder: 'e.g. 4 gym sessions' },
  { key: 'socialPlan', label: 'Social', placeholder: 'e.g. Dinner with friends Friday' },
  { key: 'restPlan', label: 'Rest', placeholder: 'e.g. One full recovery evening' },
]

export function WeeklyGoalsPanel({ weekKey, plan, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-faint">{formatWeekRange(weekKey)} · week of {getWeekKey(new Date()) === weekKey ? 'now' : weekKey}</p>
      {FIELDS.map(({ key, label, placeholder }) => (
        <label key={key} className="block text-xs text-subtle">
          {label}
          <input
            value={(plan[key] as string) ?? ''}
            onChange={(e) => onChange({ [key]: e.target.value })}
            placeholder={placeholder}
            className="mt-1 w-full rounded-xl bg-inset px-3 py-2.5 text-sm outline-none placeholder:text-faint"
          />
        </label>
      ))}
      <label className="block text-xs text-subtle">
        Notes
        <textarea
          value={plan.notes ?? ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={2}
          placeholder="Anything else for this week?"
          className="mt-1 w-full rounded-xl bg-inset px-3 py-2.5 text-sm outline-none placeholder:text-faint"
        />
      </label>
    </div>
  )
}
