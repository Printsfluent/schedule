import { useState } from 'react'
import { PlanTimeControls } from './PlanTimeControls'
import {
  appendChainedPlanItem,
  cartHasBlock,
  createBlockPlanItem,
  createCustomPlanItem,
  defaultCustomStartMinutes,
  endOfPlan,
  recascadeEntirePlan,
  sortPlanByTime,
  updatePlanItemTime,
} from '../lib/dailyPlan'
import { formatDisplayDate, formatTime } from '../lib/dates'
import {
  buildMorningRoutineTemplate,
  buildNightRoutineTemplate,
  buildTemplatePlan,
} from '../lib/routineTemplates'
import { CATEGORY_COLORS, CATEGORY_LABELS, type ActivityCategory, type DayPlanItem, type ScheduleMode, type TimeBlock } from '../types'

interface Props {
  planDate: Date
  blocks: TimeBlock[]
  initialPlan: DayPlanItem[]
  scheduleMode: ScheduleMode
  realisticMode: boolean
  onContinue: (items: DayPlanItem[]) => void
}

const CUSTOM_CATEGORIES: ActivityCategory[] = ['work', 'study', 'health', 'social', 'rest', 'life']

const TEMPLATE_BUTTONS: { id: string; label: string; apply: (blocks: TimeBlock[], mode: ScheduleMode, realistic: boolean) => DayPlanItem[] }[] = [
  { id: 'weekday', label: 'Weekday', apply: (b, m, r) => buildTemplatePlan(b, m === 'weekday' ? m : 'weekday', r) },
  { id: 'weekend', label: 'Weekend', apply: (b) => buildTemplatePlan(b, 'weekend', false) },
  { id: 'exam', label: 'Exam', apply: (b, _, r) => buildTemplatePlan(b, 'exam', r) },
  { id: 'gym', label: 'Gym day', apply: (b, _, r) => buildTemplatePlan(b, 'gym', r) },
  { id: 'morning', label: 'Morning only', apply: (b) => buildMorningRoutineTemplate(b) },
  { id: 'night', label: 'Wind down', apply: (b) => buildNightRoutineTemplate(b) },
]

export function MorningPlanOverlay({ planDate, blocks, initialPlan, scheduleMode, realisticMode, onContinue }: Props) {
  const [cart, setCart] = useState<DayPlanItem[]>(() => sortPlanByTime(initialPlan))
  const [customLabel, setCustomLabel] = useState('')
  const [customCategory, setCustomCategory] = useState<ActivityCategory>('life')
  const [customStartMinutes, setCustomStartMinutes] = useState(defaultCustomStartMinutes)
  const [customDuration, setCustomDuration] = useState(30)

  const addBlock = (block: TimeBlock) => {
    if (cartHasBlock(cart, block.id)) return
    setCart((items) => {
      const next = appendChainedPlanItem(items, createBlockPlanItem(block))
      setCustomStartMinutes(endOfPlan(next))
      return next
    })
  }

  const addCustom = () => {
    const label = customLabel.trim()
    if (!label) return
    setCart((items) => {
      const next = appendChainedPlanItem(
        items,
        createCustomPlanItem(label, customCategory, customStartMinutes, customDuration),
      )
      setCustomStartMinutes(endOfPlan(next))
      return next
    })
    setCustomLabel('')
  }

  const patchItem = (id: string, patch: Partial<Pick<DayPlanItem, 'startMinutes' | 'durationMinutes'>>) => {
    setCart((items) => {
      const next = updatePlanItemTime(items, id, patch)
      setCustomStartMinutes(endOfPlan(next))
      return next
    })
  }

  const removeItem = (id: string) => {
    setCart((items) => {
      const next = recascadeEntirePlan(items.filter((item) => item.id !== id))
      setCustomStartMinutes(endOfPlan(next))
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-base">
      <div className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="mx-auto max-w-sm text-center">
          <div className="text-4xl">🛒</div>
          <p className="mt-3 text-sm font-medium text-accent">Plan tomorrow</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">Add to tomorrow&apos;s plan</h1>
          <p className="mt-1 text-xs text-subtle">
            {formatDisplayDate(planDate)} · later items start when the previous one ends
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 touch-pan-y">
        <div className="mx-auto max-w-sm space-y-4">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Quick templates</h2>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_BUTTONS.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    const next = tpl.apply(blocks, scheduleMode, realisticMode)
                    setCart(sortPlanByTime(next))
                    setCustomStartMinutes(endOfPlan(next))
                  }}
                  className="rounded-full bg-inset px-3 py-1.5 text-xs font-medium text-muted"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">From schedule</h2>
            <div className="space-y-2">
              {blocks.map((block) => {
                const inCart = cartHasBlock(cart, block.id)
                return (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-inset p-3"
                  >
                    <div
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: CATEGORY_COLORS[block.category] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{block.label}</div>
                      <div className="text-xs text-faint">
                        Default {formatTime(block.startMinutes)} · {block.durationMinutes}m
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addBlock(block)}
                      disabled={inCart}
                      className="shrink-0 rounded-xl bg-accent-soft px-3 py-2 text-sm font-semibold text-accent disabled:opacity-30"
                    >
                      {inCart ? 'Added' : '+ Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Your own plan</h2>
            <div className="rounded-2xl border border-border bg-inset p-3">
              <input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                placeholder="e.g. Call mum, side project, errands…"
                className="w-full rounded-xl bg-inset-2 px-3 py-3 text-sm outline-none placeholder:text-faint"
              />
              <PlanTimeControls
                startMinutes={customStartMinutes}
                durationMinutes={customDuration}
                onStartChange={setCustomStartMinutes}
                onDurationChange={setCustomDuration}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CUSTOM_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCustomCategory(cat)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      customCategory === cat ? 'text-accent-text' : 'bg-inset-2 text-subtle'
                    }`}
                    style={
                      customCategory === cat ? { background: CATEGORY_COLORS[cat] } : undefined
                    }
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={addCustom}
                disabled={!customLabel.trim()}
                className="mt-3 w-full rounded-xl bg-inset-3 py-2.5 text-sm font-medium text-muted disabled:opacity-40"
              >
                + Add to plan
              </button>
            </div>
          </section>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-tabbar px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Your plan</span>
            <span className="text-xs text-subtle">{cart.length} item{cart.length === 1 ? '' : 's'}</span>
          </div>

          {cart.length === 0 ? (
            <p className="mb-3 text-xs text-faint">Nothing yet — add blocks or type your own above.</p>
          ) : (
            <div className="mb-3 max-h-48 space-y-2 overflow-y-auto overscroll-contain touch-pan-y">
              {sortPlanByTime(cart).map((item, index) => (
                <div key={item.id} className="rounded-xl bg-inset px-3 py-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 w-4 shrink-0 text-center text-[10px] font-medium text-faint">
                      {index + 1}
                    </span>
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full"
                      style={{ background: CATEGORY_COLORS[item.category] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{item.label}</div>
                      <PlanTimeControls
                        compact
                        startMinutes={item.startMinutes}
                        durationMinutes={item.durationMinutes}
                        onStartChange={(startMinutes) => patchItem(item.id, { startMinutes })}
                        onDurationChange={(durationMinutes) => patchItem(item.id, { durationMinutes })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs text-[#ff8a8a]"
                      aria-label={`Remove ${item.label}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onContinue(sortPlanByTime(cart))}
            disabled={cart.length === 0}
            className="w-full rounded-2xl bg-accent py-4 text-base font-bold text-accent-text disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            Continue · {cart.length} item{cart.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}
