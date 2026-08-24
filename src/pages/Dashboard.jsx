import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, Legend,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { KYC_STATUS, SUB_STATUS } from '../data/constants'
import { Card, GoldButton, Modal, Select, Input, SuccessScreen } from '../components/UI'
import { PIE_COLORS } from '../data/mockData'

// Safe date formatter — returns fallback if date is null/invalid
function safeDate(val, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-NG', opts)
}
function safeDateObj(val) {
  if (!val) return new Date(0)
  const d = new Date(val)
  return isNaN(d.getTime()) ? new Date(0) : d
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const LINE_COLORS = ['#A67C1A','#2563eb','#16a34a','#dc2626','#7c3aed','#0891b2','#d97706']

// Allocation donut palette — shades of the brand gold rather than unrelated
// hues, so the chart reads as part of the brand. Ordered light to dark with
// enough contrast between neighbours to stay distinguishable. Falls back to
// cycling if a client somehow holds more positions than there are shades.
const GOLD_SHADES = [
  '#A67C1A', // brand gold
  '#D4A017',
  '#8B6508',
  '#E5C158',
  '#6B4F06',
  '#F0D98C',
  '#A67C0A',
  '#C9A227',
  '#5A4205',
]

function buildMultiGrowthData(activeSubs, portfolios) {
  if (!activeSubs.length) return { data: [], keys: [] }

  // Real valuation snapshots only — this is a managed private portfolio, so
  // growth only ever exists once admin has actually added holdings and run
  // a valuation. A subscription with no valuation yet contributes a flat
  // line at its principal (nothing has happened to it yet), never a
  // fabricated compound-growth curve.
  const monthKey = (d) => {
    const dt = new Date(d)
    return `${dt.toLocaleString('en-GB', { month: 'short' })} ${dt.getFullYear()}`
  }

  // Every month with at least one real valuation snapshot, across all subs
  // shown on this chart — plus the current month, so subs still awaiting
  // their first valuation still get a point on the axis.
  const monthSet = new Set()
  activeSubs.forEach(s => {
    const pf = (portfolios || []).find(p => String(p.subscription_id) === String(s.id))
    ;(pf?.value_history || []).forEach(v => monthSet.add(monthKey(v.date)))
  })
  monthSet.add(monthKey(new Date()))
  const months = Array.from(monthSet).sort((a, b) => new Date('1 ' + a) - new Date('1 ' + b))

  const data = months.map(month => {
    const entry = { month }
    activeSubs.forEach(s => {
      const pf = (portfolios || []).find(p => String(p.subscription_id) === String(s.id))
      const history = pf?.value_history || []
      const monthEnd = new Date('1 ' + month)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      const upToThisMonth = history.filter(v => new Date(v.date) < monthEnd)
      const latest = upToThisMonth[upToThisMonth.length - 1]
      // Before any real valuation exists, the honest value is the principal
      entry[s.id] = latest ? latest.total_value : Number(s.amount)
    })
    return entry
  })

  const keys = activeSubs.map(s => ({ id: s.id, label: s.product_name || s.productName || 'Investment' }))
  return { data, keys }
}

function buildAllocation(activeSubs) {
  // Split by currency and build separate allocation arrays
  const byCurrency = (subs) => {
    if (!subs.length) return []
    const total = subs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    if (total === 0) return []
    return subs.map(s => ({
      name: s.product_name || s.productName || s.product_category || 'Investment',
      value: Math.round(((Number(s.amount) || 0) / total) * 100),
      raw: Number(s.amount) || 0,
    }))
  }
  const ngnSubs = activeSubs.filter(s => (s.currency || 'NGN') !== 'USD')
  const usdSubs = activeSubs.filter(s => s.currency === 'USD')
  return {
    ngn: byCurrency(ngnSubs),
    usd: byCurrency(usdSubs),
  }
}

function buildTransactions(subscriptions, redemptions) {
  const subTx = subscriptions.map(s => ({
    id: s.id,
    productId: s.productId,
    date: safeDate(s.submittedAt),
    sortDate: safeDateObj(s.submittedAt),
    product: s.productName,
    type: 'Subscribe',
    amount: (s.currency === 'USD' ? 'USD ' : '₦') + Number(s.amount).toLocaleString(),
    rawAmount: Number(s.amount),
    currency: s.currency,
    status: s.status === SUB_STATUS.ACTIVE ? 'Active'
      : s.status === SUB_STATUS.PENDING_REVIEW ? 'Pending'
      : s.status === SUB_STATUS.DENIED ? 'Failed'
      : s.status === 'redeemed' ? 'Redeemed'
      : s.status,
  }))

  const redTx = (redemptions || []).map(r => ({
    id: r.id,
    productId: r.productId,
    date: safeDate(r.submittedAt),
    sortDate: safeDateObj(r.submittedAt),
    product: r.productName,
    type: 'Redeem',
    amount: (r.currency === 'USD' ? 'USD ' : '₦') + Number(r.amount).toLocaleString(),
    rawAmount: Number(r.amount),
    currency: r.currency,
    status: r.status || 'Pending',
  }))

  return [...subTx, ...redTx].sort((a, b) => b.sortDate - a.sortDate)
}

const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  fontSize: 12,
}

// ── Sub Status Badge ───────────────────────────────────────────────────────────
function SubStatusBadge({ status }) {
  const configs = {
    [SUB_STATUS.PENDING_REVIEW]: { bg: 'rgba(251,191,36,0.15)', color: '#d97706', border: 'rgba(251,191,36,0.3)', dot: '#f59e0b', label: 'Pending Review' },
    [SUB_STATUS.ACTIVE]:         { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a', border: 'rgba(34,197,94,0.3)',  dot: '#22c55e', label: 'Active' },
    [SUB_STATUS.DENIED]:         { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', border: 'rgba(239,68,68,0.3)',  dot: '#ef4444', label: 'Denied' },
    [SUB_STATUS.MATURED]:        { bg: 'rgba(139,92,246,0.12)', color: '#7c3aed', border: 'rgba(139,92,246,0.3)', dot: '#8b5cf6', label: 'Matured' },
    redeemed:                    { bg: 'rgba(156,163,175,0.15)', color: '#6b7280', border: 'rgba(156,163,175,0.3)', dot: '#9ca3af', label: 'Redeemed' },
  }
  const c = configs[status] || configs[SUB_STATUS.PENDING_REVIEW]
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block', flexShrink: 0 }} />
      {c.label}
    </span>
  )
}

// ── KYC Prompt ────────────────────────────────────────────────────────────────
function KycPromptCard({ kycStatus }) {
  if (kycStatus === KYC_STATUS.APPROVED) return null
  return (
    <div style={{ background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.25)', borderRadius: 20 }}
      className="p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div style={{ background: 'rgba(184,134,11,0.12)', borderRadius: 14, width: 52, height: 52, flexShrink: 0 }}
            className="flex items-center justify-center text-2xl">
            {kycStatus === KYC_STATUS.PENDING ? '⏳' : kycStatus === KYC_STATUS.DENIED ? '❌' : '📋'}
          </div>
          <div>
            <p className="font-bold font-serif" style={{ color: '#A67C1A' }}>
              {kycStatus === KYC_STATUS.PENDING ? 'KYC Verification In Progress'
                : kycStatus === KYC_STATUS.DENIED ? 'KYC Verification Failed'
                : 'Complete KYC to Start Investing'}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {kycStatus === KYC_STATUS.PENDING
                ? "Our compliance team is reviewing your documents. You'll be notified once approved."
                : kycStatus === KYC_STATUS.DENIED
                ? 'Your documents were not approved. Please resubmit with correct information.'
                : 'SEC regulations require identity verification before you can invest.'}
            </p>
          </div>
        </div>
        <Link to="/kyc" className="flex-shrink-0">
          <GoldButton>
            {kycStatus === KYC_STATUS.PENDING ? 'View Status'
              : kycStatus === KYC_STATUS.DENIED ? 'Resubmit KYC'
              : 'Complete KYC'}
          </GoldButton>
        </Link>
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
// ── Tab navigation ────────────────────────────────────────────────────────────
// Vertical sidebar on desktop (lg+), horizontal scrolling strip on mobile so
// it doesn't eat a phone screen's width.
function TabNav({ tabs, active, onChange }) {
  return (
    <>
      {/* Desktop: vertical sidebar (xl+ only — below that the content grids
          need the full width, and a sidebar would squash them) */}
      <nav className="hidden xl:block" style={{ width: 190, flexShrink: 0 }}>
        <div className="sticky" style={{ top: 24 }}>
          {tabs.map(t => {
            const isActive = t.id === active
            return (
              <button key={t.id} onClick={() => onChange(t.id)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 mb-1 text-sm font-semibold rounded-xl transition-colors text-left"
                style={{
                  color: isActive ? '#A67C1A' : 'var(--text-muted)',
                  background: isActive ? 'rgba(184,134,11,0.10)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(184,134,11,0.25)' : 'transparent'}`,
                }}>
                <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{t.icon}</span>
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Below xl: horizontal strip */}
      <div className="flex xl:hidden gap-1 mb-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map(t => {
          const isActive = t.id === active
          return (
            <button key={t.id} onClick={() => onChange(t.id)}
              className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors"
              style={{
                color: isActive ? '#A67C1A' : 'var(--text-muted)',
                borderBottom: `2px solid ${isActive ? '#A67C1A' : 'transparent'}`,
                marginBottom: -1,
                background: 'none',
              }}>
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ── Chart time-range toggle ───────────────────────────────────────────────────
const RANGES = [
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 90 },
  { id: '6M', label: '6M', days: 182 },
  { id: 'YTD', label: 'YTD', days: null },
  { id: 'ALL', label: 'All', days: null },
]

function RangeToggle({ value, onChange }) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
      {RANGES.map(r => (
        <button key={r.id} onClick={() => onChange(r.id)}
          className="px-2.5 py-1 text-xs font-semibold rounded-md transition-colors"
          style={{
            background: value === r.id ? 'var(--bg-card)' : 'transparent',
            color: value === r.id ? '#A67C1A' : 'var(--text-muted)',
            border: 'none',
          }}>{r.label}</button>
      ))}
    </div>
  )
}

// Filters a dated series by the selected range. YTD = since 1 Jan this year.
function filterByRange(series, rangeId, dateKey = 'rawDate') {
  if (!series?.length || rangeId === 'ALL') return series || []
  const now = Date.now()
  if (rangeId === 'YTD') {
    const jan1 = new Date(new Date().getFullYear(), 0, 1).getTime()
    return series.filter(p => new Date(p[dateKey]).getTime() >= jan1)
  }
  const days = RANGES.find(r => r.id === rangeId)?.days
  if (!days) return series
  const cutoff = now - days * 86400000
  return series.filter(p => new Date(p[dateKey]).getTime() >= cutoff)
}

// ── Gradient area chart for portfolio value over time ─────────────────────────
function PortfolioAreaChart({ data, fmt }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="pfGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A67C1A" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#A67C1A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={54}
          tickFormatter={v => v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}M` : `₦${(v / 1000).toFixed(0)}K`} />
        <Tooltip
          contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
          labelStyle={{ color: 'var(--text-muted)', fontSize: 11 }}
          formatter={v => [fmt(v), 'Portfolio Value']} />
        <Area type="monotone" dataKey="total" stroke="#A67C1A" strokeWidth={2}
          fill="url(#pfGradient)" dot={false} activeDot={{ r: 5, stroke: 'var(--bg-card)', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Allocation donut with legend ──────────────────────────────────────────────
function AllocationDonut({ slices, fmt, centerLabel, centerSub }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (!total) return null
  return (
    <div>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none">
              {slices.map((s, i) => <Cell key={i} fill={s.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
              formatter={(v, n) => [`${fmt(v)} · ${((v / total) * 100).toFixed(1)}%`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div className="text-lg font-bold font-serif" style={{ color: '#A67C1A' }}>{centerLabel}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{centerSub}</div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span className="truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <span style={{ color: 'var(--text-muted)' }}>{fmt(s.value)}</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{((s.value / total) * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Holdings table ────────────────────────────────────────────────────────────
// Adapts to what the client actually holds: equities get price/units/gain
// columns, fixed income gets ROI/maturity/accrued instead (price and units
// are meaningless there). Renders as a table on desktop, stacked cards on
// mobile, so it stays readable on a phone.
function HoldingsTable({ holdings, breakdown, fmt, totalValue }) {
  if (!holdings?.length) return null
  const byId = {}
  ;(breakdown || []).forEach(b => { byId[b.holding_id] = b })

  const equities = holdings.filter(h => h.type === 'equity')
  const fixedIncome = holdings.filter(h => h.type === 'fixed_income')

  const Row = ({ h }) => {
    const snap = byId[h.id]
    const current = snap?.value
    const hasValue = current != null && current > 0
    const isEquity = h.type === 'equity'
    const cost = isEquity ? (h.units || 0) * (h.cost_price || 0) : (h.principal || 0)
    const delta = hasValue ? current - cost : 0
    const up = delta >= 0
    const weight = totalValue > 0 && hasValue ? (current / totalValue) * 100 : null

    return (
      <div className="py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        {/* Stacks vertically on narrow screens, single row from sm up */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div className="min-w-0 sm:flex-1">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{h.name}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {isEquity
                ? <>{Number(h.units).toLocaleString()} units · cost {fmt(h.cost_price)}{snap?.price != null && <> · now {fmt(snap.price)}</>}</>
                : <>{h.roi_pct}% · matures {h.maturity_date ? new Date(h.maturity_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</>}
              {h.status !== 'active' && <> · <span style={{ color: '#d97706' }}>{h.status.replace('_', ' ')}</span></>}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-5 flex-shrink-0">
            {weight != null && (
              <div className="text-left sm:text-right">
                <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{weight.toFixed(1)}%</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>weight</div>
              </div>
            )}

            <div className="text-right">
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {hasValue ? fmt(current) : fmt(cost)}
              </div>
              <div className="text-xs" style={{ color: hasValue ? (up ? '#16a34a' : '#dc2626') : 'var(--text-muted)' }}>
                {hasValue
                  ? `${up ? '+' : ''}${fmt(delta)} ${isEquity ? 'vs cost' : 'accrued'}`
                  : (isEquity ? 'cost basis' : 'principal')}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {equities.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold mb-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>EQUITIES</p>
          {equities.map(h => <Row key={h.id} h={h} />)}
        </div>
      )}
      {fixedIncome.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>FIXED INCOME</p>
          {fixedIncome.map(h => <Row key={h.id} h={h} />)}
        </div>
      )}
    </div>
  )
}

// ── Settings tab ──────────────────────────────────────────────────────────────
// Folds in what was the standalone /settings page: profile summary, avatar,
// two-factor authentication and password change, so it's reachable without
// leaving the dashboard.
function SettingsTab({ user }) {
  const { mfaSetup, mfaVerify, mfaDisable, changePassword, uploadAvatar, removeAvatar } = useAuth()

  const [qrData, setQrData] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [disableMode, setDisableMode] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  // Avatar — stored server-side via app.core.storage, so it follows the
  // client across devices rather than living only in this browser.
  const [avatarLoading, setAvatarLoading] = useState(false)
  const avatar = user?.avatarUrl || null

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setSuccess('')
    if (file.size > 2 * 1024 * 1024) { setError('Please choose an image under 2MB.'); return }
    setAvatarLoading(true)
    try {
      await uploadAvatar(file)
      setSuccess('Profile photo updated.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not upload that image.')
    } finally {
      setAvatarLoading(false)
      e.target.value = ''  // allow re-picking the same file after an error
    }
  }

  const onAvatarRemove = async () => {
    setError(''); setSuccess(''); setAvatarLoading(true)
    try {
      await removeAvatar()
      setSuccess('Profile photo removed.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not remove the photo.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const startSetup = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try { setQrData(await mfaSetup()) }
    catch (err) { setError(err.response?.data?.detail || 'Could not start setup. Please try again.') }
    finally { setLoading(false) }
  }

  const confirmSetup = async () => {
    setError('')
    if (!verifyCode || verifyCode.length !== 6) { setError('Enter the 6-digit code from your app.'); return }
    setLoading(true)
    try {
      await mfaVerify(verifyCode)
      setQrData(null); setVerifyCode('')
      setSuccess('Two-factor authentication is now enabled.')
    } catch (err) { setError(err.response?.data?.detail || 'Invalid code. Please try again.') }
    finally { setLoading(false) }
  }

  const confirmDisable = async () => {
    setError('')
    if (!disableCode || disableCode.length !== 6) { setError('Enter your current 6-digit code.'); return }
    setLoading(true)
    try {
      await mfaDisable(disableCode)
      setDisableMode(false); setDisableCode('')
      setSuccess('Two-factor authentication has been disabled.')
    } catch (err) { setError(err.response?.data?.detail || 'Invalid code. Please try again.') }
    finally { setLoading(false) }
  }

  const submitPasswordChange = async () => {
    setPwError(''); setPwSuccess('')
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwError('Please fill in all fields.'); return }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('New password and confirmation do not match.'); return }
    setPwLoading(true)
    try {
      await changePassword(pwForm.current, pwForm.next)
      setPwForm({ current: '', next: '', confirm: '' })
      setPwSuccess('Password changed successfully.')
    } catch (err) { setPwError(err.response?.data?.detail || 'Could not change password.') }
    finally { setPwLoading(false) }
  }

  const initials = (user?.full_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div>
      {/* Profile */}
      <Card className="p-5 mb-5">
        <h3 className="font-bold font-serif text-sm mb-4" style={{ color: '#A67C1A' }}>Profile</h3>
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: avatar ? 'transparent' : 'linear-gradient(135deg,#A67C1A,#D4A017)',
          }} className="flex items-center justify-center">
            {avatar
              ? <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span className="text-xl font-bold" style={{ color: '#000' }}>{initials}</span>}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold cursor-pointer" style={{ color: '#A67C1A' }}>
                {avatarLoading ? 'Uploading…' : (avatar ? 'Change photo' : 'Upload photo')}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarPick}
                  disabled={avatarLoading} style={{ display: 'none' }} />
              </label>
              {avatar && !avatarLoading && (
                <button onClick={onAvatarRemove} className="text-xs font-semibold" style={{ color: '#dc2626' }}>Remove</button>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              JPG, PNG or WEBP, under 2MB
            </p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ['Full Name', user?.full_name],
            ['Email', user?.email],
            ['Phone', user?.phone || '—'],
            ['Account Type', user?.accountType],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="text-right" style={{ color: 'var(--text-primary)', textTransform: label === 'Account Type' ? 'capitalize' : 'none' }}>{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Two-factor authentication */}
      <Card className="p-5 mb-5">
        <h3 className="font-bold font-serif text-sm mb-1" style={{ color: '#A67C1A' }}>Two-Factor Authentication</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Add an extra layer of security using an authenticator app. Optional, but recommended.
        </p>

        {success && <div className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>{success}</div>}
        {error && <div className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>{error}</div>}

        {!user?.mfaEnabled && !qrData && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Currently off</span>
            <GoldButton onClick={startSetup} disabled={loading}>{loading ? 'Starting…' : 'Set Up 2FA'}</GoldButton>
          </div>
        )}

        {qrData && (
          <div>
            <div className="flex flex-col items-center py-3">
              <img src={qrData.qr_code} alt="MFA QR code" style={{ width: 168, height: 168, marginBottom: 10 }} />
              <p className="text-xs text-center mb-1" style={{ color: 'var(--text-muted)' }}>
                Scan with your authenticator app, or enter this code manually:
              </p>
              <code className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{qrData.secret}</code>
            </div>
            <Input label="6-digit code" value={verifyCode} inputMode="numeric" maxLength={6}
              onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
            <div className="flex gap-3 mt-3">
              <GoldButton onClick={confirmSetup} disabled={loading} className="flex-1">{loading ? 'Verifying…' : 'Verify & Enable'}</GoldButton>
              <button onClick={() => { setQrData(null); setVerifyCode(''); setError('') }}
                className="px-4 text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </div>
        )}

        {user?.mfaEnabled && !disableMode && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>Enabled</span>
            <button onClick={() => setDisableMode(true)} className="text-sm font-semibold" style={{ color: '#dc2626' }}>Disable</button>
          </div>
        )}

        {user?.mfaEnabled && disableMode && (
          <div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Enter a current code from your app to confirm.</p>
            <Input label="6-digit code" value={disableCode} inputMode="numeric" maxLength={6}
              onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
            <div className="flex gap-3 mt-3">
              <GoldButton onClick={confirmDisable} disabled={loading} className="flex-1" style={{ background: '#dc2626' }}>
                {loading ? 'Disabling…' : 'Confirm Disable'}
              </GoldButton>
              <button onClick={() => { setDisableMode(false); setDisableCode(''); setError('') }}
                className="px-4 text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </div>
        )}
      </Card>

      {/* Password */}
      <Card className="p-5">
        <h3 className="font-bold font-serif text-sm mb-4" style={{ color: '#A67C1A' }}>Change Password</h3>
        {pwSuccess && <div className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>{pwSuccess}</div>}
        {pwError && <div className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>{pwError}</div>}
        <div className="space-y-3">
          <Input label="Current Password" type="password" value={pwForm.current}
            onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
          <Input label="New Password" type="password" value={pwForm.next}
            onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} placeholder="At least 8 characters" />
          <Input label="Confirm New Password" type="password" value={pwForm.confirm}
            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
        </div>
        <GoldButton onClick={submitPasswordChange} disabled={pwLoading} className="mt-4">
          {pwLoading ? 'Updating…' : 'Update Password'}
        </GoldButton>
      </Card>
    </div>
  )
}

function StatCard({ icon, label, value, sub, trend, trendUp, locked }) {
  return (
    <Card hover className="p-6 relative overflow-hidden">
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(184,134,11,0.05)', pointerEvents: 'none' }} />
      {locked ? (
        <div className="flex flex-col items-center justify-center h-24 gap-2">
          <span className="text-2xl opacity-25">🔒</span>
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>Available after KYC approval</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start mb-3">
            <div style={{ background: 'rgba(184,134,11,0.1)', borderRadius: 12, width: 42, height: 42 }}
              className="flex items-center justify-center text-xl">{icon}</div>
            {trend && (
              <span style={{
                background: trendUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: trendUp ? '#16a34a' : '#dc2626',
                border: `1px solid ${trendUp ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }} className="text-xs font-semibold px-2.5 py-1 rounded-full">{trend}</span>
            )}
          </div>
          <div className="text-2xl font-bold font-serif leading-tight mb-1" style={{ color: '#A67C1A' }}>{value}</div>
          <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{label}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>
        </>
      )}
    </Card>
  )
}

// ── Multi-line chart tooltip ───────────────────────────────────────────────────
function MultiTooltip({ active, payload, label, keys, currency = 'NGN' }) {
  if (!active || !payload?.length) return null
  const sym = currency === 'USD' ? '$' : '₦'
  const fmt = (v) => currency === 'USD'
    ? `${sym}${Number(v) >= 1000 ? (Number(v)/1000).toFixed(2)+'K' : Number(v).toLocaleString()}`
    : `${sym}${Number(v).toLocaleString()}`
  return (
    <div style={tooltipStyle} className="px-4 py-3">
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((entry, i) => {
        const keyInfo = keys.find(k => k.id === entry.dataKey || String(k.id) === String(entry.dataKey))
        return (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, display: 'inline-block', flexShrink: 0 }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{keyInfo?.label || entry.dataKey}:</span>
            <span className="text-xs font-bold" style={{ color: entry.color }}>
              {fmt(entry.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, subscriptions, redemptions, portfolios, fetchMe, fetchSubscriptions, fetchRedemptions, fetchPortfolios, fetchNotifications, notifications, unreadCount, markNotificationRead, markAllRead, submitRedemption } = useAuth()
  const [txFilter, setTxFilter] = useState('all')
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [redeemForm, setRedeemForm] = useState({ subscriptionId: '', amount: '', holdingId: '', units: '' })
  const [redeemMode, setRedeemMode] = useState('amount') // 'amount' | 'holding' — which shape this request will take
  const [redeemStage, setRedeemStage] = useState('form') // form | submitted
  const [redeemError, setRedeemError] = useState('')

  // Refresh data whenever dashboard is viewed
  useEffect(() => {
    fetchMe()
    fetchSubscriptions()
    fetchRedemptions()
    fetchNotifications()
    fetchPortfolios()
  }, [])

  // Poll every 60s — refresh all dashboard data automatically
  useEffect(() => {
    const id = setInterval(() => {
      fetchMe()
      fetchSubscriptions()
      fetchRedemptions()
      fetchNotifications()
      fetchPortfolios()
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const kycStatus = user?.kycStatus || KYC_STATUS.NOT_SUBMITTED
  const allActiveSubscriptions = subscriptions.filter(s => s.status === SUB_STATUS.ACTIVE)

  // Subscriptions that are private portfolios (have real holdings + valuations)
  // are deliberately EXCLUDED from the projection-based stat cards, growth
  // chart and allocation pie below. Those projections estimate returns from a
  // product's advertised ROI, which is meaningless for a managed portfolio
  // whose real value comes from actual stock prices and accrual. Showing both
  // gave the client two different, conflicting numbers for the same money.
  const portfolioSubIds = new Set((portfolios || []).map(p => String(p.subscription_id)))
  const activeSubscriptions = allActiveSubscriptions.filter(s => !portfolioSubIds.has(String(s.id)))

  const pendingSubscriptions = subscriptions.filter(s => s.status === SUB_STATUS.PENDING_REVIEW)
  const hasAny = subscriptions.length > 0
  const isApproved = kycStatus === KYC_STATUS.APPROVED

  // Real (not projected) totals from the valuation system, for private portfolios
  const portfolioTotalValue = (portfolios || []).reduce((sum, p) => sum + (p.current_value || 0), 0)
  const hasPortfolios = (portfolios || []).length > 0

  // ── Dashboard tabs + chart range ────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview')
  const [chartRange, setChartRange] = useState('ALL')

  // Combined value history across every portfolio the client holds.
  //
  // BUGFIX: this previously grouped by date and summed every snapshot sharing
  // that date. That correctly combined DIFFERENT portfolios, but also summed
  // MULTIPLE VALUATION RUNS OF THE SAME PORTFOLIO on the same day — so running
  // a valuation three times in one day made the chart show roughly 3x the real
  // value, while the stat card (which reads only the latest snapshot) stayed
  // correct. Now: take each portfolio's LAST snapshot per day first, then sum
  // those across portfolios.
  const portfolioChartData = useMemo(() => {
    if (!hasPortfolios) return []
    const byDate = {}
    ;(portfolios || []).forEach(pf => {
      // Latest snapshot per day for THIS portfolio
      const latestPerDay = {}
      ;(pf.value_history || []).forEach(v => {
        const key = v.date.slice(0, 10)
        const prev = latestPerDay[key]
        if (!prev || new Date(v.date).getTime() >= new Date(prev.date).getTime()) {
          latestPerDay[key] = v
        }
      })
      // Then add this portfolio's daily value to the combined total
      Object.entries(latestPerDay).forEach(([key, v]) => {
        byDate[key] = (byDate[key] || 0) + (v.total_value || 0)
      })
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([rawDate, total]) => ({
        rawDate,
        date: new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        total,
      }))
  }, [portfolios, hasPortfolios])

  const visibleChartData = useMemo(
    () => filterByRange(portfolioChartData, chartRange),
    [portfolioChartData, chartRange]
  )

  // Allocation donut slices, built per holding (not per product) so a
  // portfolio actually separates into its individual positions.
  const portfolioAllocation = useMemo(() => {
    if (!hasPortfolios) return []
    const slices = []
    ;(portfolios || []).forEach(pf => {
      const last = (pf.value_history || []).length ? pf.value_history[pf.value_history.length - 1] : null
      const bd = last?.breakdown || []
      ;(pf.holdings || []).forEach(h => {
        const snap = bd.find?.(b => b.holding_id === h.id)
        const value = snap?.value ?? (h.type === 'equity'
          ? (h.units || 0) * (h.cost_price || 0)
          : (h.principal || 0))
        if (value > 0) slices.push({ name: h.name, value })
      })
    })
    return slices
      .sort((a, b) => b.value - a.value)
      .map((s, i) => ({ ...s, color: GOLD_SHADES[i % GOLD_SHADES.length] }))
  }, [portfolios, hasPortfolios])

  // Latest per-holding breakdown, flattened across portfolios, for the table
  const allHoldings = useMemo(
    () => (portfolios || []).flatMap(pf => pf.holdings || []),
    [portfolios]
  )
  // Which asset-class cards to show below. Deliberately checks whether a
  // holding of that TYPE exists at all, not whether its value happens to
  // be > 0 — a client with no fixed income holdings should never see a
  // "Fixed Income ₦0" card (reads like an error, not "you have none"),
  // but a real holding that happened to value at ₦0 for some edge-case
  // reason should still show, since hiding it would be misleading in the
  // opposite direction.
  const hasEquityHoldings = allHoldings.some(h => h.type === 'equity')
  const hasFixedIncomeHoldings = allHoldings.some(h => h.type === 'fixed_income')
  // Global admin setting. When off, the backend sends no holdings at all, so
  // the client sees their total value and chart but not the position detail.
  const showBreakdown = (portfolios || []).every(p => p.show_breakdown !== false)

  const allBreakdown = useMemo(() => (portfolios || []).flatMap(pf => {
    const last = (pf.value_history || []).length ? pf.value_history[pf.value_history.length - 1] : null
    return last?.breakdown || []
  }), [portfolios])

  // ── Financials ────────────────────────────────────────────────────────────────
  // Returns remaining principal after subtracting completed redemptions
  const getRemaining = (sub) => {
    const completedRedemptions = (redemptions || []).filter(
      r => String(r.subscription_id || r.subscriptionId) === String(sub.id) && r.status === 'completed'
    )
    const totalRedeemed = completedRedemptions.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    return Math.max(0, (Number(sub.amount) || 0) - totalRedeemed)
  }

  // Returns accrued returns for a subscription. This platform is always a
  // managed private portfolio — a client subscribes with an amount, and
  // admin adds the REAL holdings (equity, fixed income, or a mix) after
  // reviewing the receipt and agreeing the composition with the client.
  // There is no product where returns happen automatically from a generic
  // percentage the moment a subscription is approved, so no subscription
  // should show fictional ROI-projected growth — ever. Once admin has
  // added real holdings, the REAL valuation (from portfolios[], driven by
  // actual InstrumentPrice/ROI-per-holding data) is what's shown instead.
  const getAccrued = (sub) => {
    const remaining = getRemaining(sub)
    if (remaining <= 0) return 0

    const pf = (portfolios || []).find(p => String(p.subscription_id) === String(sub.id))
    if (pf && pf.current_value != null) {
      return Math.max(0, pf.current_value - remaining)
    }
    return 0
  }

  // Split active subscriptions by currency
  const ngnSubs = activeSubscriptions.filter(s => (s.currency || 'NGN') !== 'USD')
  const usdSubs = activeSubscriptions.filter(s => s.currency === 'USD')

  const totalInvestedNgn = ngnSubs.reduce((sum, s) => sum + getRemaining(s), 0)
  const totalReturnsNgn = ngnSubs.reduce((sum, s) => sum + getAccrued(s), 0)
  const totalInvestedUsd = usdSubs.reduce((sum, s) => sum + getRemaining(s), 0)
  const totalReturnsUsd = usdSubs.reduce((sum, s) => sum + getAccrued(s), 0)

  const portfolioValueNgn = totalInvestedNgn + totalReturnsNgn
  const portfolioValueUsd = totalInvestedUsd + totalReturnsUsd
  const returnPctNgn = totalInvestedNgn > 0 ? ((totalReturnsNgn / totalInvestedNgn) * 100).toFixed(1) : null
  const returnPctUsd = totalInvestedUsd > 0 ? ((totalReturnsUsd / totalInvestedUsd) * 100).toFixed(1) : null

  // Combined totals (used by chart section)
  const totalInvested = totalInvestedNgn + totalInvestedUsd
  const totalReturns = totalReturnsNgn + totalReturnsUsd
  const portfolioValue = portfolioValueNgn + portfolioValueUsd
  const returnPct = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(1) : null

  const { data: growthDataNgn, keys: growthKeysNgn } = useMemo(() => buildMultiGrowthData(ngnSubs, portfolios), [ngnSubs, portfolios])
  const { data: growthDataUsd, keys: growthKeysUsd } = useMemo(() => buildMultiGrowthData(usdSubs, portfolios), [usdSubs, portfolios])
  const { ngn: allocationNgn, usd: allocationUsd } = useMemo(() => buildAllocation(activeSubscriptions), [activeSubscriptions])
  const transactions = useMemo(() => buildTransactions(subscriptions, redemptions), [subscriptions, redemptions])

  const fmtNgn = (v) => v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(2)}M` : `₦${Math.round(v).toLocaleString()}`
  const fmtUsd = (v) => v >= 1_000 ? `$${(v / 1_000).toFixed(2)}K` : `$${Math.round(v).toLocaleString()}`

  const productYtdNgn = useMemo(() => {
    return ngnSubs.map(s => ({
      id: s.id, label: s.product_name || s.productName || 'Investment',
      ytd: getAccrued(s), amount: getRemaining(s), currency: 'NGN'
    })).sort((a, b) => b.ytd - a.ytd)
  }, [ngnSubs])

  const productYtdUsd = useMemo(() => {
    return usdSubs.map(s => ({
      id: s.id, label: s.product_name || s.productName || 'Investment',
      ytd: getAccrued(s), amount: getRemaining(s), currency: 'USD'
    })).sort((a, b) => b.ytd - a.ytd)
  }, [usdSubs])

  // ── Redemption — submits a request, does NOT instantly process ────────────
  const selectedSub = allActiveSubscriptions.find(s => String(s.id) === String(redeemForm.subscriptionId))
  const selectedPortfolio = (portfolios || []).find(p => String(p.subscription_id) === String(redeemForm.subscriptionId))
  const equityHoldings = (selectedPortfolio?.holdings || []).filter(h => h.type === 'equity')
  const selectedHolding = equityHoldings.find(h => String(h.id) === String(redeemForm.holdingId))

  const handleRedeemSubmit = async () => {
    setRedeemError('')
    try {
      if (redeemMode === 'holding') {
        if (!redeemForm.subscriptionId || !redeemForm.holdingId || !redeemForm.units) return
        await submitRedemption({
          subscriptionId: redeemForm.subscriptionId,
          holdingId: redeemForm.holdingId,
          units: Number(redeemForm.units),
        })
      } else {
        if (!redeemForm.subscriptionId || !redeemForm.amount) return
        await submitRedemption({
          subscriptionId: redeemForm.subscriptionId,
          amount: Number(redeemForm.amount),
        })
      }
      setRedeemStage('submitted')
    } catch (err) {
      setRedeemError(err.response?.data?.detail || 'Failed to submit redemption. Please try again.')
    }
  }

  const closeRedeem = () => {
    setRedeemOpen(false)
    setRedeemStage('form')
    setRedeemMode('amount')
    setRedeemForm({ subscriptionId: '', amount: '', holdingId: '', units: '' })
  }

  // ── Transaction helpers ───────────────────────────────────────────────────────
  const txTypeColor = (t) => t === 'Redeem' ? '#ef4444' : '#A67C1A'
  const txStatusStyle = (s) => {
    if (s === 'Active')   return { bg: 'rgba(34,197,94,0.12)',   color: '#16a34a' }
    if (s === 'Pending')  return { bg: 'rgba(251,191,36,0.15)',  color: '#d97706' }
    if (s === 'Failed')   return { bg: 'rgba(239,68,68,0.1)',    color: '#ef4444' }
    if (s === 'Redeemed') return { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' }
    return { bg: 'rgba(156,163,175,0.15)', color: '#6b7280' }
  }

  const catIcon = (sub) => {
    if (!sub) return '📋'
    const cat = sub.category || sub.product_category || ''
    if (cat.toLowerCase().includes('sharia')) return '☪️'
    if (cat.toLowerCase().includes('equity')) return '📊'
    if (cat.toLowerCase().includes('fx') || cat.toLowerCase().includes('dollar')) return '💵'
    if (cat.toLowerCase().includes('portfolio')) return '💼'
    return '📋'
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 80px)' }} className="py-8 sm:py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="text-3xl font-bold font-serif" style={{ color: '#A67C1A' }}>{user?.name || 'Investor'}</h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            {/* allActiveSubscriptions, not activeSubscriptions — the latter
                deliberately excludes subscriptions that already have real
                holdings, but the redeem modal itself needs to handle those
                too (see its own "Uses allActiveSubscriptions" comment
                below). Gating the button on the wrong list meant a client
                whose only active subscription had become a private
                portfolio could never see a way to open the modal at all. */}
            {isApproved && allActiveSubscriptions.length > 0 && (
              <GoldButton outline onClick={() => setRedeemOpen(true)}>Redeem Investment</GoldButton>
            )}
            <Link to="/products"><GoldButton>Browse Products</GoldButton></Link>
          </div>
        </div>

        <KycPromptCard kycStatus={kycStatus} />

        <div className="flex flex-col xl:flex-row xl:gap-7 xl:items-start">
        <TabNav
          tabs={[
            { id: 'overview', icon: '▦', label: 'Overview' },
            { id: 'transactions', icon: '⇄', label: 'Transactions' },
            { id: 'documents', icon: '◫', label: 'Documents' },
            { id: 'settings', icon: '⚙', label: 'Settings' },
          ]}
          active={activeTab}
          onChange={setActiveTab} />

        <div style={{ flex: 1, minWidth: 0 }}>

        {activeTab === 'overview' && (<>

        {/* Private Portfolio value — REAL figures from the valuation system,
            not projections. Shown separately and above the projected cards
            below so the two are never confused for each other. */}
        {isApproved && hasPortfolios && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasEquityHoldings && hasFixedIncomeHoldings ? 'lg:grid-cols-3' : ''} gap-5 mb-4`}>
            <StatCard icon="💼" label="Portfolio Value (₦ · Valued)"
              value={portfolioTotalValue > 0 ? fmtNgn(portfolioTotalValue) : 'Awaiting valuation'}
              sub={portfolios[0]?.as_of
                ? `As valued on ${new Date(portfolios[0].as_of).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Your investment manager has not run a valuation yet'}
              trend={null} />
            {hasEquityHoldings && (
              <StatCard icon="📊" label="Equities (₦)"
                value={fmtNgn((portfolios || []).reduce((s, p) => s + (p.equities_value || 0), 0))}
                sub="Current market value of shares held" />
            )}
            {hasFixedIncomeHoldings && (
              <StatCard icon="🏦" label="Fixed Income (₦)"
                value={fmtNgn((portfolios || []).reduce((s, p) => s + (p.fixed_income_value || 0), 0))}
                sub="Principal plus accrued returns" />
            )}
          </div>
        )}

        {/* Stat Cards — one row per currency */}
        {/* NGN row — only shown if client has NGN investments */}
        {/* This row only ever contains subscriptions with NO real holdings
            yet (activeSubscriptions deliberately excludes anything with a
            real portfolio — see the "Valued" section above for those).
            There is no automatic growth formula here anymore — Total
            Returns is always ₦0 and Portfolio Value always equals Total
            Invested, until a portfolio manager actually builds real
            holdings for a subscription, at which point it moves up into
            the "Valued" section instead. Labels/copy reflect that
            directly rather than implying returns are quietly accruing. */}
        {(!isApproved || ngnSubs.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-4">
            <StatCard icon="💼" label="Total Invested (₦)"
              value={!isApproved ? '₦0.00' : totalInvestedNgn > 0 ? fmtNgn(totalInvestedNgn) : '₦0.00'}
              sub={ngnSubs.length > 0 ? `${ngnSubs.length} active NGN product${ngnSubs.length !== 1 ? 's' : ''}` : 'No active NGN investments'}
              trend={ngnSubs.length > 0 ? `${ngnSubs.length} Active` : null}
              trendUp locked={!isApproved} />
            <StatCard icon="📈" label="Total Returns (₦)"
              value={!isApproved ? '₦0.00' : totalReturnsNgn > 0 ? `+${fmtNgn(totalReturnsNgn)}` : '₦0.00'}
              sub="Shown once your portfolio manager adds real holdings to your account"
              trend={returnPctNgn && totalReturnsNgn > 0 ? `+${returnPctNgn}%` : null}
              trendUp locked={!isApproved} />
            <StatCard icon="🏦" label="Portfolio Value (₦)"
              value={!isApproved ? '₦0.00' : portfolioValueNgn > 0 ? fmtNgn(portfolioValueNgn) : '₦0.00'}
              sub="Awaiting portfolio setup — equals amount invested until holdings are added"
              trend={returnPctNgn && portfolioValueNgn > 0 ? `+${returnPctNgn}%` : null}
              trendUp locked={!isApproved} />
          </div>
        )}

        {/* USD row — only shown if client has USD investments */}
        {isApproved && usdSubs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-4">
            <StatCard icon="💵" label="Total Invested ($)"
              value={`$${totalInvestedUsd > 0 ? (totalInvestedUsd >= 1000 ? `${(totalInvestedUsd / 1000).toFixed(2)}K` : Math.round(totalInvestedUsd).toLocaleString()) : '0.00'}`}
              sub={`${usdSubs.length} active USD product${usdSubs.length !== 1 ? 's' : ''}`}
              trend={`${usdSubs.length} Active`}
              trendUp />
            <StatCard icon="📈" label="Total Returns ($)"
              value={totalReturnsUsd > 0 ? `+$${(totalReturnsUsd >= 1000 ? `${(totalReturnsUsd / 1000).toFixed(2)}K` : Math.round(totalReturnsUsd).toLocaleString())}` : '$0.00'}
              sub="Shown once your portfolio manager adds real holdings to your account"
              trend={returnPctUsd && totalReturnsUsd > 0 ? `+${returnPctUsd}%` : null}
              trendUp />
            <StatCard icon="🏦" label="Portfolio Value ($)"
              value={`$${portfolioValueUsd > 0 ? (portfolioValueUsd >= 1000 ? `${(portfolioValueUsd / 1000).toFixed(2)}K` : Math.round(portfolioValueUsd).toLocaleString()) : '0.00'}`}
              sub="Awaiting portfolio setup — equals amount invested until holdings are added"
              trend={returnPctUsd && portfolioValueUsd > 0 ? `+${returnPctUsd}%` : null}
              trendUp />
          </div>
        )}
        <div className="mb-4" />

        {/* Pending subscriptions notice */}
        {pendingSubscriptions.length > 0 && (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 16 }} className="p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                {pendingSubscriptions.length} subscription{pendingSubscriptions.length > 1 ? 's' : ''} pending review
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Our team is verifying your payment receipt(s). You'll be notified once your investment is activated.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {isApproved && !hasAny && (
          <Card className="p-12 mb-8 text-center">
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.2)', margin: '0 auto 20px' }}
              className="flex items-center justify-center text-4xl">📭</div>
            <h3 className="text-xl font-bold font-serif mb-2" style={{ color: '#A67C1A' }}>Your portfolio is empty</h3>
            <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Subscribe to one or more investment products to see your portfolio, charts, and transactions come alive here.
            </p>
            <Link to="/products"><GoldButton>Browse Products</GoldButton></Link>
          </Card>
        )}

        {/* My Subscriptions */}
        {hasAny && (
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold font-serif text-base" style={{ color: '#A67C1A' }}>My Subscriptions</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {subscriptions.length} total · {allActiveSubscriptions.length} active · {pendingSubscriptions.length} pending
                </p>
              </div>
              {pendingSubscriptions.length > 0 && (
                <span style={{ background: 'rgba(251,191,36,0.15)', color: '#d97706', border: '1px solid rgba(251,191,36,0.3)' }}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full">
                  ⏳ {pendingSubscriptions.length} Pending
                </span>
              )}
            </div>
            <div className="space-y-3">
              {subscriptions.map(sub => {
                return (
                  <div key={sub.id}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(184,134,11,0.35)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(184,134,11,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
                    className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div style={{ background: 'rgba(184,134,11,0.1)', borderRadius: 10, width: 40, height: 40, flexShrink: 0 }}
                          className="flex items-center justify-center text-lg">{catIcon(sub)}</div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{sub.productName}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            <span style={{ color: '#A67C1A' }} className="font-bold">
                              {sub.currency === 'USD' ? 'USD ' : '₦'}{Math.round(getRemaining(sub)).toLocaleString()}
                            </span>
                            {sub.roi || sub.product_roi ? <> · {sub.roi || sub.product_roi}</> : null}
                            {' · '}Ref: {sub.reference}
                          </p>
                        </div>
                      </div>
                      <SubStatusBadge status={sub.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* ── Private Portfolio: value chart, allocation, holdings ──────── */}
        {isApproved && hasPortfolios && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            {/* Value over time */}
            <Card className={`p-5 ${showBreakdown ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h3 className="font-bold font-serif text-sm" style={{ color: '#A67C1A' }}>Portfolio Value</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {portfolios[0]?.as_of
                      ? `As valued on ${new Date(portfolios[0].as_of).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : 'Awaiting first valuation'}
                  </p>
                </div>
                {portfolioChartData.length > 1 && (
                  <RangeToggle value={chartRange} onChange={setChartRange} />
                )}
              </div>

              {visibleChartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-3xl opacity-20 mb-2">📈</span>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {portfolioChartData.length === 0
                      ? 'Your portfolio has not been valued yet.'
                      : 'No valuations in this period. Try a wider range.'}
                  </p>
                </div>
              ) : (
                <PortfolioAreaChart data={visibleChartData} fmt={fmtNgn} />
              )}
            </Card>

            {/* Allocation donut — hidden when admin has disabled breakdown */}
            {showBreakdown && (
            <Card className="p-5">
              <div className="mb-3">
                <h3 className="font-bold font-serif text-sm" style={{ color: '#A67C1A' }}>Allocation</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>How your portfolio is invested</p>
              </div>
              {portfolioAllocation.length === 0 ? (
                <p className="text-xs py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  Allocation appears once holdings are valued.
                </p>
              ) : (
                <AllocationDonut
                  slices={portfolioAllocation}
                  fmt={fmtNgn}
                  centerLabel={portfolioAllocation.length}
                  centerSub={portfolioAllocation.length === 1 ? 'holding' : 'holdings'} />
              )}
            </Card>

            )}

            {/* Holdings table — hidden when admin has disabled breakdown */}
            {showBreakdown && (
            <Card className="p-5 lg:col-span-3">
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-bold font-serif text-sm" style={{ color: '#A67C1A' }}>Holdings</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {allHoldings.length} position{allHoldings.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-serif" style={{ color: '#A67C1A' }}>
                    {portfolioTotalValue > 0 ? fmtNgn(portfolioTotalValue) : '—'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>total value</div>
                </div>
              </div>
              <HoldingsTable
                holdings={allHoldings}
                breakdown={allBreakdown}
                fmt={fmtNgn}
                totalValue={portfolioTotalValue} />
            </Card>
            )}
          </div>
        )}


        {/* Charts */}
        {isApproved && activeSubscriptions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">

            {/* NGN line chart — full width if only NGN, else 1 col */}
            {ngnSubs.length > 0 && (
              <Card className={`p-5 ${usdSubs.length === 0 ? 'md:col-span-2' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold font-serif text-sm" style={{ color: '#A67C1A' }}>Growth (₦)</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date().getFullYear()}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-serif" style={{ color: '#A67C1A' }}>{fmtNgn(portfolioValueNgn)}</div>
                    {returnPctNgn && <div className="text-xs" style={{ color: '#16a34a' }}>+{returnPctNgn}%</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {productYtdNgn.map((p, i) => (
                    <span key={p.id} style={{
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${LINE_COLORS[i % LINE_COLORS.length]}40`,
                      color: LINE_COLORS[i % LINE_COLORS.length],
                    }} className="text-xs font-semibold px-2 py-0.5 rounded-full">
                      {p.label.length > 14 ? p.label.slice(0, 14) + '…' : p.label} · +₦{Math.round(p.ytd).toLocaleString()} YTD
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={growthDataNgn} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={v => `₦${(v/1_000_000).toFixed(1)}M`} axisLine={false} tickLine={false} width={52} />
                    <Tooltip content={<MultiTooltip keys={growthKeysNgn} currency="NGN" />} />
                    {growthKeysNgn.map((k, i) => (
                      <Line key={k.id} type="monotone" dataKey={k.id}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2}
                        dot={false} activeDot={{ r: 4, stroke: 'var(--bg-card)', strokeWidth: 2 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* USD line chart — only shown if client has USD investments */}
            {usdSubs.length > 0 && (
              <Card className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold font-serif text-sm" style={{ color: '#A67C1A' }}>Growth ($)</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date().getFullYear()}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-serif" style={{ color: '#A67C1A' }}>{fmtUsd(portfolioValueUsd)}</div>
                    {returnPctUsd && <div className="text-xs" style={{ color: '#16a34a' }}>+{returnPctUsd}%</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {productYtdUsd.map((p, i) => (
                    <span key={p.id} style={{
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${LINE_COLORS[i % LINE_COLORS.length]}40`,
                      color: LINE_COLORS[i % LINE_COLORS.length],
                    }} className="text-xs font-semibold px-2 py-0.5 rounded-full">
                      {p.label.length > 14 ? p.label.slice(0, 14) + '…' : p.label} · +${Math.round(p.ytd).toLocaleString()} YTD
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={growthDataUsd} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(1)}K` : `$${v}`} axisLine={false} tickLine={false} width={52} />
                    <Tooltip content={<MultiTooltip keys={growthKeysUsd} currency="USD" />} />
                    {growthKeysUsd.map((k, i) => (
                      <Line key={k.id} type="monotone" dataKey={k.id}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2}
                        dot={false} activeDot={{ r: 4, stroke: 'var(--bg-card)', strokeWidth: 2 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Allocation pie — always 1 col */}
            <Card className="p-5 flex flex-col">
              <div className="mb-3">
                <h3 className="font-bold font-serif text-sm" style={{ color: '#A67C1A' }}>Allocation</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>By product</p>
              </div>
              {allocationNgn.length > 0 && (
                <>
                  {allocationUsd.length > 0 && <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>NGN</p>}
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={allocationNgn} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={4} strokeWidth={0}>
                        {allocationNgn.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, name, props) => [`${v}% · ₦${props.payload.raw?.toLocaleString()}`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 mb-2 space-y-1.5">
                    {allocationNgn.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: '#A67C1A' }}>{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {allocationUsd.length > 0 && (
                <>
                  {allocationNgn.length > 0 && <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 4 }}><p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>USD</p></div>}
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={allocationUsd} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={4} strokeWidth={0}>
                        {allocationUsd.map((_, i) => <Cell key={i} fill={PIE_COLORS[(allocationNgn.length + i) % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, name, props) => [`${v}% · $${props.payload.raw?.toLocaleString()}`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 space-y-1.5">
                    {allocationUsd.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[(allocationNgn.length + i) % PIE_COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: '#A67C1A' }}>{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>
        )}
        </>)}

        {/* ── TRANSACTIONS TAB ─────────────────────────────────────────── */}
        {activeTab === 'transactions' && (<>
        {isApproved && transactions.length === 0 && (
          <Card className="p-10 text-center">
            <span className="text-3xl opacity-20 block mb-2">⇄</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No transactions yet.</p>
          </Card>
        )}

        {/* Transactions */}
        {isApproved && transactions.length > 0 && (() => {
          const filtered = txFilter === 'all' ? transactions
            : txFilter === 'subscribe' ? transactions.filter(t => t.type === 'Subscribe')
            : transactions.filter(t => t.type === 'Redeem')
          return (
            <Card className="p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="font-bold font-serif" style={{ color: '#A67C1A' }}>Recent Transactions</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {filtered.length} of {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[{ key: 'all', label: 'All' }, { key: 'subscribe', label: '↑ Subscriptions' }, { key: 'redeem', label: '↓ Redemptions' }].map(f => (
                    <button key={f.key} onClick={() => setTxFilter(f.key)}
                      style={{
                        background: txFilter === f.key ? 'linear-gradient(135deg,#A67C1A,#D4A017)' : 'var(--bg-secondary)',
                        color: txFilter === f.key ? '#fff' : 'var(--text-secondary)',
                        border: txFilter === f.key ? 'none' : '1px solid var(--border)',
                        padding: '5px 14px', borderRadius: 999, fontSize: 11,
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      }}>{f.label}</button>
                  ))}
                </div>
              </div>
              {filtered.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm">No {txFilter === 'redeem' ? 'redemptions' : 'subscriptions'} yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th className="text-left pb-3 pr-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', width: 40 }}></th>
                        {['Product', 'Type', 'Amount', 'Date', 'Status'].map(h => (
                          <th key={h} className="text-left pb-3 pr-6 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t, i) => {
                        const sc = txStatusStyle(t.status)
                        const isRedeem = t.type === 'Redeem'
                        return (
                          <tr key={t.id}
                            style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td className="py-4 pr-3">
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: isRedeem ? 'rgba(239,68,68,0.1)' : 'rgba(184,134,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                                {isRedeem ? '💸' : catIcon(t)}
                              </div>
                            </td>
                            <td className="py-4 pr-6">
                              <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{t.product}</div>
                              <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                                {String(t.id).replace('sub_','PCI-').replace('red_','RED-')}
                              </div>
                            </td>
                            <td className="py-4 pr-6">
                              <span className="text-xs font-bold" style={{ color: txTypeColor(t.type) }}>
                                {isRedeem ? '↓ Redeem' : '↑ Subscribe'}
                              </span>
                            </td>
                            <td className="py-4 pr-6">
                              <span className="text-xs font-bold" style={{ color: isRedeem ? '#ef4444' : 'var(--text-primary)' }}>
                                {isRedeem ? '-' : ''}{t.amount}
                              </span>
                            </td>
                            <td className="py-4 pr-6 text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.date}</td>
                            <td className="py-4">
                              <span style={{ background: sc.bg, color: sc.color }} className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )
        })()}
        </>)}

        {/* ── DOCUMENTS TAB ────────────────────────────────────────────── */}
        {activeTab === 'documents' && (
          <div>
            {/* KYC status */}
            <Card className="p-5 mb-5">
              <h3 className="font-bold font-serif text-sm mb-3" style={{ color: '#A67C1A' }}>KYC Verification</h3>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {kycStatus === KYC_STATUS.APPROVED ? 'Verified' :
                     kycStatus === KYC_STATUS.PENDING ? 'Under review' :
                     kycStatus === KYC_STATUS.DENIED ? 'Needs attention' : 'Not submitted'}
                  </div>
                  {kycStatus === KYC_STATUS.DENIED && user?.kycDeniedReason && (
                    <div className="text-xs mt-1" style={{ color: '#dc2626' }}>{user.kycDeniedReason}</div>
                  )}
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{
                  background: kycStatus === KYC_STATUS.APPROVED ? 'rgba(34,197,94,0.12)' :
                              kycStatus === KYC_STATUS.DENIED ? 'rgba(239,68,68,0.12)' : 'rgba(251,191,36,0.15)',
                  color: kycStatus === KYC_STATUS.APPROVED ? '#16a34a' :
                         kycStatus === KYC_STATUS.DENIED ? '#dc2626' : '#d97706',
                }}>{kycStatus.replace('_', ' ')}</span>
              </div>
              {kycStatus !== KYC_STATUS.APPROVED && (
                <Link to="/kyc"><GoldButton className="mt-4" outline>
                  {kycStatus === KYC_STATUS.DENIED ? 'Resubmit KYC' : 'Complete KYC'}
                </GoldButton></Link>
              )}
            </Card>

            {/* Investment certificates */}
            <Card className="p-5">
              <div className="mb-3">
                <h3 className="font-bold font-serif text-sm" style={{ color: '#A67C1A' }}>Investment Certificates</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Issued for each active investment
                </p>
              </div>
              {allActiveSubscriptions.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="text-3xl opacity-20 block mb-2">◫</span>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Certificates appear here once you have an active investment.
                  </p>
                </div>
              ) : allActiveSubscriptions.map(s => (
                <div key={s.id} className="flex items-center justify-between gap-3 py-3 flex-wrap"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.productName}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {s.reference} · {s.currency === 'USD' ? '$' : '₦'}{Number(s.amount || 0).toLocaleString()}
                      {s.maturityDate && ` · matures ${new Date(s.maturityDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Contact support to request a copy
                  </span>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── SETTINGS TAB ─────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <SettingsTab user={user} />
        )}

        </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: '📋', label: isApproved ? 'KYC Verified ✓' : 'Complete KYC', desc: isApproved ? 'Identity verified' : 'Required to invest', link: '/kyc' },
            { icon: '📦', label: 'Browse Products', desc: 'Explore all 9 products', link: '/products' },
            { icon: '🧮', label: 'Risk Assessment', desc: 'Find your investor profile', link: '/quiz' },
          ].map(a => (
            <Link key={a.label} to={a.link}>
              <Card hover className="p-5 flex items-center gap-4">
                <div style={{ background: 'rgba(184,134,11,0.08)', borderRadius: 12, width: 44, height: 44, flexShrink: 0 }}
                  className="flex items-center justify-center text-xl">{a.icon}</div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{a.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.desc}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

      </div>

      {/* Redeem Modal */}
      <Modal open={redeemOpen} onClose={closeRedeem} title="Redeem Investment">
        {redeemStage === 'form' && (
          <div className="space-y-4">
            <Select label="Select Product to Redeem" value={redeemForm.subscriptionId}
              onChange={e => setRedeemForm(f => ({ ...f, subscriptionId: e.target.value, holdingId: '', units: '', amount: '' }))} required>
              <option value="">Choose a product…</option>
              {/* Uses allActiveSubscriptions, not the projection-filtered list —
                  clients must be able to redeem from a private portfolio too. */}
              {allActiveSubscriptions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.productName} · {s.currency === 'USD' ? 'USD ' : '₦'}{Math.round(getRemaining(s) + getAccrued(s)).toLocaleString()}
                </option>
              ))}
            </Select>

            {/* A private-portfolio subscription may hold specific equities.
                Selling one of those is fundamentally different from a
                fixed-income redemption: it's a number of units, not a
                currency amount, and the real price is only known once
                admin actually executes the sale — so it's offered as a
                separate mode rather than folded into the amount field. */}
            {equityHoldings.length > 0 && (
              <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <button type="button" onClick={() => setRedeemMode('amount')}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg transition"
                  style={redeemMode === 'amount'
                    ? { background: 'var(--bg-primary)', color: '#A67C1A' }
                    : { color: 'var(--text-muted)' }}>
                  Redeem by Amount
                </button>
                <button type="button" onClick={() => setRedeemMode('holding')}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg transition"
                  style={redeemMode === 'holding'
                    ? { background: 'var(--bg-primary)', color: '#A67C1A' }
                    : { color: 'var(--text-muted)' }}>
                  Sell a Specific Holding
                </button>
              </div>
            )}

            {redeemMode === 'holding' && equityHoldings.length > 0 && (
              <div className="space-y-3">
                <Select label="Select Holding" value={redeemForm.holdingId}
                  onChange={e => setRedeemForm(f => ({ ...f, holdingId: e.target.value, units: '' }))} required>
                  <option value="">Choose a holding…</option>
                  {equityHoldings.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name} · {Number(h.units).toLocaleString()} units held
                    </option>
                  ))}
                </Select>

                {selectedHolding && (
                  <>
                    <Input label="Units to Redeem" type="number" min="1" step="any"
                      max={selectedHolding.units}
                      value={redeemForm.units}
                      onChange={e => setRedeemForm(f => ({ ...f, units: e.target.value }))}
                      placeholder={`Max: ${selectedHolding.units} units`} />
                    <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }} className="rounded-xl p-3">
                      <p className="text-xs" style={{ color: '#92400e' }}>
                        ℹ️ This is a request only — the sale hasn't happened yet. The final amount you
                        receive depends on the actual price achieved when our team executes the sale,
                        which may differ from current market price.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {redeemMode === 'amount' && selectedSub && (() => {
              const principal = getRemaining(selectedSub)
              const accruedReturns = getAccrued(selectedSub)
              const totalRedeemable = principal + accruedReturns
              const curr = selectedSub.currency === 'USD' ? 'USD ' : '₦'
              return (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} className="rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Balance Breakdown</p>
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>Principal invested</span>
                    <span>{curr}{Math.round(principal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: '#22c55e' }}>
                    <span>Accrued returns ({selectedSub.roi || selectedSub.product_roi || 'indicative'})</span>
                    <span>+{curr}{Math.round(accruedReturns).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, color: '#A67C1A' }}>
                    <span>Total redeemable</span>
                    <span>{curr}{Math.round(totalRedeemable).toLocaleString()}</span>
                  </div>
                  <Input label="Amount to Redeem" type="number" min="1"
                    max={Math.round(totalRedeemable)}
                    value={redeemForm.amount}
                    onChange={e => setRedeemForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder={`Max: ${curr}${Math.round(totalRedeemable).toLocaleString()}`} />
                  {redeemForm.amount && Number(redeemForm.amount) < totalRedeemable && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ℹ️ Partial redemption — remaining balance stays active</p>
                  )}
                </div>
              )
            })()}

            {/* Liquidation policy notice — fixed-income terms only; equity
                sales have no fixed notice period or premature penalty. */}
            {redeemMode === 'amount' && (
              <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }} className="rounded-xl p-4">
                <p className="text-xs font-semibold mb-2" style={{ color: '#92400e' }}>📋 Liquidation Policy</p>
                <ul className="text-xs space-y-1" style={{ color: '#92400e' }}>
                  <li>• Minimum 5 working days notice required for redemption</li>
                  <li>• Early redemption (before agreed tenor): 20% penalty on accrued profit</li>
                  <li>• No penalty if investment has reached maturity</li>
                  <li>• Processing takes 24–72 hours after notice period</li>
                </ul>
              </div>
            )}

            {redeemError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{redeemError}</p>}
            <GoldButton onClick={handleRedeemSubmit} className="w-full"
              disabled={redeemMode === 'holding'
                ? (!redeemForm.subscriptionId || !redeemForm.holdingId || !redeemForm.units)
                : (!redeemForm.subscriptionId || !redeemForm.amount)}>
              Submit Redemption Request
            </GoldButton>
          </div>
        )}

        {redeemStage === 'submitted' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">📨</div>
            <h4 className="text-lg font-bold font-serif mb-2" style={{ color: '#A67C1A' }}>Request Submitted!</h4>
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              Your redemption request for <strong>{selectedSub?.productName}</strong> has been received.
            </p>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} className="rounded-xl p-4 mt-4 text-left mb-5">
              <p className="text-xs font-semibold mb-2" style={{ color: '#A67C1A' }}>What happens next?</p>
              <ol className="text-xs space-y-1.5 list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
                <li>Our team reviews your redemption request</li>
                <li>A 5 working day notice period applies from submission</li>
                <li>Funds are processed within 24–72 hours after notice period</li>
                <li>Your portfolio will be updated once completed</li>
              </ol>
            </div>
            <GoldButton onClick={closeRedeem} className="w-full">Close</GoldButton>
          </div>
        )}
      </Modal>
    </div>
  )
}
