/** URL Supabase should redirect to after email confirmation (must be allowlisted in Supabase). */
export function authRedirectUrl(): string {
  if (typeof window === 'undefined') return '/login'
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}/login`
}
