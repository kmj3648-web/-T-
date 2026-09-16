import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import BookingPage from './pages/BookingPage'
import ExamBookingPage from './pages/ExamBookingPage'
import AdminPage from './pages/AdminPage'
import LookupPage from './pages/LookupPage'
import ManagementPage from './pages/ManagementPage'
import DevPage from './pages/DevPage'
import RegisterPage from './pages/RegisterPage'

function Navigation() {
  const location = useLocation()
  
  const showAdminLinks = ['/admin', '/man', '/register', '/dev'].includes(location.pathname)
  
  return (
    <nav style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
      <Link to="/" style={{ color: location.pathname === '/' ? '#ea580c' : 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold', borderBottom: location.pathname==='/' ? '2px solid #ea580c' : 'none', paddingBottom: '5px' }}>정규 클리닉 신청</Link>
      <Link to="/exam" style={{ color: location.pathname === '/exam' ? '#db2777' : 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold', borderBottom: location.pathname==='/exam' ? '2px solid #db2777' : 'none', paddingBottom: '5px' }}>시험기간 클리닉 신청</Link>
      <Link to="/lookup" style={{ color: location.pathname === '/lookup' ? '#1f2937' : 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold', borderBottom: location.pathname==='/lookup' ? '2px solid #1f2937' : 'none', paddingBottom: '5px' }}>조회/취소</Link>
      
      {showAdminLinks && (
        <>
          <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>&nbsp;|&nbsp;</span>
          <Link to="/admin" style={{ color: location.pathname === '/admin' ? '#1f2937' : 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold', borderBottom: location.pathname==='/admin' ? '2px solid #1f2937' : 'none', paddingBottom: '5px' }}>스케줄 관리자</Link>
          <Link to="/man" style={{ color: location.pathname === '/man' ? '#8b5cf6' : 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold', borderBottom: location.pathname==='/man' ? '2px solid #8b5cf6' : 'none', paddingBottom: '5px' }}>성적/출석 관리</Link>
          <Link to="/register" style={{ color: location.pathname === '/register' ? '#10b981' : 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold', borderBottom: location.pathname==='/register' ? '2px solid #10b981' : 'none', paddingBottom: '5px' }}>학생 명단 관리</Link>
        </>
      )}

      {location.pathname === '/dev' && (
         <>
          <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>&nbsp;|&nbsp;</span>
          <Link to="/dev" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold', borderBottom: '2px solid #3b82f6', paddingBottom: '5px' }}>Dev</Link>
         </>
      )}
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navigation />
        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route path="/exam" element={<ExamBookingPage />} />
          <Route path="/lookup" element={<LookupPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/man" element={<ManagementPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dev" element={<DevPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
