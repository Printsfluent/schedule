import {
  downloadDailyCalendarIcs,
  shareDailyCalendarIcs,
} from './calendarExport'
import { syncDeviceAlarms, type DeviceAlarmSyncResult } from './deviceAlarms'
import type { NativeSyncContext } from './nativeNotifications'
import type { AppSettings } from '../types'

export type PlanExportResult = {
  calendarShared: boolean
  calendarDownloaded: boolean
  alarms: DeviceAlarmSyncResult
}

/** Export .ics to calendar and schedule matching in-app / device plan alarms. */
export async function exportPlanToCalendarAndAlarms(
  forDate: Date,
  ics: string,
  notificationSettings: AppSettings['notifications'],
  alarmContexts: NativeSyncContext | NativeSyncContext[],
): Promise<PlanExportResult> {
  const alarms = await syncDeviceAlarms(notificationSettings, alarmContexts)
  const calendarShared = await shareDailyCalendarIcs(forDate, ics)
  const calendarDownloaded = !calendarShared
  if (calendarDownloaded) downloadDailyCalendarIcs(forDate, ics)
  return { calendarShared, calendarDownloaded, alarms }
}

export function formatPlanExportStatus(result: PlanExportResult): string {
  const parts: string[] = []
  if (result.calendarShared) {
    parts.push('Calendar shared — import to get alerts on your phone.')
  } else if (result.calendarDownloaded) {
    parts.push('Calendar file downloaded — open it to import events.')
  }
  if (result.alarms.scheduled > 0) {
    parts.push(`${result.alarms.scheduled} Rhythm alarm${result.alarms.scheduled === 1 ? '' : 's'} scheduled in-app.`)
  } else if (result.alarms.message) {
    parts.push(result.alarms.message)
  }
  return parts.join(' ')
}
