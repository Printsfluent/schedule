/** True when Firebase Auth has persisted a user in browser storage. */
export function hasStoredFirebaseSession(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.includes('firebase:authUser') || key.includes('firebaseLocalStorage')) return true
      if (key.startsWith('firebase:') && key.toLowerCase().includes('auth')) return true
    }
  } catch {
    /* Safari private mode / ITP */
  }
  return false
}
