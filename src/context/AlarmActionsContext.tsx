import { createContext, useContext } from 'react'

export interface AlarmActions {
  triggerTestAlarm: () => void
  scheduleTestAlarm: (delayMs?: number) => void
  clearFiredToday: () => void
}

export const AlarmActionsContext = createContext<AlarmActions>({
  triggerTestAlarm: () => {},
  scheduleTestAlarm: () => {},
  clearFiredToday: () => {},
})

export function useAlarmActions() {
  return useContext(AlarmActionsContext)
}
