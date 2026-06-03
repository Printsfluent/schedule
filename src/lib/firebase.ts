import { initializeApp, type FirebaseApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let persistenceReady: Promise<void> | null = null

export function isFirebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID,
  )
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null
  if (!auth) {
    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
      appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
    })
    auth = getAuth(app)
    persistenceReady = setPersistence(auth, browserLocalPersistence).then(() => undefined)
  }
  return auth
}

/** Wait until Firebase has restored a persisted session from localStorage. */
export async function waitForAuthPersistence(): Promise<void> {
  const instance = getFirebaseAuth()
  if (!instance) return
  if (persistenceReady) await persistenceReady
  await instance.authStateReady()
}

export function getFirestoreDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null
  if (!db) {
    getFirebaseAuth()
    db = getFirestore(app!)
  }
  return db
}
