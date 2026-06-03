/** Where Firebase email verification links should return users. */
export function emailVerificationContinueUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  if (typeof window === 'undefined') return `${base}/login`
  return `${window.location.origin}${base}/login`
}
