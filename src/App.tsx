import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { useForegroundPush } from './lib/useForegroundPush'
import { ChatPage } from './pages/ChatPage'
import { ClubHome } from './pages/ClubHome'
import { ClubLayout, ClubShell } from './pages/ClubLayout'
import { HistoryPage } from './pages/HistoryPage'
import { Landing } from './pages/Landing'
import { MyClubs } from './pages/MyClubs'
import { Present } from './pages/Present'
import { ShortlistPage } from './pages/ShortlistPage'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

function AppRoutes() {
  const { uid } = useAuth()
  useForegroundPush(uid)
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/clubs" element={<MyClubs />} />
      <Route path="/club/:code" element={<ClubLayout />}>
        <Route element={<ClubShell />}>
          <Route index element={<ClubHome />} />
          <Route path="shortlist" element={<ShortlistPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="chat" element={<ChatPage />} />
        </Route>
        <Route path="present" element={<Present />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
