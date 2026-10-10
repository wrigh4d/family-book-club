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

export const app = initializeApp(firebaseConfig)

function createDb() {
  const canPersist = typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
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
