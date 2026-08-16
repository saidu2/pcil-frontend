// src/components/GlobalBanner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Renders at the very top of every page:
//   • System Alert  — info/warning = slim top bar. critical = full-screen blocker
//   • Announcements — slim scrolling bar below the alert (if any live ones)
//
// Rules:
//   • info/warning alert → coloured thin strip across the top. Dismissable per session.
//   • critical alert     → full-screen takeover (nothing else visible). NOT dismissable.
//   • announcements      → thin gold strip below alert. Cycles if multiple. Dismissable.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useSystemAlert } from '../context/SystemAlertContext'

const G = '#B8860B'

// ── Announcement banner (cycles through active ones) ──────────────────────────
function AnnouncementBar({ announcements }) {
  const [idx, setIdx] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  const active = announcements.filter(a => a.is_active ?? a.active ?? true)

  // Auto-cycle every 6 s when there are multiple
  useEffect(() => {
    if (active.length <= 1) return
    const id = setInterval(() => setIdx(i => (i + 1) % active.length), 6000)
    return () => clearInterval(id)
  }, [active.length])

  if (dismissed || active.length === 0) return null

  const ann = active[idx % active.length]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${G}22, ${G}11)`,
      borderBottom: `1px solid ${G}55`,
      padding: '8px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      fontSize: 13, color: '#e8c97a',
    }}>
      <span style={{ fontSize: 15 }}>📢</span>
      <span style={{ flex: 1, fontWeight: 600, textAlign: 'center' }}>
        {ann.title && <strong style={{ marginRight: 6, color: G }}>{ann.title}:</strong>}
        {ann.body || ann.message || ''}
      </span>
      {active.length > 1 && (
        <span style={{ color: '#666', fontSize: 11, whiteSpace: 'nowrap' }}>
          {idx + 1} / {active.length}
        </span>
      )}
      <button onClick={() => setDismissed(true)} style={{
        background: 'none', border: 'none', color: '#888',
        cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1,
      }}>✕</button>
    </div>
  )
}

// ── System alert bar (info / warning) ────────────────────────────────────────
function AlertBar({ alert, onDismiss }) {
  const cfg = {
    info:    { bg: '#1e40af', border: '#2563eb', icon: 'ℹ️', text: '#bfdbfe' },
    warning: { bg: '#92400e', border: '#f59e0b', icon: '⚠️', text: '#fde68a' },
  }
  const c = cfg[alert.severity] || cfg.info

  return (
    <div style={{
      background: c.bg, borderBottom: `2px solid ${c.border}`,
      padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 12,
      fontSize: 13,
    }}>
      <span style={{ fontSize: 16 }}>{c.icon}</span>
      <span style={{ flex: 1, color: c.text, fontWeight: 600, textAlign: 'center' }}>{alert.message}</span>
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', color: '#aaa',
        cursor: 'pointer', fontSize: 16, padding: '0 4px',
      }}>✕</button>
    </div>
  )
}

// ── Critical alert — full-screen blocker ─────────────────────────────────────
function CriticalBlocker({ message }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'linear-gradient(135deg, #1a0000, #3b0000)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 40, textAlign: 'center',
    }}>
      {/* Animated pulse ring */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(239,68,68,0.15)',
        border: '3px solid #ef4444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32, fontSize: 36,
        animation: 'pulse 2s ease-in-out infinite',
      }}>🚨</div>

      <h1 style={{
        color: '#ef4444', fontSize: 28, fontWeight: 900,
        fontFamily: 'Georgia, serif', marginBottom: 20, letterSpacing: '0.02em',
      }}>
        Service Notice
      </h1>

      <div style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 16, padding: '24px 36px', maxWidth: 600,
        marginBottom: 32,
      }}>
        <p style={{
          color: '#fca5a5', fontSize: 18, lineHeight: 1.7,
          fontWeight: 500, margin: 0,
        }}>
          {message}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#ef4444',
          animation: 'pulse 1s ease-in-out infinite',
        }} />
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
          Prime Capital & Investment Ltd — We'll be back shortly
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────
export default function GlobalBanner({ announcements = [] }) {
  const { alert } = useSystemAlert()
  const [alertDismissed, setAlertDismissed] = useState(false)

  // Reset dismiss state when a new alert activates
  useEffect(() => {
    if (alert.active) setAlertDismissed(false)
  }, [alert.active, alert.message])

  // Critical alert — render blocker, nothing else
  if (alert.active && alert.severity === 'critical') {
    return <CriticalBlocker message={alert.message} />
  }

  return (
    <>
      {/* System alert bar (info/warning) */}
      {alert.active && !alertDismissed && alert.severity !== 'critical' && (
        <AlertBar alert={alert} onDismiss={() => setAlertDismissed(true)} />
      )}

      {/* Announcements bar */}
      <AnnouncementBar announcements={announcements} />
    </>
  )
}
