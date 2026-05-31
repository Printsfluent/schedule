import { MOOD_CONFIG } from '../../data/moods'
import type { Mood } from '../../types'

interface MoodSelectorProps {
  value: Mood | null
  onChange: (mood: Mood) => void
  compact?: boolean
}

export function MoodSelector({ value, onChange, compact }: MoodSelectorProps) {
  const moods = Object.keys(MOOD_CONFIG) as Mood[]

  return (
    <div className={`flex ${compact ? 'gap-1.5' : 'gap-2'} overflow-x-auto pb-1`}>
      {moods.map((mood) => {
        const cfg = MOOD_CONFIG[mood]
        const active = value === mood
        return (
          <button
            key={mood}
            type="button"
            onClick={() => onChange(mood)}
            className={`flex shrink-0 flex-col items-center rounded-2xl border transition-all duration-200 ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} ${active ? 'border-border bg-inset-3 scale-105' : 'border-border bg-inset'}`}
          >
            <span className={compact ? 'text-lg' : 'text-xl'}>{cfg.emoji}</span>
            {!compact && <span className="mt-0.5 text-[10px] font-medium text-muted">{cfg.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
