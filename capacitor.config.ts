import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.wrigh4d.familybookclub',
  appName: 'Book Club',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
  experimental: {
    ios: {
      spm: {
        // Required so the Google trait can be selected without the Facebook SDK.
        swiftToolsVersion: '6.1',
        packageTraits: {
          '@capacitor-firebase/authentication': ['Google'],
        },
        packageOptions: {
          '@capacitor-firebase/authentication': {
            symlink: true,
          },
        },
      },
    },
  },
}

export default config
