import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { quizQuestions } from '../data/mockData'
import { getInvestorProfile } from '../utils/helpers'
import { GoldButton, Card, Badge, RiskBadge } from '../components/UI'
import api from '../utils/api'

export default function Quiz() {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null)
  const [done, setDone] = useState(false)
  const [liveProducts, setLiveProducts] = useState([])

  // Fetch active products from backend on mount
  useEffect(() => {
    api.get('/products')
      .then(res => setLiveProducts(res.data || []))
      .catch(() => setLiveProducts([]))
  }, [])

  const progress = ((current) / quizQuestions.length) * 100

  const choose = (idx) => setSelected(idx)

  const next = () => {
    if (selected === null) return
    const newAnswers = [...answers, selected]
    setAnswers(newAnswers)
    setSelected(null)
    if (current + 1 < quizQuestions.length) {
      setCurrent(c => c + 1)
    } else {
      setDone(true)
    }
  }

  const reset = () => { setCurrent(0); setAnswers([]); setSelected(null); setDone(false) }

  if (done) {
    const profile = getInvestorProfile(answers, liveProducts)

    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 80px)' }}
        className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          <Card className="p-10 text-center">
            <div className="text-6xl mb-4">{profile.emoji}</div>
            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Your Investor Profile</p>
            <h2 className="text-3xl font-bold font-serif mb-3" style={{ color: profile.color }}>{profile.label}</h2>
            <p className="mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{profile.desc}</p>

            {/* Indicative equity/fixed-income split for this risk tier */}
            <div className="text-left mb-6">
              <p className="text-sm font-semibold mb-3" style={{ color: '#B8860B' }}>Indicative Portfolio Split</p>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} className="rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div style={{ height: 10, borderRadius: 999, overflow: 'hidden', flex: 1, display: 'flex' }}>
                    <div style={{ width: `${profile.split.fixedIncome}%`, background: '#B8860B' }} />
                    <div style={{ width: `${profile.split.equities}%`, background: '#D4A017' }} />
                  </div>
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Fixed Income: <strong>{profile.split.fixedIncome}%</strong></span>
                  <span>Equities: <strong>{profile.split.equities}%</strong></span>
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  This split is indicative only and can be adjusted together with your portfolio manager
                  once you subscribe, based on your specific goals.
                </p>
              </div>
            </div>

            {/* Sharia/Conventional + Discretionary/Non-Discretionary — informational,
                not decided by the quiz. Finalised with a portfolio manager. */}
            <div className="text-left mb-8">
              <div style={{ background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.2)' }} className="rounded-xl p-4">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Portfolios at this risk level are available in both <strong>Conventional</strong> and
                  <strong> Ethical/Sharia-compliant</strong> structures, and either can be managed on a
                  <strong> Discretionary</strong> or <strong> Non-Discretionary</strong> basis. Your
                  portfolio manager will help you choose the right combination after you subscribe.
                </p>
              </div>
            </div>

            {profile.suggested.length > 0 && (
              <div className="text-left mb-8">
                <p className="text-sm font-semibold mb-3" style={{ color: '#B8860B' }}>Example Products at This Risk Level</p>
                <div className="space-y-3">
                  {profile.suggested.map(p => (
                    <div key={p.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} className="rounded-xl p-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                        <Badge type={p.type === 'Sharia' ? 'Sharia' : p.category} />
                      </div>
                      <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>ROI: <span style={{ color: '#B8860B' }}>{p.roi}</span></span>
                        <span>Min: <span style={{ color: '#B8860B' }}>{p.minAmountDisplay}</span></span>
                        <span>Risk: <RiskBadge risk={p.risk} /></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link to="/products"><GoldButton className="w-full">Explore All Products</GoldButton></Link>
              <Link to="/signup"><GoldButton outline className="w-full">Open an Account</GoldButton></Link>
              <button onClick={reset} className="text-sm" style={{ color: 'var(--text-muted)' }}>Retake Assessment</button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const q = quizQuestions[current]

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 80px)' }}
      className="flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">

        {/* Intro header */}
        {current === 0 && (
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold font-serif mb-2" style={{ color: '#B8860B' }}>Risk Assessment</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {quizQuestions.length} questions · ~2 minutes · Personalised portfolio recommendations
            </p>
          </div>
        )}

        <Card className="p-8">
          {/* Progress */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium" style={{ color: '#B8860B' }}>Question {current + 1} of {quizQuestions.length}</span>
            <button onClick={reset} className="text-xs" style={{ color: 'var(--text-muted)' }}>Start over</button>
          </div>
          <div style={{ background: 'var(--bg-secondary)', height: 6 }} className="rounded-full mb-6 overflow-hidden">
            <div
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #B8860B, #D4A017)', transition: 'width 0.4s ease' }}
              className="h-full rounded-full"
            />
          </div>

          {q.section && (
            <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {q.section}
            </p>
          )}
          <h2 className="text-lg font-bold mb-6 leading-snug" style={{ color: 'var(--text-primary)', fontFamily: 'Georgia, serif' }}>
            {q.q}
          </h2>

          <div className="space-y-3 mb-8">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => choose(i)}
                style={{
                  border: selected === i ? '1.5px solid #B8860B' : '1px solid var(--border)',
                  background: selected === i ? 'rgba(184,134,11,0.08)' : 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
                className="w-full text-left px-5 py-4 rounded-xl text-sm transition-all hover:border-yellow-600"
              >
                <span style={{ color: '#B8860B' }} className="font-bold mr-3">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>

          <GoldButton onClick={next} disabled={selected === null} className="w-full" size="lg">
            {current + 1 === quizQuestions.length ? 'See My Profile →' : 'Next Question →'}
          </GoldButton>
        </Card>
      </div>
    </div>
  )
}
