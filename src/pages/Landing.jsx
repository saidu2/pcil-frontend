import { Link } from 'react-router-dom'
import { GoldButton, Card } from '../components/UI'

const stats = [
  { value: 'Premium', label: 'Investment Products' },
  { value: 'SEC', label: 'Licensed & Regulated' },
  { value: 'NGN & USD', label: 'Investment Currencies' },
  { value: 'Shariah', label: 'Board Certified' },
]

const JusticeIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
    <line x1="32" y1="6" x2="32" y2="58" stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="20" y1="14" x2="44" y2="14" stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="32" y1="14" x2="18" y2="28" stroke="#B8860B" strokeWidth="2" strokeLinecap="round"/>
    <line x1="32" y1="14" x2="46" y2="28" stroke="#B8860B" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 28 Q18 36 24 28" stroke="#B8860B" strokeWidth="2" fill="rgba(184,134,11,0.12)" strokeLinecap="round"/>
    <path d="M40 28 Q46 36 52 28" stroke="#B8860B" strokeWidth="2" fill="rgba(184,134,11,0.12)" strokeLinecap="round"/>
    <line x1="24" y1="58" x2="40" y2="58" stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
)

const ConventionalIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
    {/* Bar chart */}
    <rect x="8" y="36" width="10" height="18" rx="2" stroke="#B8860B" strokeWidth="2" fill="rgba(184,134,11,0.12)"/>
    <rect x="23" y="24" width="10" height="30" rx="2" stroke="#B8860B" strokeWidth="2" fill="rgba(184,134,11,0.12)"/>
    <rect x="38" y="14" width="10" height="40" rx="2" stroke="#B8860B" strokeWidth="2" fill="rgba(184,134,11,0.20)"/>
    {/* Trend line */}
    <polyline points="13,34 28,22 43,12" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2"/>
    {/* Base line */}
    <line x1="6" y1="55" x2="58" y2="55" stroke="#B8860B" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const DollarIcon = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
    <circle cx="32" cy="32" r="24" stroke="#B8860B" strokeWidth="2.5" fill="rgba(184,134,11,0.06)"/>
    <path d="M32 16 L32 48" stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M38 22 C38 22 24 20 24 28 C24 36 40 34 40 42 C40 48 26 48 26 48" stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
)

const categories = [
  {
    icon: <ConventionalIcon />,
    title: 'Portfolio Product (Conventional)',
    desc: 'A diversified portfolio allocated across Nigerian Treasury Bills, commercial papers, fixed income securities, and other conventional instruments. Available as discretionary (managed by Prime Capital) or non-discretionary (client-directed).',
    tags: ['Treasury Bills', 'Commercial Papers', 'Fixed Income', 'Discretionary', 'Non-Discretionary'],
  },
  {
    icon: <JusticeIcon />,
    title: 'Portfolio Product (Ethical-Compliant)',
    desc: 'A fully Sharia-compliant portfolio allocated across Sukuk, non-interest commercial papers, and other halal instruments. Reviewed and certified by qualified Shariah scholars. Available as discretionary or non-discretionary.',
    tags: ['Sukuk', 'Non-Interest CPs', 'Sharia-Certified', 'Discretionary', 'Non-Discretionary'],
  },
  {
    icon: <DollarIcon />,
    title: 'Dollar Product',
    desc: 'A USD-denominated investment product designed to hedge against Naira depreciation and grow your wealth in US Dollars. Open to Nigerian residents and diaspora investors.',
    tags: ['USD Denominated', 'Naira Hedge', 'Diaspora-Friendly', 'NGN & USD'],
  },
]

const whyUs = [
  { icon: '🏛️', title: 'SEC Regulated', desc: 'Fully licensed and regulated by the Securities & Exchange Commission of Nigeria.' },
  { icon: '🔐', title: 'Capital Security', desc: 'Robust risk management frameworks protecting investor capital at all times.' },
  { icon: '🕌', title: 'Sharia Board Certified', desc: 'All Islamic products reviewed and certified by qualified Shariah scholars.' },
  { icon: '📞', title: 'Dedicated Support', desc: 'Personal relationship managers and investor support team for every client.' },
]

export default function Landing() {
  return (
    <div style={{ background: 'var(--bg-primary)' }}>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          style={{ background: 'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(184,134,11,0.1), transparent)' }}
          className="absolute inset-0 pointer-events-none"
        />
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center relative">
          <div
            style={{ border: '1px solid rgba(184,134,11,0.4)', color: '#B8860B', background: 'rgba(184,134,11,0.06)' }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-600 animate-pulse" />
            SEC Regulated · Shariah-Certified · Nigerian-Owned
          </div>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight font-serif"
            style={{ color: 'var(--text-primary)' }}
          >
            We Build Wealth<br />
            <span style={{ color: '#B8860B' }}>and Preserve Trust</span>
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Prime Capital & Investment Ltd offers carefully curated investment products, conventional and Sharia-compliant, tailored to every Nigerian investor's needs and risk appetite.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup">
              <GoldButton size="lg">Open an Account</GoldButton>
            </Link>
            <Link to="/quiz">
              <GoldButton outline size="lg">Take Risk Assessment</GoldButton>
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl md:text-3xl font-bold font-serif" style={{ color: '#B8860B' }}>{value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRODUCT CATEGORIES ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4" style={{ color: '#B8860B' }}>Our Investment Products</h2>
          <p className="max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Premium investment solutions across conventional and Sharia-compliant portfolios, and a USD-denominated Dollar Fund.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Card key={cat.title} hover className="p-7">
              <div className="mb-4">{cat.icon}</div>
              <h3 className="text-xl font-bold font-serif mb-2" style={{ color: '#B8860B' }}>{cat.title}</h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>{cat.desc}</p>
              <div className="flex flex-wrap gap-2">
                {cat.tags.map(t => (
                  <span key={t} style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    className="text-xs px-3 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/products">
            <GoldButton>View Our Products →</GoldButton>
          </Link>
        </div>
      </section>

      {/* ── WHY PRIME CAPITAL ────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
        className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-serif mb-3" style={{ color: '#B8860B' }}>Why Prime Capital?</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Built on integrity, regulation, and a commitment to growing Nigerian wealth</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {whyUs.map(({ icon, title, desc }) => (
              <Card key={title} className="p-6 text-center">
                <div className="text-4xl mb-4">{icon}</div>
                <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUIZ CTA ─────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div
          style={{ background: 'linear-gradient(135deg, rgba(184,134,11,0.08), rgba(184,134,11,0.03))', border: '1px solid rgba(184,134,11,0.2)' }}
          className="rounded-3xl p-12"
        >
          <div className="text-5xl mb-5">🎯</div>
          <h2 className="text-3xl font-bold font-serif mb-4" style={{ color: 'var(--text-primary)' }}>
            Not sure which product is right for you?
          </h2>
          <p className="mb-8 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Take our 7-question risk assessment in under 2 minutes. We'll match you to the ideal Prime Capital product based on your goals, timeline, and risk appetite.
          </p>
          <Link to="/quiz">
            <GoldButton size="lg">Start Risk Assessment →</GoldButton>
          </Link>
        </div>
      </section>
    </div>
  )
}
