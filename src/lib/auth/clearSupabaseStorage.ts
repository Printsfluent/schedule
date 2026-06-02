/** Remove Supabase auth tokens from browser storage (used when forcing re-login). */
export function clearSupabaseAuthStorage(): void {
  if (typeof localStorage === 'undefined') return
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
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
