import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoldButton, Input, Card } from '../components/UI'

export default function ForgotPassword() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Please enter your email address.'); return }
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      // The backend deliberately returns the same response whether or not the
      // address exists, so a failure here means a genuine network/server
      // problem rather than "no such account".
      setError('Something went wrong. Please try again shortly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-16"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <img src="/pci-logo.png" alt="Prime Capital" className="h-16 w-auto mb-4 mx-auto" />
          <h1 className="text-2xl font-bold font-serif mb-1" style={{ color: 'var(--text-primary)' }}>
            {sent ? 'Check your email' : 'Forgot your password?'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {sent
              ? "If that address is registered, we've sent a reset link to it."
              : "Enter your email and we'll send you a link to set a new password."}
          </p>
        </div>

        <Card className="p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-3">📧</div>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                The link expires in 30 minutes. If it doesn't arrive, check your spam folder
                or try again.
              </p>
              <Link to="/login"><GoldButton className="w-full">Back to Sign In</GoldButton></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email Address" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />

              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</div>
              )}

              <GoldButton type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </GoldButton>

              <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Remembered it?{' '}
                <Link to="/login" style={{ color: '#A67C1A' }} className="font-semibold hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
