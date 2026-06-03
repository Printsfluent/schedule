/** Remove persisted auth tokens from browser storage. */
export function clearAuthStorage(): void {
  if (typeof localStorage === 'undefined') return
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (
      key &&
      (key.startsWith('sb-') ||
        key.includes('supabase.auth') ||
        key.startsWith('firebase:') ||
        key.includes('firebaseLocalStorage'))
    ) {
      toRemove.push(key)
    }
  }
  toRemove.forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* private mode */
    }
  })
}
