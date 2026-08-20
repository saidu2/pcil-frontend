import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GoldButton, Card } from '../components/UI'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmailPending() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, resendVerification, fetchMe } = useAuth()
  const email = location.state?.email

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  // The emailed link is commonly opened somewhere other than this tab —
  // the email app's own in-app browser, a different device, etc. — so
  // this tab has no way to know verification happened unless it actively
  // checks. Poll quietly in the background so the user isn't stuck here
  // forever after verifying elsewhere.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMe().catch(() => {})
    }, 4000)
    return () => clearInterval(interval)
  }, [fetchMe])

  useEffect(() => {
    if (user?.isVerified) {
      navigate('/dashboard', { replace: true })
    }
  }, [user?.isVerified, navigate])

  const handleCheckNow = async () => {
    setChecking(true)
    setError('')
    try {
      await fetchMe()
      // The effect above redirects automatically once isVerified is true —
      // if we're still here after this, it genuinely isn't verified yet.
    } catch {
      setError('Could not check your status right now. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setSending(true)
    try {
      await resendVerification()
      setSent(true)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Could not resend the confirmation email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleSignOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-16"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/pci-logo.png" alt="Prime Capital" className="h-16 w-auto mb-4 mx-auto" />
          <h1 className="text-2xl font-bold font-serif mb-1" style={{ color: 'var(--text-primary)' }}>
            Confirm your email
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {email
              ? <>We've sent a confirmation link to <strong>{email}</strong>.</>
              : "We've sent a confirmation link to your email address."}
            {' '}Click it to activate your account.
          </p>
        </div>

        <Card className="p-8 text-center space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Didn't get the email? Check your spam folder, or request a new link below.
          </p>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</div>
          )}

          {sent ? (
            <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-xl">
              A new confirmation link is on its way.
            </div>
          ) : (
            <GoldButton onClick={handleResend} disabled={sending} className="w-full" size="lg">
              {sending ? 'Sending…' : 'Resend confirmation email'}
            </GoldButton>
          )}

          <button
            type="button"
            onClick={handleCheckNow}
            disabled={checking}
            className="text-sm hover:underline w-full"
            style={{ color: 'var(--text-secondary)' }}
          >
            {checking ? 'Checking…' : "Already clicked the link? Check now"}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs hover:underline"
            style={{ color: '#A67C1A' }}
          >
            Sign out
          </button>
        </Card>
      </div>
    </div>
  )
}
