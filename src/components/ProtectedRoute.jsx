import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // If loading OR there's a token in storage but user isn't set yet — show spinner
  const hasToken = !!sessionStorage.getItem('pcil-token')

  if (loading || hasToken && !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #B8860B', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#B8860B', fontSize: 13 }}>Loading…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Block access to protected routes until the client has confirmed their
  // email address (NEW) — registration issues a real token immediately, so
  // without this check an unverified client could load the dashboard shell
  // even though every data request would then fail with a 403 from
  // get_current_verified_email_user on the backend. This catches it earlier,
  // with a clean redirect instead of a half-loaded page full of errors.
  //
  // /verify-email-pending itself is NOT wrapped in ProtectedRoute (see
  // App.jsx), so this can't create a redirect loop.
  if (!user.isVerified) {
    return <Navigate to="/verify-email-pending" state={{ email: user.email }} replace />
  }

  return children
}
