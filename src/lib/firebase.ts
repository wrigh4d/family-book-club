import {initializeApp} from 'firebase/app'
import {getAuth} from 'firebase/auth'
import {getFirestore} from 'firebase/firestore'

// Public web config. Do not add a service-account JSON here — that is a secret.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD1HUWYhCAV15jwR_yjFVYjthIWW8MTegw',
    authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'familybookclub-52781.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'familybookclub-52781',
    storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
        'familybookclub-52781.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '516556111977',
    appId:
        import.meta.env.VITE_FIREBASE_APP_ID || '1:516556111977:web:3c57b65023801a51c422f8',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
