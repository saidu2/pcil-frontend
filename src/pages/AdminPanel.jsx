import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAdmin } from '../context/AdminContext'
import { COMPANY, PAYMENT_ACCOUNTS, KYC_STATUS } from '../data/constants'
import { downloadCertificate, previewCertificate } from '../utils/certificateGenerator'
import { useSystemAlert } from '../context/SystemAlertContext'

// ── Palette ───────────────────────────────────────────────────────────────────
class SectionErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(e, info) { console.error('Section crash:', e, info) }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>Something went wrong in this section.</p>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>{this.state.error.message}</p>
        <button onClick={() => this.setState({ error: null })}
          style={{ background: '#A67C1A', border: 'none', color: '#000', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
          Try Again
        </button>
      </div>
    )
    return this.props.children
  }
}

const G = '#A67C1A'
const SECTIONS = [
  { id: 'dashboard',       icon: '▦',  label: 'Dashboard' },
  { id: 'mytasks',         icon: '✓',  label: 'My Tasks' },
  { id: 'products',        icon: '◈',  label: 'Products' },
  { id: 'clients',         icon: '◉',  label: 'Clients' },
  { id: 'kyc',             icon: '◎',  label: 'KYC Management' },
  { id: 'subscriptions',   icon: '◆',  label: 'Subscriptions' },
  { id: 'redemptions',     icon: '◀',  label: 'Redemptions' },
  { id: 'certificates',    icon: '◐',  label: 'Certificates' },
  { id: 'maturity',        icon: '◷',  label: 'Maturity Tracker' },
  { id: 'nav',             icon: '◈',  label: 'NAV & Returns' },
  { id: 'payments',        icon: '◳',  label: 'Payment Accounts' },
  { id: 'fees',            icon: '◑',  label: 'Fees & Penalties' },
  { id: 'notifications',   icon: '◈',  label: 'Notifications' },
  { id: 'announcements',   icon: '◉',  label: 'Announcements' },
  { id: 'reports',         icon: '◫',  label: 'Reports & Analytics' },
  { id: 'audit',           icon: '◬',  label: 'Audit Log' },
  { id: 'settings',        icon: '◎',  label: 'System Settings' },
  { id: 'systemalert',      icon: '📢', label: 'System Alert' },
  { id: 'admins',          icon: '◈',  label: 'Admin Users' },
  { id: 'roles',           icon: '🔑',  label: 'Roles & Permissions' },
  { id: 'workflows',       icon: '⚙',  label: 'Workflow Configuration' },
  { id: 'security',        icon: '🔒', label: 'My Security' },
  { id: 'portfolio',       icon: '💼', label: 'Private Portfolios' },
]

// ── Shared UI ─────────────────────────────────────────────────────────────────

// Minimal theme stub · keeps dark theme constants accessible to any section that calls useTheme()
const ThemeCtx = React.createContext({ dark: true, T: null })
const useTheme = () => React.useContext(ThemeCtx)

const DARK = {
  bg: '#080808', sidebar: '#0a0a0a', header: '#0a0a0a',
  border: '#1a1a1a', border2: '#2a2a2a',
  text: '#ffffff', textMuted: '#aaa', textDim: '#666', textFaint: '#555',
  card: '#111', inputBg: '#1a1a1a',
  tableRow: '#1a1a1a', tableHover: '#1f1f1f', tableCell: '#ccc', tableHead: '#555',
  navActive: 'rgba(184,134,11,0.15)', navActiveBorder: 'rgba(184,134,11,0.3)',
  navDefault: '#555', navHover: '#aaa',
}
const LIGHT = {
  bg: '#f0f2f5', sidebar: '#ffffff', header: '#ffffff',
  border: '#e2e8f0', border2: '#cbd5e1',
  text: '#0f172a', textMuted: '#475569', textDim: '#64748b', textFaint: '#94a3b8',
  card: '#ffffff', inputBg: '#f8fafc',
  tableRow: '#ffffff', tableHover: '#f8fafc', tableCell: '#334155', tableHead: '#64748b',
  navActive: 'rgba(184,134,11,0.12)', navActiveBorder: 'rgba(184,134,11,0.5)',
  navDefault: '#64748b', navHover: '#1e293b',
}

// inputCls is used inline in a few places · kept as a function so it reads T
const mkInputCls = (T) => ({
  width: '100%', padding: '9px 13px',
  background: T.inputBg, border: `1px solid ${T.border2}`,
  borderRadius: 8, color: T.text, fontSize: 13, outline: 'none',
})
// Static fallback for the few places that reference inputCls directly (e.g. textarea)
const inputCls = mkInputCls(DARK)

const AInput = ({ value, onChange, placeholder, type = 'text', disabled }) => {
  const { T = DARK } = useTheme()
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type}
      disabled={disabled} style={mkInputCls(T)}
      onFocus={e => e.target.style.borderColor = G}
      onBlur={e => e.target.style.borderColor = T.border2} />
  )
}
const ASelect = ({ value, onChange, children }) => {
  const { T = DARK } = useTheme()
  return (
    <select value={value} onChange={onChange}
      style={{ ...mkInputCls(T), cursor: 'pointer' }}
      onFocus={e => e.target.style.borderColor = G}
      onBlur={e => e.target.style.borderColor = T.border2}>
      {children}
    </select>
  )
}
const ABtn = ({ children, onClick, outline, danger, small, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: small ? '6px 14px' : '9px 20px',
    fontSize: small ? 12 : 13, fontWeight: 600, borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    border: danger ? '1.5px solid #ef4444' : outline ? `1.5px solid ${G}` : 'none',
    background: danger ? 'rgba(239,68,68,0.1)' : outline ? 'transparent' : `linear-gradient(135deg,${G},#D4A017)`,
    color: danger ? '#ef4444' : outline ? G : '#000',
    opacity: disabled ? 0.5 : 1, transition: 'opacity 0.2s',
  }}>{children}</button>
)
const ACard = ({ children, style = {} }) => {
  const { T = DARK } = useTheme()
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 12, padding: 20, ...style }}>
      {children}
    </div>
  )
}
const ABadge = ({ status }) => {
  const map = {
    approved: ['#dcfce7', '#166534'], active: ['#dcfce7', '#166534'],
    pending: ['#fef3c7', '#92400e'], pending_review: ['#fef3c7', '#92400e'],
    denied: ['#fee2e2', '#991b1b'], not_submitted: ['#f3f4f6', '#374151'],
    completed: ['#dbeafe', '#1e40af'], redeemed: ['#ede9fe', '#5b21b6'],
    matured: ['#d1fae5', '#065f46'], issued: ['#dcfce7', '#166534'],
  }
  const [bg, color] = map[status] || ['#e2e8f0', '#475569']
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
    {status?.replace(/_/g, ' ').toUpperCase()}
  </span>
}
const SectionHeader = ({ title, subtitle, action }) => {
  const { T = DARK } = useTheme()
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 style={{ color: G, fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{title}</h2>
        {subtitle && <p style={{ color: T.textDim, fontSize: 13, marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
const StatCard = ({ label, value, sub, color = G }) => {
  const { T = DARK } = useTheme()
  return (
    <ACard>
      <div style={{ color: T.textDim, fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 28, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: T.textFaint, fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </ACard>
  )
}
const Table = ({ cols, rows, emptyMsg = 'No records found' }) => {
  const { T = DARK } = useTheme()
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border2}` }}>
            {cols.map(c => <th key={c} style={{ padding: '10px 14px', textAlign: 'left', color: T.tableHead, fontWeight: 600, whiteSpace: 'nowrap' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: 32, color: T.textFaint }}>{emptyMsg}</td></tr>
            : rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {row.map((cell, j) => <td key={j} style={{ padding: '10px 14px', color: T.tableCell, whiteSpace: 'nowrap' }}>{cell}</td>)}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
const Modal = ({ open, onClose, title, children }) => {
  const { T = DARK } = useTheme()
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: T.card, border: `1px solid ${G}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ color: G, fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ color: T.textDim, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
const Field = ({ label, children }) => {
  const { T = DARK } = useTheme()
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: T.textDim, marginBottom: 5, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  )
}

// ── ReceiptCell · fetches receipt from backend and shows inline ───────────
function ReceiptCell({subscriptionId, hasReceipt }) {
  const { T = DARK } = useTheme()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000/api/v1'

  const load = async () => {
    if (data) { setOpen(true); return }
    setLoading(true); setError('')
    try {
      // Get admin token from module scope (set during admin login)
      const headers = { 'Content-Type': 'application/json' }
      // Try to get token from AdminContext · stored in module variable
      const _tok = sessionStorage.getItem('pcil-admin-token'); if (_tok) headers['Authorization'] = `Bearer ${_tok}`
      const res = await fetch(`${BASE}/admin/subscriptions/${subscriptionId}/receipt`, {
        headers, credentials: 'include'
      })
      if (!res.ok) { setError('Could not load receipt.'); setLoading(false); return }
      const json = await res.json()
      setData(json)
      setOpen(true)
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }

  if (!hasReceipt) return <span style={{ color: T.textFaint, fontSize: 12 }}>N/A</span>

  const isImage = data?.mime_type?.startsWith('image/')
  const isPdf = data?.mime_type === 'application/pdf'
  const dataUri = data ? `data:${data.mime_type};base64,${data.data}` : null

  return (
    <div>
      <button onClick={load} style={{ background: 'none', border: 'none', color: G, fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
        {loading ? 'Loading…' : '📎 View Receipt'}
      </button>
      {error && <div style={{ color: '#ef4444', fontSize: 11 }}>{error}</div>}
      {open && data && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setOpen(false)}>
          <div style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 16, padding: 24, maxWidth: 700, maxHeight: '90vh', width: '100%', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p style={{ color: T.text, fontWeight: 700, margin: 0 }}>Payment Receipt</p>
                <p style={{ color: T.textFaint, fontSize: 12, margin: 0 }}>{data.reference} · {data.filename}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={dataUri} download={data.filename}
                  style={{ background: G, color: '#000', fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 8, textDecoration: 'none' }}>
                  ⬇ Download
                </a>
                <button onClick={() => setOpen(false)}
                  style={{ background: T.border2, border: 'none', color: T.text, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
            {isImage && <img src={dataUri} alt="Receipt" style={{ width: '100%', borderRadius: 8 }} />}
            {isPdf && <iframe src={dataUri} style={{ width: '100%', height: 500, border: 'none', borderRadius: 8 }} title="Receipt PDF" />}
            {!isImage && !isPdf && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: T.textMuted }}>Preview not available for this file type.</p>
                <a href={dataUri} download={data.filename}
                  style={{ color: G, textDecoration: 'underline' }}>Download {data.filename}</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


// ── Sections ──────────────────────────────────────────────────────────────────

function Dashboard({clients, subscriptions, kyc, redemptions }) {
  const { T = DARK } = useTheme()
  // TODO: replace hardcoded 1600 with usd_ngn_rate fetched from fee_config table in DB · see PrimeCapital Context doc, Pending Development Work section
  const totalAUM = subscriptions.filter(s => s.status === 'active').reduce((a, s) => a + (s.currency === 'NGN' ? s.amount : s.amount * 1600), 0)
  const pendingKyc = kyc.filter(k => k.status === 'pending').length
  const activeInvestments = subscriptions.filter(s => s.status === 'active').length
  const pendingReview = subscriptions.filter(s => s.status === 'pending_review').length

  const { auditLog } = useAdmin()
  const recentActivity = (auditLog || []).slice(0, 8).map(a => ({
    label: `${a.action}${a.target ? ' · ' + a.target : ''}`,
    by: a.performed_by_name || 'System',
    time: new Date(a.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    type: a.action_type || 'admin',
  }))
  const typeIcon = { kyc: '📋', subscription: '💼', redemption: '↩️', admin: '⚙️', product: '◈', certificate: '🏆', settings: '🔧' }

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle="Prime Capital & Investment Ltd · Admin Overview" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Clients" value={clients.length} sub={`${kyc.filter(k => k.status === 'approved').length} verified`} />
        <StatCard label="Total AUM (₦ equiv.)" value={`₦${(totalAUM / 1_000_000).toFixed(1)}M`} sub="Active investments" color="#22c55e" />
        <StatCard label="Pending KYC" value={pendingKyc} sub="Awaiting D365 review" color="#f59e0b" />
        <StatCard label="Active Investments" value={activeInvestments} sub={`${pendingReview} pending review`} color="#3b82f6" />
        <StatCard label="Pending Redemptions" value={(redemptions || []).filter(r => r.status === 'pending').length} sub="Awaiting processing" color="#f97316" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ACard>
          <h4 style={{ color: G, fontWeight: 700, marginBottom: 14, fontSize: 14 }}>Recent Activity</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentActivity.length === 0
              ? <p style={{ color: T.textFaint, fontSize: 13 }}>No activity yet.</p>
              : recentActivity.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18 }}>{typeIcon[a.type] || '⚙️'}</span>
                  <div>
                    <p style={{ color: T.textMuted, fontSize: 13 }}>{a.label}</p>
                    <p style={{ color: T.textFaint, fontSize: 11, marginTop: 2 }}>{a.by} · {a.time}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </ACard>
        <ACard>
          <h4 style={{ color: G, fontWeight: 700, marginBottom: 14, fontSize: 14 }}>KYC Status Breakdown</h4>
          {[
            { label: 'Approved', count: kyc.filter(k => k.status === 'approved').length, color: '#22c55e' },
            { label: 'Pending', count: kyc.filter(k => k.status === 'pending').length, color: '#f59e0b' },
            { label: 'Denied', count: kyc.filter(k => k.status === 'denied').length, color: '#ef4444' },
            { label: 'Not Submitted', count: 0, color: T.textFaint },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                <span style={{ color: T.textMuted, fontSize: 13 }}>{s.label}</span>
              </div>
              <span style={{ color: s.color, fontWeight: 700, fontSize: 14 }}>{s.count}</span>
            </div>
          ))}
        </ACard>
      </div>
    </div>
  )
}

function ProductsSection({addAuditLog }) {
  const { T = DARK } = useTheme()
  const { products: backendProds, fetchProducts, createProduct, updateProduct, deleteProduct } = useAdmin()
  const [prods, setProds] = useState([])
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saveError, setSaveError] = useState('')
  const [payAccounts, setPayAccounts] = useState([])
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000/api/v1'

  useEffect(() => { fetchProducts() }, [])
  useEffect(() => { if (backendProds?.length > 0) setProds(backendProds) }, [backendProds])

  // Load payment accounts for the dropdown
  useEffect(() => {
    const tok = sessionStorage.getItem('pcil-admin-token')
    fetch(`${BASE}/admin/payment-accounts`, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setPayAccounts(Array.isArray(data) ? data.filter(a => a.is_active) : []))
      .catch(() => {})
  }, [])

  const openCreate = () => { setForm({}); setEditing(null); setModal('edit'); setSaveError('') }
  const openEdit = (p) => {
    // Map discretionary field to management_type for the dropdown
    const mgmtType = p.management_type ||
      (p.discretionary === 'Discretionary' || p.discretionary === 'discretionary' ? 'discretionary' :
       p.discretionary === 'Non-Discretionary' || p.discretionary === 'non_discretionary' ? 'non_discretionary' : '')
    setForm({ ...p, management_type: mgmtType })
    setEditing(p.id)
    setModal('edit')
    setSaveError('')
  }

  const save = async () => {
    setSaveError('')
    const minAmt = Number(form.minAmount || form.min_amount || 0)
    const currency = form.currency || 'NGN'
    const currencySign = currency === 'USD' ? '$' : '₦'
    const minDisplay = form.minAmountDisplay || form.min_amount_display ||
      (minAmt ? `${currencySign}${minAmt.toLocaleString()}` : '')
    // features is List[str] in backend · ensure we send array not string
    const rawFeatures = form.features
    const featuresArr = Array.isArray(rawFeatures)
      ? rawFeatures
      : (typeof rawFeatures === 'string' && rawFeatures.trim())
        ? rawFeatures.split('\n').map(s => s.trim()).filter(Boolean)
        : []
    const payload = {
      name:               form.name || '',
      category:           form.category || '',
      product_type:       form.type || form.product_type || '',
      currency:           currency,
      discretionary: form.management_type === 'discretionary' ? 'Discretionary'
        : form.management_type === 'non_discretionary' ? 'Non-Discretionary'
        : form.discretionary || 'Non-Discretionary',
      min_amount:         minAmt,
      min_amount_display: minDisplay,
      roi:                form.roi || '',
      duration:           form.duration || '',
      risk:               form.risk || '',
      target_investors:   form.targetInvestors ?? form.target_investors ?? '',
      description:        form.description || '',
      features:           featuresArr,
      is_active:          form.is_active ?? true,
      payment_account_id: form.payment_account_id || null,
    }
    try {
      if (editing) {
        await updateProduct(editing, payload)
        addAuditLog('Product Updated', form.name, 'product')
      } else {
        await createProduct(payload)
        addAuditLog('Product Created', form.name, 'product')
      }
      await fetchProducts()
      setModal(null)
    } catch (err) {
      setSaveError((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || err.message || 'Save failed.')
    }
  }

  const toggleActive = async (id) => {
    const p = prods.find(p => p.id === id)
    try {
      await updateProduct(id, { is_active: !(p?.is_active ?? true) })
      addAuditLog(p?.is_active ? 'Product Deactivated' : 'Product Activated', p?.name, 'product')
    } catch (err) {
      alert((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || 'Update failed.')
    }
  }

  return (
    <div>
      <SectionHeader title="Product Management" subtitle={`${prods.length} products`}
        action={<ABtn onClick={openCreate}>+ New Product</ABtn>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {prods.map(p => (
          <ACard key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                {!(p.is_active ?? !p.inactive) && <span style={{ background: T.border2, color: T.textDim, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>INACTIVE</span>}
              </div>
              <div style={{ color: T.textDim, fontSize: 12 }}>
                {p.category}{p.management_type ? ` · ${p.management_type.replace('_',' ')}` : ''} · {p.roi} · Min: {p.min_amount_display || p.minAmountDisplay || 'N/A'} · {p.currency}
              </div>
              {p.payment_account && (
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#A67C1A', background: 'rgba(184,134,11,0.1)', border: '1px solid rgba(184,134,11,0.25)', borderRadius: 4, padding: '1px 7px' }}>
                    🏦 {p.payment_account.bank} · {p.payment_account.account_number} ({p.payment_account.currency})
                  </span>
                </div>
              )}
              {!p.payment_account && (
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: T.textDim, background: T.inputBg, border: `1px solid ${T.border2}`, borderRadius: 4, padding: '1px 7px' }}>No payment account linked</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <ABtn small outline onClick={() => openEdit(p)}>Edit</ABtn>
              <ABtn small outline={!(p.is_active ?? !p.inactive)} danger={p.is_active ?? !p.inactive} onClick={() => toggleActive(p.id)}>
                {(p.is_active ?? !p.inactive) ? 'Deactivate' : 'Activate'}
              </ABtn>
            </div>
          </ACard>
        ))}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={editing ? 'Edit Product' : 'New Product'}>
        <Field label="Product Name *"><AInput value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. Prime Steady Income" /></Field>
        <Field label="Category *">
          <ASelect value={form.category || ''} onChange={e => set('category', e.target.value)}>
            <option value="">Select category</option>
            {['Fixed Income','Equity','FX / Dollar','Ethical','Portfolio'].map(c => <option key={c}>{c}</option>)}
          </ASelect>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Type"><ASelect value={form.type || form.product_type || ''} onChange={e => set('type', e.target.value)}><option value="">Select</option><option>Conventional</option><option>Sharia</option><option>Both (Conventional &amp; Sharia)</option></ASelect></Field>
          <Field label="Currency"><ASelect value={form.currency || ''} onChange={e => {
            const cur = e.target.value
            const sign = cur === 'USD' ? '$' : '₦'
            const amt = Number(form.minAmount || form.min_amount || 0)
            set('currency', cur)
            if (amt) set('minAmountDisplay', `${sign}${amt.toLocaleString()}`)
          }}><option value="">Select</option><option>NGN</option><option>USD</option></ASelect></Field>
          <Field label="Management Type">
            <ASelect value={form.management_type || ''} onChange={e => set('management_type', e.target.value)}>
              <option value="">Select</option>
              <option value="discretionary">Discretionary</option>
              <option value="non_discretionary">Non-Discretionary</option>
            </ASelect>
          </Field>
          <Field label="Min Amount (figures)"><AInput type="number" value={form.minAmount || form.min_amount || ''} onChange={e => {
            const amt = Number(e.target.value)
            const sign = (form.currency || 'NGN') === 'USD' ? '$' : '₦'
            set('minAmount', amt)
            set('minAmountDisplay', amt ? `${sign}${amt.toLocaleString()}` : '')
          }} placeholder="e.g. 5000000" /></Field>
          <Field label="Min Amount (display)"><AInput value={form.minAmountDisplay || form.min_amount_display || ''} onChange={e => set('minAmountDisplay', e.target.value)} placeholder="Auto-filled from amount above" /></Field>
          <Field label="Expected ROI"><AInput value={form.roi || ''} onChange={e => set('roi', e.target.value)} placeholder="e.g. ~14-18% p.a." /></Field>
          <Field label="Duration"><AInput value={form.duration || ''} onChange={e => set('duration', e.target.value)} placeholder="e.g. Flexible" /></Field>
          <Field label="Risk Level"><ASelect value={form.risk || ''} onChange={e => set('risk', e.target.value)}><option value="">Select</option><option>Conservative</option><option>Balanced</option><option>Aggressive</option><option>Custom</option></ASelect></Field>
          <Field label="Target Investors"><AInput value={form.targetInvestors ?? form.target_investors ?? ''} onChange={e => set('targetInvestors', e.target.value)} placeholder="e.g. Retail | HNI" /></Field>
        </div>
        <Field label="Custodian Payment Account">
          <ASelect
            value={form.payment_account_id || ''}
            onChange={e => set('payment_account_id', e.target.value || null)}
          >
            <option value="">None (no account linked)</option>
            {payAccounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.bank} · {a.account_number} · {a.currency}{a.label ? ` (${a.label})` : ''}
              </option>
            ))}
          </ASelect>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>
            The bank account clients will transfer funds to when subscribing to this product.
          </div>
        </Field>
        <Field label="Description">
          <textarea value={form.description || ''} onChange={e => set('description', e.target.value)}
            rows={3} placeholder="Product description..." style={{ ...inputCls, resize: 'vertical' }} />
        </Field>
        {saveError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{saveError}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setModal(null)}>Cancel</ABtn>
          <ABtn onClick={save} disabled={!form.name || !form.category}>Save Product</ABtn>
        </div>
      </Modal>
    </div>
  )
}

function ClientsSection({clients, setClients, addAuditLog }) {
  const { T = DARK } = useTheme()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [overrideModal, setOverrideModal] = useState(false)
  const [overrideStatus, setOverrideStatus] = useState('')
  const [overrideReason, setOverrideReason] = useState('')

  const { overrideKyc, kycSubmissions, subscriptions, createClient, resetClientPassword, products, fetchProducts } = useAdmin()

  useEffect(() => { fetchProducts?.() }, [])

  // ── Create Client (NEW in v11) ─────────────────────────────────────────────
  const [createModal, setCreateModal] = useState(false)
  const emptyClientForm = {
    full_name: '', email: '', phone: '', account_type: 'individual', temp_password: '',
    onboarding_type: 'new',
    product_id: '', investment_amount: '', investment_currency: 'NGN',
    investment_start_date: '', investment_maturity_date: '', d365_reference: '',
  }
  const [clientForm, setClientForm] = useState(emptyClientForm)
  const setClientField = (f, v) => setClientForm(p => ({ ...p, [f]: v }))
  const [createError, setCreateError] = useState('')
  const [createdResult, setCreatedResult] = useState(null) // { email, temp_password } shown once after success

  // Client password reset · same one-time-reveal pattern as account creation
  const [clientResetTarget, setClientResetTarget] = useState(null)
  const [clientResetResult, setClientResetResult] = useState(null)
  const [clientResetLoading, setClientResetLoading] = useState(false)
  const [clientResetError, setClientResetError] = useState('')

  const doClientReset = async () => {
    setClientResetError(''); setClientResetLoading(true)
    try {
      const result = await resetClientPassword(clientResetTarget.user_id || clientResetTarget.id)
      setClientResetResult(result)
    } catch (err) {
      setClientResetError(err.response?.data?.detail || 'Could not reset that password.')
    } finally {
      setClientResetLoading(false)
    }
  }

  const closeClientReset = () => {
    setClientResetTarget(null); setClientResetResult(null); setClientResetError('')
  }

  const doCreateClient = async () => {
    setCreateError('')
    try {
      const payload = {
        full_name: clientForm.full_name,
        email: clientForm.email,
        phone: clientForm.phone || null,
        account_type: clientForm.account_type,
        temp_password: clientForm.temp_password || null, // null = backend generates one
        onboarding_type: clientForm.onboarding_type,
      }
      if (clientForm.onboarding_type === 'existing') {
        payload.product_id = clientForm.product_id
        payload.investment_amount = parseFloat(clientForm.investment_amount) || null
        payload.investment_currency = clientForm.investment_currency
        payload.investment_start_date = clientForm.investment_start_date || null
        payload.investment_maturity_date = clientForm.investment_maturity_date || null
        payload.d365_reference = clientForm.d365_reference || null
      }
      const result = await createClient(payload)
      setCreatedResult(result) // switch modal to "here's the temp password" view
      setClientForm(emptyClientForm)
    } catch (err) {
      setCreateError((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || 'Failed to create client.')
    }
  }

  const closeCreateModal = () => {
    setCreateModal(false)
    setCreatedResult(null)
    setCreateError('')
    setClientForm(emptyClientForm)
  }

  const filtered = kycSubmissions.filter(k => {
    const name = (k.full_name || '').toLowerCase()
    const email = (k.email || '').toLowerCase()
    const q = search.toLowerCase()
    return (name.includes(q) || email.includes(q)) && (filter === 'all' || k.status === filter)
  })

  const getTotalInvested = (userId) =>
    subscriptions
      .filter(s => String(s.user_id) === String(userId) && s.status === 'active')
      // TODO: replace hardcoded 1600 with usd_ngn_rate fetched from fee_config table in DB · see PrimeCapital Context doc, Pending Development Work section
      .reduce((sum, s) => sum + (s.currency === 'NGN' ? Number(s.amount) : Number(s.amount) * 1600), 0)

  const [overrideError, setOverrideError] = useState('')

  const doOverride = async () => {
    if (!selected) return
    setOverrideError('')
    try {
      await overrideKyc(selected.id, overrideStatus, overrideReason)
      setOverrideModal(false)
      setSelected(null)
    } catch (err) {
      setOverrideError((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || 'Override failed.')
    }
  }

  return (
    <div>
      <SectionHeader title="Client Management" subtitle={`${kycSubmissions.length} registered clients`}
        action={<ABtn onClick={() => setCreateModal(true)}>+ Create Client</ABtn>} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <AInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." />
        <ASelect value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="denied">Denied</option>
          <option value="not_submitted">Not Submitted</option>
        </ASelect>
      </div>
      <ACard style={{ padding: 0 }}>
        <Table
          cols={['Client', 'Account Type', 'KYC Status', 'Total Invested', 'Submitted', 'Actions']}
          rows={filtered.map(k => {
            const invested = getTotalInvested(k.user_id)
            return [
              <div>
                <div style={{ color: T.text, fontWeight: 600 }}>{k.full_name || 'N/A'}</div>
                <div style={{ color: T.textDim, fontSize: 11 }}>{k.email || 'N/A'}</div>
              </div>,
              <span style={{ textTransform: 'capitalize' }}>{k.account_type || 'N/A'}</span>,
              <ABadge status={k.status} />,
              invested > 0 ? `₦${(invested / 1_000_000).toFixed(2)}M` : 'N/A',
              k.submitted_at ? new Date(k.submitted_at).toLocaleDateString('en-GB') : 'N/A',
              <div style={{ display: 'flex', gap: 6 }}>
                <ABtn small outline onClick={() => { setSelected(k); setOverrideModal(true); setOverrideStatus(k.status); setOverrideReason(''); setOverrideError('') }}>Override KYC</ABtn>
                <ABtn small outline onClick={() => setClientResetTarget(k)}>Reset Password</ABtn>
              </div>
            ]
          })}
        />
      </ACard>

      <Modal open={overrideModal} onClose={() => setOverrideModal(false)} title={`Override KYC: ${selected?.full_name || selected?.name}`}>
        <Field label="New KYC Status">
          <ASelect value={overrideStatus} onChange={e => setOverrideStatus(e.target.value)}>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="denied">Denied</option>
            <option value="not_submitted">Not Submitted</option>
          </ASelect>
        </Field>
        <Field label="Reason / Note">
          <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
            rows={3} placeholder="Reason for override..." style={{ ...inputCls, resize: 'vertical' }} />
        </Field>
        {overrideError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{overrideError}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <ABtn outline onClick={() => setOverrideModal(false)}>Cancel</ABtn>
          <ABtn onClick={doOverride}>Apply Override</ABtn>
        </div>
      </Modal>

      {/* Client Reset Password Modal */}
      <Modal open={!!clientResetTarget} onClose={closeClientReset}
        title={clientResetResult ? 'Password Reset' : `Reset Password: ${clientResetTarget?.full_name || ''}`}>
        {clientResetResult ? (
          <div>
            <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 12 }}>
              Share this temporary password with <strong style={{ color: T.text }}>{clientResetResult.full_name}</strong> now.
              It will not be shown again, and they'll be asked to set their own when they next sign in.
            </p>
            <div style={{ background: T.inputBg, border: `1px solid ${T.border2}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <div style={{ color: T.textDim, fontSize: 11, marginBottom: 4 }}>Email</div>
              <div style={{ color: T.text, fontFamily: 'monospace', fontSize: 14, marginBottom: 10 }}>{clientResetResult.email}</div>
              <div style={{ color: T.textDim, fontSize: 11, marginBottom: 4 }}>Temporary Password</div>
              <div style={{ color: G, fontFamily: 'monospace', fontSize: 16, fontWeight: 700 }}>{clientResetResult.temp_password}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <ABtn outline onClick={() => navigator.clipboard?.writeText(
                `Email: ${clientResetResult.email}\nTemporary password: ${clientResetResult.temp_password}`
              )}>Copy</ABtn>
              <ABtn onClick={closeClientReset}>Done</ABtn>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 12 }}>
              This generates a new temporary password for this client. Their current password
              stops working immediately, and they'll be asked to set a new one at next sign in.
              They'll also be notified in the portal.
            </p>
            {clientResetError && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{clientResetError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <ABtn outline onClick={closeClientReset}>Cancel</ABtn>
              <ABtn danger onClick={doClientReset} disabled={clientResetLoading}>
                {clientResetLoading ? 'Resetting…' : 'Reset Password'}
              </ABtn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={createModal} onClose={closeCreateModal} title={createdResult ? 'Client Account Created' : 'Create Client Account'}>
        {createdResult ? (
          <div>
            <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 12 }}>
              Share this temporary password with <strong style={{ color: T.text }}>{createdResult.full_name}</strong> now.
              it will not be shown again. They'll be required to set their own password on first login.
            </p>
            <div style={{ background: T.inputBg, border: `1px solid ${T.border2}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <div style={{ color: T.textDim, fontSize: 11, marginBottom: 4 }}>Email</div>
              <div style={{ color: T.text, fontFamily: 'monospace', fontSize: 14, marginBottom: 10 }}>{createdResult.email}</div>
              <div style={{ color: T.textDim, fontSize: 11, marginBottom: 4 }}>Temporary Password</div>
              <div style={{ color: G, fontFamily: 'monospace', fontSize: 16, fontWeight: 700 }}>{createdResult.temp_password}</div>
            </div>
            {createdResult.subscription_created && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#22c55e', fontSize: 13 }}>
                ✓ Active subscription created. Their portfolio is ready to view on first login.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <ABtn outline onClick={() => navigator.clipboard?.writeText(`Email: ${createdResult.email}\nTemporary password: ${createdResult.temp_password}`)}>Copy</ABtn>
              <ABtn onClick={closeCreateModal}>Done</ABtn>
            </div>
          </div>
        ) : (
          <div>
            <Field label="Onboarding Type">
              <ASelect value={clientForm.onboarding_type} onChange={e => setClientField('onboarding_type', e.target.value)}>
                <option value="new">New Client (will submit KYC through the portal)</option>
                <option value="existing">Already Onboarded (KYC, payment and D365 already done offline)</option>
              </ASelect>
            </Field>
            <Field label="Full Name *"><AInput value={clientForm.full_name} onChange={e => setClientField('full_name', e.target.value)} placeholder="e.g. Jane Doe" /></Field>
            <Field label="Email Address *"><AInput type="email" value={clientForm.email} onChange={e => setClientField('email', e.target.value)} placeholder="client@example.com" /></Field>
            <Field label="Phone Number"><AInput value={clientForm.phone} onChange={e => setClientField('phone', e.target.value)} placeholder="e.g. 0803..." /></Field>
            <Field label="Account Type">
              <ASelect value={clientForm.account_type} onChange={e => setClientField('account_type', e.target.value)}>
                <option value="individual">Individual</option>
                <option value="joint">Joint</option>
                <option value="minor">Minor</option>
                <option value="corporate">Corporate</option>
              </ASelect>
            </Field>
            <Field label="Temporary Password (optional)">
              <AInput value={clientForm.temp_password} onChange={e => setClientField('temp_password', e.target.value)} placeholder="Leave blank to auto-generate" />
            </Field>

            {clientForm.onboarding_type === 'existing' && (
              <div style={{ marginTop: 4, paddingTop: 12, borderTop: `1px solid ${T.border2}` }}>
                <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 10 }}>
                  Existing investment details. This creates an active subscription immediately, no review needed.
                </p>
                <Field label="Product *">
                  <ASelect value={clientForm.product_id} onChange={e => setClientField('product_id', e.target.value)}>
                    <option value="">Select product</option>
                    {(products || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </ASelect>
                </Field>
                <Field label="Investment Amount *">
                  <AInput type="number" value={clientForm.investment_amount} onChange={e => setClientField('investment_amount', e.target.value)} placeholder="e.g. 5000000" />
                </Field>
                <Field label="Currency">
                  <ASelect value={clientForm.investment_currency} onChange={e => setClientField('investment_currency', e.target.value)}>
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                  </ASelect>
                </Field>
                <Field label="Investment Start Date">
                  <AInput type="date" value={clientForm.investment_start_date} onChange={e => setClientField('investment_start_date', e.target.value)} />
                </Field>
                <Field label="Maturity Date">
                  <AInput type="date" value={clientForm.investment_maturity_date} onChange={e => setClientField('investment_maturity_date', e.target.value)} />
                </Field>
                <Field label="D365 Reference (optional)">
                  <AInput value={clientForm.d365_reference} onChange={e => setClientField('d365_reference', e.target.value)} placeholder="D365 record ID, if known" />
                </Field>
              </div>
            )}

            {createError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{createError}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <ABtn outline onClick={closeCreateModal}>Cancel</ABtn>
              <ABtn onClick={doCreateClient} disabled={
                !clientForm.full_name || !clientForm.email ||
                (clientForm.onboarding_type === 'existing' && (!clientForm.product_id || !clientForm.investment_amount))
              }>Create Client</ABtn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function KycDetailsModal({ k, onClose, onApprove, onDeny, actionLoading, T }) {
  const { viewKycDocument } = useAdmin()
  const [denyMode, setDenyMode] = useState(false)
  const [denyReason, setDenyReason] = useState('')
  const kycId = k.kyc_id || k.id
  const extra = k.extra_data || {}

  // BUGFIX: real account type lives in extra_data.account_type
  // ('Individual'/'Minor'/'Joint'/'Corporate') · the flat k.account_type
  // column only ever says 'individual'/'corporate' and can't tell Minor
  // or Joint apart from a plain Individual account.
  const acctType = extra.account_type || (k.account_type === 'corporate' ? 'Corporate' : 'Individual')
  const isCorporate = acctType === 'Corporate'

  // BUGFIX: was showing k.full_name (the name used to sign up on the
  // portal) as THE name everywhere, which never changes between KYC
  // submissions · made resubmissions look identical even when the client
  // entered different details. Now shows the name actually typed into
  // the KYC form itself, with the portal signup name kept as a separate,
  // clearly-labeled reference row instead.
  const formName = isCorporate
    ? (k.company_name || 'N/A')
    : [extra.title, extra.surname, extra.first_name, extra.other_name].filter(Boolean).join(' ') || k.full_name || 'N/A'

  const Row = ({ label, value }) => value ? (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${T.border2}` }}>
      <span style={{ color: T.textMuted, fontSize: 12, minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ color: T.text, fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{value}</span>
    </div>
  ) : null

  const SectionTitle = ({ children }) => (
    <p style={{ color: G, fontSize: 12, fontWeight: 700, margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>{children}</p>
  )

  // Fetches the document through an authenticated request rather than linking
  // straight to storage. The stored URL is never handed to the browser, so
  // client identity documents can live in a private bucket.
  const DocLink = ({ label, url, docType }) => {
    const [busy, setBusy] = useState(false)
    if (!url) return null

    const open = async () => {
      setBusy(true)
      try {
        const blobUrl = await viewKycDocument(kycId, docType)
        window.open(blobUrl, '_blank', 'noopener,noreferrer')
        // Revoked after a delay so the new tab has time to load it
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000)
      } catch {
        alert('Could not open that document. It may have been moved or removed.')
      } finally {
        setBusy(false)
      }
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: T.bg2, borderRadius: 8, marginBottom: 6 }}>
        <span style={{ color: T.text, fontSize: 13 }}>📄 {label}</span>
        <button onClick={open} disabled={busy}
          style={{ color: G, fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer' }}>
          {busy ? 'Opening…' : 'View ↗'}
        </button>
      </div>
    )
  }

  return (
    <Modal open onClose={onClose} title={`KYC Details: ${formName}`}>
      <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>

        {/* Status Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: k.status === 'approved' ? 'rgba(34,197,94,0.1)' : k.status === 'denied' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
          border: `1px solid ${k.status === 'approved' ? '#22c55e' : k.status === 'denied' ? '#ef4444' : '#f59e0b'}40`
        }}>
          <ABadge status={k.status} />
          <span style={{ background: T.inputBg, border: `1px solid ${T.border2}`, color: T.textMuted, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>{acctType} Account</span>
          {k.reviewed_by && <span style={{ color: T.textMuted, fontSize: 11 }}>Reviewed by {k.reviewed_by}</span>}
          {k.denial_reason && <span style={{ color: '#ef4444', fontSize: 12 }}>{k.denial_reason}</span>}
        </div>

        {/* Portal account reference · kept separate from the actual KYC form data below */}
        <div style={{ background: T.inputBg, borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
          <span style={{ color: T.textFaint, fontSize: 11 }}>Portal account: {k.full_name || 'N/A'} · {k.email} {k.phone ? `· ${k.phone}` : ''}</span>
        </div>

        {!isCorporate && <>
          {/* A. Client Personal Data */}
          <SectionTitle>A. Client Personal Data</SectionTitle>
          <Row label="Title" value={extra.title} />
          <Row label="Surname" value={extra.surname} />
          <Row label="First Name" value={extra.first_name} />
          <Row label="Other Name" value={extra.other_name} />
          <Row label="Date of Birth" value={k.date_of_birth} />
          <Row label="Gender" value={extra.gender} />
          <Row label="Marital Status" value={extra.marital_status} />
          <Row label="Residential Address" value={k.address} />
          <Row label="Mother's Maiden Name" value={extra.mother_maiden} />
          <Row label="Nationality" value={k.nationality} />
          <Row label="State" value={k.state} />
          <Row label="LGA" value={k.lga} />
          <Row label="ID Type" value={extra.id_type} />
          <Row label="ID Number" value={extra.id_number} />
          <Row label="BVN" value={extra.bvn ? '••••••••••' + String(extra.bvn).slice(-3) : null} />
          <Row label="PEP Status" value={k.pep_status ? 'Yes, Politically Exposed Person' : 'No'} />
          {k.pep_status && <Row label="PEP Details" value={extra.pep_details} />}

          {/* A1. Minor Details */}
          {acctType === 'Minor' && extra.minor && <>
            <SectionTitle>A1. Minor Details</SectionTitle>
            <Row label="Minor's Surname" value={extra.minor.surname} />
            <Row label="Minor's First Name" value={extra.minor.first_name} />
            <Row label="Other Name" value={extra.minor.other_name} />
            <Row label="Date of Birth" value={extra.minor.dob} />
            <Row label="Nationality" value={extra.minor.nationality} />
            <Row label="BVN" value={extra.minor.bvn} />
            <Row label="Mandate Authorization" value={extra.minor.mandate_auth} />
          </>}

          {/* A2. Joint Account: Partner Details */}
          {acctType === 'Joint' && extra.joint && <>
            <SectionTitle>A2. Joint Account: Partner Details</SectionTitle>
            <Row label="Title" value={extra.joint.title} />
            <Row label="Surname" value={extra.joint.surname} />
            <Row label="First Name" value={extra.joint.first_name} />
            <Row label="Other Name" value={extra.joint.other_name} />
            <Row label="Date of Birth" value={extra.joint.dob} />
            <Row label="Gender" value={extra.joint.gender} />
            <Row label="Marital Status" value={extra.joint.marital_status} />
            <Row label="Residential Address" value={extra.joint.address} />
            <Row label="Mobile Phone" value={extra.joint.phone} />
            <Row label="Email Address" value={extra.joint.email} />
            <Row label="Nationality" value={extra.joint.nationality} />
            <Row label="ID Type" value={extra.joint.id_type} />
            <Row label="ID Number" value={extra.joint.id_number} />
            <Row label="BVN" value={extra.joint.bvn} />
            <Row label="PEP Status" value={extra.joint.pep} />
            <Row label="Mandate Authorization" value={extra.joint.mandate_auth} />
          </>}

          {/* B. Employment Details */}
          <SectionTitle>B. Employment Details</SectionTitle>
          <Row label="Employment Status" value={k.occupation} />
          <Row label="Employer / Business Name" value={k.employer} />
          <Row label="Employer / Business Address" value={extra.employment?.employer_address} />
          <Row label="Nature of Business" value={extra.employment?.nature_of_business} />
          <Row label="Source of Funds" value={k.annual_income} />

          {/* C. Next of Kin */}
          <SectionTitle>C. Next of Kin</SectionTitle>
          <Row label="Surname" value={extra.next_of_kin?.surname} />
          <Row label="First Name" value={extra.next_of_kin?.first_name} />
          <Row label="Relationship" value={extra.next_of_kin?.relationship} />
          <Row label="Phone" value={extra.next_of_kin?.phone} />
          <Row label="Email" value={extra.next_of_kin?.email} />
          <Row label="Address" value={extra.next_of_kin?.address} />

          {/* D. Investment Details */}
          <SectionTitle>D. Investment Details</SectionTitle>
          <Row label="Amount in Figures" value={extra.investment?.amount_figures ? `₦${Number(extra.investment.amount_figures).toLocaleString()}` : null} />
          <Row label="Amount in Words" value={extra.investment?.amount_words} />
          <Row label="Duration" value={extra.investment?.duration} />
          <Row label="Profit/Interest Payment" value={extra.investment?.profit_payment} />
          <Row label="Portfolio Management" value={k.investment_experience} />
          <Row label="Type of Investment" value={k.risk_profile} />
          <Row label="Investment Decision" value={extra.investment?.investment_decision} />

          {/* E. Bank Account Details */}
          <SectionTitle>E. Bank Account Details</SectionTitle>
          <Row label="Bank Name" value={extra.bank?.bank_name} />
          <Row label="Account Number" value={extra.bank?.account_number} />
          <Row label="Account Name" value={extra.bank?.account_name} />
          <Row label="BVN" value={extra.bank?.bvn ? '••••••••••' + String(extra.bank.bvn).slice(-3) : null} />
        </>}

        {isCorporate && <>
          {/* Company Details */}
          <SectionTitle>Company Details</SectionTitle>
          <Row label="Company Name" value={k.company_name} />
          <Row label="Registration Number" value={k.rc_number} />
          <Row label="Date of Incorporation" value={extra.corporate?.date_of_incorporation} />
          <Row label="Company Category" value={extra.corporate?.company_category} />
          <Row label="Nature of Business" value={extra.corporate?.nature_of_business} />
          <Row label="Sector/Industry" value={extra.corporate?.sector} />
          <Row label="Tax Identification Number (TIN)" value={extra.corporate?.tin} />
          <Row label="SCUML Number" value={extra.corporate?.scuml} />
          <Row label="Business Address" value={k.company_address} />
          <Row label="Phone Number 1" value={extra.corporate?.phone1} />
          <Row label="Phone Number 2" value={extra.corporate?.phone2} />
          <Row label="Email Address" value={extra.corporate?.email} />

          {/* Investment Details */}
          <SectionTitle>Investment Details</SectionTitle>
          <Row label="Amount in Figures" value={extra.investment?.amount_figures ? `₦${Number(extra.investment.amount_figures).toLocaleString()}` : null} />
          <Row label="Amount in Words" value={extra.investment?.amount_words} />
          <Row label="Duration" value={extra.investment?.duration} />
          <Row label="Profit/Interest Payment" value={extra.investment?.profit_payment} />
          <Row label="Portfolio Management" value={k.investment_experience} />
          <Row label="Type of Investment" value={k.risk_profile} />
          <Row label="Investment Decision" value={extra.investment?.investment_decision} />

          {/* Corporate Bank Details */}
          <SectionTitle>Corporate Bank Details</SectionTitle>
          <Row label="Bank Name" value={extra.corporate?.corp_bank?.bank_name} />
          <Row label="Account Number" value={extra.corporate?.corp_bank?.account_number} />
          <Row label="Account Name" value={extra.corporate?.corp_bank?.account_name} />
          <Row label="BVN" value={extra.corporate?.corp_bank?.bvn} />
          <Row label="TIN" value={extra.corporate?.corp_bank?.tin} />

          {/* Signatories */}
          {k.signatories?.length > 0 && <>
            <SectionTitle>Signatories / Directors / Executives / Trustees</SectionTitle>
            {k.signatories.map((s, i) => (
              <div key={i} style={{ marginBottom: 10, padding: '8px 12px', background: T.bg2, borderRadius: 8 }}>
                <div style={{ color: T.text, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Signatory {['A', 'B', 'C', 'D'][i] || i + 1}: {s.title || ''} {s.surname || ''} {s.firstName || s.first_name || ''}
                </div>
                <div style={{ color: T.textMuted, fontSize: 12 }}>
                  {s.phone || 'N/A'} {s.email ? `· ${s.email}` : ''} {s.idType || s.id_type ? `· ${s.idType || s.id_type}: ${s.idNumber || s.id_number || ''}` : ''}
                </div>
              </div>
            ))}
          </>}

          {/* Account Mandate */}
          <SectionTitle>Account Mandate</SectionTitle>
          <Row label="Mandate Authorization Instruction" value={extra.corporate?.mandate} />

          {/* Board Resolution */}
          <SectionTitle>Board Resolution</SectionTitle>
          <Row label="Company Name" value={extra.corporate?.board_resolution?.company_name} />
          <Row label="Meeting Date" value={extra.corporate?.board_resolution?.meeting_date} />
          <Row label="Meeting Location" value={extra.corporate?.board_resolution?.meeting_location} />
          <Row label="Director Name" value={extra.corporate?.board_resolution?.director_name} />
          <Row label="Director/Secretary Name" value={extra.corporate?.board_resolution?.secretary_name} />
        </>}

        {/* Documents */}
        <SectionTitle>Uploaded Documents</SectionTitle>
        <DocLink label="ID Document" url={k.id_document_url} docType="id_document" />
        <DocLink label="Passport Photo" url={k.passport_photo_url} docType="passport_photo" />
        <DocLink label="CAC Certificate" url={k.cac_certificate_url} docType="cac_certificate" />
        <DocLink label="SCUML Certificate" url={k.scuml_certificate_url} docType="scuml_certificate" />
        <DocLink label="TIN Certificate" url={k.tin_certificate_url} docType="tin_certificate" />
        <DocLink label="Board Resolution: Director Signature" url={k.board_resolution_director_signature_url} docType="board_resolution_director_signature" />
        <DocLink label="Board Resolution: Secretary Signature" url={k.board_resolution_secretary_signature_url} docType="board_resolution_secretary_signature" />
        {k.signatories?.map((s, i) => (
          <div key={i}>
            <DocLink label={`Signatory ${['A','B','C','D'][i] || i+1}: Passport Photo`} url={s.passport_photo_url} docType={`signatory_${i}_photo`} />
            <DocLink label={`Signatory ${['A','B','C','D'][i] || i+1}: Signature`} url={s.signature_url} docType={`signatory_${i}_signature`} />
          </div>
        ))}
        {!k.id_document_url && !k.passport_photo_url && !k.cac_certificate_url && !k.scuml_certificate_url && !k.tin_certificate_url && (
          <p style={{ color: T.textMuted, fontSize: 12 }}>No documents uploaded yet.</p>
        )}
      </div>

      {/* Actions */}
      {k.status !== 'not_submitted' && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border2}` }}>
          {denyMode ? (
            <div>
              <Field label="Reason for Denial">
                {/* BUGFIX: was a raw <input> with ad-hoc inline styles that
                    rendered invisible text in dark mode. AInput uses the
                    shared, already-correct dark-mode-safe input styling
                    used everywhere else in the admin panel. */}
                <AInput value={denyReason} onChange={e => setDenyReason(e.target.value)}
                  placeholder="Explain why KYC is being denied..." />
              </Field>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <ABtn danger onClick={() => { onDeny(k, denyReason); setDenyMode(false) }} disabled={!denyReason || actionLoading === kycId}>
                  {actionLoading === kycId ? '...' : 'Confirm Deny'}
                </ABtn>
                <ABtn outline onClick={() => setDenyMode(false)}>Cancel</ABtn>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              {k.status !== 'approved' && (
                <ABtn onClick={() => { onApprove(k); onClose() }} disabled={actionLoading === kycId}>
                  {actionLoading === kycId ? '...' : '✓ Approve KYC'}
                </ABtn>
              )}
              {k.status !== 'denied' && (
                <ABtn danger onClick={() => setDenyMode(true)} disabled={actionLoading === kycId}>
                  ✕ Deny KYC
                </ABtn>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function KycSection({kycData, setKycData, addAuditLog }) {
  const { T = DARK } = useTheme()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [detailsModal, setDetailsModal] = useState(null)

  const filtered = filter === 'all' ? kycData : kycData.filter(k => k.status === filter)

  const { overrideKyc, fetchKyc } = useAdmin()
  const [actionLoading, setActionLoading] = useState(null)
  const [actionError, setActionError] = useState('')

  const override = async (k, status, reason = '') => {
    const kycId = k.kyc_id || k.id
    if (!kycId || k.status === 'not_submitted') {
      setActionError('Client has not submitted KYC yet.')
      setTimeout(() => setActionError(''), 3000)
      return
    }
    setActionLoading(kycId)
    setActionError('')
    try {
      await overrideKyc(kycId, status, reason)
      setDetailsModal(null)
    } catch (err) {
      setActionError((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || 'Action failed. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <SectionHeader title="KYC Management" subtitle="All registered clients. D365 handles compliance, override available here" />
      <div style={{ background: 'rgba(184,134,11,0.06)', border: `1px solid rgba(184,134,11,0.2)`, borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
        <p style={{ color: G, fontSize: 13, fontWeight: 600 }}>ℹ️ D365 Integration</p>
        <p style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>KYC approvals are handled by your compliance team via Microsoft Dynamics 365. The statuses below reflect D365 sync. Use Override only when necessary.</p>
      </div>
      {actionError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{actionError}</p>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'not_submitted', 'pending', 'approved', 'denied'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: filter === f ? G : 'transparent',
            border: `1px solid ${filter === f ? G : T.border2}`,
            color: filter === f ? '#000' : '#666',
          }}>{f === 'not_submitted' ? 'Not Submitted' : f.charAt(0).toUpperCase() + f.slice(1)}{f === 'pending' && ` (${kycData.filter(k => k.status === 'pending').length})`}</button>
        ))}
      </div>
      <ACard style={{ padding: 0 }}>
        <Table
          cols={['Client (as entered on KYC form)', 'Email', 'Account Type', 'KYC Status', 'Submitted', 'Actions']}
          rows={filtered.map(k => {
            const extra = k.extra_data || {}
            const acctType = extra.account_type || (k.account_type === 'corporate' ? 'Corporate' : 'Individual')
            const formName = acctType === 'Corporate'
              ? (k.company_name || k.full_name || 'N/A')
              : [extra.title, extra.surname, extra.first_name].filter(Boolean).join(' ') || k.full_name || 'N/A'
            return [
              formName,
              k.email || 'N/A',
              acctType,
              <ABadge status={k.status} />,
              k.submitted_at ? new Date(k.submitted_at).toLocaleDateString('en-GB') : <span style={{ color: T.textFaint, fontSize: 12 }}>Not submitted</span>,
              <div style={{ display: 'flex', gap: 6 }}>
                {k.status === 'not_submitted'
                  ? <span style={{ color: T.textFaint, fontSize: 11 }}>Awaiting KYC submission</span>
                  : <>
                      <ABtn small outline onClick={() => setDetailsModal(k)}>View Details</ABtn>
                      {k.status !== 'approved' && <ABtn small onClick={() => override(k, 'approved')} disabled={actionLoading === (k.kyc_id || k.id)}>{actionLoading === (k.kyc_id || k.id) ? '...' : 'Approve'}</ABtn>}
                      {/* Deny now always opens the details modal so a real reason
                          is required · was previously hardcoding "Admin override"
                          and skipping the reason prompt entirely from this row. */}
                      {k.status !== 'denied' && <ABtn small danger onClick={() => setDetailsModal(k)} disabled={actionLoading === (k.kyc_id || k.id)}>Deny</ABtn>}
                    </>
                }
              </div>
            ]
          })}
        />
      </ACard>

      {detailsModal && (
        <KycDetailsModal
          k={detailsModal}
          onClose={() => setDetailsModal(null)}
          onApprove={(k) => override(k, 'approved')}
          onDeny={(k, reason) => override(k, 'denied', reason)}
          actionLoading={actionLoading}
          T={T}
        />
      )}
    </div>
  )
}

function SubscriptionsSection({subscriptions, setSubscriptions, addAuditLog }) {
  const { T = DARK } = useTheme()
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? subscriptions : subscriptions.filter(s => s.status === filter)

  const { activateSubscription, denySubscription } = useAdmin()
  const [actionLoading, setActionLoading] = useState(null)
  const [actionError, setActionError] = useState('')

  const [activateModal, setActivateModal] = useState(null)
  const [maturityDate, setMaturityDate] = useState('')

  const openActivate = (id) => { setActivateModal(id); setMaturityDate(''); setActionError('') }

  const activate = async () => {
    if (!maturityDate) { setActionError('Please select a maturity date.'); return }
    const id = activateModal
    setActivateModal(null)
    setActionLoading(id)
    setActionError('')
    try {
      await activateSubscription(id, maturityDate)
    } catch (err) {
      setActionError((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || 'Activation failed.')
    } finally {
      setActionLoading(null)
    }
  }
  const deny = async (id) => {
    setActionLoading(id)
    setActionError('')
    try {
      await denySubscription(id, 'Admin denied')
    } catch (err) {
      setActionError((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || 'Denial failed.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <SectionHeader title="Subscription Management" subtitle={`${subscriptions.length} total subscriptions`} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'pending_review', 'active', 'denied', 'matured'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: filter === f ? G : 'transparent',
            border: `1px solid ${filter === f ? G : T.border2}`,
            color: filter === f ? '#000' : '#666',
          }}>{f.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}{f === 'pending_review' && ` (${subscriptions.filter(s => s.status === 'pending_review').length})`}</button>
        ))}
      </div>
      <ACard style={{ padding: 0 }}>
        <Table
          cols={['Client', 'Product', 'Amount', 'Status', 'Submitted', 'Receipt', 'Actions']}
          rows={filtered.map(s => [
            s.client_name || 'N/A',
            <div style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.product_name || 'N/A'}</div>,
            `${s.currency === 'USD' ? '$' : '₦'}${Number(s.amount).toLocaleString()}`,
            <ABadge status={s.status} />,
            new Date(s.submitted_at || s.submittedAt).toLocaleDateString('en-GB'),
            <ReceiptCell subscriptionId={s.id} hasReceipt={!!(s.has_receipt || s.receipt_url || s.receiptUrl)} />,
            <div style={{ display: 'flex', gap: 6 }}>
              {actionError && <span style={{ color: '#ef4444', fontSize: 11 }}>{actionError}</span>}
              {s.status === 'pending_review' && <>
                <ABtn small onClick={() => openActivate(s.id)} disabled={actionLoading === s.id}>{actionLoading === s.id ? '...' : 'Activate'}</ABtn>
                <ABtn small danger onClick={() => deny(s.id)} disabled={actionLoading === s.id}>{actionLoading === s.id ? '...' : 'Deny'}</ABtn>
              </>}
              {s.status === 'active' && <span style={{ color: '#22c55e', fontSize: 12 }}>Active ✓</span>}
            </div>
          ])}
        />
      </ACard>
      {actionError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{actionError}</p>}
      <Modal open={!!activateModal} onClose={() => setActivateModal(null)} title="Activate Subscription">
        <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>Set the maturity date. The client will be notified once activated.</p>
        <Field label="Maturity Date *">
          <AInput type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]} />
        </Field>
        {actionError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{actionError}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <ABtn onClick={activate} disabled={!maturityDate}>Confirm Activation</ABtn>
          <ABtn outline onClick={() => setActivateModal(null)}>Cancel</ABtn>
        </div>
      </Modal>
    </div>
  )
}

function RedemptionsSection({redemptions, setRedemptions, addAuditLog }) {
  const { T = DARK } = useTheme()
  const { processRedemption } = useAdmin()
  const [actionLoading, setActionLoading] = useState(null)
  const [actionError, setActionError] = useState('')

  // Equity redemptions need the real sale price before they can be
  // completed · the backend rejects completion without one. Fixed-income
  // redemptions are unaffected and still complete with a single click.
  const [salePriceModal, setSalePriceModal] = useState(null) // the redemption row being priced, or null
  const [salePriceInput, setSalePriceInput] = useState('')

  const process = async (r) => {
    if (r.holding_id) {
      setSalePriceModal(r)
      setSalePriceInput('')
      return
    }
    setActionLoading(r.id)
    setActionError('')
    try {
      await processRedemption(r.id, 'complete')
    } catch (err) {
      setActionError((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || 'Processing failed.')
    } finally {
      setActionLoading(null)
    }
  }

  const confirmEquityProcess = async () => {
    if (!salePriceModal || !salePriceInput) return
    setActionLoading(salePriceModal.id)
    setActionError('')
    try {
      await processRedemption(salePriceModal.id, 'complete', '', Number(salePriceInput))
      setSalePriceModal(null)
      setSalePriceInput('')
    } catch (err) {
      setActionError((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || 'Processing failed.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <SectionHeader title="Redemption Management" subtitle={`${redemptions.filter(r => r.status === 'pending').length} pending redemptions`} />
      <ACard style={{ padding: 0 }}>
        <Table
          cols={['Client', 'Product / Holding', 'Amount', 'Penalty', 'Status', 'Requested', 'Actions']}
          rows={redemptions.map(r => [
            r.client_name || r.clientName || 'N/A',
            r.holding_id
              ? `${r.instrument_name || 'N/A'} (${r.units_sold ?? 'N/A'} units)`
              : (r.product_name || r.productName || 'N/A'),
            r.holding_id
              ? <span>{r.is_equity_estimate ? 'Est. ' : ''}₦{Number(r.amount || 0).toLocaleString()}</span>
              : `₦${Number(r.amount || 0).toLocaleString()}`,
            (r.penalty_amount || r.penalty) > 0 ? <span style={{ color: '#ef4444' }}>₦{Number(r.penalty_amount || r.penalty).toLocaleString()}</span> : 'N/A',
            <ABadge status={r.status} />,
            new Date(r.requested_at || r.requestedAt).toLocaleDateString('en-GB'),
            r.status === 'pending'
              ? <ABtn small onClick={() => process(r)} disabled={actionLoading === r.id}>{actionLoading === r.id ? '...' : 'Process'}</ABtn>
              : <span style={{ color: '#22c55e', fontSize: 12 }}>Done ✓</span>
          ])}
        />
      </ACard>

      {actionError && !salePriceModal && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{actionError}</p>
      )}

      {salePriceModal && (
        <Modal open={!!salePriceModal} onClose={() => setSalePriceModal(null)}
          title={`Complete Sale: ${salePriceModal.instrument_name || ''}`}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: T.textMuted }}>
              Enter the actual price per unit the sale of {salePriceModal.units_sold} units executed at.
              This determines the client's real proceeds and realized gain/loss · it cannot be changed after completing.
            </p>
            <AInput
              label="Sale Price (per unit)"
              type="number"
              value={salePriceInput}
              onChange={e => setSalePriceInput(e.target.value)}
              placeholder="e.g. 45.50"
            />
            {salePriceInput && (
              <p className="text-xs" style={{ color: T.textMuted }}>
                Proceeds: ₦{(Number(salePriceInput) * (salePriceModal.units_sold || 0)).toLocaleString()}
              </p>
            )}
            {actionError && <p style={{ color: '#ef4444', fontSize: 13 }}>{actionError}</p>}
            <div className="flex gap-3">
              <ABtn outline onClick={() => setSalePriceModal(null)}>Cancel</ABtn>
              <ABtn onClick={confirmEquityProcess} disabled={!salePriceInput || actionLoading === salePriceModal.id}>
                {actionLoading === salePriceModal.id ? 'Processing…' : 'Confirm & Complete'}
              </ABtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CertificatesSection({certificates, createCertificate, updateCertificate, addAuditLog }) {
  const { T = DARK } = useTheme()
  const { subscriptions } = useAdmin()
  const activeSubs = (subscriptions || []).filter(s => s.status === 'active')
  const allCerts = certificates || []

  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState(null)   // null = issuing new, else editing this certificate's id
  const [selectedSubId, setSelectedSubId] = useState('')
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [generating, setGenerating] = useState(null)
  const [emailSent, setEmailSent] = useState(null)
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSubSelect = (subId) => {
    setSelectedSubId(subId)
    if (!subId) { setForm({}); return }
    const sub = activeSubs.find(s => String(s.id) === String(subId))
    if (!sub) return
    setForm({
      userId: sub.user_id,
      subscriptionId: sub.id,
      clientName:  sub.client_name  || '',
      clientEmail: sub.client_email || '',
      accountType: sub.account_type
        ? sub.account_type.charAt(0).toUpperCase() + sub.account_type.slice(1)
        : 'Individual',
      productName: sub.product_name || '',
      amount: sub.currency === 'USD'
        ? `$${Number(sub.amount).toLocaleString()}`
        : `₦${Number(sub.amount).toLocaleString()}`,
      roi: sub.product_roi || '',
      issueDate: new Date().toISOString().split('T')[0],
      maturityDate: sub.maturity_date
        ? new Date(sub.maturity_date).toISOString().split('T')[0] : '',
    })
  }

  const openModal = () => {
    setModal(true); setEditingId(null); setSelectedSubId(''); setForm({}); setFormError('')
  }

  const openEditModal = (cert) => {
    setModal(true)
    setEditingId(cert.id)
    setSelectedSubId('')
    setFormError('')
    setForm({
      clientName:   cert.client_name,
      clientEmail:  cert.client_email,
      accountType:  cert.account_type,
      productName:  cert.product_name,
      amount:       cert.amount,
      roi:          cert.roi || '',
      issueDate:    cert.issue_date,
      maturityDate: cert.maturity_date || '',
    })
  }

  const closeModal = () => {
    setModal(false); setEditingId(null); setSelectedSubId(''); setForm({}); setFormError('')
  }

  const issue = async () => {
    setSaving(true)
    setFormError('')
    try {
      if (editingId) {
        // Client and subscription are fixed at issue time · only the
        // certificate's own details can be corrected afterward.
        await updateCertificate(editingId, {
          account_type:  form.accountType,
          product_name:  form.productName,
          amount:        form.amount,
          roi:           form.roi,
          issue_date:    form.issueDate,
          maturity_date: form.maturityDate || null,
        })
        addAuditLog('Certificate Edited', form.clientName, 'certificate')
      } else {
        await createCertificate({
          user_id:         form.userId,
          subscription_id: form.subscriptionId,
          account_type:    form.accountType,
          product_name:    form.productName,
          amount:          form.amount,
          roi:             form.roi,
          issue_date:      form.issueDate,
          maturity_date:   form.maturityDate || null,
        })
        addAuditLog('Certificate Issued', form.clientName, 'certificate')
      }
      closeModal()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Could not save certificate. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // certificateGenerator.js expects camelCase fields matching the old local
  // form shape · this maps a real, backend-persisted certificate record
  // into that shape rather than changing the (already-correct) generator.
  const toGeneratorShape = (cert) => ({
    reference:    cert.reference,
    clientName:   cert.client_name,
    accountType:  cert.account_type,
    productName:  cert.product_name,
    amount:       cert.amount,
    roi:          cert.roi,
    issueDate:    cert.issue_date,
    maturityDate: cert.maturity_date,
  })

  const handleDownload = async (cert) => {
    setGenerating(cert.id)
    try {
      await downloadCertificate(toGeneratorShape(cert))
      addAuditLog('Certificate Downloaded', cert.client_name, 'certificate')
    } catch (e) {
      console.error(e)
    }
    setGenerating(null)
  }

  const handlePreview = async (cert) => {
    setGenerating(cert.id + '_preview')
    try {
      await previewCertificate(toGeneratorShape(cert))
    } catch (e) {
      console.error(e)
    }
    setGenerating(null)
  }

  const handleEmail = (cert) => {
    // Mock email send · wire to SendGrid when backend is ready
    setEmailSent(cert.id)
    addAuditLog('Certificate Emailed', cert.client_name, 'certificate')
    setTimeout(() => setEmailSent(null), 3000)
  }

  return (
    <div>
      <SectionHeader title="Investment Certificate Management" subtitle={`${allCerts.length} certificates issued`}
        action={<ABtn onClick={openModal}>+ Issue Certificate</ABtn>} />
      <ACard style={{ padding: 0 }}>
        <Table
          cols={['Reference', 'Client', 'Product', 'Amount', 'Issue Date', 'Maturity', 'Status', 'Actions']}
          rows={allCerts.map(c => [
            <span style={{ color: G, fontSize: 12, fontFamily: 'monospace' }}>{c.reference}</span>,
            c.client_name || 'N/A', c.product_name || 'N/A', c.amount || 'N/A',
            c.issue_date ? new Date(c.issue_date).toLocaleDateString('en-GB') : 'N/A', c.maturity_date ? new Date(c.maturity_date).toLocaleDateString('en-GB') : 'N/A',
            <ABadge status={c.status} />,
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <ABtn small outline onClick={() => openEditModal(c)}>Edit</ABtn>
              <ABtn small outline onClick={() => handlePreview(c)} disabled={generating === c.id + '_preview'}>
                {generating === c.id + '_preview' ? '…' : 'Preview'}
              </ABtn>
              <ABtn small onClick={() => handleDownload(c)} disabled={generating === c.id}>
                {generating === c.id ? 'Generating…' : 'Download'}
              </ABtn>
              <ABtn small outline onClick={() => handleEmail(c)}>
                {emailSent === c.id ? '✓ Sent!' : 'Email'}
              </ABtn>
            </div>
          ])}
        />
      </ACard>
      <Modal open={modal} onClose={closeModal} title={editingId ? `Edit Certificate: ${form.clientName || ''}` : 'Issue Investment Certificate'}>
        {!editingId && (
          <Field label="Select Active Subscription *">
            <ASelect value={selectedSubId} onChange={e => handleSubSelect(e.target.value)}>
              <option value="">Choose a client subscription</option>
              {activeSubs.length === 0
                ? <option disabled>No active subscriptions</option>
                : activeSubs.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.client_name || 'Unknown'} · {s.product_name || 'N/A'} · {s.currency === 'USD' ? '$' : '₦'}{Number(s.amount).toLocaleString()}
                  </option>
                ))
              }
            </ASelect>
          </Field>
        )}

        {(selectedSubId || editingId) && form.clientName && (
          <div style={{ background: T.card, border: '1px solid #A67C1A33', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
            <p style={{ color: '#A67C1A', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
              {editingId ? 'EDITING CERTIFICATE' : 'AUTO-FILLED FROM SUBSCRIPTION'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13 }}>
              <div><span style={{ color: T.textFaint }}>Client: </span><span style={{ color: T.text, fontWeight: 600 }}>{form.clientName}</span></div>
              <div>
                <span style={{ color: T.textFaint }}>Account: </span>
                {editingId ? (
                  <ASelect value={form.accountType || 'Individual'} onChange={e => set('accountType', e.target.value)} style={{ display: 'inline-block', width: 'auto' }}>
                    <option>Individual</option>
                    <option>Joint</option>
                    <option>Minor</option>
                    <option>Corporate</option>
                  </ASelect>
                ) : (
                  <span style={{ color: T.text }}>{form.accountType}</span>
                )}
              </div>
              <div><span style={{ color: T.textFaint }}>Product: </span><span style={{ color: T.text }}>{form.productName}</span></div>
              <div><span style={{ color: T.textFaint }}>Amount: </span><span style={{ color: '#A67C1A', fontWeight: 700 }}>{form.amount}</span></div>
              {form.roi && <div><span style={{ color: T.textFaint }}>ROI: </span><span style={{ color: T.text }}>{form.roi}</span></div>}
              <div><span style={{ color: T.textFaint }}>Email: </span><span style={{ color: T.textMuted }}>{form.clientEmail || 'N/A'}</span></div>
            </div>
          </div>
        )}

        {(selectedSubId || editingId) && (
          <>
            {editingId && (
              <>
                <Field label="Product Name">
                  <AInput value={form.productName || ''} onChange={e => set('productName', e.target.value)} />
                </Field>
                <Field label="Amount">
                  <AInput value={form.amount || ''} onChange={e => set('amount', e.target.value)} />
                </Field>
                <Field label="Expected ROI">
                  <AInput value={form.roi || ''} onChange={e => set('roi', e.target.value)} placeholder="e.g. ~14-18% p.a." />
                </Field>
              </>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Issue Date">
                <AInput type="date" value={form.issueDate || ''} onChange={e => set('issueDate', e.target.value)} />
              </Field>
              <Field label="Maturity Date *">
                <AInput type="date" value={form.maturityDate || ''} onChange={e => set('maturityDate', e.target.value)}
                  min={editingId ? undefined : new Date().toISOString().split('T')[0]} />
              </Field>
            </div>
            {!editingId && (
              <Field label="Override Email (optional)">
                <AInput type="email" value={form.clientEmail || ''} onChange={e => set('clientEmail', e.target.value)}
                  placeholder="Leave blank to use registered email" />
              </Field>
            )}
          </>
        )}

        {formError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{formError}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <ABtn outline onClick={closeModal}>Cancel</ABtn>
          <ABtn onClick={issue} disabled={saving || (!editingId && (!selectedSubId || !form.maturityDate))}>
            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Issue Certificate'}
          </ABtn>
        </div>
      </Modal>
    </div>
  )
}

function SystemAlertSection() {
  const { T = DARK } = useTheme()

  const { alert, updateAlert, publishAlert, dismissAlert, refresh: refreshAlert } = useSystemAlert()
  const { addAuditLog } = useAdmin()
  const [form, setForm] = useState({ message: alert.message || '', severity: alert.severity || 'info' })
  const [saved, setSaved] = useState(false)

  const severityConfig = {
    info:     { label: 'Info',     color: '#3b82f6', desc: 'General information or updates' },
    warning:  { label: 'Warning',  color: '#f59e0b', desc: 'Important notice requiring attention' },
    critical: { label: 'Critical', color: '#ef4444', desc: 'Urgent (system issues, maintenance)' },
  }

  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000/api/v1'

  const callBackend = async (payload) => {
    const headers = { 'Content-Type': 'application/json' }
    const _tok = sessionStorage.getItem('pcil-admin-token'); if (_tok) headers['Authorization'] = `Bearer ${_tok}`
    const res = await fetch(`${BASE}/admin/settings/alert`, {
      method: 'PATCH', headers, credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.detail || `HTTP ${res.status}`)
    }
  }

  const save = async () => {
    setSaving(true); setSaveErr('')
    try {
      await callBackend({ active: alert.active, message: form.message, severity: form.severity })
      updateAlert({ message: form.message, severity: form.severity })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) { setSaveErr(e.message) }
    finally { setSaving(false) }
  }

  const toggle = async () => {
    setSaving(true); setSaveErr('')
    try {
      const newActive = !alert.active
      await callBackend({ active: newActive, message: form.message || alert.message, severity: form.severity || alert.severity })
      if (newActive) {
        updateAlert({ active: true, message: form.message, severity: form.severity })
      refreshAlert()
      } else {
        dismissAlert()
      refreshAlert()
      }
    } catch (e) { setSaveErr(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <SectionHeader title="System Alert Banner" subtitle="Displays across the entire client portal for all visitors" />

      {/* Status indicator */}
      <ACard style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: alert.active ? '#22c55e' : '#333', boxShadow: alert.active ? '0 0 8px #22c55e' : 'none' }} />
          <div>
            <span style={{ color: alert.active ? '#22c55e' : '#555', fontWeight: 700, fontSize: 14 }}>
              {alert.active ? 'LIVE: Banner is visible to all visitors' : 'OFF: Banner is hidden'}
            </span>
            {alert.active && alert.message && (
              <p style={{ color: T.textDim, fontSize: 12, marginTop: 2 }}>"{alert.message.slice(0, 60)}{alert.message.length > 60 ? '…' : ''}"</p>
            )}
          </div>
        </div>
        <ABtn onClick={toggle} danger={alert.active} outline={!alert.active}>
          {alert.active ? 'Turn Off Banner' : 'Activate Banner'}
        </ABtn>
      </ACard>

      {/* Preview */}
      {form.message && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: T.textFaint, fontSize: 12, marginBottom: 8, fontWeight: 600 }}>PREVIEW:</p>
          <div style={{
            background: form.severity === 'critical' ? 'linear-gradient(135deg,#7f1d1d,#991b1b)' : form.severity === 'warning' ? 'linear-gradient(135deg,#92400e,#b45309)' : 'linear-gradient(135deg,#1e40af,#2563eb)',
            borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
            border: `1px solid ${severityConfig[form.severity]?.color || '#3b82f6'}`,
          }}>
            <span>{form.severity === 'critical' ? '🚨' : form.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <p style={{ color: T.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{form.message}</p>
          </div>
        </div>
      )}

      {/* Config */}
      <ACard style={{ maxWidth: 900, width: '100%' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: T.textDim, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>SEVERITY LEVEL</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {Object.entries(severityConfig).map(([key, cfg]) => (
              <button key={key} onClick={() => setForm(f => ({ ...f, severity: key }))} style={{
                flex: 1, padding: '12px 8px', borderRadius: 8, cursor: 'pointer',
                border: `2px solid ${form.severity === key ? cfg.color : T.border2}`,
                background: form.severity === key ? `rgba(${key === 'critical' ? '239,68,68' : key === 'warning' ? '245,158,11' : '59,130,246'},0.08)` : 'transparent',
                textAlign: 'center',
              }}>
                <div style={{ color: cfg.color, fontWeight: 700, fontSize: 13 }}>{cfg.label}</div>
                <div style={{ color: T.textFaint, fontSize: 11, marginTop: 3 }}>{cfg.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: T.textDim, marginBottom: 6, fontWeight: 600 }}>BANNER MESSAGE *</label>
          <textarea
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            rows={3} placeholder="e.g. We are currently under maintenance. We will be back shortly. Apologies for any inconvenience."
            style={{ ...inputCls, resize: 'vertical' }}
          />
          <p style={{ color: '#444', fontSize: 11, marginTop: 4 }}>{form.message.length} characters</p>
        </div>

        {saveErr && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{saveErr}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ABtn onClick={save} disabled={!form.message || saving}>{saving ? 'Saving…' : 'Save Changes'}</ABtn>
          <ABtn onClick={async () => { await save(); if (!alert.active) await toggle() }} disabled={!form.message || saving}>
            Save & Activate
          </ABtn>
          {saved && <span style={{ color: '#22c55e', fontSize: 13 }}>✓ Saved to backend</span>}
        </div>
      </ACard>

      <ACard style={{ marginTop: 16, background: 'rgba(184,134,11,0.04)', border: '1px solid rgba(184,134,11,0.15)' }}>
        <p style={{ color: G, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>ℹ️ How it works</p>
        <p style={{ color: T.textFaint, fontSize: 12, margin: 0 }}>
          When activated, the banner appears at the very top of the client portal for ALL visitors: logged in, logged out, and on mobile. Clients can dismiss it for their session. Only you (Super Admin) can turn it on or off.
        </p>
      </ACard>
    </div>
  )
}

function MaturitySection({subscriptions }) {
  const { T = DARK } = useTheme()
  const today = new Date()
  const withDays = subscriptions
    .filter(s => (s.maturity_date || s.maturityDate) && s.status === 'active')
    .map(s => {
      const mat = new Date(s.maturity_date || s.maturityDate)
      const daysLeft = Math.ceil((mat - today) / (1000 * 60 * 60 * 24))
      return { ...s, daysLeft }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const urgency = (d) => {
    if (d <= 7) return '#ef4444'
    if (d <= 30) return '#f59e0b'
    return '#22c55e'
  }

  return (
    <div>
      <SectionHeader title="Maturity Tracker" subtitle="Investments sorted by nearest maturity date" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Maturing in 7 days" value={withDays.filter(s => s.daysLeft <= 7).length} color="#ef4444" />
        <StatCard label="Maturing in 30 days" value={withDays.filter(s => s.daysLeft <= 30).length} color="#f59e0b" />
        <StatCard label="Maturing in 90 days" value={withDays.filter(s => s.daysLeft <= 90).length} color="#22c55e" />
      </div>
      <ACard style={{ padding: 0 }}>
        <Table
          cols={['Client', 'Product', 'Amount', 'Maturity Date', 'Days Left']}
          rows={withDays.map(s => [
            s.client_name || 'N/A',
            s.product_name || 'N/A',
            `${s.currency === 'USD' ? '$' : '₦'}${Number(s.amount).toLocaleString()}`,
            new Date(s.maturity_date || s.maturityDate).toLocaleDateString('en-GB'),
            <span style={{ color: urgency(s.daysLeft), fontWeight: 700 }}>
              {s.daysLeft <= 0 ? 'MATURED' : `${s.daysLeft} days`}
            </span>
          ])}
        />
      </ACard>
    </div>
  )
}

function PaymentAccountsSection({ addAuditLog }) {
  const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000/api/v1'
  const authHdr = () => {
    const tok = sessionStorage.getItem('pcil-admin-token')
    return { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }
  }
  const paFetch = async (path, opts = {}) => {
    const r = await fetch(`${BASE}${path}`, { headers: authHdr(), credentials: 'include', ...opts })
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.detail || `HTTP ${r.status}`) }
    return r.status === 204 ? null : r.json()
  }

  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const data = await paFetch('/admin/payment-accounts')
      setAccounts(Array.isArray(data) ? data : [])
    } catch (e) { setErr(e.message || 'Could not load accounts.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm({ currency: 'NGN' }); setEditing(null); setModal(true); setErr('') }
  const openEdit = (a) => {
    setForm({
      bank:           a.bank || '',
      account_name:   a.account_name || '',
      account_number: a.account_number || '',
      currency:       a.currency || 'NGN',
      label:          a.label || '',
      instruction:    a.instruction || '',
    })
    setEditing(a.id)
    setModal(true)
    setErr('')
  }

  const save = async () => {
    if (!form.bank?.trim() || !form.account_number?.trim()) {
      setErr('Bank name and account number are required.'); return
    }
    setSaving(true); setErr('')
    try {
      if (editing) {
        await paFetch(`/admin/payment-accounts/${editing}`, { method: 'PATCH', body: JSON.stringify(form) })
        addAuditLog('Payment Account Updated', form.bank, 'settings')
      } else {
        await paFetch('/admin/payment-accounts', { method: 'POST', body: JSON.stringify(form) })
        addAuditLog('Payment Account Added', form.bank, 'settings')
      }
      setModal(false)
      await load()
    } catch (e) { setErr(e.message || 'Save failed.') }
    finally { setSaving(false) }
  }

  const del = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    try { await paFetch(`/admin/payment-accounts/${id}`, { method: 'DELETE' }); await load() }
    catch (e) { alert(e.message || 'Delete failed.') }
  }

  const { T } = useTheme()
  return (
    <div>
      <SectionHeader title="Custodian Accounts" subtitle="Bank accounts linked to products, shown to clients during subscription"
        action={<ABtn onClick={openCreate}>+ Add Account</ABtn>} />
      {err && <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{err}</p>}
      {loading
        ? <div style={{ textAlign: 'center', padding: 40, color: T.textFaint }}>Loading…</div>
        : accounts.length === 0
          ? <ACard style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ color: T.textFaint }}>No custodian accounts yet. Add one to link to products.</div>
            </ACard>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {accounts.map(a => (
                <ACard key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.bank} <span style={{ color: T.textDim, fontWeight: 400 }}>· {a.currency}</span></div>
                    <div style={{ fontSize: 13, marginTop: 2, opacity: 0.7 }}>{a.account_name}</div>
                    <div style={{ color: '#A67C1A', fontSize: 14, fontWeight: 700, marginTop: 2, fontFamily: 'monospace' }}>{a.account_number}</div>
                    {a.label && <div style={{ fontSize: 11, marginTop: 2, opacity: 0.5 }}>{a.label}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <ABtn small outline onClick={() => openEdit(a)}>Edit</ABtn>
                    <ABtn small danger onClick={() => del(a.id, a.bank)}>Delete</ABtn>
                  </div>
                </ACard>
              ))}
            </div>
      }
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Custodian Account' : 'Add Custodian Account'}>
        <Field label="Bank Name *"><AInput value={form.bank || ''} onChange={e => set('bank', e.target.value)} placeholder="e.g. Zenith Bank" /></Field>
        <Field label="Account Name *"><AInput value={form.account_name || ''} onChange={e => set('account_name', e.target.value)} placeholder="Prime Capital & Investment Ltd" /></Field>
        <Field label="Account Number *"><AInput value={form.account_number || ''} onChange={e => set('account_number', e.target.value)} placeholder="10-digit account number" /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Currency">
            <ASelect value={form.currency || 'NGN'} onChange={e => set('currency', e.target.value)}>
              <option value="NGN">NGN · Nigerian Naira</option>
              <option value="USD">USD · US Dollar</option>
            </ASelect>
          </Field>
          <Field label="Label (optional)"><AInput value={form.label || ''} onChange={e => set('label', e.target.value)} placeholder="e.g. Naira Investments" /></Field>
        </div>
        <Field label="Transfer Instructions (optional)">
          <textarea value={form.instruction || ''} onChange={e => set('instruction', e.target.value)}
            rows={2} placeholder="e.g. Include subscriber name as narration"
            style={{ ...inputCls, resize: 'vertical' }} />
        </Field>
        {err && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setModal(false)}>Cancel</ABtn>
          <ABtn onClick={save} disabled={saving || !form.bank || !form.account_number}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Account'}
          </ABtn>
        </div>
      </Modal>
    </div>
  )
}
function FeesSection({addAuditLog }) {
  const { T = DARK } = useTheme()
  const [config, setConfig] = useState({
    prematurePenalty: 20,
    managementFee: 1.5,
    performanceFee: 10,
    liquidationNoticeDays: 5,
    minInvestmentNGN: 500000,
    minTenureDays: 90,
  })
  const [saved, setSaved] = useState(false)
  const set = (f, v) => setConfig(c => ({ ...c, [f]: v }))

  const save = () => {
    addAuditLog('Fee Configuration Updated', 'System', 'settings')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <SectionHeader title="Fees & Penalty Configuration" subtitle="Update without touching code" />
      <ACard style={{ maxWidth: 900, width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Premature Liquidation Penalty (%)">
            <AInput type="number" value={config.prematurePenalty} onChange={e => set('prematurePenalty', e.target.value)} />
          </Field>
          <Field label="Management Fee (% p.a.)">
            <AInput type="number" value={config.managementFee} onChange={e => set('managementFee', e.target.value)} />
          </Field>
          <Field label="Performance Fee (%)">
            <AInput type="number" value={config.performanceFee} onChange={e => set('performanceFee', e.target.value)} />
          </Field>
          <Field label="Liquidation Notice Period (days)">
            <AInput type="number" value={config.liquidationNoticeDays} onChange={e => set('liquidationNoticeDays', e.target.value)} />
          </Field>
          <Field label="Min Investment Amount (₦)">
            <AInput type="number" value={config.minInvestmentNGN} onChange={e => set('minInvestmentNGN', e.target.value)} />
          </Field>
          <Field label="Min Investment Tenure (days)">
            <AInput type="number" value={config.minTenureDays} onChange={e => set('minTenureDays', e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <ABtn onClick={save}>Save Configuration</ABtn>
          {saved && <span style={{ color: '#22c55e', fontSize: 13 }}>✓ Saved successfully</span>}
        </div>
      </ACard>
    </div>
  )
}

function NotificationsSection({addAuditLog }) {
  const { T = DARK } = useTheme()
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'KYC Approved', message: 'Your KYC has been approved.', sentTo: 'client-001', sentAt: '2026-01-14T09:00:00Z' },
    { id: 2, title: 'Subscription Activated', message: 'Your investment is now active.', sentTo: 'client-002', sentAt: '2026-01-20T08:00:00Z' },
  ])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', recipient: 'all' })

  const send = () => {
    const note = { id: Date.now(), ...form, sentAt: new Date().toISOString() }
    setNotifications(ns => [note, ...ns])
    addAuditLog('Notification Sent', form.title, 'notification')
    setModal(false)
    setForm({ title: '', message: '', recipient: 'all' })
  }

  return (
    <div>
      <SectionHeader title="Notifications" subtitle="Send alerts and messages to clients"
        action={<ABtn onClick={() => setModal(true)}>+ Send Notification</ABtn>} />
      <ACard style={{ padding: 0 }}>
        <Table
          cols={['Title', 'Message', 'Sent To', 'Sent At']}
          rows={notifications.map(n => [
            <span style={{ color: T.text, fontWeight: 600 }}>{n.title}</span>,
            <span style={{ color: T.textMuted, fontSize: 12 }}>{n.message.slice(0, 60)}...</span>,
            n.recipient === 'all' || !n.recipient ? 'All Clients' : n.sentTo,
            new Date(n.sentAt).toLocaleDateString('en-GB'),
          ])}
        />
      </ACard>
      <Modal open={modal} onClose={() => setModal(false)} title="Send Notification">
        <Field label="Title *"><AInput value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title" /></Field>
        <Field label="Message *">
          <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            rows={4} placeholder="Write your message..." style={{ ...inputCls, resize: 'vertical' }} />
        </Field>
        <Field label="Send To">
          <ASelect value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))}>
            <option value="all">All Clients</option>
            <option value="approved">KYC Approved Only</option>
            <option value="pending">KYC Pending Only</option>
          </ASelect>
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setModal(false)}>Cancel</ABtn>
          <ABtn onClick={send} disabled={!form.title || !form.message}>Send</ABtn>
        </div>
      </Modal>
    </div>
  )
}

function AnnouncementsSection({ announcements, setAnnouncements, addAuditLog }) {
  const { T = DARK } = useTheme()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' })

  const { createAnnouncement, toggleAnnouncement } = useAdmin()
  const [saving, setSaving] = useState(false)
  const [annError, setAnnError] = useState('')

  const publish = async () => {
    if (!form.title.trim() || !form.body.trim()) { setAnnError('Title and body are required.'); return }
    setSaving(true); setAnnError('')
    try {
      await createAnnouncement(form)
      addAuditLog('Announcement Published', form.title, 'announcement')
      setModal(false)
      setForm({ title: '', body: '', audience: 'all' })
    } catch (err) {
      setAnnError((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || 'Failed to publish.')
    } finally { setSaving(false) }
  }

  const toggle = async (id) => {
    try { await toggleAnnouncement(id) }
    catch (err) { setAnnError((typeof err.response?.data?.detail === 'string' ? err.response.data.detail : err.response?.data?.detail?.[0]?.msg || err.message) || err.message || 'Toggle failed.') }
  }

  return (
    <div>
      <SectionHeader title="Announcements & Market Updates" subtitle="Visible to clients on their dashboard"
        action={<ABtn onClick={() => setModal(true)}>+ New Announcement</ABtn>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {announcements.map(a => (
          <ACard key={a.id} style={{ opacity: (a.is_active ?? a.active ?? true) ? 1 : 0.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: T.text, fontWeight: 700 }}>{a.title}</span>
                  <span style={{ background: (a.is_active ?? a.active) ? '#dcfce7' : T.border2, color: (a.is_active ?? a.active) ? '#166534' : '#666', fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>
                    {(a.is_active ?? a.active) ? 'LIVE' : 'HIDDEN'}
                  </span>
                </div>
                <p style={{ color: T.textMuted, fontSize: 13, textAlign: 'justify', lineHeight: 1.7 }}>{a.body}</p>
                <p style={{ color: T.textFaint, fontSize: 11, marginTop: 4 }}>{(a.published_at || a.publishedAt) ? new Date(a.published_at || a.publishedAt).toLocaleDateString('en-GB') : 'N/A'}</p>
              </div>
              <ABtn small outline onClick={() => toggle(a.id)}>{(a.is_active ?? a.active) ? 'Hide' : 'Show'}</ABtn>
            </div>
          </ACard>
        ))}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="New Announcement">
        <Field label="Title *"><AInput value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" /></Field>
        <Field label="Body *">
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            rows={5} placeholder="Announcement content..." style={{ ...inputCls, resize: 'vertical' }} />
        </Field>
        <Field label="Audience">
          <ASelect value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
            <option value="all">All Clients</option>
            <option value="approved">Approved Clients Only</option>
          </ASelect>
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          {annError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{annError}</p>}
          <ABtn outline onClick={() => { setModal(false); setAnnError('') }}>Cancel</ABtn>
          <ABtn onClick={publish} disabled={saving || !form.title || !form.body}>{saving ? 'Publishing…' : 'Publish'}</ABtn>
        </div>
      </Modal>
    </div>
  )
}

function ReportsSection({clients, subscriptions, redemptions }) {
  const { T = DARK } = useTheme()
  // TODO: replace hardcoded 1600 with usd_ngn_rate fetched from fee_config table in DB · see PrimeCapital Context doc, Pending Development Work section
  const totalAUM = subscriptions.filter(s => s.status === 'active').reduce((a, s) => a + (s.currency === 'NGN' ? s.amount : s.amount * 1600), 0)
  const totalRedeemed = redemptions.filter(r => r.status === 'completed').reduce((a, r) => a + r.amount, 0)

  const exportCSV = (data, filename) => {
    if (!data.length) return
    const keys = Object.keys(data[0])
    const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <SectionHeader title="Reports & Analytics" subtitle="Export data for regulatory submissions and records" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total AUM" value={`₦${(totalAUM / 1_000_000).toFixed(1)}M`} color="#22c55e" />
        <StatCard label="Total Clients" value={clients.length} />
        <StatCard label="Active Investments" value={subscriptions.filter(s => s.status === 'active').length} color="#3b82f6" />
        <StatCard label="Total Redeemed" value={`₦${(totalRedeemed / 1_000_000).toFixed(1)}M`} color="#f59e0b" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { label: '📋 Client Report', sub: `${clients.length} clients`, data: clients, file: 'clients.csv' },
          { label: '💼 Subscription Report', sub: `${subscriptions.length} subscriptions`, data: subscriptions, file: 'subscriptions.csv' },
          { label: '↩️ Redemption Report', sub: `${redemptions.length} redemptions`, data: redemptions, file: 'redemptions.csv' },
          { label: '🏦 AUM Summary', sub: `₦${(totalAUM / 1_000_000).toFixed(1)}M active`, data: subscriptions.filter(s => s.status === 'active'), file: 'aum.csv' },
        ].map(r => (
          <ACard key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: T.text, fontWeight: 600, marginBottom: 4 }}>{r.label}</div>
              <div style={{ color: T.textDim, fontSize: 12 }}>{r.sub}</div>
            </div>
            <ABtn small outline onClick={() => exportCSV(r.data, r.file)}>Export CSV</ABtn>
          </ACard>
        ))}
      </div>
    </div>
  )
}

function AuditSection({auditLog }) {
  const { T = DARK } = useTheme()
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? auditLog : auditLog.filter(a => (a.action_type || a.type || '') === filter)
  const typeColor = { kyc: '#3b82f6', product: G, subscription: '#22c55e', admin: '#a855f7', redemption: '#f59e0b', settings: '#666', general: '#aaa', notification: '#06b6d4', announcement: '#ec4899', certificate: '#84cc16' }

  return (
    <div>
      <SectionHeader title="Audit Log" subtitle="Every admin action is logged here" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'kyc', 'subscription', 'redemption', 'product', 'admin', 'settings', 'certificate'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: filter === f ? G : 'transparent',
            border: `1px solid ${filter === f ? G : T.border2}`,
            color: filter === f ? '#000' : '#666',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <span style={{ marginLeft: 4, opacity: 0.5 }}>({auditLog.filter(a=>(a.action_type||a.type||'')===f).length})</span>}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <ACard><p style={{ color: T.textFaint, textAlign: 'center', padding: 24 }}>No entries for this category yet.</p></ACard>
        : <ACard style={{ padding: 0 }}>
        <Table
          cols={['Action', 'Target', 'By', 'Type', 'Timestamp']}
          rows={filtered.map(a => [
            <span style={{ color: T.text, fontWeight: 600 }}>{a.action}</span>,
            a.target || a.target_name || 'N/A',
            a.performed_by_name || a.by || 'N/A',
            <span style={{ color: typeColor[a.action_type || a.type] || '#aaa', fontSize: 12, fontWeight: 600 }}>{(a.action_type || a.type || 'general').toUpperCase()}</span>,
            new Date(a.timestamp || a.created_at).toLocaleString('en-GB'),
          ])}
        />
      </ACard>
        }
    </div>
  )
}

function SettingsSection({addAuditLog }) {
  const { T = DARK } = useTheme()
  const { companySettings, fetchCompanySettings, updateCompanySettings } = useAdmin()
  const [config, setConfig] = useState({ ...COMPANY })
  const [saved, setSaved] = useState(false)
  const set = (f, v) => setConfig(c => ({ ...c, [f]: v }))

  // Client dashboard visibility toggle · reads real state from the backend
  // rather than assuming a default, so the switch reflects what clients
  // actually see right now.
  const [showBreakdown, setShowBreakdown] = useState(true)
  const [visLoading, setVisLoading] = useState(false)
  const [visSaved, setVisSaved] = useState(false)
  const [visError, setVisError] = useState('')

  useEffect(() => { fetchCompanySettings() }, [])
  useEffect(() => {
    if (companySettings?.show_portfolio_breakdown !== undefined) {
      setShowBreakdown(companySettings.show_portfolio_breakdown)
    }
  }, [companySettings])

  const saveVisibility = async (next) => {
    setVisError(''); setVisSaved(false); setVisLoading(true)
    const previous = showBreakdown
    setShowBreakdown(next)  // optimistic, reverted below if the save fails
    try {
      await updateCompanySettings({ show_portfolio_breakdown: next })
      setVisSaved(true)
      setTimeout(() => setVisSaved(false), 2500)
    } catch (err) {
      setShowBreakdown(previous)
      setVisError(err.response?.data?.detail || 'Could not save that setting.')
    } finally {
      setVisLoading(false)
    }
  }

  const save = () => {
    addAuditLog('System Settings Updated', 'Company Info', 'settings')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <SectionHeader title="System Settings & Branding" subtitle="Company info visible across the platform" />
      <ACard style={{ maxWidth: 900, width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Company Name"><AInput value={config.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Short Name"><AInput value={config.shortName} onChange={e => set('shortName', e.target.value)} /></Field>
          <Field label="Email"><AInput type="email" value={config.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Phone"><AInput value={config.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="WhatsApp Number"><AInput value={config.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></Field>
          <Field label="Website"><AInput value={config.website} onChange={e => set('website', e.target.value)} /></Field>
        </div>
        <Field label="Address">
          <AInput value={config.address} onChange={e => set('address', e.target.value)} />
        </Field>
        <Field label="City / Region">
          <AInput value={config.city} onChange={e => set('city', e.target.value)} />
        </Field>
        <Field label="Regulator">
          <AInput value={config.regulator} onChange={e => set('regulator', e.target.value)} />
        </Field>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <ABtn onClick={save}>Save Settings</ABtn>
          {saved && <span style={{ color: '#22c55e', fontSize: 13 }}>✓ Saved</span>}
        </div>
      </ACard>

      {/* ── Client Dashboard Visibility ─────────────────────────────────── */}
      <ACard style={{ maxWidth: 900, width: '100%', marginTop: 16 }}>
        <p style={{ color: T.text, fontWeight: 700, marginBottom: 4 }}>Client Dashboard Visibility</p>
        <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 14 }}>
          Controls what clients can see about their private portfolio.
        </p>

        {visError && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{visError}</div>}
        {visSaved && <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>✓ Saved</div>}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>Show holdings breakdown</div>
            <div style={{ color: T.textMuted, fontSize: 12, marginTop: 2 }}>
              When on, clients see each position (stock names, units, allocation chart).
              When off, they see only their total portfolio value and its chart.
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
            <input type="checkbox" checked={showBreakdown} disabled={visLoading}
              onChange={e => saveVisibility(e.target.checked)}
              style={{ accentColor: G, width: 18, height: 18, cursor: 'pointer' }} />
            <span style={{ color: showBreakdown ? '#22c55e' : T.textMuted, fontSize: 12, fontWeight: 600, minWidth: 28 }}>
              {visLoading ? '...' : (showBreakdown ? 'On' : 'Off')}
            </span>
          </label>
        </div>
      </ACard>
    </div>
  )
}

function AdminUsersSection({juniorAdmins, createJuniorAdmin, toggleJuniorAdmin, deleteJuniorAdmin, updateJuniorAdmin, staffRoles, assignStaffRole, resetStaffPassword, addAuditLog }) {
  const { T = DARK } = useTheme()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', staff_role_id: '', permissions: [] })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const [roleModal, setRoleModal] = useState(null) // holds the admin being reassigned, or null
  const [editModal, setEditModal] = useState(null) // holds the admin being edited, or null
  const [resetTarget, setResetTarget] = useState(null)   // staff whose password is being reset
  const [resetResult, setResetResult] = useState(null)   // { temp_password, ... } shown once
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  const doResetPassword = async () => {
    setResetError(''); setResetLoading(true)
    try {
      const result = await resetStaffPassword(resetTarget.id)
      setResetResult(result)
    } catch (err) {
      setResetError(err.response?.data?.detail || 'Could not reset that password.')
    } finally {
      setResetLoading(false)
    }
  }

  const closeReset = () => {
    setResetTarget(null); setResetResult(null); setResetError('')
  }
  const [editForm, setEditForm] = useState({ full_name: '', department: '', permissions: [] })
  const setEditField = (f, v) => setEditForm(p => ({ ...p, [f]: v }))

  const PERMISSION_OPTIONS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'products', label: 'Products' },
    { id: 'clients', label: 'Clients' },
    { id: 'kyc', label: 'KYC Management' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'redemptions', label: 'Redemptions' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'reports', label: 'Reports' },
  ]

  const togglePerm = (id) => {
    const current = form.permissions || []
    setForm(f => ({ ...f, permissions: current.includes(id) ? current.filter(p => p !== id) : [...current, id] }))
  }

  const toggleEditPerm = (id) => {
    const current = editForm.permissions || []
    setEditForm(f => ({ ...f, permissions: current.includes(id) ? current.filter(p => p !== id) : [...current, id] }))
  }

  const openEdit = (a) => {
    setEditForm({
      full_name: a.full_name || a.name || '',
      department: a.department || '',
      permissions: a.permissions || [],
    })
    setEditModal(a)
  }

  const saveEdit = () => {
    updateJuniorAdmin(editModal.id, {
      full_name: editForm.full_name,
      department: editForm.department || null,
      permissions: editForm.permissions,
    })
    setEditModal(null)
  }

  const create = () => {
    // NOTE: backend's AdminUserCreate requires `full_name`, not `name` · form
    // field stays `name` for the input's sake, mapped here at submit time.
    createJuniorAdmin({
      full_name: form.name,
      email: form.email,
      password: form.password,
      permissions: form.permissions,
      department: form.department || null,
      staff_role_id: form.staff_role_id || null,
    })
    setModal(false)
    setForm({ name: '', email: '', password: '', department: '', staff_role_id: '', permissions: [] })
  }

  return (
    <div>
      <SectionHeader title="Admin User Management" subtitle="Create and manage staff accounts"
        action={<ABtn onClick={() => setModal(true)}>+ Create Staff Account</ABtn>} />

      <ACard style={{ marginBottom: 16, background: 'rgba(184,134,11,0.06)', border: `1px solid rgba(184,134,11,0.2)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${G},#D4A017)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000', fontSize: 16 }}>SS</div>
          <div>
            <div style={{ color: T.text, fontWeight: 700 }}>Saidu Safiyanu</div>
            <div style={{ color: G, fontSize: 12 }}>Super Admin · Full Access</div>
            <div style={{ color: T.textFaint, fontSize: 11 }}>admin@primecapital.ng</div>
          </div>
          <span style={{ marginLeft: 'auto', background: G, color: '#000', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>SUPER ADMIN</span>
        </div>
      </ACard>

      {juniorAdmins.length === 0
        ? <ACard><p style={{ color: T.textFaint, textAlign: 'center', padding: 20 }}>No staff accounts created yet.</p></ACard>
        : juniorAdmins.map(a => (
          <ACard key={a.id} style={{ marginBottom: 10, opacity: (a.is_active ?? a.active) ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.border2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: G, fontSize: 14 }}>{a.avatar}</div>
                <div>
                  <div style={{ color: T.text, fontWeight: 600 }}>{a.full_name || a.name}</div>
                  <div style={{ color: T.textDim, fontSize: 12 }}>{a.email}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                    {a.department && (
                      <span style={{ background: 'rgba(184,134,11,0.12)', border: `1px solid rgba(184,134,11,0.3)`, color: G, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>{a.department}</span>
                    )}
                    {a.staff_role ? (
                      <span style={{ background: T.inputBg, border: `1px solid ${T.border2}`, color: T.textMuted, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>{a.staff_role.name}</span>
                    ) : (
                      <span style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                        No role assigned (no access)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ABtn small outline onClick={() => openEdit(a)}>Edit</ABtn>
                <ABtn small outline onClick={() => setRoleModal(a)}>Assign Role</ABtn>
                <ABtn small outline onClick={() => setResetTarget(a)}>Reset Password</ABtn>
                <ABtn small outline onClick={() => toggleJuniorAdmin(a.id, a.is_active ?? a.active)}>{(a.is_active ?? a.active) ? 'Deactivate' : 'Activate'}</ABtn>
                <ABtn small danger onClick={() => deleteJuniorAdmin(a.id)}>Delete</ABtn>
              </div>
            </div>
          </ACard>
        ))}

      <Modal open={modal} onClose={() => setModal(false)} title="Create Staff Account">
        <Field label="Full Name *"><AInput value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. John Doe" /></Field>
        <Field label="Email Address *"><AInput type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@primecapital.ng" /></Field>
        <Field label="Password *"><AInput type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Secure password" /></Field>
        <Field label="Department"><AInput value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Compliance, Operations, Finance" /></Field>
        <Field label="Staff Role">
          <ASelect value={form.staff_role_id} onChange={e => set('staff_role_id', e.target.value)}>
            <option value="">No role · assign later</option>
            {(staffRoles || []).filter(r => r.is_active).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </ASelect>
        </Field>
        <p style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>
          Access is determined entirely by the staff role selected above.
          Configure what each role can do under Roles &amp; Permissions.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setModal(false)}>Cancel</ABtn>
          <ABtn onClick={create} disabled={!form.name || !form.email || !form.password}>Create Admin</ABtn>
        </div>
      </Modal>

      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title={`Assign Role: ${roleModal?.full_name || roleModal?.name || ''}`}>
        <Field label="Staff Role">
          <ASelect
            value={roleModal?.staff_role?.id || ''}
            onChange={e => setRoleModal(r => ({ ...r, staff_role: staffRoles.find(sr => sr.id === e.target.value) || null }))}
          >
            <option value="">No role · unassigned</option>
            {(staffRoles || []).filter(r => r.is_active).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </ASelect>
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setRoleModal(null)}>Cancel</ABtn>
          <ABtn onClick={() => {
            assignStaffRole(roleModal.id, roleModal?.staff_role?.id || null)
            setRoleModal(null)
          }}>Save</ABtn>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetTarget} onClose={closeReset}
        title={resetResult ? 'Password Reset' : `Reset Password: ${resetTarget?.full_name || resetTarget?.name || ''}`}>
        {resetResult ? (
          <div>
            <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 12 }}>
              Share this temporary password with <strong style={{ color: T.text }}>{resetResult.full_name}</strong> now.
              It will not be shown again, and they'll be asked to set their own when they next sign in.
            </p>
            <div style={{ background: T.inputBg, border: `1px solid ${T.border2}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <div style={{ color: T.textDim, fontSize: 11, marginBottom: 4 }}>Email</div>
              <div style={{ color: T.text, fontFamily: 'monospace', fontSize: 14, marginBottom: 10 }}>{resetResult.email}</div>
              <div style={{ color: T.textDim, fontSize: 11, marginBottom: 4 }}>Temporary Password</div>
              <div style={{ color: G, fontFamily: 'monospace', fontSize: 16, fontWeight: 700 }}>{resetResult.temp_password}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <ABtn outline onClick={() => navigator.clipboard?.writeText(
                `Email: ${resetResult.email}\nTemporary password: ${resetResult.temp_password}`
              )}>Copy</ABtn>
              <ABtn onClick={closeReset}>Done</ABtn>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 12 }}>
              This generates a new temporary password for this staff member. Their current
              password stops working immediately, and they'll be asked to set a new one at
              next sign in.
            </p>
            {resetError && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{resetError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <ABtn outline onClick={closeReset}>Cancel</ABtn>
              <ABtn danger onClick={doResetPassword} disabled={resetLoading}>
                {resetLoading ? 'Resetting…' : 'Reset Password'}
              </ABtn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit Staff: ${editModal?.full_name || editModal?.name || ''}`}>
        <Field label="Full Name"><AInput value={editForm.full_name} onChange={e => setEditField('full_name', e.target.value)} /></Field>
        <Field label="Department"><AInput value={editForm.department} onChange={e => setEditField('department', e.target.value)} placeholder="e.g. Compliance, Operations, Finance" /></Field>
        <p style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>
          Access is determined by this staff member's assigned role.
          Use "Assign Role" to change it, or edit the role itself under Roles &amp; Permissions.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setEditModal(null)}>Cancel</ABtn>
          <ABtn onClick={saveEdit} disabled={!editForm.full_name}>Save Changes</ABtn>
        </div>
      </Modal>
    </div>
  )
}
// Manage StaffRole records · granular permission flags assigned to staff via
// AdminUsersSection's "Assign Role" button. Super Admin only (backend-gated).
// ─────────────────────────────────────────────────────────────────────────────

const STAFF_PERMISSION_OPTIONS = [
  { id: 'can_manage_staff_users', label: 'Manage Staff Users' },
  { id: 'can_configure_roles', label: 'Configure Roles' },
  { id: 'can_manage_clients', label: 'Manage Clients' },
  { id: 'can_approve_kyc', label: 'Approve KYC' },
  { id: 'can_manage_subscriptions', label: 'Manage Subscriptions' },
  { id: 'can_manage_redemptions', label: 'Manage Redemptions' },
  { id: 'can_enter_valuations', label: 'Enter Portfolio Valuations' },
  { id: 'can_manage_nav', label: 'Manage NAV & Returns' },
  { id: 'can_configure_workflows', label: 'Configure Workflows' },
  { id: 'can_manage_products', label: 'Manage Products' },
  { id: 'can_manage_fees', label: 'Manage Fees' },
  { id: 'can_manage_certificates', label: 'Manage Certificates' },
  { id: 'can_manage_maturity', label: 'Manage Maturity Tracker' },
  { id: 'can_manage_payments', label: 'Manage Payment Accounts' },
  { id: 'can_view_reports', label: 'View Reports' },
  { id: 'can_view_audit_log', label: 'View Audit Log' },
  { id: 'can_manage_system_settings', label: 'Manage System Settings' },
]

const emptyRoleForm = () => ({
  name: '', department: '', description: '',
  ...Object.fromEntries(STAFF_PERMISSION_OPTIONS.map(p => [p.id, false])),
})

function RolesSection({ staffRoles, createStaffRole, updateStaffRole, deleteStaffRole, addAuditLog }) {
  const { T = DARK } = useTheme()
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyRoleForm())
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const togglePerm = (id) => setForm(f => ({ ...f, [id]: !f[id] }))

  const openCreate = () => { setEditingId(null); setForm(emptyRoleForm()); setModal(true) }
  const openEdit = (role) => {
    setEditingId(role.id)
    setForm({
      name: role.name || '', department: role.department || '', description: role.description || '',
      ...Object.fromEntries(STAFF_PERMISSION_OPTIONS.map(p => [p.id, !!role[p.id]])),
    })
    setModal(true)
  }

  const save = () => {
    if (editingId) updateStaffRole(editingId, form)
    else createStaffRole(form)
    setModal(false)
  }

  const remove = (role) => {
    if (window.confirm(`Delete role "${role.name}"? Staff currently assigned this role will become unassigned.`)) {
      deleteStaffRole(role.id)
    }
  }

  return (
    <div>
      <SectionHeader title="Roles & Permissions" subtitle="Configure staff roles and their granular permissions"
        action={<ABtn onClick={openCreate}>+ Create Role</ABtn>} />

      {(!staffRoles || staffRoles.length === 0)
        ? <ACard><p style={{ color: T.textFaint, textAlign: 'center', padding: 20 }}>No staff roles created yet.</p></ACard>
        : staffRoles.map(role => {
          const activeFlags = STAFF_PERMISSION_OPTIONS.filter(p => role[p.id])
          return (
            <ACard key={role.id} style={{ marginBottom: 10, opacity: role.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: T.text, fontWeight: 700 }}>{role.name}</span>
                    {role.department && (
                      <span style={{ background: 'rgba(184,134,11,0.12)', border: `1px solid rgba(184,134,11,0.3)`, color: G, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>{role.department}</span>
                    )}
                    {!role.is_active && (
                      <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>INACTIVE</span>
                    )}
                  </div>
                  {role.description && <p style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>{role.description}</p>}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {activeFlags.length === 0
                      ? <span style={{ color: T.textFaint, fontSize: 11, fontStyle: 'italic' }}>No permissions granted</span>
                      : activeFlags.map(p => (
                        <span key={p.id} style={{ background: T.inputBg, border: `1px solid ${T.border2}`, color: T.textMuted, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>{p.label}</span>
                      ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <ABtn small outline onClick={() => openEdit(role)}>Edit</ABtn>
                  <ABtn small danger onClick={() => remove(role)}>Delete</ABtn>
                </div>
              </div>
            </ACard>
          )
        })}

      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? 'Edit Staff Role' : 'Create Staff Role'}>
        <Field label="Role Name *"><AInput value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Compliance Officer" /></Field>
        <Field label="Department"><AInput value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Compliance" /></Field>
        <Field label="Description">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            placeholder="What this role is responsible for..."
            style={{ ...mkInputCls(T), resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>
        <Field label="Permissions">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {STAFF_PERMISSION_OPTIONS.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form[p.id]} onChange={() => togglePerm(p.id)}
                  style={{ accentColor: G }} />
                <span style={{ color: T.textMuted, fontSize: 12 }}>{p.label}</span>
              </label>
            ))}
          </div>
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setModal(false)}>Cancel</ABtn>
          <ABtn onClick={save} disabled={!form.name}>{editingId ? 'Save Changes' : 'Create Role'}</ABtn>
        </div>
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MY TASKS SECTION (NEW in v11)
// Shows workflow instances the current staff member can act on, based on
// their staff_role permission flags matching the current step's requirement.
// ─────────────────────────────────────────────────────────────────────────────

function MyTasksSection({ myTasks, actOnTask, downloadKycPdf }) {
  const { T = DARK } = useTheme()
  const [actionModal, setActionModal] = useState(null) // { task, action }
  const [note, setNote] = useState('')

  const actionLabels = { approve: 'Approve', reject: 'Reject', escalate: 'Escalate', request_info: 'Request Info' }
  const actionColors = { approve: '#22c55e', reject: '#ef4444', escalate: '#f59e0b', request_info: T.textMuted }

  const openAction = (task, action) => { setActionModal({ task, action }); setNote('') }
  const closeAction = () => { setActionModal(null); setNote('') }

  const submitAction = async () => {
    await actOnTask(actionModal.task.id, actionModal.action, note)
    closeAction()
  }

  const recordTypeLabel = { kyc: 'KYC Submission', subscription: 'Subscription', redemption: 'Redemption', client: 'Client Account' }

  return (
    <div>
      <SectionHeader title="My Tasks" subtitle={`${myTasks.length} item${myTasks.length === 1 ? '' : 's'} awaiting your action`} />

      {myTasks.length === 0 ? (
        <ACard><p style={{ color: T.textFaint, textAlign: 'center', padding: 20 }}>Nothing pending right now · you're all caught up.</p></ACard>
      ) : myTasks.map(task => {
        const actions = (task.current_step_actions || '').split(',').map(a => a.trim()).filter(Boolean)
        return (
          <ACard key={task.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: T.text, fontWeight: 700 }}>{task.workflow_name}</span>
                  <span style={{ background: T.inputBg, border: `1px solid ${T.border2}`, color: T.textMuted, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>
                    {recordTypeLabel[task.record_type] || task.record_type}
                  </span>
                  <span style={{ background: 'rgba(184,134,11,0.12)', border: '1px solid rgba(184,134,11,0.3)', color: G, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                    Step {task.current_step}: {task.current_step_name}
                  </span>
                </div>
                <div style={{ color: T.textDim, fontSize: 13 }}>Client: {task.client_name}</div>
                {task.step_history?.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: T.textFaint }}>
                    {task.step_history.slice(-2).map((h, i) => (
                      <div key={i}>Step {h.step} · {h.action} by {h.by} {h.note ? `("${h.note}")` : ''}</div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {task.record_type === 'kyc' && (
                  <ABtn small outline onClick={() => downloadKycPdf(task.record_id, task.client_name)}>Download KYC PDF</ABtn>
                )}
                {actions.map(a => (
                  <ABtn key={a} small
                    style={a !== 'approve' ? { borderColor: actionColors[a], color: actionColors[a] } : undefined}
                    outline={a !== 'approve'}
                    onClick={() => openAction(task, a)}>
                    {actionLabels[a] || a}
                  </ABtn>
                ))}
              </div>
            </div>
          </ACard>
        )
      })}

      <Modal open={!!actionModal} onClose={closeAction} title={actionModal ? `${actionLabels[actionModal.action]} · ${actionModal.task.workflow_name}` : ''}>
        <Field label="Note (optional)">
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Add a note for the record..."
            style={{ ...mkInputCls(T), resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={closeAction}>Cancel</ABtn>
          <ABtn onClick={submitAction}>Confirm {actionModal ? actionLabels[actionModal.action] : ''}</ABtn>
        </div>
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW CONFIGURATION SECTION (NEW in v11)
// IT Admin (can_configure_workflows) configures workflows and their steps.
// ─────────────────────────────────────────────────────────────────────────────

const WORKFLOW_TRIGGERS = [
  { id: 'kyc_submitted', label: 'KYC Submitted' },
  { id: 'subscription_created', label: 'Subscription Receipt Uploaded' },
  { id: 'redemption_requested', label: 'Redemption Requested' },
  { id: 'client_account_created', label: 'Client Account Created' },
]
const WORKFLOW_ACTION_OPTIONS = ['approve', 'reject', 'escalate', 'request_info']

function WorkflowConfigSection({ workflows, createWorkflow, updateWorkflow, deleteWorkflow, addWorkflowStep, updateWorkflowStep, deleteWorkflowStep }) {
  const { T = DARK } = useTheme()
  const [expanded, setExpanded] = useState(null)
  const [wfModal, setWfModal] = useState(false)
  const [wfForm, setWfForm] = useState({ name: '', trigger: 'kyc_submitted', description: '' })
  // Steps defined while creating a workflow. Previously a new workflow was
  // always created empty and steps had to be added one at a time afterwards.
  const [newWfSteps, setNewWfSteps] = useState([])
  // The step currently being edited, if any. Reuses the same modal as adding.
  const [editingStep, setEditingStep] = useState(null)
  const [stepModal, setStepModal] = useState(null) // workflow id
  const emptyStepForm = { step_order: 1, name: '', description: '', required_permission: 'can_approve_kyc', available_actions: ['approve', 'reject'], sla_hours: 24, notify_ceo: false }
  const [stepForm, setStepForm] = useState(emptyStepForm)

  const toggleStepAction = (a) => setStepForm(f => ({
    ...f, available_actions: f.available_actions.includes(a) ? f.available_actions.filter(x => x !== a) : [...f.available_actions, a]
  }))

  const createWf = () => {
    createWorkflow({
      ...wfForm,
      steps: newWfSteps.map((s, i) => ({ ...s, step_order: i + 1 })),
    })
    setWfModal(false)
    setWfForm({ name: '', trigger: 'kyc_submitted', description: '' })
    setNewWfSteps([])
  }

  // Adds a step to the not-yet-created workflow, held locally until save
  const addStepToNewWf = () => {
    if (!stepForm.name || stepForm.available_actions.length === 0) return
    setNewWfSteps(prev => [...prev, {
      ...stepForm,
      step_order: prev.length + 1,
      available_actions: stepForm.available_actions.join(','),
    }])
    setStepForm({ ...emptyStepForm })
  }

  const removeNewWfStep = (idx) => setNewWfSteps(prev => prev.filter((_, i) => i !== idx))

  // Editing an existing workflow's own details (name, description). The
  // trigger is deliberately not editable: changing it on a workflow with
  // in-progress instances would leave those instances attached to a workflow
  // that no longer matches how they were started. Create a new workflow for
  // a different trigger instead.
  const [editWfModal, setEditWfModal] = useState(null)
  const [editWfForm, setEditWfForm] = useState({ name: '', description: '' })

  const openEditWorkflow = (wf) => {
    setEditWfForm({ name: wf.name || '', description: wf.description || '' })
    setEditWfModal(wf)
  }

  const submitEditWorkflow = () => {
    updateWorkflow(editWfModal.id, {
      name: editWfForm.name,
      description: editWfForm.description || null,
    })
    setEditWfModal(null)
  }

  const openStepModal = (workflowId, nextOrder) => {
    setEditingStep(null)
    setStepForm({ ...emptyStepForm, step_order: nextOrder })
    setStepModal(workflowId)
  }

  const openEditStep = (workflowId, step) => {
    setEditingStep(step)
    setStepForm({
      step_order: step.step_order,
      name: step.name || '',
      description: step.description || '',
      required_permission: step.required_permission || 'can_approve_kyc',
      available_actions: (step.available_actions || '').split(',').map(a => a.trim()).filter(Boolean),
      sla_hours: step.sla_hours ?? 24,
      notify_ceo: !!step.notify_ceo,
    })
    setStepModal(workflowId)
  }

  const submitStep = () => {
    const payload = { ...stepForm, available_actions: stepForm.available_actions.join(',') }
    if (editingStep) {
      updateWorkflowStep(stepModal, editingStep.id, payload)
    } else {
      addWorkflowStep(stepModal, payload)
    }
    setStepModal(null)
    setEditingStep(null)
  }

  return (
    <div>
      <SectionHeader title="Workflow Configuration" subtitle="Configure approval steps for KYC, subscriptions, redemptions, and client onboarding"
        action={<ABtn onClick={() => setWfModal(true)}>+ Create Workflow</ABtn>} />

      {workflows.map(wf => (
        <ACard key={wf.id} style={{ marginBottom: 10, opacity: wf.is_active ? 1 : 0.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => setExpanded(expanded === wf.id ? null : wf.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: T.text, fontWeight: 700 }}>{wf.name}</span>
                <span style={{ background: T.inputBg, border: `1px solid ${T.border2}`, color: T.textMuted, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>
                  {WORKFLOW_TRIGGERS.find(t => t.id === wf.trigger)?.label || wf.trigger}
                </span>
                {!wf.is_active && <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 600 }}>INACTIVE</span>}
              </div>
              {wf.description && <p style={{ color: T.textDim, fontSize: 12, marginTop: 4 }}>{wf.description}</p>}
              <p style={{ color: T.textFaint, fontSize: 11, marginTop: 4 }}>
                {wf.steps?.length || 0} step{wf.steps?.length === 1 ? '' : 's'}
                {expanded === wf.id ? ' · showing' : ' · click "Edit Steps" to add, edit or reorder them'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <ABtn small outline onClick={() => setExpanded(expanded === wf.id ? null : wf.id)}>
                {expanded === wf.id ? 'Hide Steps' : 'Edit Steps'}
              </ABtn>
              <ABtn small outline onClick={() => openEditWorkflow(wf)}>Rename</ABtn>
              <ABtn small outline onClick={() => updateWorkflow(wf.id, { is_active: !wf.is_active })}>{wf.is_active ? 'Deactivate' : 'Activate'}</ABtn>
              <ABtn small danger onClick={() => window.confirm(
                `Delete workflow "${wf.name}"?\n\n` +
                `This removes its ${wf.steps?.length || 0} step(s) too. Any KYC, subscription ` +
                `or redemption currently part-way through this workflow will be left ` +
                `orphaned and won't appear in anyone's My Tasks.\n\n` +
                `If you only want to stop it being used for new items, Deactivate instead.`
              ) && deleteWorkflow(wf.id)}>Delete</ABtn>
            </div>
          </div>

          {expanded === wf.id && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border2}` }}>
              {(wf.steps || []).map(step => (
                <div key={step.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border2}` }}>
                  <div>
                    <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>Step {step.step_order}: {step.name}</div>
                    <div style={{ color: T.textFaint, fontSize: 11 }}>
                      Requires: {step.required_permission} · Actions: {step.available_actions} · SLA: {step.sla_hours}h
                      {step.notify_ceo ? ' · Notifies CEO' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <ABtn small outline onClick={() => openEditStep(wf.id, step)}>Edit</ABtn>
                    <ABtn small danger onClick={() => deleteWorkflowStep(wf.id, step.id)}>Remove</ABtn>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <ABtn small outline onClick={() => openStepModal(wf.id, (wf.steps?.length || 0) + 1)}>+ Add Step</ABtn>
              </div>
            </div>
          )}
        </ACard>
      ))}

      <Modal open={!!editWfModal} onClose={() => setEditWfModal(null)} title={`Edit Workflow: ${editWfModal?.name || ''}`}>
        <Field label="Workflow Name">
          <AInput value={editWfForm.name} onChange={e => setEditWfForm(f => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Description">
          <textarea value={editWfForm.description} onChange={e => setEditWfForm(f => ({ ...f, description: e.target.value }))} rows={2}
            style={{ ...mkInputCls(T), resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>
        <p style={{ color: T.textFaint, fontSize: 11, marginTop: 6 }}>
          The trigger can't be changed. Workflows already in progress were started
          under the current trigger, so switching it would leave them mismatched.
          Create a separate workflow if you need a different trigger.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
          <ABtn outline onClick={() => setEditWfModal(null)}>Cancel</ABtn>
          <ABtn onClick={submitEditWorkflow} disabled={!editWfForm.name.trim()}>Save Changes</ABtn>
        </div>
      </Modal>

      <Modal open={wfModal} onClose={() => setWfModal(false)} title="Create Workflow">
        <Field label="Workflow Name *"><AInput value={wfForm.name} onChange={e => setWfForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. KYC Approval" /></Field>
        <Field label="Trigger *">
          <ASelect value={wfForm.trigger} onChange={e => setWfForm(f => ({ ...f, trigger: e.target.value }))}>
            {WORKFLOW_TRIGGERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </ASelect>
        </Field>
        <Field label="Description">
          <textarea value={wfForm.description} onChange={e => setWfForm(f => ({ ...f, description: e.target.value }))} rows={2}
            style={{ ...mkInputCls(T), resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>
        {/* Steps can now be defined here, rather than creating an empty
            workflow and adding them one at a time afterwards. */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border2}` }}>
          <p style={{ color: T.text, fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Steps</p>
          {newWfSteps.length === 0 ? (
            <p style={{ color: T.textFaint, fontSize: 12, marginBottom: 10 }}>
              No steps yet. A workflow with no steps won't do anything when it fires.
            </p>
          ) : newWfSteps.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${T.border2}` }}>
              <div>
                <div style={{ color: T.text, fontSize: 12, fontWeight: 600 }}>Step {i + 1}: {s.name}</div>
                <div style={{ color: T.textFaint, fontSize: 11 }}>
                  {s.required_permission} · {s.available_actions} · SLA {s.sla_hours}h
                </div>
              </div>
              <ABtn small danger onClick={() => removeNewWfStep(i)}>Remove</ABtn>
            </div>
          ))}

          <div style={{ marginTop: 12, padding: 12, background: T.inputBg, borderRadius: 8 }}>
            <Field label="Step Name">
              <AInput value={stepForm.name} onChange={e => setStepForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Compliance Approval" />
            </Field>
            <Field label="Who can handle this step">
              <ASelect value={stepForm.required_permission} onChange={e => setStepForm(f => ({ ...f, required_permission: e.target.value }))}>
                {STAFF_PERMISSION_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </ASelect>
            </Field>
            <Field label="Available Actions">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                {WORKFLOW_ACTION_OPTIONS.map(a => (
                  <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={stepForm.available_actions.includes(a)}
                      onChange={() => toggleStepAction(a)} style={{ accentColor: G }} />
                    <span style={{ color: T.textMuted, fontSize: 12 }}>{a}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="SLA (hours)">
              <AInput type="number" value={stepForm.sla_hours}
                onChange={e => setStepForm(f => ({ ...f, sla_hours: parseInt(e.target.value) || 24 }))} />
            </Field>
            <ABtn small outline onClick={addStepToNewWf}
              disabled={!stepForm.name || stepForm.available_actions.length === 0}>+ Add This Step</ABtn>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
          <ABtn outline onClick={() => { setWfModal(false); setNewWfSteps([]) }}>Cancel</ABtn>
          <ABtn onClick={createWf} disabled={!wfForm.name}>
            Create Workflow{newWfSteps.length > 0 ? ` (${newWfSteps.length} step${newWfSteps.length === 1 ? '' : 's'})` : ''}
          </ABtn>
        </div>
      </Modal>

      <Modal open={!!stepModal} onClose={() => { setStepModal(null); setEditingStep(null) }}
        title={editingStep ? `Edit Step: ${editingStep.name}` : 'Add Workflow Step'}>
        <Field label="Step Order"><AInput type="number" value={stepForm.step_order} onChange={e => setStepForm(f => ({ ...f, step_order: parseInt(e.target.value) || 1 }))} /></Field>
        <Field label="Step Name *"><AInput value={stepForm.name} onChange={e => setStepForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Compliance Approval" /></Field>
        <Field label="Description">
          <textarea value={stepForm.description} onChange={e => setStepForm(f => ({ ...f, description: e.target.value }))} rows={2}
            style={{ ...mkInputCls(T), resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>
        <Field label="Required Permission (who can handle this step)">
          <ASelect value={stepForm.required_permission} onChange={e => setStepForm(f => ({ ...f, required_permission: e.target.value }))}>
            {STAFF_PERMISSION_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </ASelect>
        </Field>
        <Field label="Available Actions">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            {WORKFLOW_ACTION_OPTIONS.map(a => (
              <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={stepForm.available_actions.includes(a)} onChange={() => toggleStepAction(a)} style={{ accentColor: G }} />
                <span style={{ color: T.textMuted, fontSize: 12 }}>{a}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="SLA (hours)"><AInput type="number" value={stepForm.sla_hours} onChange={e => setStepForm(f => ({ ...f, sla_hours: parseInt(e.target.value) || 24 }))} /></Field>
        <Field label="">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={stepForm.notify_ceo} onChange={() => setStepForm(f => ({ ...f, notify_ceo: !f.notify_ceo }))} style={{ accentColor: G }} />
            <span style={{ color: T.textMuted, fontSize: 12 }}>Notify CEO when this step completes</span>
          </label>
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => { setStepModal(null); setEditingStep(null) }}>Cancel</ABtn>
          <ABtn onClick={submitStep} disabled={!stepForm.name || stepForm.available_actions.length === 0}>
            {editingStep ? 'Save Changes' : 'Add Step'}
          </ABtn>
        </div>
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MY SECURITY SECTION (NEW) · staff MFA enrollment. Mandatory for staff
// (nudged via mustSetupMfa after login), unlike the client-side version
// which is optional. No "disable" option here by design · matches the
// backend, which doesn't expose an admin MFA disable endpoint.
// ─────────────────────────────────────────────────────────────────────────────

function SecuritySection({ admin, adminMfaSetup, adminMfaVerify, adminChangePassword, mustChangePassword }) {
  const { T = DARK } = useTheme()
  const [qrData, setQrData] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Change own password · staff previously had no way to do this at all, so
  // a temp password issued by IT could never be replaced by its owner.
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const submitPasswordChange = async () => {
    setPwError(''); setPwSuccess('')
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwError('Please fill in all fields.'); return }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('New password and confirmation do not match.'); return }
    setPwLoading(true)
    try {
      await adminChangePassword(pwForm.current, pwForm.next)
      setPwForm({ current: '', next: '', confirm: '' })
      setPwSuccess('Password changed successfully.')
    } catch (err) {
      setPwError(err.response?.data?.detail || 'Could not change password.')
    } finally {
      setPwLoading(false)
    }
  }

  const startSetup = async () => {
    setError(''); setSuccess(''); setLoading(true)
    try {
      const data = await adminMfaSetup()
      setQrData(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start MFA setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const confirmSetup = async () => {
    setError('')
    if (!verifyCode || verifyCode.length !== 6) { setError('Please enter the 6-digit code from your authenticator app.'); return }
    setLoading(true)
    try {
      await adminMfaVerify(verifyCode)
      setQrData(null)
      setVerifyCode('')
      setSuccess('Two-factor authentication is now enabled on your account.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionHeader title="My Security" subtitle="Two-factor authentication is mandatory for all staff accounts" />

      <ACard style={{ maxWidth: 900, width: '100%' }}>
        {success && <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{success}</div>}
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}

        {!admin?.mfa_enabled && !qrData && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999 }}>Not yet enabled · required</span>
            <ABtn onClick={startSetup} disabled={loading}>{loading ? 'Starting…' : 'Set Up 2FA'}</ABtn>
          </div>
        )}

        {qrData && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0' }}>
              <img src={qrData.qr_code} alt="MFA QR Code" style={{ width: 180, height: 180, marginBottom: 10 }} />
              <p style={{ color: T.textMuted, fontSize: 11, textAlign: 'center', marginBottom: 6 }}>
                Scan with your authenticator app, or enter this code manually:
              </p>
              <code style={{ background: T.inputBg, color: T.text, fontSize: 12, padding: '6px 12px', borderRadius: 8 }}>{qrData.secret}</code>
            </div>
            <Field label="Enter the 6-digit code from your app">
              <AInput value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
            </Field>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <ABtn onClick={confirmSetup} disabled={loading} style={{ flex: 1 }}>{loading ? 'Verifying…' : 'Verify & Enable'}</ABtn>
              <ABtn outline onClick={() => { setQrData(null); setVerifyCode(''); setError('') }}>Cancel</ABtn>
            </div>
          </div>
        )}

        {admin?.mfa_enabled && !qrData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999 }}>Enabled ✓</span>
            <span style={{ color: T.textMuted, fontSize: 12 }}>Your account is protected with two-factor authentication.</span>
          </div>
        )}
      </ACard>

      {/* ── Change Password ─────────────────────────────────────────────── */}
      <ACard style={{ maxWidth: 900, width: '100%', marginTop: 16 }}>
        <p style={{ color: T.text, fontWeight: 700, marginBottom: 4 }}>Change Password</p>
        {mustChangePassword ? (
          <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
            You're using a temporary password. Please set your own now.
          </div>
        ) : (
          <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 14 }}>
            Use a password you don't use anywhere else.
          </p>
        )}

        {pwSuccess && <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{pwSuccess}</div>}
        {pwError && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{pwError}</div>}

        <Field label="Current Password">
          <AInput type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
        </Field>
        <Field label="New Password">
          <AInput type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} placeholder="At least 8 characters" />
        </Field>
        <Field label="Confirm New Password">
          <AInput type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
        </Field>
        <div style={{ marginTop: 8 }}>
          <ABtn onClick={submitPasswordChange} disabled={pwLoading}>
            {pwLoading ? 'Updating…' : 'Update Password'}
          </ABtn>
        </div>
      </ACard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE PORTFOLIOS SECTION (NEW) · Investment Manager / IT Admin
// Manage holdings per portfolio, enter closing prices in batch, run
// valuations, view value history. Backend enforces can_manage_nav
// regardless of what shows in this nav · visible here to any staff, but
// actions will fail with a clear error if their role lacks the permission.
// ─────────────────────────────────────────────────────────────────────────────

function PortfolioSection({ subscriptions, portfolioHoldings, valuationHistory, fetchPortfolioHoldings, fetchValuationHistory, addHolding, redeemHolding, deleteHolding, submitPrices, runValuation, editHolding, downloadPriceTemplate, uploadPrices, instruments, fetchInstruments, renameInstrument }) {
  const { T = DARK } = useTheme()

  // Instruments master list · surfaces every instrument name in use so
  // near-duplicates ("MTN Nigeria" vs "MTN Nigeria PLC") can be spotted and
  // merged, since a price entered under one name won't value the other.
  const [showInstruments, setShowInstruments] = useState(false)
  const [renameTarget, setRenameTarget] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  useEffect(() => { fetchInstruments() }, [])

  const openRename = (inst) => {
    setRenameTarget(inst)
    setRenameValue(inst.name)
  }

  const submitRename = async () => {
    setError(''); setSuccess(''); setRenameLoading(true)
    try {
      const result = await renameInstrument(renameTarget.name, renameValue.trim())
      setSuccess(result.message)
      setRenameTarget(null)
      if (selectedSubId) fetchPortfolioHoldings(selectedSubId)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not rename that instrument.')
    } finally {
      setRenameLoading(false)
    }
  }

  const [selectedSubId, setSelectedSubId] = useState('')
  const [holdingModal, setHoldingModal] = useState(false)
  const [holdingForm, setHoldingForm] = useState({ holding_type: 'equity', instrument_name: '', units: '', cost_price: '', start_date: '', principal: '', roi_pct: '', maturity_date: '' })
  const [editModal, setEditModal] = useState(null) // holding being edited
  const [editForm, setEditForm] = useState({})
  const [redeemModal, setRedeemModal] = useState(null) // holding being redeemed
  const [redeemAmount, setRedeemAmount] = useState('')
  const [redeemNote, setRedeemNote] = useState('')
  const [deleteModal, setDeleteModal] = useState(null) // holding being deleted (data-entry mistake only — see note above)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Daily price entry
  const [priceRows, setPriceRows] = useState([{ instrument_name: '', price: '' }])
  const [pricePreview, setPricePreview] = useState(null) // { matched, unmatched, message }
  const [priceLoading, setPriceLoading] = useState(false)
  const [valuationLoading, setValuationLoading] = useState(false)
  // Backdating: prices and valuations both default to today, but can be set
  // to a past date to build historical charts for clients who already held
  // investments before they were entered into the portal.
  const [priceDate, setPriceDate] = useState('')
  const [valuationDate, setValuationDate] = useState('')
  // Excel bulk upload
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  // Display helper: 2000000 -> "2,000,000" while typing, raw value kept in state
  const fmtNum = (v) => {
    if (v === '' || v === null || v === undefined) return ''
    const [i, d] = String(v).split('.')
    const withCommas = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return d !== undefined ? `${withCommas}.${d}` : withCommas
  }
  const parseNum = (v) => v.replace(/,/g, '').replace(/[^0-9.]/g, '')

  const selectedSub = subscriptions.find(s => String(s.id) === String(selectedSubId))

  useEffect(() => {
    if (selectedSubId) {
      fetchPortfolioHoldings(selectedSubId)
      fetchValuationHistory(selectedSubId)
    }
  }, [selectedSubId])

  const openAddHolding = () => {
    setHoldingForm({ holding_type: 'equity', instrument_name: '', units: '', cost_price: '', start_date: '', principal: '', roi_pct: '', maturity_date: '' })
    setHoldingModal(true)
  }

  const submitHolding = async () => {
    setError('')
    try {
      const payload = {
        holding_type: holdingForm.holding_type,
        instrument_name: holdingForm.instrument_name,
        // BUGFIX: start_date was already fully supported by the backend for
        // BOTH holding types (equity purchase date, fixed income placement
        // date) but no form field ever collected it · every holding was
        // silently dated "today" regardless of when it was actually bought.
        start_date: holdingForm.start_date ? new Date(holdingForm.start_date).toISOString() : null,
      }
      if (holdingForm.holding_type === 'equity') {
        payload.units = parseFloat(holdingForm.units)
        payload.cost_price = parseFloat(holdingForm.cost_price)
      } else {
        payload.principal = parseFloat(holdingForm.principal)
        payload.roi_pct = parseFloat(holdingForm.roi_pct)
        payload.maturity_date = holdingForm.maturity_date ? new Date(holdingForm.maturity_date).toISOString() : null
      }
      await addHolding(selectedSubId, payload)
      setHoldingModal(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not add holding.')
    }
  }

  const submitRedeem = async () => {
    setError('')
    try {
      await redeemHolding(redeemModal.id, selectedSubId, { units_or_amount: parseFloat(redeemAmount), note: redeemNote })
      setRedeemModal(null); setRedeemAmount(''); setRedeemNote('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not redeem holding.')
    }
  }

  const submitDelete = async () => {
    setError('')
    setDeleteLoading(true)
    try {
      await deleteHolding(deleteModal.id, selectedSubId)
      setDeleteModal(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not delete holding.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const openEditHolding = (h) => {
    setEditForm({
      instrument_name: h.instrument_name || '',
      units: h.units ?? '',
      cost_price: h.cost_price ?? '',
      principal: h.principal ?? '',
      roi_pct: h.roi_pct ?? '',
      start_date: h.start_date ? h.start_date.slice(0, 10) : '',
      maturity_date: h.maturity_date ? h.maturity_date.slice(0, 10) : '',
    })
    setEditModal(h)
  }

  const submitEdit = async () => {
    setError('')
    try {
      const payload = { instrument_name: editForm.instrument_name }
      if (editModal.holding_type === 'equity') {
        if (editForm.units !== '') payload.units = parseFloat(editForm.units)
        if (editForm.cost_price !== '') payload.cost_price = parseFloat(editForm.cost_price)
      } else {
        if (editForm.principal !== '') payload.principal = parseFloat(editForm.principal)
        if (editForm.roi_pct !== '') payload.roi_pct = parseFloat(editForm.roi_pct)
        if (editForm.maturity_date) payload.maturity_date = new Date(editForm.maturity_date).toISOString()
      }
      if (editForm.start_date) payload.start_date = new Date(editForm.start_date).toISOString()
      await editHolding(editModal.id, selectedSubId, payload)
      setEditModal(null)
      setSuccess('Holding updated. Run a valuation to reflect the change.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update holding.')
    }
  }

  const doUploadPreview = async () => {
    if (!uploadFile) { setError('Choose an Excel file first.'); return }
    setError(''); setUploadPreview(null); setUploadLoading(true)
    try {
      const result = await uploadPrices(uploadFile, priceDate ? new Date(priceDate).toISOString() : null, false)
      setUploadPreview(result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not read that file.')
    } finally {
      setUploadLoading(false)
    }
  }

  const doUploadConfirm = async () => {
    setUploadLoading(true); setError('')
    try {
      const result = await uploadPrices(uploadFile, priceDate ? new Date(priceDate).toISOString() : null, true)
      setSuccess(result.message)
      setUploadFile(null); setUploadPreview(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save prices.')
    } finally {
      setUploadLoading(false)
    }
  }

  const addPriceRow = () => setPriceRows(r => [...r, { instrument_name: '', price: '' }])
  const removePriceRow = (i) => setPriceRows(r => r.filter((_, idx) => idx !== i))
  const updatePriceRow = (i, field, value) => setPriceRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row))

  const previewPrices = async () => {
    setError(''); setPricePreview(null); setPriceLoading(true)
    try {
      const entries = priceRows.filter(r => r.instrument_name && r.price).map(r => ({ instrument_name: r.instrument_name, price: parseFloat(r.price) }))
      if (!entries.length) { setError('Enter at least one instrument name and price.'); setPriceLoading(false); return }
      const result = await submitPrices(entries, priceDate ? new Date(priceDate).toISOString() : null, false)
      setPricePreview({ ...result, entries })
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not preview prices.')
    } finally {
      setPriceLoading(false)
    }
  }

  const confirmPrices = async () => {
    setPriceLoading(true); setError('')
    try {
      await submitPrices(pricePreview.entries, priceDate ? new Date(priceDate).toISOString() : null, true)
      setSuccess(`${pricePreview.entries.length} price(s) saved.`)
      setPriceRows([{ instrument_name: '', price: '' }])
      setPricePreview(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save prices.')
    } finally {
      setPriceLoading(false)
    }
  }

  const doRunValuation = async (scopeToSelected) => {
    setValuationLoading(true); setError(''); setSuccess('')
    try {
      const result = await runValuation(
        scopeToSelected && selectedSubId ? [selectedSubId] : null,
        valuationDate ? new Date(valuationDate).toISOString() : null
      )
      setSuccess(`Revalued ${result.revalued} portfolio${result.revalued === 1 ? '' : 's'}.`)
      if (selectedSubId) fetchValuationHistory(selectedSubId)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not run valuation.')
    } finally {
      setValuationLoading(false)
    }
  }

  const chartData = valuationHistory.map(v => ({
    date: new Date(v.valuation_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    total: v.total_value,
  }))

  return (
    <div>
      <SectionHeader title="Private Portfolios" subtitle="Manage client holdings, enter closing prices, and run valuations" />

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{success}</div>}

      {/* ── Daily Price Entry (applies across ALL portfolios holding these stocks) ── */}
      <ACard style={{ marginBottom: 16 }}>
        <p style={{ color: T.text, fontWeight: 700, marginBottom: 4 }}>Daily Closing Prices</p>
        <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 12 }}>
          One price per stock revalues every client holding that stock, no need to repeat per client.
        </p>

        <Field label="Price Date (leave blank for today, or set a past date to backfill history)">
          <AInput type="date" value={priceDate} onChange={e => setPriceDate(e.target.value)} />
        </Field>

        {priceRows.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <div style={{ flex: 2 }}><AInput value={row.instrument_name} onChange={e => updatePriceRow(i, 'instrument_name', e.target.value)} placeholder="e.g. MTN Nigeria" /></div>
            <div style={{ flex: 1 }}><AInput value={fmtNum(row.price)} onChange={e => updatePriceRow(i, 'price', parseNum(e.target.value))} placeholder="Price" /></div>
            {priceRows.length > 1 && <ABtn small outline onClick={() => removePriceRow(i)}>✕</ABtn>}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <ABtn small outline onClick={addPriceRow}>+ Add Stock</ABtn>
          <ABtn small onClick={previewPrices} disabled={priceLoading}>{priceLoading ? '...' : 'Preview'}</ABtn>
        </div>

        {pricePreview && (
          <div style={{ marginTop: 14, padding: 12, background: T.inputBg, borderRadius: 8 }}>
            <p style={{ color: T.text, fontSize: 13, marginBottom: 6 }}>{pricePreview.message}</p>
            {pricePreview.matched?.length > 0 && (
              <p style={{ color: '#22c55e', fontSize: 12, marginBottom: 4 }}>✓ Matched: {pricePreview.matched.join(', ')}</p>
            )}
            {pricePreview.unmatched?.length > 0 && (
              <p style={{ color: '#f59e0b', fontSize: 12, marginBottom: 8 }}>⚠ Not matched to any existing holding: {pricePreview.unmatched.join(', ')}. Double check spelling before confirming.</p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <ABtn small onClick={confirmPrices} disabled={priceLoading}>{priceLoading ? '...' : 'Confirm & Save'}</ABtn>
              <ABtn small outline onClick={() => setPricePreview(null)}>Cancel</ABtn>
            </div>
          </div>
        )}

        {/* ── Excel bulk upload ── */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border2}` }}>
          <p style={{ color: T.text, fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Or upload from Excel</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ABtn small outline onClick={downloadPriceTemplate}>Download Template</ABtn>
            <input type="file" accept=".xlsx,.xlsm" onChange={e => { setUploadFile(e.target.files[0]); setUploadPreview(null) }}
              style={{ color: T.textMuted, fontSize: 12 }} />
            <ABtn small onClick={doUploadPreview} disabled={uploadLoading || !uploadFile}>{uploadLoading ? '...' : 'Preview Upload'}</ABtn>
          </div>

          {uploadPreview && (
            <div style={{ marginTop: 12, padding: 12, background: T.inputBg, borderRadius: 8 }}>
              <p style={{ color: T.text, fontSize: 13, marginBottom: 6 }}>{uploadPreview.message}</p>
              {uploadPreview.matched?.length > 0 && (
                <p style={{ color: '#22c55e', fontSize: 12, marginBottom: 4 }}>✓ Matched: {uploadPreview.matched.join(', ')}</p>
              )}
              {uploadPreview.unmatched?.length > 0 && (
                <p style={{ color: '#f59e0b', fontSize: 12, marginBottom: 4 }}>⚠ Not matched: {uploadPreview.unmatched.join(', ')}</p>
              )}
              {uploadPreview.skipped?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ color: '#ef4444', fontSize: 12 }}>Skipped rows:</p>
                  {uploadPreview.skipped.map((s, i) => (
                    <p key={i} style={{ color: T.textMuted, fontSize: 11, marginLeft: 8 }}>Row {s.row}: {s.name} ({s.reason})</p>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <ABtn small onClick={doUploadConfirm} disabled={uploadLoading}>{uploadLoading ? '...' : 'Confirm & Save'}</ABtn>
                <ABtn small outline onClick={() => setUploadPreview(null)}>Cancel</ABtn>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border2}` }}>
          <Field label="Valuation Date (leave blank for today, or set a past date to backfill history)">
            <AInput type="date" value={valuationDate} onChange={e => setValuationDate(e.target.value)} />
          </Field>
          <ABtn outline onClick={() => doRunValuation(false)} disabled={valuationLoading}>
            {valuationLoading ? 'Running…' : 'Run Valuation for All Portfolios'}
          </ABtn>
        </div>
      </ACard>

      {/* ── Instruments master list ─────────────────────────────────────── */}
      <ACard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowInstruments(v => !v)}>
          <div>
            <p style={{ color: T.text, fontWeight: 700 }}>Instruments</p>
            <p style={{ color: T.textMuted, fontSize: 12 }}>
              {instruments.length} instrument{instruments.length === 1 ? '' : 's'} in the system
              {instruments.some(i => i.needs_price) &&
                <span style={{ color: '#f59e0b' }}> · {instruments.filter(i => i.needs_price).length} missing a price</span>}
            </p>
          </div>
          <span style={{ color: T.textMuted, fontSize: 12 }}>{showInstruments ? 'Hide' : 'Show'}</span>
        </div>

        {showInstruments && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border2}` }}>
            <p style={{ color: T.textMuted, fontSize: 11, marginBottom: 10 }}>
              Names are matched exactly, so "MTN Nigeria" and "MTN Nigeria PLC" are treated as
              two different instruments. Renaming one to match the other merges them.
            </p>
            {instruments.length === 0 ? (
              <p style={{ color: T.textFaint, fontSize: 13 }}>No instruments yet. They appear once holdings or prices are added.</p>
            ) : instruments.map(inst => (
              <div key={inst.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border2}`, gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>
                    {inst.name}
                    {inst.needs_price && (
                      <span style={{ marginLeft: 8, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                        No price
                      </span>
                    )}
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>
                    {inst.holding_count} holding{inst.holding_count === 1 ? '' : 's'} · {inst.client_count} client{inst.client_count === 1 ? '' : 's'}
                    {inst.latest_price != null
                      ? ` · latest ₦${Number(inst.latest_price).toLocaleString()} on ${new Date(inst.latest_price_date).toLocaleDateString('en-GB')}`
                      : ' · never priced'}
                  </div>
                </div>
                <ABtn small outline onClick={() => openRename(inst)}>Rename</ABtn>
              </div>
            ))}
          </div>
        )}
      </ACard>

      {/* ── Portfolio selector ── */}
      <ACard style={{ marginBottom: 16 }}>
        <Field label="Select a Client Portfolio">
          <ASelect value={selectedSubId} onChange={e => setSelectedSubId(e.target.value)}>
            <option value="">Choose a portfolio…</option>
            {subscriptions.filter(s => s.status === 'active').map(s => (
              <option key={s.id} value={s.id}>{s.client_name || s.user?.full_name || 'Client'} · {s.product_name || s.productName || 'Portfolio'} ({s.reference})</option>
            ))}
          </ASelect>
        </Field>
      </ACard>

      {selectedSub && (
        <>
          {/* Holdings */}
          <ACard style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ color: T.text, fontWeight: 700 }}>Holdings</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <ABtn small outline onClick={() => doRunValuation(true)} disabled={valuationLoading}>{valuationLoading ? '...' : 'Run Valuation for This Portfolio'}</ABtn>
                <ABtn small onClick={openAddHolding}>+ Add Holding</ABtn>
              </div>
            </div>

            {portfolioHoldings.length === 0 ? (
              <p style={{ color: T.textFaint, fontSize: 13 }}>No holdings yet. Add an equity or fixed income position to get started.</p>
            ) : portfolioHoldings.map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.border2}` }}>
                <div>
                  <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>
                    {h.instrument_name}
                    <span style={{ marginLeft: 8, background: T.inputBg, color: T.textMuted, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>{h.holding_type === 'equity' ? 'Equity' : 'Fixed Income'}</span>
                    {h.status !== 'active' && <span style={{ marginLeft: 6, color: '#f59e0b', fontSize: 10, fontWeight: 600 }}>{h.status.replace('_', ' ').toUpperCase()}</span>}
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>
                    {h.holding_type === 'equity'
                      ? `${h.units} units @ ${h.cost_price} cost · purchased ${h.start_date ? new Date(h.start_date).toLocaleDateString('en-GB') : 'N/A'}`
                      : `₦${h.principal?.toLocaleString()} at ${h.roi_pct}% · placed ${h.start_date ? new Date(h.start_date).toLocaleDateString('en-GB') : 'N/A'} · matures ${h.maturity_date ? new Date(h.maturity_date).toLocaleDateString('en-GB') : 'N/A'}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <ABtn small outline onClick={() => openEditHolding(h)}>Edit</ABtn>
                  {h.status !== 'redeemed' && (
                    <ABtn small danger onClick={() => setRedeemModal(h)}>Redeem</ABtn>
                  )}
                  {/* Delete only fixes a genuine data-entry mistake — wrong instrument,
                      wrong client, duplicate, typo — never a real closed-out position.
                      Closing a real position always goes through Redeem, which leaves
                      a proper record. Gated per-holding: only shown if THIS holding's
                      id has never appeared in any past valuation snapshot's breakdown
                      for this portfolio — an existing client's portfolio can already
                      have valuation history while a holding just added today has
                      never been part of one, and that new holding should still be
                      deletable. The backend independently re-checks this exact same
                      condition and is the real source of truth; this is only a
                      convenience so the button doesn't appear when it would be
                      rejected anyway. */}
                  {h.status !== 'redeemed' && !valuationHistory.some(
                    v => (v.breakdown || []).some(entry => entry.holding_id === String(h.id))
                  ) && (
                    <ABtn small danger outline onClick={() => setDeleteModal(h)}>Delete</ABtn>
                  )}
                </div>
              </div>
            ))}
          </ACard>

          {/* Valuation history + chart */}
          <ACard>
            <p style={{ color: T.text, fontWeight: 700, marginBottom: 12 }}>Value History</p>
            {chartData.length === 0 ? (
              <p style={{ color: T.textFaint, fontSize: 13 }}>No valuation runs yet for this portfolio.</p>
            ) : (
              <div style={{ height: 220, marginBottom: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: T.textMuted }} />
                    <YAxis tick={{ fontSize: 11, fill: T.textMuted }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ background: T.bg2, border: `1px solid ${T.border2}`, fontSize: 12 }} formatter={v => `₦${Number(v).toLocaleString()}`} />
                    <Line type="monotone" dataKey="total" stroke={G} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {valuationHistory.slice().reverse().map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border2}`, fontSize: 12 }}>
                <span style={{ color: T.textMuted }}>{new Date(v.valuation_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span style={{ color: T.textMuted }}>Equities: ₦{v.equities_value.toLocaleString()} · Fixed Income: ₦{v.fixed_income_value.toLocaleString()}</span>
                <span style={{ color: T.text, fontWeight: 700 }}>₦{v.total_value.toLocaleString()}</span>
              </div>
            ))}
          </ACard>
        </>
      )}

      {/* Add Holding Modal */}
      <Modal open={holdingModal} onClose={() => setHoldingModal(false)} title="Add Holding">
        <Field label="Type">
          <ASelect value={holdingForm.holding_type} onChange={e => setHoldingForm(f => ({ ...f, holding_type: e.target.value }))}>
            <option value="equity">Equity (Stock)</option>
            <option value="fixed_income">Fixed Income (T-Bill, Sukuk, etc.)</option>
          </ASelect>
        </Field>
        <Field label="Instrument Name"><AInput value={holdingForm.instrument_name} onChange={e => setHoldingForm(f => ({ ...f, instrument_name: e.target.value }))} placeholder="e.g. MTN Nigeria" /></Field>
        {holdingForm.holding_type === 'equity' ? (
          <>
            <Field label="Units"><AInput value={fmtNum(holdingForm.units)} onChange={e => setHoldingForm(f => ({ ...f, units: parseNum(e.target.value) }))} /></Field>
            <Field label="Cost Price (per unit)"><AInput value={fmtNum(holdingForm.cost_price)} onChange={e => setHoldingForm(f => ({ ...f, cost_price: parseNum(e.target.value) }))} /></Field>
            <Field label="Purchase Date"><AInput type="date" value={holdingForm.start_date} onChange={e => setHoldingForm(f => ({ ...f, start_date: e.target.value }))} /></Field>
          </>
        ) : (
          <>
            <Field label="Principal"><AInput value={fmtNum(holdingForm.principal)} onChange={e => setHoldingForm(f => ({ ...f, principal: parseNum(e.target.value) }))} /></Field>
            <Field label="ROI %"><AInput value={fmtNum(holdingForm.roi_pct)} onChange={e => setHoldingForm(f => ({ ...f, roi_pct: parseNum(e.target.value) }))} /></Field>
            <Field label="Start Date (placement date)"><AInput type="date" value={holdingForm.start_date} onChange={e => setHoldingForm(f => ({ ...f, start_date: e.target.value }))} /></Field>
            <Field label="Maturity Date"><AInput type="date" value={holdingForm.maturity_date} onChange={e => setHoldingForm(f => ({ ...f, maturity_date: e.target.value }))} /></Field>
          </>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setHoldingModal(false)}>Cancel</ABtn>
          <ABtn onClick={submitHolding} disabled={!holdingForm.instrument_name}>Add Holding</ABtn>
        </div>
      </Modal>

      {/* Rename Instrument Modal */}
      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title={`Rename: ${renameTarget?.name || ''}`}>
        <Field label="New Name">
          <AInput value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="e.g. MTN Nigeria" />
        </Field>
        {renameTarget && instruments.some(i => i.name === renameValue.trim() && i.name !== renameTarget.name) && (
          <div style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginTop: 8 }}>
            <strong>This will merge instruments.</strong> "{renameValue.trim()}" already exists, so all holdings
            and prices under "{renameTarget.name}" will move to it. If both have a price for the same date,
            the existing one is kept. This cannot be undone automatically.
          </div>
        )}
        <p style={{ color: T.textMuted, fontSize: 11, marginTop: 8 }}>
          Updates the name across {renameTarget?.holding_count || 0} holding(s) and all its price history,
          so prices and holdings stay linked. Run a valuation afterwards to refresh client values.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
          <ABtn outline onClick={() => setRenameTarget(null)}>Cancel</ABtn>
          <ABtn onClick={submitRename}
            disabled={renameLoading || !renameValue.trim() || renameValue.trim() === renameTarget?.name}>
            {renameLoading ? 'Renaming…' : 'Rename'}
          </ABtn>
        </div>
      </Modal>

      {/* Edit Holding Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit Holding: ${editModal?.instrument_name || ''}`}>
        <Field label="Instrument Name"><AInput value={editForm.instrument_name || ''} onChange={e => setEditForm(f => ({ ...f, instrument_name: e.target.value }))} /></Field>
        {editModal?.holding_type === 'equity' ? (
          <>
            <Field label="Units"><AInput value={fmtNum(editForm.units)} onChange={e => setEditForm(f => ({ ...f, units: parseNum(e.target.value) }))} /></Field>
            <Field label="Cost Price (per unit)"><AInput value={fmtNum(editForm.cost_price)} onChange={e => setEditForm(f => ({ ...f, cost_price: parseNum(e.target.value) }))} /></Field>
            <Field label="Purchase Date"><AInput type="date" value={editForm.start_date || ''} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} /></Field>
          </>
        ) : (
          <>
            <Field label="Principal"><AInput value={fmtNum(editForm.principal)} onChange={e => setEditForm(f => ({ ...f, principal: parseNum(e.target.value) }))} /></Field>
            <Field label="ROI %"><AInput value={fmtNum(editForm.roi_pct)} onChange={e => setEditForm(f => ({ ...f, roi_pct: parseNum(e.target.value) }))} /></Field>
            <Field label="Start Date (placement date)"><AInput type="date" value={editForm.start_date || ''} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} /></Field>
            <Field label="Maturity Date"><AInput type="date" value={editForm.maturity_date || ''} onChange={e => setEditForm(f => ({ ...f, maturity_date: e.target.value }))} /></Field>
          </>
        )}
        <p style={{ color: T.textFaint, fontSize: 11, marginTop: 6 }}>
          Past valuation snapshots are a historical record and won't change. Run a new valuation to reflect these corrections.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setEditModal(null)}>Cancel</ABtn>
          <ABtn onClick={submitEdit} disabled={!editForm.instrument_name}>Save Changes</ABtn>
        </div>
      </Modal>

      {/* Redeem Modal */}
      <Modal open={!!redeemModal} onClose={() => setRedeemModal(null)} title={`Redeem: ${redeemModal?.instrument_name || ''}`}>
        <Field label={redeemModal?.holding_type === 'equity' ? 'Units to Redeem' : 'Amount to Redeem'}>
          <AInput value={fmtNum(redeemAmount)} onChange={e => setRedeemAmount(parseNum(e.target.value))}
            placeholder={redeemModal?.holding_type === 'equity' ? `Max ${fmtNum(redeemModal?.units)}` : `Max ${fmtNum(redeemModal?.principal)}`} />
        </Field>
        <Field label="Note (optional)"><AInput value={redeemNote} onChange={e => setRedeemNote(e.target.value)} /></Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setRedeemModal(null)}>Cancel</ABtn>
          <ABtn danger onClick={submitRedeem} disabled={!redeemAmount}>Confirm Redeem</ABtn>
        </div>
      </Modal>

      {/* Delete Modal — data-entry mistakes only. Never used to close a real
          position; that always goes through Redeem instead (see the gating
          note on the Delete button above). */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title={`Delete: ${deleteModal?.instrument_name || ''}`}>
        <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          This permanently removes this holding. Use this only to correct a genuine
          mistake — wrong instrument, wrong client, duplicate entry. If this position
          is real and you want to close it out, use <strong>Redeem</strong> instead,
          which keeps a proper record. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <ABtn outline onClick={() => setDeleteModal(null)}>Cancel</ABtn>
          <ABtn danger onClick={submitDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting…' : 'Permanently Delete'}
          </ABtn>
        </div>
      </Modal>
    </div>
  )
}

// ── Main Admin Panel ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// NAV & RETURNS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function NavSection() {
  const { T = DARK } = useTheme()

  const API = import.meta.env.VITE_API_URL
  const token = sessionStorage.getItem('pcil-admin-token')

  const [records, setRecords] = useState([])
  const [products, setProducts] = useState([])
  const [filterProduct, setFilterProduct] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    product_id: '', period_label: '', period_start: '',
    period_end: '', nav_per_unit: '', return_pct: '',
    cumulative_pct: '', total_aum: '', notes: '',
  })

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchRecords = async (pid = filterProduct) => {
    setLoading(true)
    try {
      const url = pid
        ? `${API}/admin/nav?product_id=${pid}&limit=100`
        : `${API}/admin/nav?limit=100`
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error(await res.text())
      setRecords(await res.json())
    } catch (e) {
      setError('Failed to load NAV records: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API}/products`, { headers })
      if (res.ok) setProducts(await res.json())
    } catch {}
  }

  useEffect(() => { fetchProducts(); fetchRecords() }, [])

  const resetForm = () => setForm({
    product_id: '', period_label: '', period_start: '', period_end: '',
    nav_per_unit: '', return_pct: '', cumulative_pct: '', total_aum: '', notes: '',
  })

  const openCreate = () => { setEditing(null); resetForm(); setShowForm(true); setError('') }

  const openEdit = (r) => {
    setEditing(r)
    setForm({
      product_id:     r.product_id,
      period_label:   r.period_label,
      period_start:   r.period_start?.split('T')[0] || '',
      period_end:     r.period_end?.split('T')[0]   || '',
      nav_per_unit:   r.nav_per_unit    ?? '',
      return_pct:     r.return_pct      ?? '',
      cumulative_pct: r.cumulative_pct  ?? '',
      total_aum:      r.total_aum       ?? '',
      notes:          r.notes           || '',
    })
    setShowForm(true)
    setError('')
  }

  const handleSave = async () => {
    if (!form.product_id || !form.period_label || !form.period_start || !form.period_end) {
      setError('Product, period label, start and end date are required.')
      return
    }
    setSaving(true); setError('')
    try {
      const payload = {
        product_id:     form.product_id,
        period_label:   form.period_label,
        period_start:   new Date(form.period_start).toISOString(),
        period_end:     new Date(form.period_end).toISOString(),
        nav_per_unit:   form.nav_per_unit   !== '' ? parseFloat(form.nav_per_unit)   : null,
        return_pct:     form.return_pct     !== '' ? parseFloat(form.return_pct)     : null,
        cumulative_pct: form.cumulative_pct !== '' ? parseFloat(form.cumulative_pct) : null,
        total_aum:      form.total_aum      !== '' ? parseFloat(form.total_aum)      : null,
        notes:          form.notes || null,
      }
      const url    = editing ? `${API}/admin/nav/${editing.id}` : `${API}/admin/nav`
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Save failed') }
      setShowForm(false)
      await fetchRecords()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this NAV record? This cannot be undone.')) return
    try {
      const res = await fetch(`${API}/admin/nav/${id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Delete failed')
      setRecords(r => r.filter(x => x.id !== id))
    } catch (e) { setError(e.message) }
  }

  const productName = (id) => products.find(p => p.id === id)?.name || 'N/A'
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'
  const fmtNum  = (n, d = 2) => n != null ? Number(n).toLocaleString('en-NG', { minimumFractionDigits: d, maximumFractionDigits: d }) : 'N/A'
  const fmtAUM  = (n) => n != null ? `₦${(n / 1_000_000).toFixed(2)}M` : 'N/A'

  return (
    <div>
      <SectionHeader
        title="NAV & Returns"
        subtitle="Enter actual Net Asset Value and return % per product per period. The client dashboard reads from these records instead of estimating."
        action={<ABtn onClick={openCreate}>+ Add Record</ABtn>}
      />

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 16px', color: '#ef4444', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: T.textMuted, display: 'flex', gap: 10 }}>
        <span style={{ color: G, fontSize: 16, flexShrink: 0 }}>ⓘ</span>
        <span>Records entered here are shown to clients as actual returns on their dashboard. When D365 is configured it will write here automatically with source = "d365".</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select value={filterProduct} onChange={e => { setFilterProduct(e.target.value); fetchRecords(e.target.value) }}
          style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.text, fontSize: 13, minWidth: 200 }}>
          <option value="">All Products</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => fetchRecords()} style={{ padding: '8px 16px', background: T.inputBg, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.textMuted, fontSize: 13, cursor: 'pointer' }}>↻ Refresh</button>
        <span style={{ color: T.textFaint, fontSize: 12 }}>{records.length} record{records.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.textFaint }}>Loading…</div>
      ) : records.length === 0 ? (
        <ACard style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ color: T.textFaint, fontSize: 14 }}>No NAV records yet.</div>
          <div style={{ color: '#333', fontSize: 12, marginTop: 6 }}>Add the first record to enable real return figures on the client dashboard.</div>
          <div style={{ marginTop: 16 }}><ABtn onClick={openCreate}>+ Add First Record</ABtn></div>
        </ACard>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                {['Product', 'Period', 'Start', 'End', 'NAV/Unit', 'Return %', 'Cumulative %', 'AUM', 'Source', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: T.textFaint, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #151515' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#111'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 12px', color: '#ddd' }}>{productName(r.product_id)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: 'rgba(184,134,11,0.15)', color: G, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>{r.period_label}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#888' }}>{fmtDate(r.period_start)}</td>
                  <td style={{ padding: '10px 12px', color: '#888' }}>{fmtDate(r.period_end)}</td>
                  <td style={{ padding: '10px 12px', color: T.text, fontWeight: 600 }}>{fmtNum(r.nav_per_unit, 4)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.return_pct != null
                      ? <span style={{ color: r.return_pct >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{r.return_pct >= 0 ? '+' : ''}{fmtNum(r.return_pct)}%</span>
                      : <span style={{ color: '#444' }}>N/A</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.cumulative_pct != null
                      ? <span style={{ color: '#a78bfa', fontWeight: 600 }}>{fmtNum(r.cumulative_pct)}%</span>
                      : <span style={{ color: '#444' }}>N/A</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: T.textMuted }}>{fmtAUM(r.total_aum)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: r.source === 'd365' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                      color: r.source === 'd365' ? '#60a5fa' : '#666' }}>
                      {(r.source || 'manual').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <ABtn small outline onClick={() => openEdit(r)}>Edit</ABtn>
                      <ABtn small danger onClick={() => handleDelete(r.id)}>Del</ABtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Edit NAV Record' : 'Add NAV Record'}</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14, background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 7 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>Product *</div>
                <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} disabled={!!editing}
                  style={{ width: '100%', padding: '9px 13px', background: T.inputBg, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.text, fontSize: 13 }}>
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>Period Label * <span style={{ color: '#444' }}>(e.g. Q1 2026, March 2026)</span></div>
                <AInput value={form.period_label} onChange={e => setForm(f => ({ ...f, period_label: e.target.value }))} placeholder="Q1 2026" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>Period Start *</div>
                <AInput type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>Period End *</div>
                <AInput type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>NAV per Unit <span style={{ color: '#444' }}>(e.g. 1.082)</span></div>
                <AInput type="number" value={form.nav_per_unit} onChange={e => setForm(f => ({ ...f, nav_per_unit: e.target.value }))} placeholder="1.0000" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>Return % <span style={{ color: '#444' }}>(this period)</span></div>
                <AInput type="number" value={form.return_pct} onChange={e => setForm(f => ({ ...f, return_pct: e.target.value }))} placeholder="8.20" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>Cumulative % <span style={{ color: '#444' }}>(since inception)</span></div>
                <AInput type="number" value={form.cumulative_pct} onChange={e => setForm(f => ({ ...f, cumulative_pct: e.target.value }))} placeholder="14.50" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>Total AUM (₦)</div>
                <AInput type="number" value={form.total_aum} onChange={e => setForm(f => ({ ...f, total_aum: e.target.value }))} placeholder="500000000" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, color: T.textDim, marginBottom: 6 }}>Notes (optional)</div>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Finance team notes for this period..." rows={3}
                  style={{ width: '100%', padding: '9px 13px', background: T.inputBg, border: `1px solid ${T.border2}`, borderRadius: 8, color: T.text, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <ABtn outline onClick={() => setShowForm(false)}>Cancel</ABtn>
              <ABtn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update Record' : 'Create Record'}</ABtn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPanel() {
  const {
    admin, adminLogout, isSuperAdmin, hasPermission,
    mustSetupMfa, adminMfaSetup, adminMfaVerify,
    mustChangePassword, resetStaffPassword, resetClientPassword, adminChangePassword,
    juniorAdmins, createJuniorAdmin, toggleJuniorAdmin, deleteJuniorAdmin, updateJuniorAdmin,
    staffRoles, createStaffRole, updateStaffRole, deleteStaffRole, assignStaffRole,
    workflows, myTasks, createWorkflow, updateWorkflow, deleteWorkflow,
    addWorkflowStep, updateWorkflowStep, deleteWorkflowStep, actOnTask, downloadKycPdf,
    portfolioHoldings, valuationHistory, fetchPortfolioHoldings, fetchValuationHistory,
    addHolding, redeemHolding, deleteHolding, submitPrices, runValuation,
    editHolding, downloadPriceTemplate, uploadPrices,
    instruments, fetchInstruments, renameInstrument,
    auditLog, addAuditLog,
    // Real data from backend
    clients, kycSubmissions, subscriptions, redemptions, announcements, certificates,
    // Fetchers
    fetchClients, fetchKyc, fetchSubscriptions, fetchRedemptions, fetchCertificates,
    fetchAuditLog, fetchJuniorAdmins, fetchStaffRoles, fetchWorkflows, fetchMyTasks, fetchAnnouncements,
    // Actions
    overrideKyc, activateSubscription, denySubscription, processRedemption,
    createCertificate, updateCertificate,
  } = useAdmin()
  const navigate = useNavigate()
  const [active, setActive] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [lightMode, setLightMode] = useState(false)
  const T = lightMode ? LIGHT : DARK
  const toggleTheme = () => setLightMode(m => !m)

  // Redirect if not logged in
  useEffect(() => {
    if (!admin) navigate('/admin/login')
  }, [admin])

  // Load all data on mount
  useEffect(() => {
    if (!admin) return
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([
        fetchKyc(),
        fetchSubscriptions(),
        fetchRedemptions(),
        fetchAuditLog(),
        fetchJuniorAdmins(),
        fetchStaffRoles(),
        fetchWorkflows(),
        fetchMyTasks(),
        fetchAnnouncements(),
        fetchCertificates(),
      ])
      setLoading(false)
    }
    loadAll()
  }, [admin])

  // Use kycSubmissions as kycData for backward compat with section components
  const kycData = kycSubmissions
  const setKycData = () => {}
  const setClients = () => {}      // no-op · data comes from backend now
  const setSubscriptions = () => {}
  const setRedemptions = () => {}
  const setAnnouncements = () => {}

  if (!admin) return null

  // 'dashboard' and 'mytasks' are always visible to any logged-in staff -
  // they're not part of the legacy section-permission list, and My Tasks
  // in particular is meaningless to gate since it's just "your own queue".
  const ALWAYS_VISIBLE = ['dashboard', 'mytasks', 'security']
  const visibleSections = isSuperAdmin
    ? SECTIONS
    : SECTIONS.filter(s => ALWAYS_VISIBLE.includes(s.id) || hasPermission(s.id))

  const renderSection = () => {
    switch (active) {
      case 'dashboard':     return <Dashboard clients={clients} subscriptions={subscriptions} kyc={kycData} redemptions={redemptions} />
      case 'products':      return <ProductsSection addAuditLog={addAuditLog} />
      case 'clients':       return <ClientsSection clients={clients} setClients={setClients} addAuditLog={addAuditLog} />
      case 'kyc':           return <KycSection kycData={kycData} setKycData={setKycData} addAuditLog={addAuditLog} />
      case 'subscriptions': return <SubscriptionsSection subscriptions={subscriptions} setSubscriptions={setSubscriptions} addAuditLog={addAuditLog} />
      case 'redemptions':   return <RedemptionsSection redemptions={redemptions} setRedemptions={setRedemptions} addAuditLog={addAuditLog} />
      case 'certificates':  return <CertificatesSection certificates={certificates} createCertificate={createCertificate} updateCertificate={updateCertificate} addAuditLog={addAuditLog} />
      case 'maturity':      return <MaturitySection subscriptions={subscriptions} />
      case 'nav':           return <NavSection />
      case 'payments':      return <PaymentAccountsSection addAuditLog={addAuditLog} />
      case 'fees':          return <FeesSection addAuditLog={addAuditLog} />
      case 'notifications': return <NotificationsSection addAuditLog={addAuditLog} />
      case 'announcements': return <AnnouncementsSection announcements={announcements} setAnnouncements={setAnnouncements} addAuditLog={addAuditLog} />
      case 'reports':       return <ReportsSection clients={clients} subscriptions={subscriptions} redemptions={redemptions} />
      case 'audit':         return <AuditSection auditLog={auditLog} />
      case 'settings':      return <SettingsSection addAuditLog={addAuditLog} />
      case 'systemalert':   return <SystemAlertSection />
      case 'admins':        return <AdminUsersSection juniorAdmins={juniorAdmins} createJuniorAdmin={createJuniorAdmin} toggleJuniorAdmin={toggleJuniorAdmin} deleteJuniorAdmin={deleteJuniorAdmin} updateJuniorAdmin={updateJuniorAdmin} staffRoles={staffRoles} assignStaffRole={assignStaffRole} resetStaffPassword={resetStaffPassword} addAuditLog={addAuditLog} />
      case 'roles':         return <RolesSection staffRoles={staffRoles} createStaffRole={createStaffRole} updateStaffRole={updateStaffRole} deleteStaffRole={deleteStaffRole} addAuditLog={addAuditLog} />
      case 'mytasks':       return <MyTasksSection myTasks={myTasks} actOnTask={actOnTask} downloadKycPdf={downloadKycPdf} />
      case 'workflows':     return <WorkflowConfigSection workflows={workflows} createWorkflow={createWorkflow} updateWorkflow={updateWorkflow} deleteWorkflow={deleteWorkflow} addWorkflowStep={addWorkflowStep} updateWorkflowStep={updateWorkflowStep} deleteWorkflowStep={deleteWorkflowStep} />
      case 'security':      return <SecuritySection admin={admin} adminMfaSetup={adminMfaSetup} adminMfaVerify={adminMfaVerify} adminChangePassword={adminChangePassword} mustChangePassword={mustChangePassword} />
      case 'portfolio':     return <PortfolioSection subscriptions={subscriptions} portfolioHoldings={portfolioHoldings} valuationHistory={valuationHistory} fetchPortfolioHoldings={fetchPortfolioHoldings} fetchValuationHistory={fetchValuationHistory} addHolding={addHolding} redeemHolding={redeemHolding} deleteHolding={deleteHolding} submitPrices={submitPrices} runValuation={runValuation} editHolding={editHolding} downloadPriceTemplate={downloadPriceTemplate} uploadPrices={uploadPrices} instruments={instruments} fetchInstruments={fetchInstruments} renameInstrument={renameInstrument} />
      default:              return <Dashboard clients={clients} subscriptions={subscriptions} kyc={kycData} redemptions={redemptions} />
    }
  }

  const pendingCount = (kycData || []).filter(k => k.status === 'pending').length + (subscriptions || []).filter(s => s.status === 'pending_review').length

  return (
    <ThemeCtx.Provider value={{ dark: !lightMode, T }}>
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 64, flexShrink: 0,
        background: T.sidebar, borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease', overflow: 'hidden',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/pci-logo.png" alt="Prime Capital & Investment Ltd"
            style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
          {sidebarOpen && <div>
            <div style={{ color: G, fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>Prime Capital</div>
            <div style={{ color: T.textFaint, fontSize: 10 }}>Admin Panel</div>
          </div>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
          {visibleSections.map(s => {
            const isActive = active === s.id
            const hasBadge = (s.id === 'kyc' || s.id === 'subscriptions') && pendingCount > 0
            return (
              <button key={s.id} onClick={() => setActive(s.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, marginBottom: 2, cursor: 'pointer',
                background: isActive ? T.navActive : 'transparent',
                border: isActive ? `1px solid ${T.navActiveBorder}` : '1px solid transparent',
                color: isActive ? G : T.navDefault, transition: 'all 0.15s',
                textAlign: 'left', position: 'relative',
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = T.navHover }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = T.navDefault }}>
                <span style={{ fontSize: 16, flexShrink: 0, fontFamily: 'monospace' }}>{s.icon}</span>
                {sidebarOpen && <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap' }}>{s.label}</span>}
                {sidebarOpen && hasBadge && (s.id === 'kyc') && (
                  <span style={{ marginLeft: 'auto', background: '#ef4444', color: T.text, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>
                    {kycData.filter(k => k.status === 'pending').length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User + logout */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: '12px 8px' }}>
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${G},#D4A017)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000', fontSize: 13, flexShrink: 0 }}>
                {(admin.full_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: T.text, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{admin.full_name}</div>
                <div style={{ color: G, fontSize: 10 }}>
                  {isSuperAdmin ? 'Super Admin' : (admin.staff_role?.name || 'Staff · no role assigned')}
                </div>
              </div>
            </div>
          )}
          <button onClick={() => { adminLogout(); navigate('/admin/login') }} style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, background: 'transparent',
            border: `1px solid ${T.border2}`, color: T.textDim, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>⏻</span>{sidebarOpen && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{ height: 56, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, background: T.header, position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 18, padding: 4 }}>☰</button>
          <span style={{ color: T.textDim, fontSize: 13 }}>Prime Capital & Investment Ltd</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {pendingCount > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 999, padding: '4px 12px', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
                {pendingCount} pending action{pendingCount > 1 ? 's' : ''}
              </div>
            )}
            <button onClick={toggleTheme} title="Toggle light/dark mode" style={{
              background: T.inputBg, border: `1px solid ${T.border2}`,
              borderRadius: 20, padding: '4px 14px', cursor: 'pointer',
              fontSize: 13, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {lightMode ? '🌙 Dark' : '☀️ Light'}
            </button>
            <div style={{ color: T.textFaint, fontSize: 12 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </header>

        {/* Temp password nudge · shown until they set their own */}
        {mustChangePassword && active !== 'security' && (
          <div style={{ margin: '0 28px', marginTop: 16, padding: '12px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
              🔑 You're using a temporary password. Please set your own now.
            </span>
            <ABtn small onClick={() => setActive('security')}>Change Password</ABtn>
          </div>
        )}

        {/* MFA setup nudge · mandatory for staff, shown until they enroll */}
        {mustSetupMfa && active !== 'security' && (
          <div style={{ margin: '0 28px', marginTop: 16, padding: '12px 18px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
              🔒 Two-factor authentication is required for staff accounts · please set it up now.
            </span>
            <ABtn small onClick={() => setActive('security')}>Set Up 2FA</ABtn>
          </div>
        )}

        {/* Page content */}
        <main style={{ flex: 1, padding: 28, overflowY: 'auto', background: T.bg }}>
          <SectionErrorBoundary>
            {renderSection()}
          </SectionErrorBoundary>
        </main>
      </div>
    </div>
    </ThemeCtx.Provider>
  )
}
