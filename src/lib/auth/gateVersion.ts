/**
 * Bump AUTH_GATE_GENERATION to bust stale PWA caches and redirect guests to /login.
 * Does not sign out users who are already logged in.
 */
export const AUTH_GATE_GENERATION = 7

export const SW_PURGE_LOCAL_KEY = `rhythm-sw-purge-v${AUTH_GATE_GENERATION}`
export const FORCE_LOGIN_LOCAL_KEY = `rhythm-force-login-v${AUTH_GATE_GENERATION}`
export const SW_RELOAD_SESSION_KEY = `rhythm-sw-reload-v${AUTH_GATE_GENERATION}`
export const SERVICE_WORKER_FILE = `rhythm-sw-v${AUTH_GATE_GENERATION}.js`
export const WORKBOX_CACHE_ID = `rhythm-auth-v${AUTH_GATE_GENERATION}`
