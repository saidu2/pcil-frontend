import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'
import { RadialSpinner } from '../components/UI'

const G = '#A67C1A'

export default function AdminLogin() {
  const { adminLogin, adminMfaLoginVerify, admin } = useAdmin()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // MFA second step
  const [mfaMode, setMfaMode] = useState(false)
  const [mfaToken, setMfaToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  if (admin) { navigate('/admin'); return null }

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true)
    setError('')
    const result = await adminLogin(email, password)
    setLoading(false)
    if (result.success) {
      if (result.mfaRequired) {
        setMfaToken(result.mfaToken)
        setMfaMode(true)
      } else {
        navigate('/admin')
      }
    } else {
      setError(result.error || 'Login failed')
    }
  }

  const handleMfaSubmit = async () => {
    if (!mfaCode || mfaCode.length !== 6) { setError('Please enter the 6-digit code.'); return }
    setLoading(true)
    setError('')
    const result = await adminMfaLoginVerify(mfaToken, mfaCode)
    setLoading(false)
    if (result.success) {
      navigate('/admin')
    } else {
      setError(result.error || 'Invalid code.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/pci-logo.png" alt="Prime Capital" style={{ height: 64, width: 'auto', margin: '0 auto 14px', display: 'block' }} />
          <h1 style={{ color: G, fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Prime Capital
          </h1>
          <p style={{ color: '#444', fontSize: 13, marginTop: 4 }}>
            {mfaMode ? 'Two-Factor Authentication' : 'Admin Portal — Restricted Access'}
          </p>
        </div>

        <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 16, padding: 32 }}>
          {mfaMode ? (
            <>
              <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 8, marginTop: 0 }}>Enter Your Code</h2>
              <p style={{ color: '#555', fontSize: 13, marginBottom: 24 }}>Enter the 6-digit code from your authenticator app.</p>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 18 }}>
                  <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', color: '#555', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Authentication Code</label>
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  onKeyDown={e => e.key === 'Enter' && handleMfaSubmit()}
                  style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 18, letterSpacing: 4, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = G}
                  onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                  autoFocus
                />
              </div>

              <button onClick={handleMfaSubmit} disabled={loading} style={{
                width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                background: `linear-gradient(135deg,${G},#D4A017)`,
                color: '#000', fontWeight: 700, fontSize: 14,
                opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {loading ? <RadialSpinner size={20} /> : 'Verify'}
              </button>

              <button onClick={() => { setMfaMode(false); setMfaCode(''); setError('') }} style={{
                width: '100%', padding: '10px 0', marginTop: 10, background: 'none', border: 'none',
                color: '#555', fontSize: 13, cursor: 'pointer',
              }}>← Back to login</button>
            </>
          ) : (
            <>
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 24, marginTop: 0 }}>Sign In</h2>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 18 }}>
              <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#555', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Email Address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@primecapital.ng"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ width: '100%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = G}
              onBlur={e => e.target.style.borderColor = '#2a2a2a'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#555', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ width: '100%', padding: '10px 40px 10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = G}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
              />
              <button onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14,
              }}>{showPass ? '🙈' : '👁'}</button>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: `linear-gradient(135deg,${G},#D4A017)`,
            color: '#000', fontWeight: 700, fontSize: 14,
            opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {loading ? <RadialSpinner size={20} /> : 'Sign In to Admin'}
          </button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#2a2a2a', fontSize: 12, marginTop: 20 }}>
          This portal is restricted to authorised personnel only.
        </p>
      </div>
    </div>
  )
}
