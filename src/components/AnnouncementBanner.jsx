// src/components/AnnouncementBanner.jsx
// Fetches active announcements and shows them to all visitors.
// Tries the public endpoint first, works silently if backend not configured.

import { useState, useEffect, useRef } from 'react'

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000/api/v1'

export function useActiveAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const esRef = useRef(null)

  useEffect(() => {
    let reconnectTimer = null
    const connect = () => {
      if (esRef.current) esRef.current.close()
      const es = new EventSource(`${BASE}/system/announcements/stream`)
      esRef.current = es
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          setAnnouncements(Array.isArray(data) ? data : [])
          setLoading(false)
        } catch {}
      }
      es.onerror = () => {
        es.close()
        setLoading(false)
        reconnectTimer = setTimeout(connect, 5000)
      }
    }
    connect()
    return () => {
      if (esRef.current) esRef.current.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  return { announcements, loading }
}

// ── Slim top banner ────────────────────────────────────────────────────────
export function AnnouncementBanner() {
  const { announcements, loading } = useActiveAnnouncements()
  const [dismissed, setDismissed] = useState([])

  if (loading || announcements.length === 0) return null
  const visible = announcements.filter(a => !dismissed.includes(a.id))
  if (visible.length === 0) return null
  const ann = visible[0]

  return (
    <div style={{
      background: 'linear-gradient(90deg, #7a4f00, #B8860B, #c9920c, #B8860B, #7a4f00)',
      borderBottom: '1px solid #D4A01788',
      padding: '10px 48px 10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      position: 'relative', zIndex: 100,
      boxShadow: '0 2px 12px rgba(184,134,11,0.25)',
    }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>📢</span>
      <div style={{ textAlign: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{ann.title}</span>
        {ann.body && (
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginLeft: 8 }}>— {ann.body}</span>
        )}
        {visible.length > 1 && (
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 8 }}>+{visible.length - 1} more</span>
        )}
      </div>
      <button onClick={() => setDismissed(d => [...d, ann.id])}
        style={{
          position: 'absolute', right: 14,
          background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff', borderRadius: 5, padding: '1px 8px',
          fontSize: 11, cursor: 'pointer', fontWeight: 600, lineHeight: '18px',
        }}>✕</button>
    </div>
  )
}

// ── Blocking modal gate for Login / Sign Up ────────────────────────────────
export function AnnouncementGate({ children, pageName = 'this page' }) {
  const { announcements, loading } = useActiveAnnouncements()
  const [acknowledged, setAcknowledged] = useState(false)
  const active = announcements.filter(a => a.is_active ?? a.active ?? true)
  const showGate = !loading && active.length > 0 && !acknowledged

  return (
    <>
      {children}
      {showGate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0d0d0d', border: '1px solid #B8860B', borderRadius: 20, padding: '40px 36px', maxWidth: 520, width: '100%', boxShadow: '0 0 60px rgba(184,134,11,0.15)' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(184,134,11,0.12)', border: '1px solid #B8860B44', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>📢</div>
              <p style={{ color: '#B8860B', fontSize: 11, fontWeight: 700, letterSpacing: 2, margin: 0 }}>IMPORTANT NOTICE</p>
            </div>
            {active.map((ann, i) => (
              <div key={ann.id} style={{ marginBottom: i < active.length - 1 ? 20 : 0, paddingBottom: i < active.length - 1 ? 20 : 0, borderBottom: i < active.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>{ann.title}</h3>
                <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{ann.body}</p>
                <p style={{ color: '#555', fontSize: 11, marginTop: 10 }}>
                  {new Date(ann.published_at || ann.publishedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ))}
            <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(184,134,11,0.06)', border: '1px solid #B8860B33', borderRadius: 10, marginBottom: 24 }}>
              <p style={{ color: '#d4b86a', fontSize: 13, textAlign: 'center', lineHeight: 1.6, margin: 0 }}>Our team is dedicated to serving you. You may continue once you have read the message above.</p>
            </div>
            <button onClick={() => setAcknowledged(true)} style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#B8860B,#8B6508)', border: 'none', borderRadius: 10, color: '#000', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              I Understand — Continue to {pageName}
            </button>
            <p style={{ color: '#333', fontSize: 11, textAlign: 'center', marginTop: 12, marginBottom: 0 }}>Prime Capital & Investment Ltd · SEC Regulated</p>
          </div>
        </div>
      )}
    </>
  )
}
