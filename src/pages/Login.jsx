import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoldButton, Input, Card, RadialSpinner } from '../components/UI'

export default function Login() {
  const { login, loginMfaVerify } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/dashboard'

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // MFA second step
  const [mfaMode, setMfaMode] = useState(false)
  const [mfaToken, setMfaToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      const result = await login(form.email, form.password)
      if (result?.mfaRequired) {
        setMfaToken(result.mfaToken)
        setMfaMode(true)
        return
      }
      if (result?.mustChangePassword) {
        navigate('/change-password', { replace: true, state: { from } })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleMfaSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!mfaCode || mfaCode.length !== 6) { setError('Please enter the 6-digit code.'); return }
    setLoading(true)
    try {
      const result = await loginMfaVerify(mfaToken, mfaCode)
      if (result?.mustChangePassword) {
        navigate('/change-password', { replace: true, state: { from } })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Invalid authentication code.')
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
            {mfaMode ? 'Two-factor authentication' : 'Welcome back'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {mfaMode
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Sign in to your Prime Capital account'}
          </p>
        </div>

        <Card className="p-8">
          {mfaMode ? (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <Input label="Authentication Code" type="text" inputMode="numeric"
                maxLength={6} value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" required />
              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</div>
              )}
              <GoldButton type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? <RadialSpinner size={20} /> : 'Verify'}
              </GoldButton>
              <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                <button type="button" onClick={() => { setMfaMode(false); setMfaCode(''); setError('') }}
                  className="hover:underline" style={{ color: '#A67C1A' }}>← Back to login</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Email Address" type="email" value={form.email}
                onChange={set('email')} placeholder="you@example.com" required />
              <Input label="Password" type="password" value={form.password}
                onChange={set('password')} placeholder="••••••••" required />

              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</div>
              )}

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs hover:underline" style={{ color: '#A67C1A' }}>Forgot password?</Link>
              </div>

              <GoldButton type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? <RadialSpinner size={20} /> : 'Sign In'}
              </GoldButton>
            </form>
          )}

          {!mfaMode && (
            <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#A67C1A' }} className="font-semibold hover:underline">Create account</Link>
            </p>
          )}
        </Card>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          By signing in, you agree to our{' '}
          <a href="#" className="hover:underline" style={{ color: '#A67C1A' }}>Terms of Use</a> and{' '}
          <a href="#" className="hover:underline" style={{ color: '#A67C1A' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
