function publicSetting(name: string): string {
  const value = import.meta.env[name]
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (import.meta.env.MODE === 'test') return 'test'
  throw new Error(
    `Missing ${name}. Copy .env.example to .env.local and fill in the Firebase web config.`,
  )
}

/** Firebase web settings from the environment. Never put a service-account JSON here. */
export const firebaseConfig = {
  apiKey: publicSetting('VITE_FIREBASE_API_KEY'),
  authDomain: publicSetting('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: publicSetting('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: publicSetting('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: publicSetting('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: publicSetting('VITE_FIREBASE_APP_ID'),
}
