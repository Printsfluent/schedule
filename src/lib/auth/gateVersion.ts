/**
 * Bump AUTH_GATE_GENERATION to force every client back to /login and drop stale PWA caches.
 * Keep in sync with index.html placeholders (injected at build time).
 */
export const AUTH_GATE_GENERATION = 6

export const SW_PURGE_LOCAL_KEY = `rhythm-sw-purge-v${AUTH_GATE_GENERATION}`
export const FORCE_LOGIN_LOCAL_KEY = `rhythm-force-login-v${AUTH_GATE_GENERATION}`
export const SW_RELOAD_SESSION_KEY = `rhythm-sw-reload-v${AUTH_GATE_GENERATION}`
export const SERVICE_WORKER_FILE = `rhythm-sw-v${AUTH_GATE_GENERATION}.js`
export const WORKBOX_CACHE_ID = `rhythm-auth-v${AUTH_GATE_GENERATION}`
