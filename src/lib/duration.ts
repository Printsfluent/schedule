export type DurationUnit = 'hours' | 'minutes' | 'seconds'

export const MIN_DURATION_SECONDS = 1

export function clampDurationSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < MIN_DURATION_SECONDS) return MIN_DURATION_SECONDS
  return Math.round(seconds)
}

export function secondsToUnitValue(seconds: number, unit: DurationUnit) {
  if (unit === 'hours') return Math.round((seconds / 3600) * 1000) / 1000
  if (unit === 'minutes') return Math.round((seconds / 60) * 100) / 100
  return seconds
}

export function unitValueToSeconds(value: number, unit: DurationUnit) {
  if (!Number.isFinite(value)) return MIN_DURATION_SECONDS
  if (unit === 'hours') return Math.round(value * 3600)
  if (unit === 'minutes') return Math.round(value * 60)
  return Math.round(value)
}

export function unitInputConfig(unit: DurationUnit) {
  if (unit === 'hours') {
    return {
      min: MIN_DURATION_SECONDS / 3600,
      step: 0.05,
    }
  }
  if (unit === 'minutes') {
    return {
      min: MIN_DURATION_SECONDS / 60,
      step: 1,
    }
  }
  return {
    min: MIN_DURATION_SECONDS,
    step: 1,
  }
}

export function formatDurationCompact(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  if (m > 0 && s > 0) return `${m}m ${s}s`
  if (m > 0) return `${m}m`
  return `${s}s`
}
