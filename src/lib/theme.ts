import { safeStorage } from './browserCompat'
import { getDeviceStorageKey, STORAGE_BASE } from './deviceStorage'
import type { ThemePreference } from '../types'

const STORAGE_KEY = getDeviceStorageKey(STORAGE_BASE)

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' ? getSystemTheme() : preference
}

export function readStoredThemePreference(): ThemePreference {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY)
    if (!raw) return 'dark'
    const parsed = JSON.parse(raw) as { settings?: { theme?: ThemePreference } }
    const theme = parsed.settings?.theme
    if (theme === 'light' || theme === 'dark' || theme === 'system') return theme
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function applyTheme(preference: ThemePreference): 'light' | 'dark' {
  const resolved = resolveTheme(preference)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', resolved === 'dark' ? '#0a0e14' : '#f4f6f9')
  }
  return resolved
}

export function bootstrapTheme() {
  applyTheme(readStoredThemePreference())
}

export function watchSystemTheme(onChange: (theme: 'light' | 'dark') => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => onChange(getSystemTheme())
  media.addEventListener('change', handler)
  return () => media.removeEventListener('change', handler)
}
