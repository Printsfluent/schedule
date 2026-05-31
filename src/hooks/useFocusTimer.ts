import { useCallback, useEffect, useRef, useState } from 'react'
import type { FocusType } from '../types'

interface UseTimerOptions {
  workSeconds: number
  breakSeconds: number
  type: FocusType
  onComplete: (seconds: number, phase: 'work' | 'break') => void
}

export function useFocusTimer({ workSeconds, breakSeconds, type, onComplete }: UseTimerOptions) {
  const [phase, setPhase] = useState<'idle' | 'work' | 'break'>('idle')
  const [secondsLeft, setSecondsLeft] = useState(workSeconds)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef<number | null>(null)

  const totalSeconds = phase === 'break' ? breakSeconds : workSeconds

  const clear = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
  }, [])

  const start = useCallback(() => {
    clear()
    setPhase('work')
    setSecondsLeft(workSeconds)
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clear()
          setPhase('break')
          onComplete(workSeconds, 'work')
          setSessions((n) => n + 1)
          return breakSeconds
        }
        return s - 1
      })
    }, 1000)
  }, [workSeconds, breakSeconds, clear, onComplete])

  const startBreak = useCallback(() => {
    clear()
    setPhase('break')
    setSecondsLeft(breakSeconds)
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clear()
          onComplete(breakSeconds, 'break')
          setPhase('idle')
          return workSeconds
        }
        return s - 1
      })
    }, 1000)
  }, [breakSeconds, workSeconds, clear, onComplete])

  const pause = useCallback(() => {
    clear()
    setPhase('idle')
  }, [clear])

  const reset = useCallback(() => {
    clear()
    setPhase('idle')
    setSecondsLeft(workSeconds)
  }, [workSeconds, clear])

  useEffect(() => () => clear(), [clear])

  useEffect(() => {
    if (phase === 'idle') setSecondsLeft(workSeconds)
  }, [workSeconds, phase])

  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0

  return { phase, secondsLeft, sessions, progress, type, start, startBreak, pause, reset, totalSeconds }
}

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
