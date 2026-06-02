import { useEffect, useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AlarmOverlay } from './components/AlarmOverlay'
import { EndOfDayPlanPrompt } from './components/EndOfDayPlanPrompt'
import { MorningCalendarOverlay } from './components/MorningCalendarOverlay'
import { MorningPlanOverlay } from './components/MorningPlanOverlay'
import { SleepFeedbackOverlay } from './components/SleepFeedbackOverlay'
import { WakeAlarmOverlay } from './components/WakeAlarmOverlay'
import { TabBar, AppHeader } from './components/layout/Shell'
import { AlarmActionsContext } from './context/AlarmActionsContext'
import { useEndOfDayPlanPrompt } from './hooks/useEndOfDayPlanPrompt'
import { useAlarmScheduler } from './hooks/useAlarmScheduler'
import { useDeviceAlarmSync } from './hooks/useDeviceAlarmSync'
import { useNativeNotifications } from './hooks/useNativeNotifications'
import { useTheme } from './hooks/useTheme'
import { getBlocksForDate, getTomorrowKey, parseDateKey } from './lib/dates'
import { getMorningFlowStep } from './lib/wakeFlow'
import { decodeSharePayload, importSharePayload } from './lib/shareRoutine'
import { DashboardPage } from './pages/DashboardPage'
import { FocusPage } from './pages/FocusPage'
import { HabitsPage } from './pages/HabitsPage'
import { InsightsPage } from './pages/InsightsPage'
import { SchedulePage } from './pages/SchedulePage'
import { useStore } from './store/useStore'

export default function App() {
  const {
    state,
    todayKey,
    todayLog,
    setSleep,
    completeWake,
    updateDay,
    setPlanFocus,
    setPlanDate,
    importFriendRoutine,
    getLog,
  } = useStore()
  const {
    activeAlarm,
    showWakePopup,
    dismissAlarm,
    dismissWakePopup,
    triggerTestAlarm,
    scheduleTestAlarm,
    clearFiredToday,
    testScheduledAt,
  } = useAlarmScheduler({
    settings: state.settings,
    todayKey,
    todayLog,
    timeBlocks: state.timeBlocks,
  })

  useDeviceAlarmSync({
    settings: state.settings.notifications,
    todayKey,
    todayLog,
    timeBlocks: state.timeBlocks,
    getLog,
  })
  useNativeNotifications({
    settings: state.settings.notifications,
    todayKey,
    todayLog,
    timeBlocks: state.timeBlocks,
  })
  useTheme(state.settings.theme)

  useEffect(() => {
    if (window.location.search.includes('reset=')) {
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    const params = new URLSearchParams(window.location.search)
    const dParam = params.get('d')
    const rParam = params.get('r')
    const dataParam = params.get('data')
    const hashQuery = window.location.hash.replace(/^#\/?/, '')
    const raw = dParam
      ? `d=${dParam}`
      : rParam
        ? `r=${rParam}`
        : dataParam
          ? `data=${dataParam}`
          : hashQuery.includes('d=') || hashQuery.includes('r=') || hashQuery.includes('data=')
            ? hashQuery
            : window.location.href.includes('rhythm://share')
              ? window.location.href
              : ''
    if (!raw) return
    const payload = decodeSharePayload(raw)
    if (payload) {
      importFriendRoutine(importSharePayload(payload))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [importFriendRoutine, todayKey])

  const morningStep = getMorningFlowStep(todayKey, todayLog)
  const showSleepStep = morningStep === 'sleep' || (showWakePopup && todayLog.sleepHours === null)

  const morningBlocking = morningStep !== null || showSleepStep

  const tomorrowKey = useMemo(() => getTomorrowKey(todayKey), [todayKey])
  const tomorrowDate = useMemo(() => parseDateKey(tomorrowKey), [tomorrowKey])

  const tomorrowBlocks = useMemo(
    () => getBlocksForDate(state.timeBlocks, tomorrowDate),
    [state.timeBlocks, tomorrowDate],
  )
  const todayBlocks = useMemo(
    () => getBlocksForDate(state.timeBlocks, parseDateKey(todayKey)),
    [state.timeBlocks, todayKey],
  )

  const {
    showEveningPrompt,
    eveningFlow,
    dismissEveningPrompt,
    startEveningPlan,
    showEveningCalendar,
    finishEveningFlow,
  } = useEndOfDayPlanPrompt({
    todayLog,
    todayBlocks,
    blocked: morningBlocking,
  })

  const eveningBlocking = eveningFlow !== null
  const appBlocked = morningBlocking || eveningBlocking

  return (
    <AlarmActionsContext.Provider
      value={{ triggerTestAlarm, scheduleTestAlarm, clearFiredToday }}
    >
      <div className="mx-auto min-h-screen min-h-[100dvh] max-w-lg bg-base text-fg">
        {!appBlocked && (
          <>
            <main className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
              <AppHeader />
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/focus" element={<FocusPage />} />
                <Route path="/habits" element={<HabitsPage />} />
                <Route path="/insights" element={<InsightsPage testScheduledAt={testScheduledAt} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <TabBar />
          </>
        )}

        {showSleepStep && (
          <WakeAlarmOverlay
            onSaveSleep={(hours) => {
              setSleep(todayKey, hours)
              updateDay(todayKey, {
                morningSleepFeedbackDone: false,
                morningFlowComplete: false,
              })
              dismissWakePopup()
            }}
            onSkip={() => {
              completeWake(todayKey)
              updateDay(todayKey, { morningFlowComplete: true })
              dismissWakePopup()
            }}
          />
        )}

        {morningStep === 'sleepFeedback' && todayLog.sleepHours != null && (
          <SleepFeedbackOverlay
            sleepHours={todayLog.sleepHours}
            todayKey={todayKey}
            days={state.days}
            onContinue={() =>
              updateDay(todayKey, { morningSleepFeedbackDone: true, morningFlowComplete: true })
            }
          />
        )}

        {!appBlocked && activeAlarm && activeAlarm.kind === 'reminder' && (
          <AlarmOverlay
            alarm={activeAlarm}
            persistentReminders={state.settings.persistentReminders}
            planSnoozes={todayLog.planSnoozes}
            onDismiss={dismissAlarm}
            onSnooze={(planItemId, until) =>
              updateDay(todayKey, {
                planSnoozes: [...(todayLog.planSnoozes ?? []).filter((s) => s.planItemId !== planItemId), { planItemId, until }],
              })
            }
          />
        )}
        {showEveningPrompt && (
          <EndOfDayPlanPrompt
            onYes={startEveningPlan}
            onNo={() => {
              updateDay(todayKey, { eveningPlanPrompt: 'declined' })
              dismissEveningPrompt()
            }}
          />
        )}

        {eveningFlow === 'plan' && (
          <MorningPlanOverlay
            planDate={tomorrowDate}
            blocks={tomorrowBlocks}
            initialPlan={getLog(tomorrowKey).dailyPlan ?? []}
            scheduleMode={state.settings.scheduleMode}
            realisticMode={state.settings.realisticMode}
            onContinue={(items) => {
              updateDay(tomorrowKey, { dailyPlan: items })
              updateDay(todayKey, { eveningPlanPrompt: 'planned' })
              setPlanDate(todayKey)
              const firstBlock = items.find((item) => item.kind === 'block')
              setPlanFocus(tomorrowKey, firstBlock?.blockId ?? null)
              showEveningCalendar()
            }}
          />
        )}

        {eveningFlow === 'calendar' && (
          <MorningCalendarOverlay
            forDate={tomorrowDate}
            planDateKey={tomorrowKey}
            planLog={getLog(tomorrowKey)}
            timeBlocks={state.timeBlocks}
            notificationSettings={state.settings.notifications}
            dailyPlan={getLog(tomorrowKey).dailyPlan ?? []}
            onDone={() => {
              finishEveningFlow()
            }}
          />
        )}

      </div>
    </AlarmActionsContext.Provider>
  )
}
