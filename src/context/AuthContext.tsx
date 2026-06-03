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
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { messageFromUnknownError } from '../lib/auth/errors'
import { applyAuthSessionResetIfNeeded } from '../lib/auth/sessionReset'
import { isValidEmail, isValidUsername } from '../lib/auth/validation'
import { emailVerificationContinueUrl } from '../lib/auth/verificationUrl'
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase'

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
  signIn: (email: string, password: string) => Promise<SignInResult>
  signUp: (email: string, username: string, password: string) => Promise<SignUpResult>
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const authConfigured = isFirebaseConfigured()

  const applyFirebaseUser = useCallback((fbUser: User | null) => {
    if (!fbUser?.email || !fbUser.emailVerified) {
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

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const auth = getFirebaseAuth()
    if (!auth) {
      return {
        status: 'error',
        message: 'Firebase is not configured. Add VITE_FIREBASE_* keys to your environment.',
      }
    }

    const normalized = email.trim().toLowerCase()
    if (!isValidEmail(normalized)) {
      return { status: 'error', message: 'Enter a valid email address.' }
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, normalized, password)
      if (!credential.user.emailVerified) {
        return { status: 'verify_email' }
      }
      applyFirebaseUser(credential.user)
      return { status: 'signed_in' }
    } catch (err) {
      const { message, code } = messageFromUnknownError(err)
      return { status: 'error', message, code }
    }
  }, [applyFirebaseUser])

  const signUp = useCallback(
    async (email: string, username: string, password: string): Promise<SignUpResult> => {
      const auth = getFirebaseAuth()
      if (!auth) {
        return {
          status: 'error',
          message: 'Firebase is not configured. Add VITE_FIREBASE_* keys to your environment.',
        }
      }

      if (!isValidEmail(email)) return { status: 'error', message: 'Enter a valid email address.' }
      if (!isValidUsername(username)) {
        return {
          status: 'error',
          message: 'Username must be 3–20 characters (letters, numbers, underscore).',
        }
      }
      if (password.length < 6) {
        return { status: 'error', message: 'Password must be at least 6 characters.' }
      }

      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim().toLowerCase(),
          password,
        )
        await updateProfile(credential.user, { displayName: username.trim().toLowerCase() })

        if (credential.user.emailVerified) {
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
    if (fbUser.emailVerified) {
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
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      authConfigured,
      signIn,
      signUp,
      refreshEmailVerification,
      resendVerificationEmail,
      signOut,
    }),
    [
      user,
      loading,
      authConfigured,
      signIn,
      signUp,
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
