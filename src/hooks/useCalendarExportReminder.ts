import { useEffect, useRef } from 'react'
import {
  getFirstBlockStartMinutes,
  hasExportableCalendarEvents,
  isCalendarExportedForDay,
  isSameCalendarDay,
  shouldRemindCalendarAtFirstBlock,
} from '../lib/calendarExportFlow'
import { parseDateKey } from '../lib/dates'
import type { AppSettings, DayLog, TimeBlock } from '../types'

interface Options {
  dateKey: string
  dayLog: DayLog
  timeBlocks: TimeBlock[]
  notifications: AppSettings['notifications']
  blocked: boolean
  onPrompt: () => void
}

/**
 * When the user skipped calendar export after planning, show the export overlay
 * once the first block of that day starts.
 */
export function useCalendarExportReminder({
  dateKey,
  dayLog,
  timeBlocks,
  notifications,
  blocked,
  onPrompt,
}: Options) {
  const promptedRef = useRef(false)

  useEffect(() => {
    promptedRef.current = false
  }, [dateKey])

  useEffect(() => {
    if (blocked || promptedRef.current) return
    if (!isSameCalendarDay(dateKey)) return
    if (!shouldRemindCalendarAtFirstBlock(dayLog)) return
    if (isCalendarExportedForDay(dayLog)) return

    const forDate = parseDateKey(dateKey)
    if (!hasExportableCalendarEvents(dayLog, timeBlocks, forDate, notifications)) return

    const firstStart = getFirstBlockStartMinutes(dayLog, timeBlocks, forDate)
    if (firstStart == null) return

    const tick = () => {
      if (promptedRef.current || blocked) return
      const now = new Date()
      if (!isSameCalendarDay(dateKey, now)) return
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      if (nowMinutes >= firstStart) {
        promptedRef.current = true
        onPrompt()
      }
    }

    tick()
    const interval = setInterval(tick, 30_000)
    return () => clearInterval(interval)
  }, [blocked, dateKey, dayLog, notifications, onPrompt, timeBlocks])
}
