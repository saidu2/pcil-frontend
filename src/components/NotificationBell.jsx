import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(!open)
    if (!open && unreadCount > 0) markAllRead()
  }

  const iconFor = (type) => {
    if (type === 'kyc_approved') return '✅'
    if (type === 'kyc_denied') return '❌'
    if (type === 'sub_approved') return '🎉'
    if (type === 'sub_denied') return '⚠️'
    if (type === 'sub_pending') return '🔄'
    return '🔔'
  }

  // BUGFIX: this read n.timestamp, but the backend sends created_at and the
  // notifications are passed through unnormalised — so new Date(undefined)
  // gave Invalid Date, the subtraction produced NaN, and every notification
  // showed "NaNd ago". Reads the real field now, accepts either name, and
  // degrades to a dash rather than NaN if a date is ever missing or unparseable.
  const timeAgo = (n) => {
    const raw = typeof n === 'string' ? n : (n?.created_at || n?.timestamp)
    if (!raw) return ''
    const then = new Date(raw).getTime()
    if (Number.isNaN(then)) return ''

    const diff = Math.floor((Date.now() - then) / 1000)
    if (diff < 0) return 'Just now'          // clock skew between server and browser
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
    return new Date(raw).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        style={{ border: '1px solid var(--border)', background: 'var(--bg-input)', position: 'relative' }}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:border-yellow-600 transition-colors"
        title="Notifications"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{ background: '#A67C1A', color: '#fff', fontSize: 9, minWidth: 16, height: 16 }}
            className="absolute -top-1 -right-1 rounded-full flex items-center justify-center font-bold px-1"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', width: 320, boxShadow: 'var(--shadow)', top: '110%', right: 0 }}
          className="absolute z-50 rounded-2xl overflow-hidden"
        >
          <div style={{ borderBottom: '1px solid var(--border)' }} className="px-4 py-3 flex justify-between items-center">
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notifications</span>
            {notifications.length > 0 && (
              <span className="text-xs" style={{ color: '#A67C1A' }}>{notifications.length} total</span>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{ borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'rgba(184,134,11,0.04)' }}
                  className="px-4 py-3 flex gap-3"
                >
                  <span className="text-lg flex-shrink-0">{iconFor(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(n)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
