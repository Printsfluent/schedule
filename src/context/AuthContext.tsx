import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authRedirectUrl } from '../lib/auth/redirectUrl'
import { applyAuthSessionResetIfNeeded } from '../lib/auth/sessionReset'
import { isValidEmail, isValidUsername } from '../lib/auth/validation'
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient'

export type AuthUser = {
  id: string
  email: string
  username: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  supabaseConfigured: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, username: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function usernameFromSupabaseUser(
  meta: Record<string, unknown> | undefined,
  email: string,
): string {
  const raw = meta?.username
  if (typeof raw === 'string' && isValidUsername(raw)) return raw.toLowerCase()
  return email.split('@')[0]?.slice(0, 20) || 'user'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseConfigured = isSupabaseConfigured()

  const applySession = useCallback(
    (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (!session?.user.email) {
        setUser(null)
        return
      }
      setUser({
        id: session.user.id,
        email: session.user.email,
        username: usernameFromSupabaseUser(session.user.user_metadata, session.user.email),
      })
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabase()

    if (!supabase) {
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      await applyAuthSessionResetIfNeeded(supabase)
      const { data } = await supabase.auth.getSession()
      if (!cancelled) {
        applySession(data.session)
        setLoading(false)
      }
    })()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })
    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [applySession])

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const supabase = getSupabase()
    if (!supabase) return 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).'

    const normalized = email.trim().toLowerCase()
    if (!isValidEmail(normalized)) return 'Enter a valid email address.'

    const { error } = await supabase.auth.signInWithPassword({ email: normalized, password })
    return error?.message ?? null
  }, [])

  const signUp = useCallback(
    async (email: string, username: string, password: string): Promise<string | null> => {
      const supabase = getSupabase()
      if (!supabase) return 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).'

      if (!isValidEmail(email)) return 'Enter a valid email address.'
      if (!isValidUsername(username)) {
        return 'Username must be 3–20 characters (letters, numbers, underscore).'
      }
      if (password.length < 6) return 'Password must be at least 6 characters.'

      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: authRedirectUrl(),
          data: { username: username.trim().toLowerCase() },
        },
      })
      if (error) return error.message

      const { data } = await supabase.auth.getSession()
      if (data.session) {
        applySession(data.session)
        return null
      }
      return 'Check your email to confirm your account, then sign in.'
    },
    [applySession],
  )

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      supabaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [user, loading, supabaseConfigured, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
