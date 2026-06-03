/** True when Firebase Auth has persisted a user in browser storage. */
export function hasStoredFirebaseSession(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('firebase:authUser') || key.includes('firebaseLocalStorageDb'))) {
        return true
      }
    }
  } catch {
    /* Safari private mode / ITP */
  }
  return false
}
