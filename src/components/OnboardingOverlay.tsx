import { useState } from 'react'
import { TimeAdjustInput, DurationAdjustInput } from './PlanTimeControls'
import { DEFAULT_ONBOARDING, mergeOnboardingPrefs, parseNaturalLanguageSchedule } from '../lib/onboardingSchedule'
import { CATEGORY_LABELS, type ActivityCategory, type OnboardingPreferences } from '../types'

const PRIORITY_OPTIONS: ActivityCategory[] = ['work', 'study', 'health', 'social', 'rest', 'life']

interface Props {
  onComplete: (prefs: OnboardingPreferences) => void
}

export function OnboardingOverlay({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [prefs, setPrefs] = useState<OnboardingPreferences>(DEFAULT_ONBOARDING)
  const [nlInput, setNlInput] = useState('')

  const patch = (p: Partial<OnboardingPreferences>) => setPrefs((prev) => mergeOnboardingPrefs(prev, p))

  const togglePriority = (cat: ActivityCategory) => {
    setPrefs((prev) => {
      const has = prev.priorities.includes(cat)
      const priorities = has ? prev.priorities.filter((c) => c !== cat) : [...prev.priorities, cat]
      return { ...prev, priorities: priorities.length ? priorities : [cat] }
    })
  }

  const applyNaturalLanguage = () => {
    if (!nlInput.trim()) return
    setPrefs((prev) => mergeOnboardingPrefs(prev, parseNaturalLanguageSchedule(nlInput)))
  }

  const finish = () => onComplete(prefs)

  const steps = ['Welcome', 'Sleep & wake', 'Work & goals', 'Your words']

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-base animate-fade-in">
      <div className="shrink-0 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-sm">
          <p className="text-xs font-medium text-accent">Setup · {steps[step]}</p>
          <div className="mt-3 flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-inset-3'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-sm space-y-5">
          {step === 0 && (
            <>
              <div className="text-center">
                <div className="text-5xl">🌿</div>
                <h1 className="mt-4 text-2xl font-bold tracking-tight">Build a realistic life</h1>
                <p className="mt-2 text-sm text-subtle">
                  Not just a task list — balance work, health, study, fun, and rest in under 2 minutes.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted">
                <li>· Realistic daily schedule from your rhythm</li>
                <li>· Gentle streaks — missed days don&apos;t destroy progress</li>
                <li>· Plan each day, track habits, stay focused</li>
              </ul>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold">When do you wake and sleep?</h2>
              <label className="block text-xs text-subtle">
                Usual wake-up
                <div className="mt-1">
                  <TimeAdjustInput minutes={prefs.wakeMinutes} onChange={(wakeMinutes) => patch({ wakeMinutes })} step={15} />
                </div>
              </label>
              <label className="block text-xs text-subtle">
                Bedtime
                <div className="mt-1">
                  <TimeAdjustInput minutes={prefs.sleepMinutes} onChange={(sleepMinutes) => patch({ sleepMinutes })} step={15} />
                </div>
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold">Work, study & fitness</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-subtle">
                  Work starts
                  <div className="mt-1">
                    <TimeAdjustInput minutes={prefs.workStartMinutes} onChange={(workStartMinutes) => patch({ workStartMinutes })} step={30} compact />
                  </div>
                </label>
                <label className="block text-xs text-subtle">
                  Work ends
                  <div className="mt-1">
                    <TimeAdjustInput minutes={prefs.workEndMinutes} onChange={(workEndMinutes) => patch({ workEndMinutes })} step={30} compact />
                  </div>
                </label>
              </div>
              <label className="block text-xs text-subtle">
                Study goal (hours / day)
                <div className="mt-1">
                  <DurationAdjustInput
                    minutes={prefs.studyHoursDaily * 60}
                    onChange={(m) => patch({ studyHoursDaily: Math.round(m / 60) })}
                    step={30}
                    max={8 * 60}
                  />
                </div>
              </label>
              <label className="block text-xs text-subtle">
                Gym / exercise (days per week): {prefs.gymDaysPerWeek}
                <input
                  type="range"
                  min={0}
                  max={7}
                  value={prefs.gymDaysPerWeek}
                  onChange={(e) => patch({ gymDaysPerWeek: Number(e.target.value) })}
                  className="mt-2 w-full accent-[#3dd68c]"
                />
              </label>
              <div>
                <p className="text-xs text-subtle">What matters most right now?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRIORITY_OPTIONS.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => togglePriority(cat)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        prefs.priorities.includes(cat) ? 'bg-accent text-accent-text' : 'bg-inset text-muted'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold">Describe your life (optional)</h2>
              <p className="text-xs text-subtle">
                Example: &ldquo;I work 9-5 remotely, gym 4x a week, study programming 2 hours daily, sleep 8 hours.&rdquo;
              </p>
              <textarea
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                rows={4}
                placeholder="Tell Rhythm your goals in plain English…"
                className="w-full rounded-2xl bg-inset px-4 py-3 text-sm outline-none placeholder:text-faint"
              />
              <button
                type="button"
                onClick={applyNaturalLanguage}
                disabled={!nlInput.trim()}
                className="rounded-xl bg-inset-2 px-4 py-2 text-sm text-muted disabled:opacity-40"
              >
                Parse & apply
              </button>
              <p className="text-[10px] text-faint">
                We&apos;ll generate a realistic weekday plan from your picks — you can edit everything later in Plan.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-sm gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-2xl bg-inset px-4 py-3 text-sm">
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (step < steps.length - 1 ? setStep((s) => s + 1) : finish())}
            className="flex-1 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-text"
          >
            {step < steps.length - 1 ? 'Continue' : 'Build my rhythm'}
          </button>
        </div>
      </div>
    </div>
  )
}
