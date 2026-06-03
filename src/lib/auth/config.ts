/** When true, users can use the app without verifying email (testing only). */
export function skipEmailVerification(): boolean {
  return import.meta.env.VITE_FIREBASE_SKIP_EMAIL_VERIFICATION === 'true'
}
