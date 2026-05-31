export type DevicePlatform = 'ios' | 'android' | 'desktop'

export function detectPlatform(): DevicePlatform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function platformSettingsHint(platform: DevicePlatform, standalone: boolean): string {
  if (platform === 'ios') {
    if (standalone) {
      return 'Settings → Notifications → Rhythm → Allow Notifications'
    }
    return 'Add Rhythm to Home Screen first (Share → Add to Home Screen), then Settings → Notifications → Rhythm'
  }
  if (platform === 'android') {
    return 'Chrome → ⋮ → Settings → Site settings → Notifications → Allow for this site'
  }
  return 'Browser site settings → Notifications → Allow for this site'
}
