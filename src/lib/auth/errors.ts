/** User-friendly copy for Firebase auth errors. */
export function formatAuthError(message: string, code?: string): string {
  switch (code) {
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
      return 'Email/password sign-in is disabled in Firebase. Enable it under Authentication → Sign-in method → Email/Password.'
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
