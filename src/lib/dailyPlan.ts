import type { ActivityCategory, DayLog, DayPlanItem, TimeBlock } from '../types'
import { clampDayMinutes, formatDuration, formatTime, getBlocksForDate, UPCOMING_LIMIT } from './dates'

export type PlanDisplayEntry =
  | {
      kind: 'block'
      planItemId: string
      block: TimeBlock
      startMinutes: number
      durationMinutes: number
      done: boolean
    }
  | {
      kind: 'custom'
      item: DayPlanItem
      startMinutes: number
      durationMinutes: number
      done: boolean
    }

export function resolvePlanItemTime(
  item: DayPlanItem,
  block?: TimeBlock,
): { startMinutes: number; durationMinutes: number } {
  const startMinutes =
    item.startMinutes != null ? item.startMinutes : (block?.startMinutes ?? 9 * 60)
  const durationMinutes =
    item.durationMinutes != null ? item.durationMinutes : (block?.durationMinutes ?? 30)
  return { startMinutes, durationMinutes }
}

export function sortPlanByTime(plan: DayPlanItem[]): DayPlanItem[] {
  return [...plan].sort((a, b) => a.startMinutes - b.startMinutes)
}

/** After item at fromIndex, each plan starts when the previous one ends. */
export function cascadePlanFromIndex(plan: DayPlanItem[], fromIndex: number): DayPlanItem[] {
  if (plan.length <= 1 || fromIndex >= plan.length - 1) return plan

  const result = plan.map((item) => ({ ...item }))
  for (let i = fromIndex + 1; i < result.length; i++) {
    const prev = result[i - 1]
    result[i] = {
      ...result[i],
      startMinutes: clampDayMinutes(prev.startMinutes + prev.durationMinutes),
    }
  }
  return result
}

export function endOfPlan(plan: DayPlanItem[]): number {
  const ordered = sortPlanByTime(plan)
  if (ordered.length === 0) return defaultCustomStartMinutes()
  const last = ordered[ordered.length - 1]
  return clampDayMinutes(last.startMinutes + last.durationMinutes)
}

export function isSleepPlanItem(item: DayPlanItem): boolean {
  return /^sleep$/i.test(item.label.trim())
}

export function appendChainedPlanItem(plan: DayPlanItem[], newItem: DayPlanItem): DayPlanItem[] {
  if (plan.length === 0) return [newItem]
  const ordered = sortPlanByTime(plan)
  const chained = {
    ...newItem,
    startMinutes: endOfPlan(ordered),
  }
  return sortPlanByTime([...ordered, chained])
}

/** Chain a new item before overnight sleep so it does not land at 23:59 on top of sleep. */
export function insertChainedPlanItem(plan: DayPlanItem[], newItem: DayPlanItem): DayPlanItem[] {
  const sleepIdx = plan.findIndex(isSleepPlanItem)
  if (sleepIdx < 0) return appendChainedPlanItem(plan, newItem)

  let next = appendChainedPlanItem(plan.slice(0, sleepIdx), newItem)
  for (const item of plan.slice(sleepIdx)) {
    next = appendChainedPlanItem(next, item)
  }
  return recascadeEntirePlan(next)
}

export function movePlanItem(
  plan: DayPlanItem[],
  itemId: string,
  direction: 'up' | 'down',
): DayPlanItem[] {
  const idx = plan.findIndex((item) => item.id === itemId)
  if (idx < 0) return plan
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= plan.length) return plan

  const next = [...plan]
  ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
  return recascadeEntirePlan(next)
}

export function dedupeSleepInPlan(plan: DayPlanItem[]): DayPlanItem[] {
  const sleeps = plan.filter(isSleepPlanItem)
  if (sleeps.length <= 1) return plan

  const keepId = [...sleeps].sort((a, b) => a.startMinutes - b.startMinutes)[0].id
  return plan.filter((item) => !isSleepPlanItem(item) || item.id === keepId)
}

/** Remove duplicate sleep and fix chained times on load/save. */
export function sanitizeDailyPlan(
  plan: DayPlanItem[],
  timeBlocks: TimeBlock[] = [],
  forDate?: Date,
): DayPlanItem[] {
  if (plan.length === 0) return plan
  let next = dedupeSleepInPlan(plan)
  if (timeBlocks.length > 0 && forDate) {
    next = refreshBlockTimesInPlan(next, timeBlocks, forDate)
  }
  next = repairOverlappingPlanTimes(next)
  return recascadeEntirePlan(next)
}

export function recascadeEntirePlan(plan: DayPlanItem[]): DayPlanItem[] {
  const ordered = sortPlanByTime(plan)
  if (ordered.length <= 1) return ordered
  return cascadePlanFromIndex(ordered, 0)
}

export function createBlockPlanItem(block: TimeBlock): DayPlanItem {
  return {
    id: `plan-block-${block.id}-${Date.now()}`,
    kind: 'block',
    blockId: block.id,
    label: block.label,
    category: block.category,
    startMinutes: block.startMinutes,
    durationMinutes: block.durationMinutes,
    done: false,
  }
}

export function createCustomPlanItem(
  label: string,
  category: ActivityCategory = 'life',
  startMinutes = 10 * 60,
  durationMinutes = 30,
): DayPlanItem {
  return {
    id: `plan-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: 'custom',
    label: label.trim(),
    category,
    startMinutes,
    durationMinutes,
    done: false,
  }
}

export function getDailyPlan(log: DayLog | undefined): DayPlanItem[] {
  return sortPlanByTime(log?.dailyPlan ?? [])
}

/** True when the user explicitly picked items (evening/morning planner), not the recurring fallback. */
export function hasUserPickedPlan(log: DayLog | undefined): boolean {
  return (log?.dailyPlan?.length ?? 0) > 0
}

/** Picked plan for the day only — no automatic weekday/weekend schedule. */
export function getEffectivePlan(log: DayLog | undefined, _blocks: TimeBlock[]): DayPlanItem[] {
  return getDailyPlan(log)
}

export function cartHasBlock(cart: DayPlanItem[], blockId: string) {
  return cart.some((item) => item.kind === 'block' && item.blockId === blockId)
}

export function syncPlanItemsForBlock(
  plan: DayPlanItem[],
  blockId: string,
  patch: Partial<Pick<DayPlanItem, 'label' | 'category' | 'startMinutes' | 'durationMinutes'>>,
): DayPlanItem[] {
  return sortPlanByTime(
    plan.map((item) =>
      item.kind === 'block' && item.blockId === blockId ? { ...item, ...patch } : item,
    ),
  )
}

/** Keep plan item times as the user picked; only sync block label/category from the schedule. */
export function refreshBlockTimesInPlan(
  plan: DayPlanItem[],
  timeBlocks: TimeBlock[],
  forDate: Date,
): DayPlanItem[] {
  const dayBlocks = getBlocksForDate(timeBlocks, forDate)
  let next = plan
  for (const item of plan) {
    if (item.kind !== 'block' || !item.blockId) continue
    const block = dayBlocks.find((b) => b.id === item.blockId)
    if (!block) continue
    next = syncPlanItemsForBlock(next, block.id, {
      label: block.label,
      category: block.category,
    })
  }
  return sortPlanByTime(next)
}

export function updatePlanItemTime(
  plan: DayPlanItem[],
  itemId: string,
  patch: Partial<Pick<DayPlanItem, 'startMinutes' | 'durationMinutes'>>,
): DayPlanItem[] {
  const ordered = sortPlanByTime(plan)
  const idx = ordered.findIndex((item) => item.id === itemId)
  if (idx < 0) return ordered

  ordered[idx] = { ...ordered[idx], ...patch }
  return cascadePlanFromIndex(ordered, idx)
}

/** Re-chain overlapping plan items using stored durations (fixes legacy schedule-sync corruption). */
export function repairOverlappingPlanTimes(plan: DayPlanItem[]): DayPlanItem[] {
  const sorted = sortPlanByTime(plan)
  if (sorted.length <= 1) return sorted

  let needsRepair = false
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    if (sorted[i].startMinutes < prev.startMinutes + prev.durationMinutes) {
      needsRepair = true
      break
    }
  }
  if (!needsRepair) return sorted

  const result = sorted.map((item) => ({ ...item }))
  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1]
    result[i] = {
      ...result[i],
      startMinutes: clampDayMinutes(prev.startMinutes + prev.durationMinutes),
    }
  }
  return result
}

export function buildPlanDisplayEntries(
  log: DayLog | undefined,
  blocks: TimeBlock[],
): PlanDisplayEntry[] {
  const plan = repairOverlappingPlanTimes(dedupeSleepInPlan(getEffectivePlan(log, blocks)))
  if (plan.length === 0) return []

  const blockMap = new Map(blocks.map((b) => [b.id, b]))
  const entries: PlanDisplayEntry[] = []

  for (const item of plan) {
    if (item.kind === 'block' && item.blockId) {
      const block = blockMap.get(item.blockId)
      if (!block) continue
      const { startMinutes, durationMinutes } = resolvePlanItemTime(item, block)
      entries.push({
        kind: 'block',
        planItemId: item.id,
        block,
        startMinutes,
        durationMinutes,
        done: log?.completedBlockIds.includes(block.id) ?? false,
      })
    } else if (item.kind === 'custom') {
      const { startMinutes, durationMinutes } = resolvePlanItemTime(item)
      entries.push({
        kind: 'custom',
        item,
        startMinutes,
        durationMinutes,
        done: item.done ?? false,
      })
    }
  }

  return entries.sort((a, b) => a.startMinutes - b.startMinutes)
}

export function timelineRangeForEntries(
  entries: PlanDisplayEntry[],
): { dayStart: number; dayEnd: number } {
  const defaultStart = 6 * 60
  const defaultEnd = 24 * 60
  if (entries.length === 0) return { dayStart: defaultStart, dayEnd: defaultEnd }

  const minStart = Math.min(...entries.map((e) => e.startMinutes))
  const maxEnd = Math.max(...entries.map((e) => e.startMinutes + e.durationMinutes))
  const pad = 60
  const dayStart = Math.max(0, Math.floor((minStart - pad) / 60) * 60)
  const dayEnd = Math.min(24 * 60, Math.max(defaultEnd, Math.ceil((maxEnd + pad) / 60) * 60))
  return { dayStart, dayEnd }
}

export function assignTimelineLanes(
  entries: PlanDisplayEntry[],
): { entry: PlanDisplayEntry; lane: number; laneCount: number }[] {
  const sorted = [...entries].sort((a, b) => a.startMinutes - b.startMinutes)
  const laneEnds: number[] = []
  const placed: { entry: PlanDisplayEntry; lane: number }[] = []

  for (const entry of sorted) {
    const start = entry.startMinutes
    const end = start + entry.durationMinutes
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    placed.push({ entry, lane })
  }

  const laneCount = Math.max(1, laneEnds.length)
  return placed.map((row) => ({ ...row, laneCount }))
}

/** True when every plan item or schedule block for the day is marked done. */
export function isDayFullyComplete(
  log: DayLog | undefined,
  timeBlocks: TimeBlock[],
  forDate: Date,
): boolean {
  const dayBlocks = getBlocksForDate(timeBlocks, forDate)
  const entries = buildPlanDisplayEntries(log, dayBlocks)
  return entries.length > 0 && entries.every((entry) => entry.done)
}

/** Slice of the day's picked plan — same ordering as Schedule timeline. */
export function getPlanListSlice(
  entries: PlanDisplayEntry[],
  options: {
    limit?: number
    isToday?: boolean
    nowMinutes?: number
    /** When true, only items still in progress or upcoming (default for home "up next"). */
    upcomingOnly?: boolean
  } = {},
): PlanDisplayEntry[] {
  const limit = options.limit ?? UPCOMING_LIMIT
  let list = [...entries]

  if (options.upcomingOnly !== false) {
    list = list.filter((entry) => !entry.done)
    if (options.isToday && options.nowMinutes != null) {
      list = list.filter((entry) => entry.startMinutes + entry.durationMinutes > options.nowMinutes!)
    }
  }

  return list.slice(0, limit)
}

/** Home "Your plan" — next incomplete items from the user's picked plan. */
export function getHomePlanDisplayEntries(
  entries: PlanDisplayEntry[],
  options: {
    limit?: number
    isToday?: boolean
    nowMinutes?: number
  } = {},
): PlanDisplayEntry[] {
  return getPlanListSlice(entries, { ...options, upcomingOnly: true })
}

export function toggleCustomPlanItemDone(plan: DayPlanItem[], planItemId: string): DayPlanItem[] {
  return plan.map((item) =>
    item.id === planItemId && item.kind === 'custom' ? { ...item, done: !item.done } : item,
  )
}

export function planTimedItemsForCalendar(
  plan: DayPlanItem[],
  timeBlocks: TimeBlock[],
  forDate: Date,
): { id: string; label: string; startMinutes: number; durationMinutes: number }[] {
  const dayBlocks = getBlocksForDate(timeBlocks, forDate)
  const dayIds = new Set(dayBlocks.map((b) => b.id))
  const seenBlockIds = new Set<string>()
  const seenPlanIds = new Set<string>()
  const results: { id: string; label: string; startMinutes: number; durationMinutes: number }[] = []

  for (const item of plan) {
    if (seenPlanIds.has(item.id)) continue
    seenPlanIds.add(item.id)

    if (item.kind === 'block' && item.blockId) {
      if (!dayIds.has(item.blockId) || seenBlockIds.has(item.blockId)) continue
      seenBlockIds.add(item.blockId)
      const block = timeBlocks.find((b) => b.id === item.blockId)
      if (!block) continue
      const { startMinutes, durationMinutes } = resolvePlanItemTime(item, block)
      results.push({
        id: item.id,
        label: item.label,
        startMinutes,
        durationMinutes,
      })
    } else if (item.kind === 'custom') {
      const { startMinutes, durationMinutes } = resolvePlanItemTime(item)
      results.push({
        id: item.id,
        label: item.label,
        startMinutes,
        durationMinutes,
      })
    }
  }

  return results.sort((a, b) => a.startMinutes - b.startMinutes)
}

export function planSummarySubtitle(
  log: DayLog | undefined,
  blocks: TimeBlock[],
  dateKey: string,
  todayKey: string,
): string {
  const entries = buildPlanDisplayEntries(log, blocks)
  if (entries.length === 0) return 'Plan tonight to set tomorrow'
  const count = entries.length
  if (dateKey !== todayKey) return `${count} picked for this day`
  return `${count} picked for today`
}

export function formatPlanItemMeta(entry: PlanDisplayEntry): string {
  return `${formatTime(entry.startMinutes)} · ${formatDuration(entry.durationMinutes)}`
}

export function defaultCustomStartMinutes(): number {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const rounded = Math.ceil(mins / 15) * 15
  return Math.min(rounded, 23 * 60 + 45)
}
