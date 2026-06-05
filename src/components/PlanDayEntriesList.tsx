import { formatPlanItemMeta, type PlanDisplayEntry } from '../lib/dailyPlan'
import { CATEGORY_COLORS, type ActivityCategory } from '../types'

interface Props {
  entries: PlanDisplayEntry[]
  onCompleteBlock: (blockId: string, label: string, done: boolean) => void
  onCompleteCustom: (itemId: string, label: string, category: ActivityCategory, done: boolean) => void
  /** Dim items that already ended today (still tappable). */
  nowMinutes?: number
  isToday?: boolean
}

export function PlanDayEntriesList({
  entries,
  onCompleteBlock,
  onCompleteCustom,
  nowMinutes,
  isToday = false,
}: Props) {
  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const past =
          isToday &&
          nowMinutes != null &&
          entry.startMinutes + entry.durationMinutes <= nowMinutes &&
          !entry.done

        if (entry.kind === 'block') {
          const { block } = entry
          return (
            <button
              key={entry.planItemId}
              type="button"
              onClick={() => onCompleteBlock(block.id, block.label, entry.done)}
              className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98]"
              style={{
                background: `${CATEGORY_COLORS[block.category]}12`,
                opacity: past ? 0.55 : 1,
              }}
            >
              <div
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: CATEGORY_COLORS[block.category] }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{block.label}</div>
                <div className="text-xs text-faint">{formatPlanItemMeta(entry)}</div>
              </div>
              <div
                className="size-5 shrink-0 rounded-full border-2 transition-all"
                style={{
                  borderColor: entry.done ? CATEGORY_COLORS[block.category] : 'rgba(255,255,255,0.15)',
                  background: entry.done ? CATEGORY_COLORS[block.category] : 'transparent',
                }}
              />
            </button>
          )
        }

        const { item } = entry
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onCompleteCustom(item.id, item.label, item.category, entry.done)}
            className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all active:scale-[0.98]"
            style={{
              background: `${CATEGORY_COLORS[item.category]}12`,
              opacity: past ? 0.55 : 1,
            }}
          >
            <div
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: CATEGORY_COLORS[item.category] }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{item.label}</div>
              <div className="text-xs text-faint">{formatPlanItemMeta(entry)}</div>
            </div>
            <div
              className="size-5 shrink-0 rounded-full border-2 transition-all"
              style={{
                borderColor: entry.done ? CATEGORY_COLORS[item.category] : 'rgba(255,255,255,0.15)',
                background: entry.done ? CATEGORY_COLORS[item.category] : 'transparent',
              }}
            />
          </button>
        )
      })}
    </div>
  )
}
