import type { SupabaseClient } from '@supabase/supabase-js'

/** Bump to sign out every client on their next visit (e.g. when login becomes required). */
export const AUTH_SESSION_RESET_VERSION = 1

const VERSION_KEY = 'rhythm-auth-reset-version'

export async function applyAuthSessionResetIfNeeded(supabase: SupabaseClient): Promise<void> {
  if (typeof localStorage === 'undefined') return

  const current = String(AUTH_SESSION_RESET_VERSION)
  if (localStorage.getItem(VERSION_KEY) === current) return

  await supabase.auth.signOut({ scope: 'local' })
  localStorage.setItem(VERSION_KEY, current)
}
