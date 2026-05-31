import { useState } from 'react'
import { SCHEDULE_REMINDERS } from '../data/notifications'
import {
  countDailyCalendarEvents,
  generateDailyCalendarIcs,
} from '../lib/calendarExport'
import { syncDeviceAlarms, countUpcomingDeviceAlarms } from '../lib/deviceAlarms'
import { exportPlanToCalendarAndAlarms, formatPlanExportStatus } from '../lib/planScheduleExport'
import { emptyDayLog, formatDateKey } from '../lib/dates'
import { formatDeviceTime, getDeviceSyncLabel, getDeviceTimezone } from '../lib/deviceTime'
import { useAlarmActions } from '../context/AlarmActionsContext'
import {
  isNativeApp,
  scheduleNativeTestNotification,
} from '../lib/nativeNotifications'
import {
  getNotificationPermission,
  getNotificationStatusMessage,
  requestNotificationPermission,
} from '../hooks/useAlarmScheduler'
import type { AppSettings, AppState } from '../types'
import { Card, SectionTitle } from './ui/Card'

interface Props {
  state: AppState
  onUpdateSettings: (patch: Partial<AppSettings>) => void
  testScheduledAt: number | null
}

const ALARM_STYLES: { id: AppSettings['notifications']['alarmStyle']; label: string }[] = [
  { id: 'gentle', label: 'Gentle' },
  { id: 'classic', label: 'Classic' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'off', label: 'Silent' },
]

function formatReminderTime(hour: number, minute: number): string {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return formatDeviceTime(d)
}

export function AlarmSyncPanel({ state, onUpdateSettings, testScheduledAt }: Props) {
  const notif = state.settings.notifications
  const permission = getNotificationPermission()
  const [nativeStatus, setNativeStatus] = useState<string | null>(null)
  const native = isNativeApp()
  const today = new Date()
  const todayKey = formatDateKey(today)
  const todayLog = state.days[todayKey] ?? emptyDayLog(todayKey)
  const dailyPlan = todayLog.dailyPlan ?? []
  const todayEventCount = countDailyCalendarEvents(today, state.timeBlocks, notif, dailyPlan)
  const upcomingDeviceAlarms = countUpcomingDeviceAlarms({
    todayKey,
    todayLog,
    timeBlocks: state.timeBlocks,
  })

  const { triggerTestAlarm, scheduleTestAlarm, clearFiredToday } = useAlarmActions()

  const syncDevice = async () => {
    const result = await syncDeviceAlarms(notif, {
      todayKey,
      todayLog,
      timeBlocks: state.timeBlocks,
    })
    setNativeStatus(result.message)
  }

  const testNative = async () => {
    const ok = await scheduleNativeTestNotification(5)
    setNativeStatus(ok ? 'Native test notification in 5 seconds.' : 'Native notification permission required.')
  }

  const allowBrowserNotifications = async () => {
    const p = await requestNotificationPermission()
    if (p === 'granted') {
      onUpdateSettings({
        notifications: { ...notif, enabled: true, syncDeviceTime: true },
      })
      if (native) await syncDevice()
    }
  }

  const runTestAlarm = async () => {
    onUpdateSettings({
      notifications: { ...notif, enabled: true },
    })
    await allowBrowserNotifications()
    triggerTestAlarm()
  }

  const exportCalendar = async () => {
    const ics = generateDailyCalendarIcs(today, state.timeBlocks, notif, dailyPlan)
    const result = await exportPlanToCalendarAndAlarms(
      today,
      ics,
      notif,
      { todayKey, todayLog, timeBlocks: state.timeBlocks },
    )
    setNativeStatus(formatPlanExportStatus(result))
  }

  const toggleReminder = (id: string) => {
    const ids = new Set(notif.reminderIds)
    if (ids.has(id)) ids.delete(id)
    else ids.add(id)
    onUpdateSettings({ notifications: { ...notif, reminderIds: [...ids] } })
  }

  return (
    <>
      <Card glow="#3dd68c">
        <SectionTitle title="Device time sync" subtitle="Uses your phone clock & timezone" />
        <p className="text-sm text-muted">{getDeviceSyncLabel()}</p>
        <p className="mt-2 text-xs text-subtle">
          Timezone: {getDeviceTimezone()} · All schedule blocks follow your device date & time
        </p>
      </Card>

      <Card glow="#3dd68c">
        <SectionTitle
          title="Plan device alarms"
          subtitle={
            dailyPlan.length > 0
              ? `${upcomingDeviceAlarms} upcoming today · 5 min before + start`
              : 'Plan your morning to link alarms'
          }
        />
        {native ? (
          <>
            <p className="mb-3 text-xs leading-relaxed text-subtle">
              When you finish your morning plan, Rhythm registers alerts with iOS / Android so
              they can fire when the app is closed — same times as your plan blocks.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={syncDevice}
                disabled={dailyPlan.length === 0}
                className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-accent-text disabled:opacity-40"
              >
                Link plan to device alarms
              </button>
              <button
                type="button"
                onClick={testNative}
                className="w-full rounded-2xl border border-border py-3 text-sm text-muted"
              >
                Native test in 5 seconds
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-xs leading-relaxed text-subtle">
              On the web, Rhythm links plan times to device notifications via the installed app
              (Add to Home Screen). Alarms fire at block start and 5 minutes before — even when
              Rhythm is in the background. For the Clock app, use Calendar export below.
            </p>
            <button
              type="button"
              onClick={syncDevice}
              disabled={dailyPlan.length === 0}
              className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-accent-text disabled:opacity-40"
            >
              Link plan to device alarms
            </button>
          </>
        )}
        {nativeStatus && <p className="mt-3 text-xs text-accent">{nativeStatus}</p>}
      </Card>

      <Card glow="#f4a261">
        <SectionTitle title="Test alarms" subtitle="Verify sound + on-screen alert now" />
        <p className="mb-3 text-xs leading-relaxed text-subtle">
          In-app alarms work while Rhythm is open. Plan device alarms (above) fire in the
          background after your morning plan. Use Test below to confirm sound and alerts on this
          device.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={runTestAlarm}
            className="w-full rounded-2xl bg-[#f4a261] py-3 text-sm font-semibold text-accent-text"
          >
            Test alarm now
          </button>
          <button
            type="button"
            onClick={() => {
              onUpdateSettings({ notifications: { ...notif, enabled: true } })
              scheduleTestAlarm(60_000)
            }}
            className="w-full rounded-2xl border border-border py-3 text-sm text-muted"
          >
            Test in 1 minute
          </button>
          {testScheduledAt && (
            <p className="text-center text-xs text-[#f4a261]">
              Test scheduled for {formatDeviceTime(new Date(testScheduledAt))} — keep Rhythm open
            </p>
          )}
          <button
            type="button"
            onClick={clearFiredToday}
            className="text-xs text-faint underline"
          >
            Reset today&apos;s fired reminders
          </button>
        </div>
      </Card>

      <Card>
        <SectionTitle
          title="Alarm-style reminders"
          subtitle="Sound + full-screen alert at schedule times"
        />
        <p className="mb-3 text-xs text-subtle">
          In-app alarms work while Rhythm is open. Browser banners need permission below. For alarms
          when the app is closed, use Calendar export.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {ALARM_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onUpdateSettings({ notifications: { ...notif, alarmStyle: s.id } })}
              className={`rounded-full px-3 py-1.5 text-sm ${notif.alarmStyle === s.id ? 'bg-accent-soft text-accent' : 'bg-inset text-muted'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs text-subtle">
          In-app alarms: {notif.enabled ? 'On' : 'Off'} · Browser: {permission}
          {dailyPlan.length > 0 && (
            <> · Device: {upcomingDeviceAlarms} linked</>
          )}
        </p>
        <p className="mb-3 text-xs leading-relaxed text-subtle">
          {getNotificationStatusMessage(permission)}
        </p>

        {permission !== 'granted' ? (
          <button
            type="button"
            onClick={allowBrowserNotifications}
            className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-accent-text"
          >
            Allow browser notifications
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onUpdateSettings({ notifications: { ...notif, enabled: !notif.enabled } })}
            className="w-full rounded-2xl border border-border py-3 text-sm text-muted"
          >
            {notif.enabled ? 'Turn off browser banners' : 'Turn on browser banners'}
          </button>
        )}
      </Card>

      <Card glow="#6ea8fe">
        <SectionTitle
          title="Today's Calendar"
          subtitle="One-day alerts via Apple/Google Calendar"
        />
        <p className="mb-3 text-sm text-muted">
          Export today&apos;s plan as a single .ics file. When you&apos;ve planned your morning,
          only those items export — no extra reminder duplicates.
        </p>
        <ol className="mb-4 space-y-1 text-xs text-subtle">
          <li>1. Tap Export below</li>
          <li>2. Open the .ics file (or Share → Calendar on iPhone)</li>
          <li>3. Enable alerts when importing</li>
          <li>4. Repeat tomorrow for that day&apos;s reminders</li>
        </ol>
        <button
          type="button"
          onClick={exportCalendar}
          disabled={todayEventCount === 0}
          className="w-full rounded-2xl bg-[#6ea8fe] py-3 text-sm font-semibold text-accent-text disabled:opacity-40"
        >
          Export today to Calendar & Alarms · {todayEventCount} event{todayEventCount === 1 ? '' : 's'}
        </button>
      </Card>

      <Card>
        <SectionTitle title="Reminder schedule" subtitle="Device local times" />
        <div className="space-y-2">
          {SCHEDULE_REMINDERS.map((r) => {
            const on = notif.reminderIds.includes(r.id)
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleReminder(r.id)}
                className="flex w-full items-center gap-3 rounded-xl bg-inset px-3 py-2.5 text-left"
              >
                <div
                  className="size-4 rounded border-2"
                  style={{
                    borderColor: on ? '#3dd68c' : 'rgba(255,255,255,0.15)',
                    background: on ? '#3dd68c' : 'transparent',
                  }}
                />
                <span className="w-16 shrink-0 text-xs tabular-nums text-accent">
                  {formatReminderTime(r.hour, r.minute)}
                </span>
                <span className="text-sm text-muted">{r.body}</span>
              </button>
            )
          })}
        </div>
      </Card>
    </>
  )
}
