import { useState } from 'react'
import { PlanTimeControls } from './PlanTimeControls'
import {
  appendChainedPlanItem,
  createCustomPlanItem,
  defaultCustomStartMinutes,
  endOfPlan,
  recascadeEntirePlan,
  sortPlanByTime,
  updatePlanItemTime,
} from '../lib/dailyPlan'
import { formatDisplayDate } from '../lib/dates'
import {
  getPlanSample,
  PLAN_ACTIVITY_SAMPLES,
  sampleActivityToPlanItem,
  type PlanSampleId,
} from '../lib/planSamples'
import { CATEGORY_COLORS, CATEGORY_LABELS, type ActivityCategory, type DayPlanItem } from '../types'

interface Props {
  planDate: Date
  initialPlan: DayPlanItem[]
  realisticMode: boolean
  /** Evening flow targets tomorrow; morning flow fills today when empty. */
  variant?: 'today' | 'tomorrow'
  onContinue: (items: DayPlanItem[]) => void
}

const CUSTOM_CATEGORIES: ActivityCategory[] = ['work', 'study', 'health', 'social', 'rest', 'life']

const TEMPLATE_BUTTONS: { id: PlanSampleId; label: string }[] = [
  { id: 'weekday', label: 'Weekday sample' },
  { id: 'weekend', label: 'Weekend sample' },
  { id: 'exam', label: 'Exam sample' },
  { id: 'gym', label: 'Gym day sample' },
  { id: 'morning', label: 'Morning only' },
  { id: 'night', label: 'Wind down' },
]

export function MorningPlanOverlay({
  planDate,
  initialPlan,
  realisticMode,
  variant = 'tomorrow',
  onContinue,
}: Props) {
  const isToday = variant === 'today'
  const [cart, setCart] = useState<DayPlanItem[]>(() => sortPlanByTime(initialPlan))
  const [customLabel, setCustomLabel] = useState('')
  const [customCategory, setCustomCategory] = useState<ActivityCategory>('life')
  const [customStartMinutes, setCustomStartMinutes] = useState(defaultCustomStartMinutes)
  const [customDuration, setCustomDuration] = useState(30)

  const addSample = (label: string, category: ActivityCategory, durationMinutes: number) => {
    setCart((items) => {
      const next = appendChainedPlanItem(
        items,
        sampleActivityToPlanItem({ label, category, durationMinutes }, endOfPlan(items) || customStartMinutes),
      )
      setCustomStartMinutes(endOfPlan(next))
      return next
    })
  }

  const applyTemplate = (id: PlanSampleId) => {
    const next = getPlanSample(id, { realisticMode: id === 'weekday' || id === 'exam' || id === 'gym' ? realisticMode : false })
    setCart(sortPlanByTime(next))
    setCustomStartMinutes(endOfPlan(next))
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

  const hasActivity = (label: string) => cart.some((item) => item.label === label)

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-base">
      <div className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="mx-auto max-w-sm text-center">
          <div className="text-4xl">🛒</div>
          <p className="mt-3 text-sm font-medium text-accent">
            {isToday ? 'Plan today' : 'Plan tomorrow'}
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">
            {isToday ? "Build today's plan" : "Add to tomorrow's plan"}
          </h1>
          <p className="mt-1 text-xs text-subtle">
            {formatDisplayDate(planDate)} · pick a sample or add your own — nothing repeats automatically
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 touch-pan-y">
        <div className="mx-auto max-w-sm space-y-4">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Sample day plans</h2>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_BUTTONS.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl.id)}
                  className="rounded-full bg-inset px-3 py-1.5 text-xs font-medium text-muted"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Add from samples</h2>
            <div className="space-y-2">
              {PLAN_ACTIVITY_SAMPLES.map((sample) => {
                const added = hasActivity(sample.label)
                return (
                  <div
                    key={sample.label}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-inset p-3"
                  >
                    <div
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: CATEGORY_COLORS[sample.category] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{sample.label}</div>
                      <div className="text-xs text-faint">{sample.durationMinutes}m</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addSample(sample.label, sample.category, sample.durationMinutes)}
                      disabled={added}
                      className="shrink-0 rounded-xl bg-accent-soft px-3 py-2 text-sm font-semibold text-accent disabled:opacity-30"
                    >
                      {added ? 'Added' : '+ Add'}
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
            <p className="mb-3 text-xs text-faint">Nothing yet — tap a sample day or add activities above.</p>
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
