import { Capacitor } from '@capacitor/core'
import { initializeApp } from 'firebase/app'
import { getAuth, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig'
import { isIosDevice } from './pwa'

export const app = initializeApp(firebaseConfig)

function createDb() {
  // iOS drops IndexedDB when the sign-in popup backgrounds the page, so the
  // club list stays on a stale cache. Keep the persistent cache everywhere else.
  const canPersist =
    typeof window !== 'undefined' && typeof indexedDB !== 'undefined' && !isIosDevice()
  try {
    return initializeFirestore(app, {
      localCache: canPersist
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : memoryLocalCache(),
    })
  } catch {
    return getFirestore(app)
  }
}

// The store WebView does not keep the default auth session. The website uses getAuth.
export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app)
export const db = createDb()
