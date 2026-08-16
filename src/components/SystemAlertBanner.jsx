// src/components/SystemAlertBanner.jsx
//
// Connects to backend via Server-Sent Events (SSE).
// The moment admin saves an alert, the backend pushes to ALL connected
// browsers instantly — no refresh or polling delay.
//
// Behaviour by severity:
//   info     — slim blue banner, dismissible, portal fully usable
//   warning  — amber banner, dismissible, portal fully usable
//   critical — full-screen red blocking gate, portal locked

import { useState, useEffect, useRef } from 'react'

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000/api/v1'

function useSystemAlert() {
  const [alert, setAlert] = useState(null)
  const esRef = useRef(null)

  useEffect(() => {
    let reconnectTimer = null

    const connect = () => {
      // Close any existing connection
      if (esRef.current) esRef.current.close()

      const es = new EventSource(`${BASE}/system/alert/stream`)
      esRef.current = es

      es.onmessage = (e) => {
        try { setAlert(JSON.parse(e.data)) } catch {}
      }

      es.onerror = () => {
        // SSE auto-reconnects but if it errors repeatedly, back off 5s
        es.close()
        reconnectTimer = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      if (esRef.current) esRef.current.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  return alert
}

const STYLES = {
  info:     { bg: 'linear-gradient(135deg,#1e3a5f,#1e40af)', border: '#3b82f6', icon: 'ℹ️' },
  warning:  { bg: 'linear-gradient(135deg,#78350f,#b45309)',  border: '#f59e0b', icon: '⚠️' },
  critical: { bg: 'linear-gradient(135deg,#450a0a,#991b1b)',  border: '#ef4444', icon: '🚨' },
}

export default function SystemAlertBanner() {
  const alert = useSystemAlert()
  const [dismissed, setDismissed] = useState(false)

  // Reset dismiss when alert changes (new message from admin)
  useEffect(() => { setDismissed(false) }, [alert?.message, alert?.active])

  if (!alert?.active || !alert?.message) return null

  const s = STYLES[alert.severity] || STYLES.info

  // ── Critical: full blocking gate ─────────────────────────────────────────
  if (alert.severity === 'critical') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          background: '#0d0d0d', border: '1px solid #ef4444', borderRadius: 20,
          padding: '48px 40px', maxWidth: 500, width: '100%', textAlign: 'center',
          boxShadow: '0 0 80px rgba(239,68,68,0.15)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 20,
          }}>🚨</div>
          <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
            SYSTEM UNAVAILABLE
          </p>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 16, lineHeight: 1.4 }}>
            Portal Temporarily Unavailable
          </h2>
          <p style={{ color: '#ccc', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
            {alert.message}
          </p>
          <div style={{
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '14px 18px', marginBottom: 28,
          }}>
            <p style={{ color: '#f87171', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Our team is actively working to restore service. Please check back shortly.
              We apologise for any inconvenience.
            </p>
          </div>
          <p style={{ color: '#333', fontSize: 12, margin: 0 }}>
            Prime Capital & Investment Ltd · SEC Regulated
          </p>
        </div>
      </div>
    )
  }

  // ── Info / Warning: dismissible banner ────────────────────────────────────
  if (dismissed) return null

  return (
    <div style={{
      background: s.bg, borderBottom: `2px solid ${s.border}`,
      padding: alert.severity === 'warning' ? '14px 24px' : '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 12, position: 'relative', zIndex: 200,
    }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>{s.icon}</span>
      <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0, textAlign: 'center' }}>
        {alert.message}
      </p>
      <button onClick={() => setDismissed(true)} style={{
        position: 'absolute', right: 16,
        background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff', borderRadius: 6, padding: '2px 10px',
        fontSize: 12, cursor: 'pointer', fontWeight: 600,
      }}>✕</button>
    </div>
  )
}
