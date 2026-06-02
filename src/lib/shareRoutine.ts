import { sortPlanByTime } from './dailyPlan'
import { formatDuration, formatTime } from './dates'
import type { ActivityCategory, AppState, DayPlanItem, ScheduleMode, TimeBlock } from '../types'

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

/** Compact wire format — short keys, tuple arrays, then base64url */
type ShareWire = {
  v: 2
  m: ScheduleMode
  r?: 0 | 1
  /** [kind 0|1, label, category code, startMinutes, durationMinutes] */
  p: [0 | 1, string, string, number, number][]
  /** fallback blocks when plan is empty: [label, category code, start, duration, recurring] */
  b?: [string, string, number, number, string][]
}

const CAT_TO_CODE: Record<ActivityCategory, string> = {
  work: 'w',
  health: 'h',
  study: 's',
  social: 'o',
  rest: 'r',
  life: 'l',
}

const CODE_TO_CAT = Object.fromEntries(
  Object.entries(CAT_TO_CODE).map(([k, v]) => [v, k]),
) as Record<string, ActivityCategory>

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

function shareOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'https://rhythm.app'
}

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
  const binary = atob(base64 + pad)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function toWire(payload: SharePayload): ShareWire {
  const wire: ShareWire = {
    v: 2,
    m: payload.scheduleMode,
    p: payload.samplePlan.map((item) => [
      item.kind === 'block' ? 0 : 1,
      item.label,
      CAT_TO_CODE[item.category],
      item.startMinutes,
      item.durationMinutes,
    ]),
  }
  if (!payload.realisticMode) wire.r = 0
  if (wire.p.length === 0 && payload.timeBlocks.length > 0) {
    wire.b = payload.timeBlocks.slice(0, 8).map((b) => [
      b.label,
      CAT_TO_CODE[b.category],
      b.startMinutes,
      b.durationMinutes,
      b.recurring,
    ])
  }
  return wire
}

function fromWire(wire: ShareWire): SharePayload | null {
  if (wire.v !== 2 || !wire.m || !Array.isArray(wire.p)) return null
  const samplePlan = wire.p.map(([kind, label, cat, start, dur]) => ({
    kind: (kind === 0 ? 'block' : 'custom') as DayPlanItem['kind'],
    label,
    category: CODE_TO_CAT[cat] ?? 'life',
    startMinutes: start,
    durationMinutes: dur,
  }))
  const timeBlocks =
    wire.b?.map(([label, cat, start, dur, recurring]) => ({
      label,
      category: CODE_TO_CAT[cat] ?? 'life',
      startMinutes: start,
      durationMinutes: dur,
      recurring: recurring as TimeBlock['recurring'],
    })) ?? []
  return {
    v: 1,
    app: 'rhythm',
    sharedAt: new Date().toISOString(),
    scheduleMode: wire.m,
    realisticMode: wire.r !== 0,
    message: 'Shared Rhythm routine',
    timeBlocks,
    samplePlan,
  }
}

function parseLegacyJson(json: string): SharePayload | null {
  try {
    const parsed = JSON.parse(json) as SharePayload | ShareWire
    if (parsed.v === 2) return fromWire(parsed as ShareWire)
    if (parsed.v === 1 && (parsed as SharePayload).app === 'rhythm') return parsed as SharePayload
    return null
  } catch {
    return null
  }
}

export function encodeSharePayload(payload: SharePayload): string {
  const data = toBase64Url(JSON.stringify(toWire(payload)))
  return `${shareOrigin()}/?d=${data}`
}

export function decodeSharePayload(raw: string): SharePayload | null {
  try {
    let input = raw.trim()

    const param =
      input.match(/[?&#]d=([^&#]+)/)?.[1] ??
      input.match(/data=([^&]+)/)?.[1] ??
      input.match(/[?&#]r=([^&#]+)/)?.[1]

    if (param) input = decodeURIComponent(param)

    if (input.startsWith('{')) return parseLegacyJson(input)

    try {
      return parseLegacyJson(fromBase64Url(input))
    } catch {
      /* try legacy base64 + utf8 escape */
    }

    if (!input.startsWith('{')) {
      const legacyJson = decodeURIComponent(escape(atob(input.replace(/-/g, '+').replace(/_/g, '/'))))
      return parseLegacyJson(legacyJson)
    }

    return null
  } catch {
    return null
  }
}

export function formatShareText(payload: SharePayload): string {
  const link = encodeSharePayload(payload)
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
  lines.push('', 'Open in Rhythm to copy my routine:', link)
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
    await navigator.clipboard.writeText(url)
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
  const link = text.match(/https?:\/\/[^\s]+[?&]d=[^\s&#]+/)?.[0]
  if (link) return decodeSharePayload(link)
  const legacy = text.match(/rhythm:\/\/share[^\s]+/)?.[0]
  if (legacy) return decodeSharePayload(legacy)
  const oldCompressed = text.match(/https?:\/\/[^\s]+[?&]r=[^\s&#]+/)?.[0]
  if (oldCompressed) return decodeSharePayload(oldCompressed)
  if (text.trim().startsWith('{')) return decodeSharePayload(text)
  return decodeSharePayload(text.trim())
}
