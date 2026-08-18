import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoldButton, Input, Card } from '../components/UI'

const onlyLetters = (val) => val.replace(/[^a-zA-Z\s\-']/g, '')
const onlyDigits  = (val, max) => { const v = val.replace(/\D/g, ''); return max ? v.slice(0, max) : v }

export default function Signup() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.full_name || !form.email || !form.password) { setError('Please fill in all required fields.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const result = await register({ full_name: form.full_name, email: form.email, phone: form.phone, password: form.password })
      if (result?.emailVerificationRequired) {
        navigate('/verify-email-pending', { replace: true, state: { email: form.email } })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Registration failed. This email may already be registered.')
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
          <h1 className="text-2xl font-bold font-serif mb-1" style={{ color: 'var(--text-primary)' }}>Create your account</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Join Prime Capital investors</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: onlyLetters(e.target.value) }))} placeholder="e.g. Chukwuemeka Okafor" required />
            <Input label="Email Address *" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
            <Input label="Phone Number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: onlyDigits(e.target.value, 11) }))} placeholder="08012345678" maxLength={11} />
            <Input label="Password *" type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" required />
            <Input label="Confirm Password *" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Re-enter password" required />

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</div>
            )}

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} className="rounded-xl p-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                After registration, you'll need to complete{' '}
                <span style={{ color: '#A67C1A' }} className="font-medium">KYC verification</span>{' '}
                before you can invest.
              </p>
            </div>

            <GoldButton type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Creating account…' : 'Create Account'}
            </GoldButton>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#A67C1A' }} className="font-semibold hover:underline">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
