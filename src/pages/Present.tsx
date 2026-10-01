import { Navigate, useParams } from 'react-router-dom'

/** Temporary stub while full Present.tsx is restored after an accidental overwrite. */
export function Present() {
  const { code } = useParams()
  return <Navigate to={code ? `/club/${code}` : '/'} replace />
}
