import { sortPlanByTime } from './dailyPlan'
import { formatDuration, formatTime } from './dates'
import type { AppState, DayPlanItem, ScheduleMode, TimeBlock } from '../types'

export type SharePayload = {
  v: 1
  app: 'rhythm'
  sharedAt: string
  scheduleMode: ScheduleMode
  realisticMode: boolean
  message: string
  timeBlocks: Pick<TimeBlock, 'label' | 'category' | 'startMinutes' | 'durationMinutes' | 'recurring'>[]
  samplePlan: Pick<DayPlanItem, 'kind' | 'label' | 'category' | 'startMinutes' | 'durationMinutes'>[]
}

export function buildSharePayload(state: AppState, todayKey: string): SharePayload {
  const log = state.days[todayKey]
  const plan = sortPlanByTime(log?.dailyPlan ?? [])
  return {
    v: 1,
    app: 'rhythm',
    sharedAt: new Date().toISOString(),
    scheduleMode: state.settings.scheduleMode,
    realisticMode: state.settings.realisticMode,
    message: `My Rhythm routine for ${todayKey}`,
    timeBlocks: state.timeBlocks.slice(0, 20).map((b) => ({
      label: b.label,
      category: b.category,
      startMinutes: b.startMinutes,
      durationMinutes: b.durationMinutes,
      recurring: b.recurring,
    })),
    samplePlan: plan.map((item) => ({
      kind: item.kind,
      label: item.label,
      category: item.category,
      startMinutes: item.startMinutes,
      durationMinutes: item.durationMinutes,
    })),
  }
}

export function encodeSharePayload(payload: SharePayload): string {
  const json = JSON.stringify(payload)
  if (typeof btoa !== 'undefined') {
    return `rhythm://share?v=1&data=${encodeURIComponent(btoa(unescape(encodeURIComponent(json))))}`
  }
  return `rhythm://share?v=1&data=${encodeURIComponent(json)}`
}

export function decodeSharePayload(raw: string): SharePayload | null {
  try {
    let json = raw.trim()
    const linkMatch = json.match(/data=([^&]+)/)
    if (linkMatch) json = decodeURIComponent(linkMatch[1])
    if (!json.startsWith('{')) {
      json = decodeURIComponent(escape(atob(json)))
    }
    const parsed = JSON.parse(json) as SharePayload
    if (parsed.app !== 'rhythm' || parsed.v !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function formatShareText(payload: SharePayload): string {
  const lines = [
    payload.message,
    '',
    `Mode: ${payload.scheduleMode}${payload.realisticMode ? ' · realistic' : ''}`,
    '',
    "Today's plan:",
  ]
  for (const item of payload.samplePlan) {
    lines.push(`• ${formatTime(item.startMinutes)} · ${item.label} (${formatDuration(item.durationMinutes)})`)
  }
  if (payload.samplePlan.length === 0) {
    for (const block of payload.timeBlocks.slice(0, 8)) {
      lines.push(`• ${formatTime(block.startMinutes)} · ${block.label}`)
    }
  }
  lines.push('', 'Get Rhythm and import this link to copy my routine.', encodeSharePayload(payload))
  return lines.join('\n')
}

export async function shareRoutineWithFriends(payload: SharePayload): Promise<boolean> {
  const text = formatShareText(payload)
  const url = encodeSharePayload(payload)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Rhythm routine', text, url })
      return true
    } catch {
      /* fall through */
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return true
  }
  return false
}

export function importSharePayload(payload: SharePayload): {
  plan: DayPlanItem[]
  scheduleMode: ScheduleMode
  realisticMode: boolean
} {
  const plan: DayPlanItem[] = payload.samplePlan.map((item, i) => ({
    id: `import-${Date.now()}-${i}`,
    kind: item.kind,
    label: item.label,
    category: item.category,
    startMinutes: item.startMinutes,
    durationMinutes: item.durationMinutes,
    done: false,
  }))
  return {
    plan: sortPlanByTime(plan),
    scheduleMode: payload.scheduleMode,
    realisticMode: payload.realisticMode,
  }
}

export function parseShareFromClipboard(text: string): SharePayload | null {
  const link = text.match(/rhythm:\/\/share[^\s]+/)?.[0]
  if (link) return decodeSharePayload(link)
  if (text.trim().startsWith('{')) return decodeSharePayload(text)
  return null
}
