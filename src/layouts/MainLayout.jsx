// src/layouts/MainLayout.jsx
import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import KycBanner from '../components/KycBanner'
import GlobalBanner from '../components/GlobalBanner'

export default function MainLayout() {
  const [announcements, setAnnouncements] = useState([])
  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

  // Fetch public announcements on mount
  useEffect(() => {
    fetch(`${API}/system/announcements`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* System alert + announcements — appears above everything */}
      <GlobalBanner announcements={announcements} />

      <Navbar />
      <KycBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
