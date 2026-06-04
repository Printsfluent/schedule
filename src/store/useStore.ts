import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { DEFAULT_REMINDER_IDS } from '../data/notifications'
import { createDefaultBlocks, DEFAULT_HABITS } from '../data/defaults'
import type {
  AppSettings,
  AppState,
  DayLog,
  DayPlanItem,
  FocusModeTimer,
  FocusTimers,
  Habit,
  Mood,
  ScheduleMode,
  StudyBlocks,
  Task,
  TimeBlock,
  WeeklyPlan,
} from '../types'
import { applyBlockCascadeOnDay, cascadeEntireDay } from '../lib/blockCascade'
import { refreshBlockTimesInPlan } from '../lib/dailyPlan'
import { emptyDayLog, formatDateKey, getBlocksForDate, parseDateKey } from '../lib/dates'
import { applyAutoHabitsToLog } from '../lib/habitTracking'
import { addXp, defaultGamification, xpForCategory } from '../lib/gamification'
import { safeStorage } from '../lib/browserCompat'
import { getDeviceStorageKey, getUserStorageKey, STORAGE_BASE } from '../lib/deviceStorage'
import { clampDurationSeconds } from '../lib/duration'
import { applySleepScheduleMigration } from '../lib/ensureSleepBlock'
import { createId } from '../lib/id'

let storageKey = getDeviceStorageKey(STORAGE_BASE)
let skipCloudPush = false
let cloudPushHandler: ((s: AppState) => void) | null = null

function defaultFocusTimers(): FocusTimers {
  return {
    'deep-work': { workSeconds: 50 * 60, breakSeconds: 10 * 60 },
    study: { workSeconds: 45 * 60, breakSeconds: 10 * 60 },
    pomodoro: { workSeconds: 25 * 60, breakSeconds: 5 * 60 },
  }
}

function normalizeFocusModeTimer(
  raw: Partial<FocusModeTimer> & { workMinutes?: number; breakMinutes?: number },
  fallback: FocusModeTimer,
): FocusModeTimer {
  let workSeconds = raw.workSeconds
  let breakSeconds = raw.breakSeconds
  if (workSeconds == null && raw.workMinutes != null) workSeconds = raw.workMinutes * 60
  if (breakSeconds == null && raw.breakMinutes != null) breakSeconds = raw.breakMinutes * 60
  return {
    workSeconds: clampDurationSeconds(workSeconds ?? fallback.workSeconds),
    breakSeconds: clampDurationSeconds(breakSeconds ?? fallback.breakSeconds),
  }
}

function defaultSettings(): AppSettings {
  return {
    theme: 'dark',
    focusTimers: defaultFocusTimers(),
    ambientSound: 'none',
    ambientVolume: 0.3,
    spotify: {
      playlistUrl: '',
    },
    notifications: {
      enabled: true,
      reminderIds: DEFAULT_REMINDER_IDS,
      alarmStyle: 'classic',
      syncDeviceTime: true,
    },
    realisticMode: true,
    scheduleMode: 'weekday',
    adaptiveScheduling: true,
    persistentReminders: true,
    gentleStreakSince: null,
  }
}

function defaultState(): AppState {
  return {
    timeBlocks: createDefaultBlocks(),
    tasks: [],
    habits: DEFAULT_HABITS,
    days: {},
    weeklyPlans: {},
    settings: defaultSettings(),
    gamification: defaultGamification(),
    onboardingDone: true,
    planDateKey: formatDateKey(new Date()),
    planFocusBlockId: null,
  }
}

function enrichDayLog(s: AppState, dateKey: string, log: DayLog): DayLog {
  const blocks = getBlocksForDate(s.timeBlocks, parseDateKey(dateKey))
  return applyAutoHabitsToLog(s.habits, { ...log, date: dateKey }, blocks)
}

function resyncAllDays(s: AppState): Record<string, DayLog> {
  const days = { ...s.days }
  for (const [key, log] of Object.entries(days)) {
    if (log && typeof log === 'object') {
      days[key] = enrichDayLog(s, key, log)
    }
  }
  return days
}

function stripHabit(h: Habit & { flexible?: boolean }): Habit {
  return { id: h.id, name: h.name, emoji: h.emoji, category: h.category }
}

function migrateFocusTimers(raw: Partial<AppSettings> & { pomodoroWork?: number; pomodoroBreak?: number }): FocusTimers {
  const base = defaultFocusTimers()
  if (raw.focusTimers && typeof raw.focusTimers === 'object') {
    return {
      'deep-work': normalizeFocusModeTimer(raw.focusTimers['deep-work'] ?? {}, base['deep-work']),
      study: normalizeFocusModeTimer(raw.focusTimers.study ?? {}, base.study),
      pomodoro: normalizeFocusModeTimer(raw.focusTimers.pomodoro ?? {}, base.pomodoro),
    }
  }
  if (raw.pomodoroWork != null || raw.pomodoroBreak != null) {
    return {
      ...base,
      pomodoro: normalizeFocusModeTimer(
        {
          workMinutes: raw.pomodoroWork ?? base.pomodoro.workSeconds / 60,
          breakMinutes: raw.pomodoroBreak ?? base.pomodoro.breakSeconds / 60,
        },
        base.pomodoro,
      ),
    }
  }
  return base
}

function migrate(raw: Partial<AppState>): AppState {
  try {
    const base = defaultState()
    const days: Record<string, DayLog> = {}
    for (const [key, record] of Object.entries(raw.days ?? {})) {
      if (record && typeof record === 'object') {
        days[key] = {
          ...emptyDayLog(key),
          ...record,
          wakeCompleted: record.wakeCompleted ?? false,
          dailyPlan: Array.isArray(record.dailyPlan)
            ? record.dailyPlan.map((item) => ({
                ...item,
                startMinutes: item.startMinutes ?? 9 * 60,
                durationMinutes: item.durationMinutes ?? 30,
              }))
            : [],
          morningSleepFeedbackDone:
            record.morningSleepFeedbackDone ??
            Boolean(record.morningPlanDone || record.morningFlowComplete),
          morningFlowComplete:
            record.morningFlowComplete ??
            Boolean(record.morningPlanDone || record.morningSleepFeedbackDone),
        }
      }
    }
    const timeBlocks = Array.isArray(raw.timeBlocks) && raw.timeBlocks.length > 0
      ? raw.timeBlocks.filter((b) => b && typeof b.id === 'string')
      : base.timeBlocks
    const migratedHabits = Array.isArray(raw.habits)
      ? raw.habits.filter((h) => h && typeof h.id === 'string').map(stripHabit)
      : []
    const habits =
      migratedHabits.length > 0
        ? migratedHabits.map((h) => {
            const fallback = base.habits.find((d) => d.id === h.id)
            return {
              ...h,
              emoji: h.emoji || fallback?.emoji || '✓',
              name: h.name || fallback?.name || 'Habit',
            }
          })
        : base.habits
    const migrated: AppState = {
      ...base,
      timeBlocks,
      habits,
      days,
      weeklyPlans: raw.weeklyPlans && typeof raw.weeklyPlans === 'object' ? raw.weeklyPlans : {},
      planDateKey: raw.planDateKey ?? formatDateKey(new Date()),
      planFocusBlockId: raw.planFocusBlockId ?? null,
      settings: {
        ...defaultSettings(),
        ...(raw.settings && typeof raw.settings === 'object' ? raw.settings : {}),
        theme: raw.settings?.theme ?? 'dark',
        notifications: {
          ...defaultSettings().notifications,
          ...(raw.settings?.notifications ?? {}),
          alarmStyle: raw.settings?.notifications?.alarmStyle ?? 'classic',
          syncDeviceTime: raw.settings?.notifications?.syncDeviceTime ?? true,
        },
        spotify: {
          playlistUrl: raw.settings?.spotify?.playlistUrl ?? '',
        },
        focusTimers: migrateFocusTimers(raw.settings ?? {}),
        realisticMode: raw.settings?.realisticMode ?? true,
        scheduleMode: raw.settings?.scheduleMode ?? 'weekday',
        adaptiveScheduling: raw.settings?.adaptiveScheduling ?? true,
        persistentReminders: raw.settings?.persistentReminders ?? true,
        gentleStreakSince:
          typeof raw.settings?.gentleStreakSince === 'string'
            ? raw.settings.gentleStreakSince
            : null,
      },
      gamification: {
        ...defaultGamification(),
        ...(raw.gamification && typeof raw.gamification === 'object' ? raw.gamification : {}),
      },
    }
    return { ...migrated, days: resyncAllDays(migrated) }
  } catch {
    return defaultState()
  }
}

function finalizeLoadedState(key: string, loaded: AppState): AppState {
  const [state, changed] = applySleepScheduleMigration(loaded)
  if (changed) {
    try {
      safeStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* quota */
    }
  }
  return state
}

function load(key: string = storageKey): AppState {
  if (typeof window === 'undefined') {
    return defaultState()
  }
  try {
    const raw = safeStorage.getItem(key)
    if (raw) return finalizeLoadedState(key, migrate(JSON.parse(raw) as Partial<AppState>))
    const legacy = safeStorage.getItem('schedule-app-state')
    if (legacy) return finalizeLoadedState(key, migrate(JSON.parse(legacy) as Partial<AppState>))
  } catch {
    /* ignore corrupt storage */
  }
  return finalizeLoadedState(key, defaultState())
}

export function setCloudPushHandler(handler: ((s: AppState) => void) | null): void {
  cloudPushHandler = handler
}

/** Switch local cache to the signed-in user (call before cloud sync). */
export function setStorageUserId(userId: string | null): void {
  if (userId) {
    const userKey = getUserStorageKey(userId)
    const deviceKey = getDeviceStorageKey(STORAGE_BASE)
    if (!safeStorage.getItem(userKey) && safeStorage.getItem(deviceKey)) {
      try {
        safeStorage.setItem(userKey, safeStorage.getItem(deviceKey)!)
      } catch {
        /* quota */
      }
    }
    storageKey = userKey
  } else {
    storageKey = getDeviceStorageKey(STORAGE_BASE)
  }
  state = load(storageKey)
  listeners.forEach((l) => l())
}

export function getAppState(): AppState {
  return state
}

export function replaceAppState(next: AppState): void {
  const [migrated] = applySleepScheduleMigration(migrate(next))
  state = migrated
  skipCloudPush = true
  try {
    safeStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    /* quota */
  }
  skipCloudPush = false
  listeners.forEach((l) => l())
}

/** Replace in-memory state and storage with factory defaults (empty logs, zero streaks). */
export function persistFactoryDefaults() {
  state = {
    ...defaultState(),
    days: {},
    weeklyPlans: {},
    tasks: [],
  }
  try {
    safeStorage.removeItem('schedule-app-state')
    safeStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    /* quota exceeded etc */
  }
}

let state = load(storageKey)
const listeners = new Set<() => void>()

function emit() {
  try {
    safeStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    /* quota exceeded etc */
  }
  if (!skipCloudPush && cloudPushHandler) {
    cloudPushHandler(state)
  }
  listeners.forEach((l) => l())
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(state)
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

function getDay(dateKey: string): DayLog {
  return state.days[dateKey] ?? emptyDayLog(dateKey)
}

function patchDay(dateKey: string, patch: Partial<DayLog>) {
  setState((s) => {
    const log = enrichDayLog(s, dateKey, { ...getDay(dateKey), ...patch, date: dateKey })
    return {
      ...s,
      days: {
        ...s.days,
        [dateKey]: log,
      },
    }
  })
}

export function useStore() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const todayKey = formatDateKey(new Date())
  const todayLog = useMemo(() => snap.days[todayKey] ?? emptyDayLog(todayKey), [snap.days, todayKey])

  const getLog = useCallback((dateKey: string) => snap.days[dateKey] ?? emptyDayLog(dateKey), [snap.days])

  const updateDay = useCallback((dateKey: string, patch: Partial<DayLog>) => {
    patchDay(dateKey, patch)
  }, [])

  const toggleBlockComplete = useCallback((dateKey: string, blockId: string) => {
    setState((s) => {
      const log = s.days[dateKey] ?? emptyDayLog(dateKey)
      const set = new Set(log.completedBlockIds)
      const wasDone = set.has(blockId)
      if (wasDone) set.delete(blockId)
      else set.add(blockId)
      const block = s.timeBlocks.find((b) => b.id === blockId)
      const gamification =
        !wasDone && block ? addXp(s.gamification ?? defaultGamification(), xpForCategory(block.category)) : (s.gamification ?? defaultGamification())
      const next = enrichDayLog(s, dateKey, { ...log, completedBlockIds: [...set] })
      return { ...s, gamification, days: { ...s.days, [dateKey]: next } }
    })
  }, [])

  const awardXp = useCallback((amount: number) => {
    setState((s) => ({ ...s, gamification: addXp(s.gamification ?? defaultGamification(), amount) }))
  }, [])

  const importFriendRoutine = useCallback(
    (data: { plan: DayPlanItem[]; scheduleMode: ScheduleMode; realisticMode: boolean }) => {
      const key = formatDateKey(new Date())
      patchDay(key, { dailyPlan: data.plan })
      setState((s) => ({
        ...s,
        planDateKey: key,
        settings: { ...s.settings, scheduleMode: data.scheduleMode, realisticMode: data.realisticMode },
      }))
    },
    [],
  )

  const addTask = useCallback((text: string, category: Task['category'] = 'life') => {
    setState((s) => ({
      ...s,
      tasks: [
        ...s.tasks,
        {
          id: createId(),
          text,
          done: false,
          category,
          priority: 'medium',
          createdAt: new Date().toISOString(),
        },
      ],
    }))
  }, [])

  const toggleTask = useCallback((taskId: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
    }))
  }, [])

  const toggleTaskToday = useCallback((dateKey: string, taskId: string) => {
    setState((s) => {
      const log = s.days[dateKey] ?? emptyDayLog(dateKey)
      const set = new Set(log.completedTaskIds)
      if (set.has(taskId)) set.delete(taskId)
      else set.add(taskId)
      const next = enrichDayLog(s, dateKey, { ...log, completedTaskIds: [...set] })
      return { ...s, days: { ...s.days, [dateKey]: next } }
    })
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
    }))
  }, [])

  const removeTask = useCallback((taskId: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }))
  }, [])

  const setMood = useCallback((dateKey: string, mood: Mood) => {
    patchDay(dateKey, { mood })
  }, [])

  const setSleep = useCallback((dateKey: string, hours: number | null) => {
    patchDay(dateKey, { sleepHours: hours, wakeCompleted: hours !== null ? true : undefined })
  }, [])

  const completeWake = useCallback((dateKey: string) => {
    patchDay(dateKey, { wakeCompleted: true })
  }, [])

  const toggleRecovery = useCallback((dateKey: string) => {
    const log = getDay(dateKey)
    patchDay(dateKey, { isRecoveryDay: !log.isRecoveryDay })
  }, [])

  const toggleOutage = useCallback((dateKey: string, type: 'power' | 'internet') => {
    const log = getDay(dateKey)
    patchDay(dateKey, {
      powerOutage: type === 'power' ? !log.powerOutage : log.powerOutage,
      internetOutage: type === 'internet' ? !log.internetOutage : log.internetOutage,
    })
  }, [])

  const toggleStudyBlock = useCallback((dateKey: string, block: keyof StudyBlocks) => {
    setState((s) => {
      const log = s.days[dateKey] ?? emptyDayLog(dateKey)
      const studyBlocks = { ...log.studyBlocks, [block]: !log.studyBlocks[block] }
      const studyMinutes = log.studyMinutes + (studyBlocks[block] ? 30 : -30)
      const next = enrichDayLog(s, dateKey, {
        ...log,
        studyBlocks,
        studyMinutes: Math.max(0, studyMinutes),
      })
      return { ...s, days: { ...s.days, [dateKey]: next } }
    })
  }, [])

  const addFocusMinutes = useCallback((dateKey: string, minutes: number, type: 'study' | 'focus') => {
    setState((s) => {
      const log = s.days[dateKey] ?? emptyDayLog(dateKey)
      const next = enrichDayLog(s, dateKey, {
        ...log,
        focusMinutes: log.focusMinutes + minutes,
        studyMinutes: type === 'study' ? log.studyMinutes + minutes : log.studyMinutes,
      })
      return { ...s, days: { ...s.days, [dateKey]: next } }
    })
  }, [])

  const updateTimeBlock = useCallback(
    (blockId: string, patch: Partial<TimeBlock>, forDateKey?: string) => {
      setState((s) => {
        const date = forDateKey ? parseDateKey(forDateKey) : null
        const cascades =
          patch.startMinutes != null || patch.durationMinutes != null
        let timeBlocks =
          date && cascades
            ? applyBlockCascadeOnDay(s.timeBlocks, date, blockId, patch)
            : s.timeBlocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b))
        let days = s.days
        const refreshKeys = new Set<string>()
        if (forDateKey) refreshKeys.add(forDateKey)
        refreshKeys.add(formatDateKey(new Date()))
        for (const refreshKey of refreshKeys) {
          const log = days[refreshKey]
          const plan = log?.dailyPlan
          if (!log || !plan || plan.length === 0) continue
          days = {
            ...days,
            [refreshKey]: {
              ...log,
              dailyPlan: refreshBlockTimesInPlan(plan, timeBlocks, parseDateKey(refreshKey)),
            },
          }
        }
        return { ...s, timeBlocks, days }
      })
    },
    [],
  )

  const recascadeDay = useCallback((forDateKey: string) => {
    setState((s) => {
      const timeBlocks = cascadeEntireDay(s.timeBlocks, parseDateKey(forDateKey))
      let days = s.days
      const log = days[forDateKey]
      const plan = log?.dailyPlan
      if (log && plan && plan.length > 0) {
        days = {
          ...days,
          [forDateKey]: {
            ...log,
            dailyPlan: refreshBlockTimesInPlan(plan, timeBlocks, parseDateKey(forDateKey)),
          },
        }
      }
      return { ...s, timeBlocks, days }
    })
  }, [])

  /** Swap stored start times for two blocks on a day, then re-chain the full day. */
  const swapDayBlockStarts = useCallback((forDateKey: string, idA: string, idB: string) => {
    setState((s) => {
      const a = s.timeBlocks.find((b) => b.id === idA)
      const b = s.timeBlocks.find((block) => block.id === idB)
      if (!a || !b) return s
      let timeBlocks = s.timeBlocks.map((block) => {
        if (block.id === idA) return { ...block, startMinutes: b.startMinutes }
        if (block.id === idB) return { ...block, startMinutes: a.startMinutes }
        return block
      })
      timeBlocks = cascadeEntireDay(timeBlocks, parseDateKey(forDateKey))
      let days = s.days
      const log = days[forDateKey]
      const plan = log?.dailyPlan
      if (log && plan && plan.length > 0) {
        days = {
          ...days,
          [forDateKey]: {
            ...log,
            dailyPlan: refreshBlockTimesInPlan(plan, timeBlocks, parseDateKey(forDateKey)),
          },
        }
      }
      return { ...s, timeBlocks, days }
    })
  }, [])

  const addTimeBlock = useCallback((block: Omit<TimeBlock, 'id'>, blockId?: string) => {
      const id = blockId ?? createId()
      setState((s) => ({
        ...s,
        timeBlocks: [...s.timeBlocks, { ...block, id }],
      }))
      return id
    },
    [],
  )

  const removeTimeBlock = useCallback((blockId: string) => {
    setState((s) => {
      const days: Record<string, DayLog> = {}
      for (const [key, log] of Object.entries(s.days)) {
        days[key] = {
          ...log,
          completedBlockIds: log.completedBlockIds.filter((id) => id !== blockId),
          dailyPlan: (log.dailyPlan ?? []).filter(
            (item) => !(item.kind === 'block' && item.blockId === blockId),
          ),
        }
      }
      return {
        ...s,
        timeBlocks: s.timeBlocks.filter((b) => b.id !== blockId),
        days,
        planFocusBlockId: s.planFocusBlockId === blockId ? null : s.planFocusBlockId,
      }
    })
  }, [])

  const reorderTimeBlocks = useCallback((orderedIds: string[]) => {
    setState((s) => {
      const map = new Map(s.timeBlocks.map((b) => [b.id, b]))
      const reordered = orderedIds.map((id) => map.get(id)!).filter(Boolean)
      const rest = s.timeBlocks.filter((b) => !orderedIds.includes(b.id))
      return { ...s, timeBlocks: [...reordered, ...rest] }
    })
  }, [])

  const updateWeeklyPlan = useCallback((weekKey: string, patch: Partial<WeeklyPlan>) => {
    setState((s) => {
      const current = s.weeklyPlans[weekKey] ?? {
        weekKey,
        workFocus: '',
        studyGoal: '',
        healthGoal: '',
        socialPlan: '',
        restPlan: '',
        notes: '',
        items: [],
      }
      return { ...s, weeklyPlans: { ...s.weeklyPlans, [weekKey]: { ...current, ...patch, weekKey } } }
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [])

  const addHabit = useCallback((habit: Omit<Habit, 'id'>) => {
    setState((s) => ({
      ...s,
      habits: [...s.habits, { ...habit, id: createId() }],
    }))
  }, [])

  const setPlanDate = useCallback((dateKey: string) => {
    setState((s) => ({ ...s, planDateKey: dateKey, planFocusBlockId: null }))
  }, [])

  const setPlanFocus = useCallback((dateKey: string, blockId: string | null) => {
    setState((s) => ({ ...s, planDateKey: dateKey, planFocusBlockId: blockId }))
  }, [])

  return {
    state: snap,
    todayKey,
    todayLog,
    getLog,
    updateDay,
    toggleBlockComplete,
    addTask,
    toggleTask,
    toggleTaskToday,
    removeTask,
    setMood,
    setSleep,
    completeWake,
    toggleRecovery,
    toggleOutage,
    toggleStudyBlock,
    addFocusMinutes,
    updateTimeBlock,
    recascadeDay,
    swapDayBlockStarts,
    addTimeBlock,
    removeTimeBlock,
    reorderTimeBlocks,
    updateWeeklyPlan,
    updateSettings,
    addHabit,
    setPlanDate,
    setPlanFocus,
    awardXp,
    importFriendRoutine,
  }
}
