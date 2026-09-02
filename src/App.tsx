import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom'
import {AuthProvider} from './lib/auth'
import {ClubHome} from './pages/ClubHome'
import {ClubLayout} from './pages/ClubLayout'
import {Landing} from './pages/Landing'
import {MyClubs} from './pages/MyClubs'
import {Present} from './pages/Present'
import {ShortlistPage} from './pages/ShortlistPage'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter basename={basename}>
                <Routes>
                    <Route path="/" element={<Landing/>}/>
                    <Route path="/clubs" element={<MyClubs/>}/>
                    <Route path="/club/:code" element={<ClubLayout/>}>
                        <Route index element={<ClubHome/>}/>
                        <Route path="shortlist" element={<ShortlistPage/>}/>
                        <Route path="present" element={<Present/>}/>
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace/>}/>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}
