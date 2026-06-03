export interface ScheduleReminder {
  id: string
  hour: number
  minute: number
  label: string
  body: string
  weekdaysOnly: boolean
}

export const SCHEDULE_REMINDERS: ScheduleReminder[] = [
  { id: 'wake', hour: 6, minute: 30, label: 'Rhythm — Good morning', body: 'Log your sleep to start the day', weekdaysOnly: true },
  { id: 'study', hour: 8, minute: 0, label: 'Rhythm — Study time', body: 'Programming deep focus — before work drains you.', weekdaysOnly: true },
  { id: 'work-am', hour: 10, minute: 30, label: 'Rhythm — Work', body: 'First work block. Check power & internet first.', weekdaysOnly: true },
  { id: 'lunch', hour: 14, minute: 30, label: 'Rhythm — Lunch break', body: 'Eat and rest. No guilt.', weekdaysOnly: true },
  { id: 'gym', hour: 17, minute: 30, label: 'Rhythm — Gym', body: 'Separator between work stress and personal life.', weekdaysOnly: true },
  { id: 'fun', hour: 20, minute: 0, label: 'Rhythm — Fun time', body: 'Friends, gaming, football — scheduled joy.', weekdaysOnly: true },
  { id: 'wind-down', hour: 23, minute: 0, label: 'Rhythm — Wind down', body: 'Start shutting down. Sleep by midnight.', weekdaysOnly: true },
  { id: 'burnout', hour: 17, minute: 0, label: 'Rhythm — Burnout check', body: 'How\'s energy? Consider a recovery block tonight.', weekdaysOnly: true },
  { id: 'sat-code', hour: 10, minute: 0, label: 'Rhythm — Saturday coding', body: 'Longer project session — build something.', weekdaysOnly: false },
]

export const DEFAULT_REMINDER_IDS = SCHEDULE_REMINDERS.map((r) => r.id)
