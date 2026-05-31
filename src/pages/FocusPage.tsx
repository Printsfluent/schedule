import { useCallback, useState } from 'react'
import { DurationField } from '../components/DurationField'
import { SpotifyMusicPanel } from '../components/SpotifyMusicPanel'
import { Card, SectionTitle } from '../components/ui/Card'
import { PageHeader } from '../components/layout/Shell'
import { useAmbientSound } from '../hooks/useAmbientSound'
import { formatTimer, useFocusTimer } from '../hooks/useFocusTimer'
import { resumeAudioContext } from '../lib/audioContext'
import { clampDurationSeconds, formatDurationCompact } from '../lib/duration'
import type { AmbientSound, FocusModeTimer, FocusType } from '../types'
import { useStore } from '../store/useStore'

const MODES: { id: FocusType; label: string; emoji: string; desc: string }[] = [
  { id: 'deep-work', label: 'Deep work', emoji: '💻', desc: 'Remote job focus' },
  { id: 'study', label: 'Study', emoji: '📚', desc: 'Programming learning' },
  { id: 'pomodoro', label: 'Pomodoro', emoji: '🍅', desc: 'Short focus cycles' },
]

const SOUNDS: { id: AmbientSound; label: string }[] = [
  { id: 'none', label: 'Off' },
  { id: 'rain', label: 'Rain' },
  { id: 'brown', label: 'Brown noise' },
  { id: 'lofi', label: 'Lo-fi hum' },
]

export function FocusPage() {
  const { state, todayKey, addFocusMinutes, updateSettings } = useStore()
  const [mode, setMode] = useState<FocusType>('pomodoro')
  const [soundPreview, setSoundPreview] = useState(false)
  const modeTimer = state.settings.focusTimers[mode]

  const onComplete = useCallback(
    (seconds: number, phase: 'work' | 'break') => {
      if (phase === 'work') {
        addFocusMinutes(todayKey, Math.max(1, Math.round(seconds / 60)), mode === 'study' ? 'study' : 'focus')
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Break time', { body: 'Step away. Hydrate. Breathe.', icon: '/favicon.svg' })
        }
      }
    },
    [addFocusMinutes, todayKey, mode],
  )

  const timer = useFocusTimer({
    workSeconds: modeTimer.workSeconds,
    breakSeconds: modeTimer.breakSeconds,
    type: mode,
    onComplete,
  })

  const focusActive = timer.phase === 'work' || timer.phase === 'break'
  const ambientActive =
    state.settings.ambientSound !== 'none' &&
    (focusActive || soundPreview)

  useAmbientSound(state.settings.ambientSound, state.settings.ambientVolume, ambientActive)

  const handleStart = () => {
    void resumeAudioContext()
    setSoundPreview(false)
    timer.start()
  }

  const handleSoundSelect = (id: AmbientSound) => {
    updateSettings({ ambientSound: id })
    if (id === 'none') {
      setSoundPreview(false)
      return
    }
    void resumeAudioContext()
    setSoundPreview(true)
  }

  const handleReset = () => {
    setSoundPreview(false)
    timer.reset()
  }

  const updateSpotify = (patch: Partial<typeof state.settings.spotify>) => {
    updateSettings({ spotify: { ...state.settings.spotify, ...patch } })
  }

  const updateModeTimer = (focusMode: FocusType, patch: Partial<FocusModeTimer>) => {
    updateSettings({
      focusTimers: {
        ...state.settings.focusTimers,
        [focusMode]: { ...state.settings.focusTimers[focusMode], ...patch },
      },
    })
  }

  const selectMode = (next: FocusType) => {
    setMode(next)
    timer.reset()
    setSoundPreview(false)
  }

  return (
    <div>
      <PageHeader title="Focus" />

      <div className="space-y-4 px-4 py-4">
        <div className="space-y-2">
          {MODES.map((m) => {
            const timerSettings = state.settings.focusTimers[m.id]
            const selected = mode === m.id
            return (
              <div
                key={m.id}
                className={`rounded-2xl border transition-all ${selected ? 'border-[#3dd68c]/40 bg-accent-soft' : 'border-border bg-inset'}`}
              >
                <button
                  type="button"
                  onClick={() => selectMode(m.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
                >
                  <div className="text-lg">{m.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{m.label}</div>
                    <div className="text-[11px] text-subtle">{m.desc}</div>
                  </div>
                  <div className="shrink-0 text-right text-[11px] tabular-nums text-faint">
                    <div>{formatDurationCompact(timerSettings.workSeconds)}</div>
                    <div>{formatDurationCompact(timerSettings.breakSeconds)} break</div>
                  </div>
                </button>
                <div className="grid grid-cols-2 gap-3 border-t border-border px-4 py-3">
                  <DurationField
                    label="Focus"
                    seconds={timerSettings.workSeconds}
                    onChange={(workSeconds) =>
                      updateModeTimer(m.id, { workSeconds: clampDurationSeconds(workSeconds) })
                    }
                  />
                  <DurationField
                    label="Break"
                    seconds={timerSettings.breakSeconds}
                    onChange={(breakSeconds) =>
                      updateModeTimer(m.id, { breakSeconds: clampDurationSeconds(breakSeconds) })
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>

        <Card glow="#3dd68c" className="flex flex-col items-center py-8">
          <div className="text-xs uppercase tracking-widest text-faint">
            {MODES.find((m) => m.id === mode)?.label} ·{' '}
            {timer.phase === 'break' ? 'Break' : timer.phase === 'work' ? 'Focus' : 'Ready'}
          </div>
          <div className="mt-4 font-mono text-[56px] font-light tabular-nums tracking-tight">
            {formatTimer(timer.secondsLeft)}
          </div>
          <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-inset-2">
            <div
              className="h-full rounded-full bg-accent transition-all duration-1000"
              style={{ width: `${timer.progress * 100}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-faint">
            {timer.sessions} sessions today
          </div>

          <div className="mt-6 flex gap-3">
            {timer.phase === 'idle' ? (
              <button type="button" onClick={handleStart} className="rounded-2xl bg-accent px-8 py-3.5 text-sm font-bold text-accent-text">
                Start
              </button>
            ) : (
              <>
                <button type="button" onClick={timer.pause} className="rounded-2xl bg-inset-3 px-6 py-3 text-sm">Pause</button>
                <button type="button" onClick={handleReset} className="rounded-2xl bg-inset-3 px-6 py-3 text-sm">Reset</button>
              </>
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle
            title="Ambient sound"
            subtitle="Tap a sound to preview · plays during focus"
          />
          <div className="flex flex-wrap gap-2">
            {SOUNDS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSoundSelect(s.id)}
                className={`rounded-full px-4 py-2 text-sm transition-all ${state.settings.ambientSound === s.id ? 'bg-accent-soft text-accent' : 'bg-inset text-muted'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {state.settings.ambientSound !== 'none' && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.settings.ambientVolume}
              onChange={(e) => updateSettings({ ambientVolume: Number(e.target.value) })}
              className="mt-3 w-full accent-[#3dd68c]"
            />
          )}
        </Card>

        <SpotifyMusicPanel
          settings={state.settings.spotify}
          onChange={updateSpotify}
        />
      </div>
    </div>
  )
}
