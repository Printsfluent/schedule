/** User-friendly copy for Firebase auth errors. */
export function formatAuthError(message: string, code?: string): string {
  switch (code) {
    case 'auth/configuration-not-found':
      return 'Firebase Auth is not set up yet. Open Firebase Console → Authentication → Get started, then enable Email/Password under Sign-in method.'
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is disabled in Firebase. Enable it under Authentication → Sign-in method.'
    case 'auth/popup-blocked':
      return 'Pop-up blocked. We will try redirecting you to Google — if nothing happens, allow pop-ups for this site.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using email and password. Sign in with your password, or use the same method you signed up with.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
  }

  const lower = message.toLowerCase()
  if (
    lower.includes('email signups are disabled') ||
    lower.includes('signups not allowed') ||
    lower.includes('operation-not-allowed')
  ) {
    return 'Email sign-up is disabled in Firebase. Enable Email/Password under Authentication → Sign-in method.'
  }
  if (lower.includes('too-many-requests')) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  return message
}

export function messageFromUnknownError(err: unknown): { message: string; code?: string } {
  if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
    const e = err as { code?: string; message?: string }
    return { message: e.message ?? 'Something went wrong.', code: e.code }
  }
  if (err instanceof Error) return { message: err.message }
  return { message: 'Something went wrong.' }
}

export const VERIFICATION_EMAIL_COOLDOWN_SEC = 60
