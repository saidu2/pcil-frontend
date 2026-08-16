import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { GoldButton, Input, Card } from '../components/UI'

export default function Settings() {
  const { user, mfaSetup, mfaVerify, mfaDisable } = useAuth()

  // ── MFA enrollment flow ───────────────────────────────────────────────
  const [qrData, setQrData] = useState(null)      // { secret, qr_code, otpauth_uri } while mid-setup
  const [verifyCode, setVerifyCode] = useState('')
  const [disableMode, setDisableMode] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const startSetup = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      const data = await mfaSetup()
      setQrData(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start MFA setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const confirmSetup = async (e) => {
    e.preventDefault()
    setError('')
    if (!verifyCode || verifyCode.length !== 6) { setError('Please enter the 6-digit code from your authenticator app.'); return }
    setLoading(true)
    try {
      await mfaVerify(verifyCode)
      setQrData(null)
      setVerifyCode('')
      setSuccess('Two-factor authentication is now enabled on your account.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const cancelSetup = () => {
    setQrData(null)
    setVerifyCode('')
    setError('')
  }

  const confirmDisable = async (e) => {
    e.preventDefault()
    setError('')
    if (!disableCode || disableCode.length !== 6) { setError('Please enter your current 6-digit code.'); return }
    setLoading(true)
    try {
      await mfaDisable(disableCode)
      setDisableMode(false)
      setDisableCode('')
      setSuccess('Two-factor authentication has been disabled.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold font-serif mb-1" style={{ color: 'var(--text-primary)' }}>Account Settings</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Manage your profile and security preferences.</p>

      {/* ── Profile summary ── */}
      <Card className="p-6 mb-6">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Profile</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Full Name</span><span style={{ color: 'var(--text-primary)' }}>{user?.full_name}</span></div>
          <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Email</span><span style={{ color: 'var(--text-primary)' }}>{user?.email}</span></div>
          <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Phone</span><span style={{ color: 'var(--text-primary)' }}>{user?.phone || '—'}</span></div>
          <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Account Type</span><span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{user?.accountType}</span></div>
        </div>
      </Card>

      {/* ── Two-Factor Authentication ── */}
      <Card className="p-6">
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Two-Factor Authentication</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Add an extra layer of security to your account using an authenticator app (Google Authenticator, Authy, etc.). Optional, but recommended.
        </p>

        {success && (
          <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-xl mb-4">{success}</div>
        )}
        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl mb-4">{error}</div>
        )}

        {/* State 1: 2FA is off, nothing in progress */}
        {!user?.mfaEnabled && !qrData && (
          <div className="flex items-center justify-between">
            <span className="text-sm px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Currently OFF</span>
            <GoldButton onClick={startSetup} disabled={loading}>{loading ? 'Starting…' : 'Set Up 2FA'}</GoldButton>
          </div>
        )}

        {/* State 2: mid-setup — show QR code + verify */}
        {qrData && (
          <form onSubmit={confirmSetup} className="space-y-4">
            <div className="flex flex-col items-center py-4">
              <img src={qrData.qr_code} alt="MFA QR Code" className="w-48 h-48 mb-3" />
              <p className="text-xs text-center mb-1" style={{ color: 'var(--text-muted)' }}>
                Scan this with your authenticator app, or enter the code manually:
              </p>
              <code className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{qrData.secret}</code>
            </div>
            <Input label="Enter the 6-digit code from your app" type="text" inputMode="numeric" maxLength={6}
              value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" required />
            <div className="flex gap-3">
              <GoldButton type="submit" disabled={loading} className="flex-1">{loading ? 'Verifying…' : 'Verify & Enable'}</GoldButton>
              <button type="button" onClick={cancelSetup} className="px-4 text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </form>
        )}

        {/* State 3: 2FA is on */}
        {user?.mfaEnabled && !disableMode && (
          <div className="flex items-center justify-between">
            <span className="text-sm px-3 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Currently ON</span>
            <button onClick={() => setDisableMode(true)} className="text-sm font-semibold" style={{ color: '#ef4444' }}>Disable</button>
          </div>
        )}

        {/* State 4: disabling — confirm with a current code */}
        {user?.mfaEnabled && disableMode && (
          <form onSubmit={confirmDisable} className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Enter a current code from your authenticator app to confirm.</p>
            <Input label="6-digit code" type="text" inputMode="numeric" maxLength={6}
              value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" required />
            <div className="flex gap-3">
              <GoldButton type="submit" disabled={loading} className="flex-1" style={{ background: '#ef4444' }}>{loading ? 'Disabling…' : 'Confirm Disable'}</GoldButton>
              <button type="button" onClick={() => { setDisableMode(false); setDisableCode(''); setError('') }} className="px-4 text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
