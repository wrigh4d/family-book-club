import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ClubHome } from './pages/ClubHome'
import { Landing } from './pages/Landing'
import { Present } from './pages/Present'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/club/:code" element={<ClubHome />} />
          <Route path="/club/:code/present" element={<Present />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
