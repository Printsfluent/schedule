import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type UserCredential,
} from 'firebase/auth'

export function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

/** Mobile browsers and installed PWAs often block auth pop-ups — redirect is more reliable. */
export function prefersGoogleRedirect(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const mobile = /iPhone|iPad|iPod|Android/i.test(ua)
  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari PWA
      ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)))
  return mobile || standalone
}

export async function completeGoogleRedirectSignIn(auth: Auth): Promise<UserCredential | null> {
  try {
    return await getRedirectResult(auth)
  } catch {
    return null
  }
}

export async function signInWithGoogleAuth(auth: Auth): Promise<
  | { kind: 'credential'; credential: UserCredential }
  | { kind: 'redirect' }
> {
  const provider = createGoogleProvider()

  if (prefersGoogleRedirect()) {
    await signInWithRedirect(auth, provider)
    return { kind: 'redirect' }
  }

  try {
    const credential = await signInWithPopup(auth, provider)
    return { kind: 'credential', credential }
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : ''
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider)
      return { kind: 'redirect' }
    }
    throw err
  }
}
