import { useEffect, useRef } from 'react'
import { getBlocksForDate, getTomorrowKey, parseDateKey } from '../lib/dates'
import { syncDeviceAlarms } from '../lib/deviceAlarms'
import type { NativeSyncContext } from '../lib/nativeNotifications'
import type { AppSettings, DayLog } from '../types'

interface Options extends NativeSyncContext {
  settings: AppSettings['notifications']
  getLog?: (dateKey: string) => DayLog
}

/** Auto-link today + tomorrow plan times to device alarms when plans change. */
export function useDeviceAlarmSync({ settings, todayKey, todayLog, timeBlocks, getLog }: Options) {
  const lastSyncKey = useRef('')
  const tomorrowKey = getTomorrowKey(todayKey)
  const tomorrowLog = getLog?.(tomorrowKey)
  const todayPlanKey = (todayLog.dailyPlan ?? []).map((item) => item.id).join(',')
  const tomorrowPlanKey = (tomorrowLog?.dailyPlan ?? []).map((item) => item.id).join(',')

  useEffect(() => {
    const todayHasBlocks = getBlocksForDate(timeBlocks, parseDateKey(todayKey)).length > 0
    const tomorrowHasBlocks = getBlocksForDate(timeBlocks, parseDateKey(tomorrowKey)).length > 0
    if (
      todayPlanKey.length === 0 &&
      tomorrowPlanKey.length === 0 &&
      !todayHasBlocks &&
      !tomorrowHasBlocks
    ) {
      return
    }

    const syncKey = `${todayKey}:${todayPlanKey}:${tomorrowKey}:${tomorrowPlanKey}:${todayHasBlocks}:${tomorrowHasBlocks}:${settings.enabled}:${settings.alarmStyle}`
    if (syncKey === lastSyncKey.current) return
    lastSyncKey.current = syncKey

    const contexts: NativeSyncContext[] = [{ todayKey, todayLog, timeBlocks }]
    if (tomorrowLog && (tomorrowPlanKey.length > 0 || tomorrowHasBlocks)) {
      contexts.push({ todayKey: tomorrowKey, todayLog: tomorrowLog, timeBlocks })
    }
    void syncDeviceAlarms(settings, contexts)
  }, [
    todayPlanKey,
    tomorrowPlanKey,
    settings.enabled,
    settings.alarmStyle,
    todayKey,
    todayLog,
    tomorrowKey,
    tomorrowLog,
    timeBlocks,
    settings,
  ])
}

export { syncDeviceAlarms }
