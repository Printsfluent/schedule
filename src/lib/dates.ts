import { getRawBlocksForDate } from './blockCascade'
import type { DayLog, Recurring, StudyBlocks, TimeBlock } from '../types'

export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getTomorrowKey(from: Date | string = new Date()): string {
  const d = typeof from === 'string' ? parseDateKey(from) : new Date(from)
  d.setDate(d.getDate() + 1)
  return formatDateKey(d)
}

export function getDayType(date: Date): 'weekday' | 'saturday' | 'sunday' {
  const day = date.getDay()
  if (day === 0) return 'sunday'
  if (day === 6) return 'saturday'
  return 'weekday'
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-NG', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric' })
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function getRecentDateKeys(days: number, from: Date = new Date()): string[] {
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(from)
    d.setDate(d.getDate() - i)
    keys.push(formatDateKey(d))
  }
  return keys
}

export function getWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return formatDateKey(d)
}

export function formatWeekRange(weekKey: string): string {
  const start = parseDateKey(weekKey)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function isOneOffBlock(block: TimeBlock): boolean {
  return Boolean(block.dateKey)
}

export function blockAppliesToday(block: TimeBlock, date: Date): boolean {
  if (!block.enabled) return false
  if (block.dateKey) {
    return block.dateKey === formatDateKey(date)
  }
  const day = date.getDay()
  switch (block.recurring) {
    case 'daily':
      return true
    case 'weekday':
      return day >= 1 && day <= 5
    case 'weekend':
      return day === 0 || day === 6
    case 'saturday':
      return day === 6
    case 'sunday':
      return day === 0
    default:
      return false
  }
}

/** Blocks for a date using stored start/duration (user edits are not overridden). */
export function getBlocksForDate(blocks: TimeBlock[], date: Date): TimeBlock[] {
  return getRawBlocksForDate(blocks, date)
}

export function recurringForDate(date: Date): Recurring {
  const dayType = getDayType(date)
  if (dayType === 'saturday') return 'saturday'
  if (dayType === 'sunday') return 'sunday'
  return 'weekday'
}

/** New blocks start after the last block on this day; they apply to this date only. */
export function defaultNewBlockForDay(
  timeBlocks: TimeBlock[],
  date: Date,
): Omit<TimeBlock, 'id'> {
  const dayBlocks = getBlocksForDate(timeBlocks, date)
  const end =
    dayBlocks.length > 0
      ? Math.max(...dayBlocks.map((b) => b.startMinutes + b.durationMinutes))
      : 9 * 60
  return {
    startMinutes: clampDayMinutes(end),
    durationMinutes: 60,
    label: 'New block',
    category: 'life',
    recurring: 'none',
    dateKey: formatDateKey(date),
    enabled: true,
  }
}

export function getCurrentBlock(blocks: TimeBlock[], date: Date = new Date()): TimeBlock | null {
  const now = date.getHours() * 60 + date.getMinutes()
  const todayBlocks = getBlocksForDate(blocks, date)
  return (
    todayBlocks.find((b) => now >= b.startMinutes && now < b.startMinutes + b.durationMinutes) ??
    null
  )
}

export function getUpcomingBlocks(
  blocks: TimeBlock[],
  date: Date = new Date(),
  limit = 3,
): TimeBlock[] {
  const now = date.getHours() * 60 + date.getMinutes()
  return getBlocksForDate(blocks, date)
    .filter((b) => b.startMinutes + b.durationMinutes > now)
    .slice(0, limit)
}

/** Upcoming blocks for Home — follows Plan tab day + clicked block */
export const UPCOMING_LIMIT = 5

export function getPlanUpcomingBlocks(
  blocks: TimeBlock[],
  planDate: Date,
  focusBlockId: string | null,
  limit = UPCOMING_LIMIT,
  now: Date = new Date(),
  completedBlockIds: string[] = [],
): TimeBlock[] {
  const dayBlocks = getBlocksForDate(blocks, planDate)
  const isToday = formatDateKey(planDate) === formatDateKey(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const completed = new Set(completedBlockIds)

  let list = dayBlocks.filter((block) => !completed.has(block.id))

  if (focusBlockId) {
    const idx = list.findIndex((b) => b.id === focusBlockId)
    if (idx >= 0) list = list.slice(idx)
  }

  if (isToday) {
    list = list.filter((b) => b.startMinutes + b.durationMinutes > nowMinutes)
  }

  return list.slice(0, limit)
}

export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export function emptyStudyBlocks(): StudyBlocks {
  return { concepts: false, projects: false, tutorials: false, practice: false }
}

export function emptyDayLog(date: string): DayLog {
  return {
    date,
    mood: null,
    sleepHours: null,
    wakeCompleted: false,
    completedBlockIds: [],
    completedTaskIds: [],
    completedHabitIds: [],
    studyBlocks: emptyStudyBlocks(),
    studyMinutes: 0,
    focusMinutes: 0,
    workoutDone: false,
    powerOutage: false,
    internetOutage: false,
    isRecoveryDay: false,
    funMinutes: 0,
    notes: '',
    dailyPlan: [],
    morningPlanDone: false,
    morningSleepFeedbackDone: false,
    morningFlowComplete: false,
  }
}

/** Parse duration: "90", "45", "1h30", "2h" */
export function parseDurationMinutes(value: string): number | null {
  const cleaned = value.trim()
  if (!cleaned) return null

  if (/^\d+$/.test(cleaned)) {
    const n = Number(cleaned)
    if (n > 0) return Math.round(n)
    return null
  }

  const hm = cleaned.match(/^(\d+)\s*h(?:\s*(\d+))?$/i)
  if (hm) {
    const h = Number(hm[1])
    const m = Number(hm[2] ?? 0)
    if (h >= 0 && m >= 0 && m < 60) return h * 60 + m
  }

  return null
}

export function minutesToTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function timeInputToMinutes(value: string): number {
  const parsed = parseTimeInput(value)
  return parsed ?? 0
}

/** Parse typed time: "9:30", "09:30", "930", "1430", "9:30 AM", "2 pm", "9" */
export function parseTimeInput(value: string): number | null {
  const cleaned = value.trim()
  if (!cleaned) return null

  const ampm = cleaned.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(a\.?m\.?|p\.?m\.?)$/i)
  if (ampm) {
    let h = Number(ampm[1])
    const m = Number(ampm[2] ?? '0')
    const isPm = /^p/i.test(ampm[3])
    if (h === 12) h = isPm ? 12 : 0
    else if (isPm) h += 12
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m
    return null
  }

  const colon = cleaned.match(/^(\d{1,2}):(\d{1,2})$/)
  if (colon) {
    const h = Number(colon[1])
    const m = Number(colon[2])
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m
    return null
  }

  if (/^\d{3,4}$/.test(cleaned)) {
    const m = Number(cleaned.slice(-2))
    const h = Number(cleaned.slice(0, -2))
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m
  }

  if (/^\d{1,2}$/.test(cleaned)) {
    const h = Number(cleaned)
    if (h >= 0 && h <= 23) return h * 60
  }

  return null
}

export function clampDayMinutes(minutes: number) {
  return Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)))
}

export function recurringLabel(r: Recurring): string {
  const map: Record<Recurring, string> = {
    daily: 'Every day',
    weekday: 'Weekdays',
    weekend: 'Weekends',
    saturday: 'Saturday',
    sunday: 'Sunday',
    none: 'One-off',
  }
  return map[r]
}

export function blockScheduleLabel(block: TimeBlock): string {
  if (block.dateKey) {
    return `${formatShortDate(parseDateKey(block.dateKey))} only`
  }
  return recurringLabel(block.recurring)
}
