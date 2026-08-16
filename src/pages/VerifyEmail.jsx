import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GoldButton, Card } from '../components/UI'

export default function VerifyEmail() {
  const { verifyEmail } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [state, setState] = useState(token ? 'verifying' : 'no-token')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        await verifyEmail(token)
        if (!cancelled) setState('done')
      } catch (err) {
        if (cancelled) return
        const detail = err.response?.data?.detail
        setError(typeof detail === 'string' ? detail : 'We could not confirm that link.')
        setState('failed')
      }
    })()
    // Guards against React running this twice in development, which would
    // consume the single-use token and make a valid link look expired.
    return () => { cancelled = true }
  }, [token])

  const content = {
    'verifying': { icon: '⏳', title: 'Confirming your email…', body: 'This will only take a moment.' },
    'done': { icon: '✓', title: 'Email confirmed', body: "Thank you. We'll use this address to keep you updated about your investments." },
    'failed': { icon: '✕', title: "That link didn't work", body: error },
    'no-token': { icon: '🔗', title: "This link isn't valid", body: 'It may have been copied incompletely. Please sign in and request a new one.' },
  }[state]

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 py-16"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/pci-logo.png" alt="Prime Capital" className="h-16 w-auto mb-4 mx-auto" />
        </div>
        <Card className="p-8 text-center">
          <div className="text-4xl mb-3">{content.icon}</div>
          <h1 className="text-lg font-bold font-serif mb-2" style={{ color: 'var(--text-primary)' }}>
            {content.title}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{content.body}</p>
          {state !== 'verifying' && (
            <Link to="/dashboard"><GoldButton className="w-full">Go to Dashboard</GoldButton></Link>
          )}
        </Card>
      </div>
    </div>
  )
}
