import { downloadBlob } from './browserCompat'
import { getTimedScheduleItems } from './scheduleAlerts'
import { formatDateKey, formatDuration, getBlocksForDate } from './dates'
import { getDeviceTimezone } from './deviceTime'
import { PLAN_ALERT_MINUTES_BEFORE } from './planAlarms'
import { getDailyRemindersForDate } from './wakeFlow'
import type { DayPlanItem, NotificationSettings, TimeBlock } from '../types'

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatIcsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function buildAlarmBlock(minutesBefore = 0): string {
  const trigger = minutesBefore === 0 ? '-PT0M' : `-PT${minutesBefore}M`
  return [
    'BEGIN:VALARM',
    `TRIGGER:${trigger}`,
    'ACTION:DISPLAY',
    'DESCRIPTION:Rhythm alarm',
    'END:VALARM',
  ].join('\r\n')
}

const CALENDAR_EVENT_PRIORITY = {
  plan: 30,
  reminder: 10,
} as const

type CalendarEventSource = keyof typeof CALENDAR_EVENT_PRIORITY

interface CalendarExportEvent {
  slotKey: string
  startMinutes: number
  start: Date
  durationMin: number
  summary: string
  description: string
  uid: string
  alarm: boolean
  priority: number
  source: CalendarEventSource
}

function dedupeCalendarEvents(events: CalendarExportEvent[]): CalendarExportEvent[] {
  const best = new Map<string, CalendarExportEvent>()
  for (const event of events) {
    const existing = best.get(event.slotKey)
    if (!existing || event.priority > existing.priority) {
      best.set(event.slotKey, event)
    }
  }
  return [...best.values()].sort((a, b) => a.startMinutes - b.startMinutes)
}

function buildEvent(opts: {
  uid: string
  start: Date
  durationMin: number
  summary: string
  description: string
  alarm: boolean
}): string {
  const end = new Date(opts.start)
  end.setMinutes(end.getMinutes() + opts.durationMin)
  const tz = getDeviceTimezone()
  const lines = [
    'BEGIN:VEVENT',
    `UID:${opts.uid}@rhythm.app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART;TZID=${tz}:${formatIcsDate(opts.start)}`,
    `DTEND;TZID=${tz}:${formatIcsDate(end)}`,
    `SUMMARY:${opts.summary}`,
    `DESCRIPTION:${opts.description.replace(/\n/g, '\\n')}`,
  ]
  if (opts.alarm) {
    for (const minutesBefore of [...PLAN_ALERT_MINUTES_BEFORE].sort((a, b) => b - a)) {
      lines.push(buildAlarmBlock(minutesBefore))
    }
  }
  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

export type DailyCalendarEventPreview = {
  uid: string
  source: 'plan' | 'reminder'
  label: string
  startMinutes: number
  durationMinutes: number
}

function buildDailyCalendarEvents(
  forDate: Date,
  timeBlocks: TimeBlock[],
  notificationSettings: NotificationSettings,
  dailyPlan: DayPlanItem[] = [],
): CalendarExportEvent[] {
  const dateKey = formatDateKey(forDate)
  const candidates: CalendarExportEvent[] = []

  for (const item of getTimedScheduleItems(dailyPlan, timeBlocks, forDate)) {
    const start = new Date(forDate)
    start.setHours(Math.floor(item.startMinutes / 60), item.startMinutes % 60, 0, 0)
    const isPlan = Boolean(item.planItemId)
    candidates.push({
      slotKey: `${isPlan ? 'plan' : 'block'}:${item.id}`,
      startMinutes: item.startMinutes,
      start,
      durationMin: Math.max(1, item.durationMinutes),
      summary: `Rhythm — ${item.label}`,
      description: isPlan
        ? `In your plan for ${dateKey} · ${formatDuration(item.durationMinutes)}.`
        : `Schedule block for ${dateKey} · ${formatDuration(item.durationMinutes)}.`,
      uid: `daily-${dateKey}-${isPlan ? 'plan' : 'block'}-${item.id}`,
      alarm: notificationSettings.alarmStyle !== 'off',
      priority: CALENDAR_EVENT_PRIORITY.plan,
      source: 'plan',
    })
  }

  if (dailyPlan.length === 0 && getBlocksForDate(timeBlocks, forDate).length === 0) {
    for (const reminder of getDailyRemindersForDate(forDate, notificationSettings.reminderIds)) {
      const startMinutes = reminder.hour * 60 + reminder.minute
      const start = new Date(forDate)
      start.setHours(reminder.hour, reminder.minute, 0, 0)
      candidates.push({
        slotKey: `reminder:${reminder.id}`,
        startMinutes,
        start,
        durationMin: 15,
        summary: reminder.label,
        description: `${reminder.body}\n\nRhythm daily reminder for ${dateKey}.`,
        uid: `daily-${dateKey}-${reminder.id}`,
        alarm: true,
        priority: CALENDAR_EVENT_PRIORITY.reminder,
        source: 'reminder',
      })
    }
  }

  return dedupeCalendarEvents(candidates)
}

export function getDailyCalendarEventPreview(
  forDate: Date,
  timeBlocks: TimeBlock[],
  notificationSettings: NotificationSettings,
  dailyPlan: DayPlanItem[] = [],
): DailyCalendarEventPreview[] {
  return buildDailyCalendarEvents(forDate, timeBlocks, notificationSettings, dailyPlan).map(
    (event) => ({
      uid: event.uid,
      source: event.source === 'plan' ? 'plan' : 'reminder',
      label: event.summary.replace(/^Rhythm — /, ''),
      startMinutes: event.startMinutes,
      durationMinutes: event.durationMin,
    }),
  )
}

/** One-day calendar file: today's plan + reminders — no recurring events. */
export function generateDailyCalendarIcs(
  forDate: Date,
  timeBlocks: TimeBlock[],
  notificationSettings: NotificationSettings,
  dailyPlan: DayPlanItem[] = [],
): string {
  const tz = getDeviceTimezone()
  const events = buildDailyCalendarEvents(
    forDate,
    timeBlocks,
    notificationSettings,
    dailyPlan,
  ).map((event) =>
    buildEvent({
      uid: event.uid,
      start: event.start,
      durationMin: event.durationMin,
      summary: event.summary,
      description: event.description,
      alarm: event.alarm,
    }),
  )

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rhythm App//Daily Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-TIMEZONE:${tz}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadDailyCalendarIcs(forDate: Date, ics: string) {
  downloadBlob(
    new Blob([ics], { type: 'text/calendar;charset=utf-8' }),
    `rhythm-reminders-${formatDateKey(forDate)}.ics`,
  )
}

export async function shareDailyCalendarIcs(forDate: Date, ics: string): Promise<boolean> {
  const filename = `rhythm-reminders-${formatDateKey(forDate)}.ics`
  const file = new File([ics], filename, { type: 'text/calendar' })
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Rhythm — Today\'s reminders',
        text: 'Add today\'s reminders to your calendar (one day only)',
        files: [file],
      })
      return true
    } catch {
      return false
    }
  }
  return false
}

export function countDailyCalendarEvents(
  forDate: Date,
  timeBlocks: TimeBlock[],
  notificationSettings: NotificationSettings,
  dailyPlan: DayPlanItem[] = [],
): number {
  return buildDailyCalendarEvents(forDate, timeBlocks, notificationSettings, dailyPlan).length
}
