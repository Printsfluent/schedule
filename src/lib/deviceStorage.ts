import { clearRhythmStorage } from './browserCompat'

const STORAGE_BASE = 'rhythm-app-v2'

function hashString(input: string): string {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function deviceFingerprint(): string {
  let timezone = 'UTC'
  try {
    timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    /* ignore */
  }
  return [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.availWidth,
    screen.availHeight,
    screen.colorDepth,
    timezone,
    navigator.maxTouchPoints ?? 0,
    navigator.platform ?? '',
  ].join('|')
}

export function getDeviceStorageKey(base: string = STORAGE_BASE): string {
  if (typeof window === 'undefined') return base
  return `${base}-${hashString(deviceFingerprint())}`
}

export function clearDeviceStorage() {
  clearRhythmStorage()
}

export { STORAGE_BASE }
