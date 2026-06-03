import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { skipEmailVerification } from '../lib/auth/config'
import { messageFromUnknownError } from '../lib/auth/errors'
import { applyAuthSessionResetIfNeeded } from '../lib/auth/sessionReset'
import { resolveAuthIdentifier } from '../lib/auth/resolveAuthIdentifier'
import { isValidUsername } from '../lib/auth/validation'
import { emailVerificationContinueUrl } from '../lib/auth/verificationUrl'
import { loginPath, redirectToLoginIfGuest } from '../lib/auth/forceLoginGate'
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase'
import { registerProductionPwa, resetPwaRegistration } from '../lib/registerPwa'
import { deleteAllCaches, unregisterAllServiceWorkers } from '../lib/unregisterServiceWorkers'

export type AuthUser = {
  id: string
  email: string
  username: string
}

export type SignUpResult =
  | { status: 'signed_in' }
  | { status: 'verify_email' }
  | { status: 'error'; message: string; code?: string }

export type SignInResult =
  | { status: 'signed_in' }
  | { status: 'verify_email' }
  | { status: 'error'; message: string; code?: string }

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  authConfigured: boolean
  skipEmailVerification: boolean
  signIn: (identifier: string, password: string) => Promise<SignInResult>
  signUp: (identifier: string, password: string) => Promise<SignUpResult>
  signInWithGoogle: () => Promise<SignInResult>
  refreshEmailVerification: () => Promise<boolean>
  resendVerificationEmail: () => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function usernameFromFirebaseUser(fbUser: User): string {
  const fromDisplay = fbUser.displayName?.trim().toLowerCase()
  if (fromDisplay && isValidUsername(fromDisplay)) return fromDisplay
  return fbUser.email?.split('@')[0]?.slice(0, 20) || 'user'
}

function userFromFirebase(fbUser: User): AuthUser | null {
  if (!fbUser.email) return null
  return {
    id: fbUser.uid,
    email: fbUser.email,
    username: usernameFromFirebaseUser(fbUser),
  }
}

function canUseApp(fbUser: User): boolean {
  return Boolean(fbUser.email && (fbUser.emailVerified || skipEmailVerification()))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const authConfigured = isFirebaseConfigured()
  const skipVerification = skipEmailVerification()

  const applyFirebaseUser = useCallback((fbUser: User | null) => {
    if (!fbUser || !canUseApp(fbUser)) {
      setUser(null)
      return
    }
    setUser(userFromFirebase(fbUser))
  }, [])

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) {
      setLoading(false)
      return
    }

    let cancelled = false

    void (async () => {
      await applyAuthSessionResetIfNeeded(auth)
    })()

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!cancelled) {
        applyFirebaseUser(fbUser)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [applyFirebaseUser])

  useEffect(() => {
    if (user) void registerProductionPwa()
  }, [user])

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      const auth = getFirebaseAuth()
      if (!auth?.currentUser) {
        setUser(null)
        redirectToLoginIfGuest()
        return
      }
      if (event.persisted) {
        void auth.currentUser.reload().then(() => {
          applyFirebaseUser(auth.currentUser)
        })
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !user) redirectToLoginIfGuest()
    }
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [applyFirebaseUser, user])

  const signIn = useCallback(async (identifier: string, password: string): Promise<SignInResult> => {
    const auth = getFirebaseAuth()
    if (!auth) {
      return {
        status: 'error',
        message: 'Firebase is not configured. Add VITE_FIREBASE_* keys to your environment.',
      }
    }

    const resolved = resolveAuthIdentifier(identifier)
    if (!resolved.ok) {
      return { status: 'error', message: resolved.message }
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, resolved.email, password)
      if (!credential.user.emailVerified && !skipEmailVerification()) {
        return { status: 'verify_email' }
      }
      applyFirebaseUser(credential.user)
      return { status: 'signed_in' }
    } catch (err) {
      const { message, code } = messageFromUnknownError(err)
      return { status: 'error', message, code }
    }
  }, [applyFirebaseUser])

  const signInWithGoogle = useCallback(async (): Promise<SignInResult> => {
    const auth = getFirebaseAuth()
    if (!auth) {
      return {
        status: 'error',
        message: 'Firebase is not configured. Add VITE_FIREBASE_* keys to your environment.',
      }
    }

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const credential = await signInWithPopup(auth, provider)
      applyFirebaseUser(credential.user)
      return { status: 'signed_in' }
    } catch (err) {
      const { message, code } = messageFromUnknownError(err)
      if (code === 'auth/popup-closed-by-user') {
        return { status: 'error', message: 'Sign-in cancelled.' }
      }
      return { status: 'error', message, code }
    }
  }, [applyFirebaseUser])

  const signUp = useCallback(
    async (identifier: string, password: string): Promise<SignUpResult> => {
      const auth = getFirebaseAuth()
      if (!auth) {
        return {
          status: 'error',
          message: 'Firebase is not configured. Add VITE_FIREBASE_* keys to your environment.',
        }
      }

      const resolved = resolveAuthIdentifier(identifier)
      if (!resolved.ok) {
        return { status: 'error', message: resolved.message }
      }
      if (resolved.usedUsername && !skipEmailVerification()) {
        return {
          status: 'error',
          message: 'Use your email to create an account, or sign up with a username only when email verification is off.',
        }
      }
      if (password.length < 6) {
        return { status: 'error', message: 'Password must be at least 6 characters.' }
      }

      try {
        const credential = await createUserWithEmailAndPassword(auth, resolved.email, password)
        await updateProfile(credential.user, { displayName: resolved.username })

        if (credential.user.emailVerified || skipEmailVerification()) {
          applyFirebaseUser(credential.user)
          return { status: 'signed_in' }
        }

        await sendEmailVerification(credential.user, {
          url: emailVerificationContinueUrl(),
          handleCodeInApp: false,
        })
        return { status: 'verify_email' }
      } catch (err) {
        const { message, code } = messageFromUnknownError(err)
        return { status: 'error', message, code }
      }
    },
    [applyFirebaseUser],
  )

  const refreshEmailVerification = useCallback(async (): Promise<boolean> => {
    const auth = getFirebaseAuth()
    const fbUser = auth?.currentUser
    if (!fbUser) return false
    await fbUser.reload()
    if (canUseApp(fbUser)) {
      applyFirebaseUser(fbUser)
      return true
    }
    return false
  }, [applyFirebaseUser])

  const resendVerificationEmail = useCallback(async (): Promise<string | null> => {
    const auth = getFirebaseAuth()
    const fbUser = auth?.currentUser
    if (!fbUser) {
      return 'Sign in again, or finish creating your account from the sign-up screen.'
    }
    try {
      await sendEmailVerification(fbUser, {
        url: emailVerificationContinueUrl(),
        handleCodeInApp: false,
      })
      return null
    } catch (err) {
      const { message } = messageFromUnknownError(err)
      return message
    }
  }, [])

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (auth) await firebaseSignOut(auth)
    setUser(null)
    resetPwaRegistration()
    await unregisterAllServiceWorkers()
    await deleteAllCaches()
    window.location.replace(loginPath())
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      authConfigured,
      skipEmailVerification: skipVerification,
      signIn,
      signUp,
      signInWithGoogle,
      refreshEmailVerification,
      resendVerificationEmail,
      signOut,
    }),
    [
      user,
      loading,
      authConfigured,
      skipVerification,
      signIn,
      signUp,
      signInWithGoogle,
      refreshEmailVerification,
      resendVerificationEmail,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
