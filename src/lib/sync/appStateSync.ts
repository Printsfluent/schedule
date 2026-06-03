import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import type { AppState } from '../../types'
import { getFirestoreDb } from '../firebase'
import {
  getAppState,
  replaceAppState,
  setCloudPushHandler,
  setStorageUserId,
} from '../../store/useStore'

const SCHEMA_VERSION = 1
const DEBOUNCE_MS = 1500
const REMOTE_IGNORE_MS = 4000

type CloudDoc = {
  state: AppState
  updatedAt: number
  schemaVersion: number
}

function metaKey(userId: string): string {
  return `rhythm-sync-meta-${userId}`
}

function readLocalUpdatedAt(userId: string): number {
  try {
    const raw = localStorage.getItem(metaKey(userId))
    if (!raw) return 0
    const parsed = JSON.parse(raw) as { updatedAt?: number }
    return typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0
  } catch {
    return 0
  }
}

function writeLocalUpdatedAt(userId: string, updatedAt: number): void {
  try {
    localStorage.setItem(metaKey(userId), JSON.stringify({ updatedAt }))
  } catch {
    /* quota */
  }
}

let unsubscribeRemote: Unsubscribe | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let ignoreRemoteUntil = 0
let activeUserId: string | null = null

async function pushToCloud(userId: string, appState: AppState): Promise<void> {
  const firestore = getFirestoreDb()
  if (!firestore) throw new Error('Cloud sync is not available.')

  const updatedAt = Date.now()
  ignoreRemoteUntil = updatedAt + REMOTE_IGNORE_MS
  const ref = doc(firestore, 'users', userId, 'appdata', 'state')
  const payload: CloudDoc = { state: appState, updatedAt, schemaVersion: SCHEMA_VERSION }
  await setDoc(ref, payload)
  writeLocalUpdatedAt(userId, updatedAt)
}

function schedulePush(userId: string, appState: AppState): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void pushToCloud(userId, appState).catch((err) => {
      console.warn('[Rhythm] cloud sync push failed', err)
    })
  }, DEBOUNCE_MS)
}

function applyRemoteState(userId: string, remote: CloudDoc): void {
  writeLocalUpdatedAt(userId, remote.updatedAt)
  replaceAppState(remote.state)
}

export function stopAppStateSync(): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = null
  unsubscribeRemote?.()
  unsubscribeRemote = null
  setCloudPushHandler(null)
  activeUserId = null
}

/**
 * Bind store to Firestore for cross-device sync. Resolves when initial merge completes.
 */
export async function startAppStateSync(userId: string): Promise<void> {
  stopAppStateSync()
  const firestore = getFirestoreDb()
  if (!firestore) return

  activeUserId = userId
  setStorageUserId(userId)

  const ref = doc(firestore, 'users', userId, 'appdata', 'state')
  const localState = getAppState()
  const localUpdatedAt = readLocalUpdatedAt(userId)

  const snap = await getDoc(ref)
  const remote = snap.exists() ? (snap.data() as CloudDoc) : null

  if (remote?.state && remote.updatedAt > localUpdatedAt) {
    applyRemoteState(userId, remote)
  } else if (remote?.state && remote.updatedAt === localUpdatedAt) {
    replaceAppState(remote.state)
    writeLocalUpdatedAt(userId, remote.updatedAt)
  } else {
    writeLocalUpdatedAt(userId, Date.now())
    await pushToCloud(userId, localState)
  }

  setCloudPushHandler((next) => {
    if (activeUserId !== userId) return
    writeLocalUpdatedAt(userId, Date.now())
    schedulePush(userId, next)
  })

  unsubscribeRemote = onSnapshot(ref, (docSnap) => {
    if (!docSnap.exists() || activeUserId !== userId) return
    const data = docSnap.data() as CloudDoc
    if (!data?.state || typeof data.updatedAt !== 'number') return
    if (Date.now() < ignoreRemoteUntil) return
    if (data.updatedAt <= readLocalUpdatedAt(userId)) return
    applyRemoteState(userId, data)
  })
}

export async function pushAppStateNow(userId: string): Promise<void> {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = null
  await pushToCloud(userId, getAppState())
}
