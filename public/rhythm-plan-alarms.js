/* Plan alarm scheduling for the Rhythm service worker (importScripts). */
'use strict'

var alarmTimers = Object.create(null)
var storedAlarms = []

function clearTimers() {
  Object.keys(alarmTimers).forEach(function (id) {
    clearTimeout(alarmTimers[id])
  })
  alarmTimers = Object.create(null)
}

function showAlarm(alarm) {
  return self.registration.showNotification(alarm.title, {
    body: alarm.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: alarm.id,
    requireInteraction: true,
    vibrate: [250, 120, 250, 120, 250],
    data: { planAlarmId: alarm.id },
  })
}

function rescheduleAll() {
  clearTimers()
  var now = Date.now()
  storedAlarms.forEach(function (alarm) {
    var delay = alarm.at - now
    if (delay <= 0) return
    if (delay > 2147483647) delay = 2147483647
    alarmTimers[alarm.id] = setTimeout(function () {
      showAlarm(alarm)
    }, delay)
  })
}

self.addEventListener('message', function (event) {
  var data = event.data
  if (!data || data.type !== 'SYNC_PLAN_ALARMS') return
  storedAlarms = Array.isArray(data.alarms) ? data.alarms : []
  rescheduleAll()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
  rescheduleAll()
})
