import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppAboutSummary } from '../components/AppAboutSummary'
import { RhythmLogo } from '../components/RhythmLogo'
import { Card } from '../components/ui/Card'
import { useAuth } from '../context/AuthContext'
import { formatAuthError, VERIFICATION_EMAIL_COOLDOWN_SEC } from '../lib/auth/errors'

type Mode = 'signin' | 'signup'

const EYE_STROKE = '#9db0cc'

function EyeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke={EYE_STROKE}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke={EYE_STROKE} strokeWidth="2" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.5 10.7A3 3 0 0 0 12 15a3 3 0 0 0 2.2-5.2M6.7 6.8C4.6 8.1 3 10 2 12c0 0 3.5 7 10 7 1.8 0 3.4-.5 4.8-1.2M9.9 5.1A10.1 10.1 0 0 1 12 5c6.5 0 10 7 10 7a16.2 16.2 0 0 1-3.2 4.2"
        stroke={EYE_STROKE}
        strokeWidth="2"
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
          className="relative z-0 w-full rounded-2xl border border-border bg-inset py-3 pl-4 pr-12 text-sm outline-none focus:border-accent/50"
          placeholder="••••••••"
          minLength={minLength}
          required
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center rounded-r-2xl bg-inset/80"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  )
}

function FirebaseSetupNotice() {
  return (
    <Card glow="#6ea8fe">
      <h2 className="text-[17px] font-semibold">Firebase required</h2>
      <p className="mt-2 text-xs leading-relaxed text-subtle">
        Create a project at{' '}
        <a href="https://console.firebase.google.com" className="text-accent underline" target="_blank" rel="noreferrer">
          Firebase Console
        </a>
        , enable Email/Password auth, and add these env vars:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-inset p-3 text-[11px] text-muted">
        {`VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=`}
      </pre>
      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        See <code className="text-muted">firebase/SETUP.md</code> in the repo for step-by-step setup.
      </p>
    </Card>
  )
}

export function LoginPage() {
  const {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    refreshEmailVerification,
    resendVerificationEmail,
    authConfigured,
    skipEmailVerification: skipVerify,
  } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [signInEmail, setSignInEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  if (!loading && user && !pendingVerifyEmail) {
    return <Navigate to="/" replace />
  }

  const handleCheckVerified = async () => {
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      const verified = await refreshEmailVerification()
      if (!verified) {
        setError('Not verified yet. Open the link in your email, then try again.')
        return
      }
      setPendingVerifyEmail(null)
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return
    setError(null)
    setBusy(true)
    try {
      const err = await resendVerificationEmail()
      if (err) {
        setError(formatAuthError(err))
        return
      }
      setResendCooldown(VERIFICATION_EMAIL_COOLDOWN_SEC)
      setInfo('Verification email sent again.')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      const result = await signInWithGoogle()
      if (result.status === 'error') {
        if (result.message !== 'Sign-in cancelled.') {
          setError(formatAuthError(result.message, result.code))
        }
        return
      }
      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        const result = await signIn(signInEmail, password)
        if (result.status === 'error') {
          setError(formatAuthError(result.message, result.code))
          return
        }
        if (result.status === 'verify_email') {
          setPendingVerifyEmail(signInEmail.trim().toLowerCase())
          setInfo('Verify your email using the link we sent, then tap the button below.')
          return
        }
        navigate('/', { replace: true })
        return
      }

      if (password !== confirm) {
        setError('Passwords do not match.')
        return
      }

      const result = await signUp(email, username, password)
      if (result.status === 'error') {
        setError(formatAuthError(result.message, result.code))
        return
      }
      if (result.status === 'signed_in') {
        navigate('/', { replace: true })
        return
      }

      setPendingVerifyEmail(email.trim().toLowerCase())
      setResendCooldown(VERIFICATION_EMAIL_COOLDOWN_SEC)
      setInfo('We sent a verification link to your email. Open it, then continue below.')
    } finally {
      setBusy(false)
    }
  }

  if (pendingVerifyEmail) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-base px-4 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <RhythmLogo className="size-14 rounded-2xl" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Verify your email</h1>
            <p className="mt-1 text-sm text-subtle">
              We sent a link to <span className="text-fg">{pendingVerifyEmail}</span>
            </p>
          </div>

          <Card glow="#3dd68c">
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-relaxed text-subtle">
                Open the email from Firebase, tap <strong className="text-fg">Verify email</strong>, then
                return here.
              </p>

              {error && <p className="text-xs text-[#e76f6f]">{error}</p>}
              {info && <p className="text-xs text-accent">{info}</p>}

              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCheckVerified()}
                className="mt-1 w-full rounded-2xl bg-accent py-3.5 text-sm font-semibold text-accent-text disabled:opacity-60"
              >
                {busy ? 'Please wait…' : "I've verified my email"}
              </button>

              <button
                type="button"
                disabled={busy || resendCooldown > 0}
                onClick={() => void handleResendEmail()}
                className="text-xs text-subtle underline disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend verification email'}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPendingVerifyEmail(null)
                  setError(null)
                  setInfo(null)
                }}
                className="text-xs text-faint"
              >
                ← Back to sign in
              </button>
            </div>
          </Card>
        </div>
      </div>
    )
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

        <AppAboutSummary />

        {!authConfigured ? (
          <FirebaseSetupNotice />
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

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] text-faint">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleGoogleSignIn()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-inset py-3.5 text-sm font-semibold text-fg disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {skipVerify && (
              <p className="mt-3 text-center text-[10px] text-faint">
                Email verification skipped (VITE_FIREBASE_SKIP_EMAIL_VERIFICATION=true)
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
