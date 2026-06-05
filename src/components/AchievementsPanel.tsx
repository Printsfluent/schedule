import { ACHIEVEMENTS } from '../lib/achievements'

interface Props {
  unlockedIds: string[]
}

export function AchievementsPanel({ unlockedIds }: Props) {
  const unlocked = new Set(unlockedIds)

  return (
    <div className="grid grid-cols-2 gap-2">
      {ACHIEVEMENTS.map((a) => {
        const done = unlocked.has(a.id)
        return (
          <div
            key={a.id}
            className={`rounded-2xl p-3 transition-opacity ${done ? 'bg-inset' : 'bg-inset-2 opacity-50'}`}
          >
            <div className="text-2xl">{done ? a.emoji : '🔒'}</div>
            <div className="mt-1 text-sm font-medium">{a.title}</div>
            <div className="text-[10px] text-faint">{a.description}</div>
          </div>
        )
      })}
    </div>
  )
}
