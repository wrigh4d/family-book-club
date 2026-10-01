import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
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

export const auth = getAuth(app)
export const db = createDb()
