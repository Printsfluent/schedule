export type Mood = 'great' | 'good' | 'okay' | 'tired' | 'rough'
export type ActivityCategory = 'work' | 'health' | 'study' | 'social' | 'rest' | 'life'
export type Recurring = 'daily' | 'weekday' | 'weekend' | 'saturday' | 'sunday' | 'none'
export type FocusType = 'deep-work' | 'study' | 'pomodoro'
export type AmbientSound = 'none' | 'rain' | 'brown' | 'lofi'
export type TabId = 'home' | 'schedule' | 'focus' | 'habits' | 'insights'
export type ScheduleMode = 'weekday' | 'weekend' | 'exam' | 'gym'

export interface PlanSnooze {
  planItemId: string
  until: number
}

export interface Gamification {
  xp: number
  totalXp: number
  level: number
}

export interface FocusModeTimer {
  workSeconds: number
  breakSeconds: number
}

export type FocusTimers = Record<FocusType, FocusModeTimer>

export interface TimeBlock {
  id: string
  startMinutes: number
  durationMinutes: number
  label: string
  category: ActivityCategory
  recurring: Recurring
  enabled: boolean
}

export interface Task {
  id: string
  text: string
  done: boolean
  category: ActivityCategory
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  createdAt: string
}

export interface Habit {
  id: string
  name: string
  emoji: string
  category: ActivityCategory
}

export interface StudyBlocks {
  concepts: boolean
  projects: boolean
  tutorials: boolean
  practice: boolean
}

export interface DayPlanItem {
  id: string
  kind: 'block' | 'custom'
  blockId?: string
  label: string
  category: ActivityCategory
  startMinutes: number
  durationMinutes: number
  done?: boolean
}

export interface DayLog {
  date: string
  mood: Mood | null
  /** Which home encouragement / mood quote is showing (syncs across devices). */
  homeMessageIndex?: number
  sleepHours: number | null
  wakeCompleted: boolean
  completedBlockIds: string[]
  completedTaskIds: string[]
  completedHabitIds: string[]
  studyBlocks: StudyBlocks
  studyMinutes: number
  focusMinutes: number
  workoutDone: boolean
  powerOutage: boolean
  internetOutage: boolean
  isRecoveryDay: boolean
  funMinutes: number
  notes: string
  dailyPlan?: DayPlanItem[]
  morningPlanDone?: boolean
  morningSleepFeedbackDone?: boolean
  morningFlowComplete?: boolean
  eveningPlanPrompt?: 'declined' | 'planned'
  /** Calendar .ics was exported for this day. */
  calendarExported?: boolean
  /** User skipped export after planning — remind at first block start. */
  calendarExportSkipped?: boolean
  wakeDelayMinutes?: number
  planSnoozes?: PlanSnooze[]
  weeklyReviewNote?: string
}

export interface WeeklyPlan {
  weekKey: string
  workFocus: string
  studyGoal: string
  healthGoal: string
  socialPlan: string
  restPlan: string
  notes: string
  items: { id: string; text: string; done: boolean }[]
}

export interface SpotifySettings {
  playlistUrl: string
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface NotificationSettings {
  enabled: boolean
  reminderIds: string[]
  alarmStyle: 'gentle' | 'classic' | 'urgent' | 'off'
  syncDeviceTime: boolean
}

export interface AppSettings {
  theme: ThemePreference
  focusTimers: FocusTimers
  ambientSound: AmbientSound
  ambientVolume: number
  spotify: SpotifySettings
  notifications: NotificationSettings
  realisticMode: boolean
  scheduleMode: ScheduleMode
  adaptiveScheduling: boolean
  persistentReminders: boolean
}

export interface AppState {
  timeBlocks: TimeBlock[]
  tasks: Task[]
  habits: Habit[]
  days: Record<string, DayLog>
  weeklyPlans: Record<string, WeeklyPlan>
  settings: AppSettings
  gamification: Gamification
  onboardingDone: boolean
  planDateKey: string
  planFocusBlockId: string | null
}

export interface ConsistencyStats {
  score7: number
  score14: number
  score30: number
  gentleStreak: number
  graceDaysUsed: number
  graceDaysAvailable: number
  todayCounts: boolean
  message: string
}

export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  work: '#6ea8fe',
  health: '#3dd68c',
  study: '#f4d35e',
  social: '#f4a261',
  rest: '#7c9cbf',
  life: '#c4a1ff',
}

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  work: 'Work',
  health: 'Health',
  study: 'Study',
  social: 'Social',
  rest: 'Rest',
  life: 'Life',
}
