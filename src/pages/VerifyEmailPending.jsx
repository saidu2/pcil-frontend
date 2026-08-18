import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GoldButton, Card } from '../components/UI'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmailPending() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, resendVerification } = useAuth()
  const email = location.state?.email

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

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
