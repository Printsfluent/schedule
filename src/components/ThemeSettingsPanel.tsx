import type { ThemePreference } from '../types'
import { Card, SectionTitle } from './ui/Card'

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

interface Props {
  theme: ThemePreference
  onChange: (theme: ThemePreference) => void
}

export function ThemeSettingsPanel({ theme, onChange }: Props) {
  return (
    <Card glow="#6ea8fe">
      <SectionTitle title="Appearance" subtitle="Light, dark, or match your device" />
      <div className="flex flex-wrap gap-2">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              theme === option.id
                ? 'bg-accent text-accent-text'
                : 'bg-inset-2 text-muted'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Card>
  )
}
