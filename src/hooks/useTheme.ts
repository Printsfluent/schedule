import { useEffect } from 'react'
import { applyTheme, watchSystemTheme } from '../lib/theme'
import type { ThemePreference } from '../types'

export function useTheme(preference: ThemePreference) {
  useEffect(() => {
    applyTheme(preference)
    if (preference !== 'system') return
    return watchSystemTheme(() => applyTheme('system'))
  }, [preference])
}
