import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function supabaseKey(): string | undefined {
  return import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
}

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && supabaseKey())
}

export function getSupabase(): SupabaseClient | null {
  const key = supabaseKey()
  if (!import.meta.env.VITE_SUPABASE_URL || !key) return null
  if (!client) {
    client = createClient(import.meta.env.VITE_SUPABASE_URL as string, key, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
      },
    })
  }
  return client
}
