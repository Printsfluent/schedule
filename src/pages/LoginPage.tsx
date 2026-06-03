import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { RhythmLogo } from '../components/RhythmLogo'
import { Card } from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'

type Mode = 'signin' | 'signup'

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.5 10.7A3 3 0 0 0 12 15a3 3 0 0 0 2.2-5.2M6.7 6.8C4.6 8.1 3 10 2 12c0 0 3.5 7 10 7 1.8 0 3.4-.5 4.8-1.2M9.9 5.1A10.1 10.1 0 0 1 12 5c6.5 0 10 7 10 7a16.2 16.2 0 0 1-3.2 4.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength = 6,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  minLength?: number
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-2xl border border-border bg-inset py-3 pl-4 pr-11 text-sm outline-none focus:border-accent/50"
          placeholder="••••••••"
          minLength={minLength}
          required
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-subtle transition-colors hover:text-fg"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  )
}

function SupabaseSetupNotice() {
  return (
    <Card glow="#6ea8fe">
      <h2 className="text-[17px] font-semibold">Supabase required</h2>
      <p className="mt-2 text-xs leading-relaxed text-subtle">
        Rhythm needs Supabase for sign-in. Create a free project at{' '}
        <a href="https://supabase.com" className="text-accent underline" target="_blank" rel="noreferrer">
          supabase.com
        </a>
        , then set these environment variables when you build or deploy:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-inset p-3 text-[11px] text-muted">
        {`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key`}
      </pre>
      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        In Supabase: Authentication → Providers → enable Email. For quick testing, disable “Confirm email”
        under Email settings.
      </p>
    </Card>
  )
}

export function LoginPage() {
  const { user, loading, signIn, signUp, supabaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [signInEmail, setSignInEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const err = await signIn(signInEmail, password)
        if (err) {
          setError(err)
          return
        }
        navigate('/', { replace: true })
        return
      }

      if (password !== confirm) {
        setError('Passwords do not match.')
        return
      }

      const err = await signUp(email, username, password)
      if (err) {
        if (err.includes('confirm')) setInfo(err)
        else setError(err)
        return
      }
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-base px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8 flex flex-col items-center text-center">
          <RhythmLogo className="size-14 rounded-2xl" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Rhythm</h1>
          <p className="mt-1 text-sm text-subtle">
            {mode === 'signin' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        {!supabaseConfigured ? (
          <SupabaseSetupNotice />
        ) : (
          <Card glow="#3dd68c">
            <div className="mb-4 flex rounded-2xl bg-inset p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setError(null)
                  setInfo(null)
                }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-panel text-fg shadow-sm' : 'text-subtle'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  setError(null)
                  setInfo(null)
                }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-panel text-fg shadow-sm' : 'text-subtle'}`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
              {mode === 'signin' ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Email</span>
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-2xl border border-border bg-inset px-4 py-3 text-sm outline-none focus:border-accent/50"
                    placeholder="you@email.com"
                    required
                  />
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">Username</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                      autoComplete="username"
                      autoCapitalize="off"
                      className="w-full rounded-2xl border border-border bg-inset px-4 py-3 text-sm outline-none focus:border-accent/50"
                      placeholder="yourname"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="w-full rounded-2xl border border-border bg-inset px-4 py-3 text-sm outline-none focus:border-accent/50"
                      placeholder="you@email.com"
                      required
                    />
                  </label>
                </>
              )}

              <PasswordField
                id="login-password"
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />

              {mode === 'signup' && (
                <PasswordField
                  id="login-confirm-password"
                  label="Confirm password"
                  value={confirm}
                  onChange={setConfirm}
                  autoComplete="new-password"
                />
              )}

              {error && <p className="text-xs text-[#e76f6f]">{error}</p>}
              {info && <p className="text-xs text-accent">{info}</p>}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 w-full rounded-2xl bg-accent py-3.5 text-sm font-semibold text-accent-text disabled:opacity-60"
              >
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}
