import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import BookingPage from './pages/BookingPage'
import ExamBookingPage from './pages/ExamBookingPage'
import AdminPage from './pages/AdminPage'
import LookupPage from './pages/LookupPage'
import ManagementPage from './pages/ManagementPage'

function Navigation() {
  const location = useLocation()
  
  return (
    <nav style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
      <Link to="/" style={{ color: location.pathname === '/' ? '#ea580c' : 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold', borderBottom: location.pathname==='/' ? '2px solid #ea580c' : 'none', paddingBottom: '5px' }}>정규 클리닉 신청</Link>
      <Link to="/exam" style={{ color: location.pathname === '/exam' ? '#db2777' : 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold', borderBottom: location.pathname==='/exam' ? '2px solid #db2777' : 'none', paddingBottom: '5px' }}>시험기간 클리닉 신청</Link>
      <Link to="/lookup" style={{ color: location.pathname === '/lookup' ? '#1f2937' : 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold', borderBottom: location.pathname==='/lookup' ? '2px solid #1f2937' : 'none', paddingBottom: '5px' }}>조회/취소</Link>
      <Link to="/man" style={{ color: location.pathname === '/man' ? '#8b5cf6' : 'var(--text-muted)', textDecoration: 'none', fontWeight: 'bold', borderBottom: location.pathname==='/man' ? '2px solid #8b5cf6' : 'none', paddingBottom: '5px' }}>성적/출석 관리</Link>
      
      {location.pathname === '/admin' && (
        <Link to="/admin" style={{ color: '#1f2937', textDecoration: 'none', fontWeight: 'bold', borderBottom: '2px solid #1f2937', paddingBottom: '5px' }}>&nbsp;|&nbsp;&nbsp;관리자 페이지 (열람중)</Link>
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
        </Routes>
      </div>
    </Router>
  )
}

export default App
