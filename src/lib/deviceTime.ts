/** All schedule times use the device clock & local timezone automatically. */

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export function getDeviceLocale(): string {
  try {
    return navigator.language || 'en-NG'
  } catch {
    return 'en-NG'
  }
}

export function getDeviceNow(): Date {
  return new Date()
}

export function formatDeviceTime(date: Date = new Date()): string {
  return date.toLocaleTimeString(getDeviceLocale(), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: getDeviceTimezone(),
  })
}

export function formatDeviceDateTime(date: Date = new Date()): string {
  return date.toLocaleString(getDeviceLocale(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: getDeviceTimezone(),
  })
}

export function minutesToLocalDate(minutes: number, base: Date = new Date()): Date {
  const d = new Date(base)
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return d
}

export function isSameLocalMinute(a: Date, hour: number, minute: number): boolean {
  return a.getHours() === hour && a.getMinutes() === minute
}

export function getDeviceSyncLabel(): string {
  return `Synced with ${getDeviceTimezone()} · ${formatDeviceTime()}`
}
