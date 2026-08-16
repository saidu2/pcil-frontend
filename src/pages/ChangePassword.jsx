import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoldButton, Input, Card } from '../components/UI'

export default function ChangePassword() {
  const { changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/dashboard'

  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.current || !form.next || !form.confirm) {
      setError('Please fill in all fields.')
      return
    }
    if (form.next.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (form.next !== form.confirm) {
      setError('New password and confirmation do not match.')
      return
    }

    setLoading(true)
    try {
      await changePassword(form.current, form.next)
      navigate(from, { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Could not change password. Please try again.')
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
          <h1 className="text-2xl font-bold font-serif mb-1" style={{ color: 'var(--text-primary)' }}>Set your password</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Your account was created with a temporary password. Please set a new one to continue.
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Temporary Password" type="password" value={form.current}
              onChange={set('current')} placeholder="The temp password you were given" required />
            <Input label="New Password" type="password" value={form.next}
              onChange={set('next')} placeholder="At least 8 characters" required />
            <Input label="Confirm New Password" type="password" value={form.confirm}
              onChange={set('confirm')} placeholder="Re-enter your new password" required />

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</div>
            )}

            <GoldButton type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Updating…' : 'Set New Password'}
            </GoldButton>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Wrong account?{' '}
            <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }) }}
              style={{ color: '#A67C1A' }} className="font-semibold hover:underline">Sign out</button>
          </p>
        </Card>
      </div>
    </div>
  )
}
