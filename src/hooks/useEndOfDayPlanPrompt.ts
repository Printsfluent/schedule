import { useEffect, useState } from 'react'
import { shouldOfferEveningPlan } from '../lib/endOfDayPlan'
import type { DayLog, TimeBlock } from '../types'

interface Options {
  todayLog: DayLog
  todayBlocks: TimeBlock[]
  blocked: boolean
}

export function useEndOfDayPlanPrompt({ todayLog, todayBlocks, blocked }: Options) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [eveningFlow, setEveningFlow] = useState<'plan' | 'calendar' | null>(null)
  const [clockTick, setClockTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setClockTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (blocked || eveningFlow || showPrompt) return
    if (!shouldOfferEveningPlan(todayLog, todayBlocks)) return
    setShowPrompt(true)
  }, [blocked, eveningFlow, showPrompt, todayLog, todayBlocks, clockTick])

  return {
    showEveningPrompt: showPrompt,
    eveningFlow,
    dismissEveningPrompt: () => setShowPrompt(false),
    startEveningPlan: () => {
      setShowPrompt(false)
      setEveningFlow('plan')
    },
    showEveningCalendar: () => setEveningFlow('calendar'),
    finishEveningFlow: () => setEveningFlow(null),
  }
}
