/**
 * Bump AUTH_GATE_GENERATION and AUTH_LOGIN_REQUIRED_EPOCH together to force
 * every device (including pre-login testers) through /login once, then bust PWA caches.
 */
export const AUTH_GATE_GENERATION = 9

/** One-time epoch — devices below this must clear auth and sign in again. */
export const AUTH_LOGIN_REQUIRED_EPOCH = AUTH_GATE_GENERATION

/** Set on window by the live bundle; missing means a cached pre-auth build is running. */
export const AUTH_BUNDLE_REV = AUTH_GATE_GENERATION

export const AUTH_EPOCH_STORAGE_KEY = 'rhythm-auth-epoch'

export const SW_PURGE_LOCAL_KEY = `rhythm-sw-purge-v${AUTH_GATE_GENERATION}`
export const FORCE_LOGIN_LOCAL_KEY = `rhythm-force-login-v${AUTH_GATE_GENERATION}`
export const SW_RELOAD_SESSION_KEY = `rhythm-sw-reload-v${AUTH_GATE_GENERATION}`
export const SERVICE_WORKER_FILE = `rhythm-sw-v${AUTH_GATE_GENERATION}.js`
export const WORKBOX_CACHE_ID = `rhythm-auth-v${AUTH_GATE_GENERATION}`
