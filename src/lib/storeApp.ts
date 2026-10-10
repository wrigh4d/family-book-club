import { Capacitor } from '@capacitor/core'

/** True when this UI is running inside the Capacitor store shell. */
export function isStoreApp(): boolean {
  return Capacitor.isNativePlatform()
}
