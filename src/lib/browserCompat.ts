/** Cross-browser helpers for Safari, Chrome, Firefox, Edge, and mobile WebViews. */

const memoryStore = new Map<string, string>()
let storageAvailable: boolean | null = null

function canUseLocalStorage(): boolean {
  if (storageAvailable !== null) return storageAvailable
  if (typeof localStorage === 'undefined') {
    storageAvailable = false
    return false
  }
  try {
    localStorage.setItem('__rhythm_probe__', '1')
    localStorage.removeItem('__rhythm_probe__')
    storageAvailable = true
  } catch {
    storageAvailable = false
  }
  return storageAvailable
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (canUseLocalStorage()) {
      try {
        return localStorage.getItem(key)
      } catch {
        /* private mode / quota */
      }
    }
    return memoryStore.get(key) ?? null
  },
  setItem(key: string, value: string) {
    if (canUseLocalStorage()) {
      try {
        localStorage.setItem(key, value)
        return
      } catch {
        /* fall through to memory */
      }
    }
    memoryStore.set(key, value)
  },
  removeItem(key: string) {
    if (canUseLocalStorage()) {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    }
    memoryStore.delete(key)
  },
}

function isRhythmStorageKey(key: string) {
  return (
    key.startsWith('rhythm-') ||
    key.startsWith('schedule-') ||
    key === 'schedule-app-state'
  )
}

/** Wipe every Rhythm key from localStorage and the in-memory fallback store. */
export function clearRhythmStorage() {
  for (const key of memoryStore.keys()) {
    if (isRhythmStorageKey(key)) memoryStore.delete(key)
  }
  if (canUseLocalStorage()) {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && isRhythmStorageKey(key)) toRemove.push(key)
    }
    toRemove.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    })
  }
}

/** Clear Rhythm keys from sessionStorage (if any). */
export function clearRhythmSessionStorage() {
  if (typeof sessionStorage === 'undefined') return
  const toRemove: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && isRhythmStorageKey(key)) toRemove.push(key)
  }
  toRemove.forEach((key) => {
    try {
      sessionStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  })
}

type AudioContextCtor = typeof AudioContext

export function createAudioContext(): AudioContext {
  const w = window as Window & {
    webkitAudioContext?: AudioContextCtor
  }
  const Ctx = window.AudioContext ?? w.webkitAudioContext
  if (!Ctx) throw new Error('AudioContext not supported')
  return new Ctx()
}

export async function requestNotificationPermissionCompat(): Promise<
  NotificationPermission | 'unsupported' | 'insecure'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (!window.isSecureContext) return 'insecure'

  const current = Notification.permission
  if (current === 'granted' || current === 'denied') return current

  try {
    const request = Notification.requestPermission.bind(Notification)
    const result = request()
    if (result && typeof (result as Promise<NotificationPermission>).then === 'function') {
      return await result
    }
  } catch {
    /* legacy callback API below */
  }

  return await new Promise<NotificationPermission>((resolve) => {
    try {
      Notification.requestPermission((permission) => resolve(permission))
    } catch {
      resolve('denied')
    }
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function cleanupStaleServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    if (import.meta.env.DEV) {
      await Promise.all(regs.map((r) => r.unregister()))
      return
    }
    // Production dev-server SW accidentally cached on phone — drop if no controller script
    for (const reg of regs) {
      if (!reg.active?.scriptURL.includes('sw.js')) {
        await reg.unregister()
      }
    }
  } catch {
    /* ignore */
  }
}

export async function cleanupRhythmCaches() {
  if (!('caches' in window)) return
  try {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((k) => k.includes('workbox') || k.includes('rhythm') || k.includes('vite'))
        .map((k) => caches.delete(k)),
    )
  } catch {
    /* ignore */
  }
}

export function bootstrapBrowserCompat() {
  if (typeof window === 'undefined') return

  void cleanupStaleServiceWorkers()
  if (import.meta.env.DEV) void cleanupRhythmCaches()

  // Legacy iOS viewport height fix
  const setVh = () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
  }
  setVh()
  window.addEventListener('resize', setVh)
  window.addEventListener('orientationchange', setVh)
}

export type BrowserName = 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other'

export function detectBrowser(): BrowserName {
  const ua = navigator.userAgent
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  if (/Edg\//i.test(ua)) return 'edge'
  if (/Firefox\//i.test(ua)) return 'firefox'
  if (/Chrome\//i.test(ua) || /CriOS/i.test(ua)) return 'chrome'
  if (/Safari/i.test(ua)) return 'safari'
  return 'other'
}
