import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AuthLoading } from '../components/AuthLoading'
import { useAuth } from './AuthContext'
import { isFirebaseConfigured } from '../lib/firebase'
import { startAppStateSync, stopAppStateSync } from '../lib/sync/appStateSync'
import { setStorageUserId } from '../store/useStore'

type SyncContextValue = {
  ready: boolean
  syncing: boolean
  error: string | null
}

const SyncContext = createContext<SyncContextValue>({
  ready: true,
  syncing: false,
  error: null,
})

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ready, setReady] = useState(() => !user || !isFirebaseConfigured())
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      stopAppStateSync()
      setStorageUserId(null)
      setReady(true)
      setSyncing(false)
      setError(null)
      return
    }

    if (!isFirebaseConfigured()) {
      setReady(true)
      setSyncing(false)
      return
    }

    let cancelled = false
    setReady(false)
    setSyncing(true)
    setError(null)

    void startAppStateSync(user.id)
      .then(() => {
        if (!cancelled) {
          setReady(true)
          setSyncing(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[Rhythm] sync start failed', err)
          setError('Cloud sync is unavailable. Changes stay on this device only.')
          setReady(true)
          setSyncing(false)
        }
      })

    return () => {
      cancelled = true
      stopAppStateSync()
    }
  }, [user?.id])

  const value = useMemo(() => ({ ready, syncing, error }), [ready, syncing, error])

  if (!ready) {
    return <AuthLoading message="Syncing your schedule across devices…" />
  }

  return (
    <SyncContext.Provider value={value}>
      {error && (
        <div
          className="fixed inset-x-0 top-0 z-[100] border-b border-border bg-panel/95 px-4 py-2 text-center text-xs text-subtle backdrop-blur-md"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        >
          {error}
        </div>
      )}
      {children}
    </SyncContext.Provider>
  )
}

export function useSync(): SyncContextValue {
  return useContext(SyncContext)
}
