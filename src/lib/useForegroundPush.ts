import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { attachForegroundListener, detachForegroundListener, setPushPath } from './push'

export function useForegroundPush(uid: string | null): void {
  const { pathname } = useLocation()

  useEffect(() => {
    setPushPath(pathname)
  }, [pathname])

  useEffect(() => {
    if (!uid) {
      detachForegroundListener()
      return
    }
    void attachForegroundListener(uid).catch((error: unknown) => {
      console.error(error)
    })
    return () => {
      detachForegroundListener()
    }
  }, [uid])
}
