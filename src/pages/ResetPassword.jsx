import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoldButton, Input, Card } from '../components/UI'

export default function ResetPassword() {
  const { resetPasswordWithToken } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [form, setForm] = useState({ next: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.next || !form.confirm) { setError('Please fill in both fields.'); return }
    if (form.next.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.next !== form.confirm) { setError('The two passwords do not match.'); return }

    setLoading(true)
    try {
      await resetPasswordWithToken(token, form.next)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Could not reset your password. Please request a new link.')
    } finally {
      setLoading(false)
    }
  }

  // No token in the URL means the link was mistyped or truncated by an email
  // client, so there's nothing to submit.
  if (!token) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-16"
        style={{ background: 'var(--bg-primary)' }}>
        <Card className="p-8 max-w-md text-center">
          <div className="text-4xl mb-3">🔗</div>
          <h1 className="text-lg font-bold font-serif mb-2" style={{ color: 'var(--text-primary)' }}>
            This reset link isn't valid
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            It may have been copied incompletely. Please request a new one.
          </p>
          <Link to="/forgot-password"><GoldButton className="w-full">Request New Link</GoldButton></Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-16"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <img src="/pci-logo.png" alt="Prime Capital" className="h-16 w-auto mb-4 mx-auto" />
          <h1 className="text-2xl font-bold font-serif mb-1" style={{ color: 'var(--text-primary)' }}>
            {done ? 'Password changed' : 'Set a new password'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {done ? 'Taking you to sign in…' : 'Choose a password you don\'t use anywhere else.'}
          </p>
        </div>

        <Card className="p-8">
          {done ? (
            <div className="text-center">
              <div className="text-4xl mb-3">✓</div>
              <Link to="/login"><GoldButton className="w-full">Sign In</GoldButton></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="New Password" type="password" value={form.next}
                onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
                placeholder="At least 8 characters" required />
              <Input label="Confirm New Password" type="password" value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />

              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</div>
              )}

              <GoldButton type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? 'Saving…' : 'Set New Password'}
              </GoldButton>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
