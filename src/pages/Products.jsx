import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { subscribeToProduct, fetchProducts } from '../utils/api'
import { PAYMENT_ACCOUNTS, KYC_STATUS, SUB_STATUS } from '../data/constants'
import { Card, GoldButton, Badge, RiskBadge, Modal, Input } from '../components/UI'

// Categories are derived dynamically from active products

// ── Payment details card ───────────────────────────────────────────────────────
function PaymentDetails({ account }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(account.accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ background: 'rgba(184,134,11,0.06)', border: '1.5px solid rgba(184,134,11,0.3)' }} className="rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🏦</span>
        <span className="text-sm font-bold" style={{ color: '#B8860B' }}>Transfer Payment To:</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span style={{ color: 'var(--text-muted)' }}>Bank</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{account.bank}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--text-muted)' }}>Account Name</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{account.accountName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--text-muted)' }}>Account Number</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base font-mono" style={{ color: '#B8860B' }}>{account.accountNumber}</span>
            <button onClick={copy}
              style={{ background: copied ? '#dcfce7' : 'var(--bg-secondary)', border: '1px solid var(--border)', color: copied ? '#16a34a' : 'var(--text-muted)' }}
              className="text-xs px-2 py-1 rounded-lg transition-all">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--text-muted)' }}>Currency</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{account.currency}</span>
        </div>
      </div>
    </div>
  )
}

// ── Single product card ────────────────────────────────────────────────────────
function ProductCard({ product, onSubscribe, kycStatus }) {
  const [expanded, setExpanded] = useState(false)
  const canSubscribe = kycStatus === KYC_STATUS.APPROVED

  return (
    <Card hover className="p-6 flex flex-col">
      <div className="flex justify-between items-start mb-3">
        <Badge type={product.type === 'Sharia' ? 'Sharia' : product.category} />
        <RiskBadge risk={product.risk} />
      </div>

      <h3 className="text-base font-bold font-serif mb-2" style={{ color: 'var(--text-primary)' }}>{product.name}</h3>
      <p className="text-xs leading-relaxed mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>
        {expanded ? (product.description || "") : (product.description || "").slice(0, 100) + '…'}
        <button onClick={() => setExpanded(!expanded)} style={{ color: '#B8860B' }} className="ml-1 font-medium">
          {expanded ? 'less' : 'more'}
        </button>
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} className="rounded-xl p-3 text-center">
          <div className="text-xs font-bold" style={{ color: '#B8860B' }}>{product.roi}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Expected ROI</div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} className="rounded-xl p-3 text-center">
          <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{product.duration}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Duration</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Minimum Investment</div>
        <div className="text-sm font-bold" style={{ color: '#B8860B' }}>{product.minAmountDisplay}</div>
      </div>

      {expanded && (
        <div className="mb-5">
          <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Target Investors</div>
          <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{product.targetInvestors}</div>
          {product.features && (
            <ul className="space-y-1.5">
              {product.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#B8860B' }}>✓</span> {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <GoldButton onClick={() => onSubscribe(product)} className="w-full" outline={!canSubscribe}>
        {canSubscribe ? 'Subscribe' : 'Subscribe'}
      </GoldButton>
    </Card>
  )
}

// ── Subscribe modal ────────────────────────────────────────────────────────────
function SubscribeModal({ product, onClose, onSuccess }) {
  const { user } = useAuth()
  const kycStatus = user?.kycStatus
  const [modalStep, setModalStep] = useState('amount') // amount | upload | submitted
  const [amount, setAmount] = useState('')
  const [proof, setProof] = useState(null)
  const [loading, setLoading] = useState(false)
  const [subRef, setSubRef] = useState('')

  // ── Use product's assigned payment account, fall back to hardcoded list ────
  const paymentAccount = product?.payment_account
    ? {
        bank:          product.payment_account.bank,
        accountName:   product.payment_account.account_name,
        accountNumber: product.payment_account.account_number,
        currency:      product.payment_account.currency,
        label:         product.payment_account.label || '',
        instruction:   product.payment_account.instruction || 'Transfer your investment amount to the account below, then upload your payment receipt.',
      }
    : product?.currency === 'USD'
      ? PAYMENT_ACCOUNTS.find(a => a.currency === 'USD')
      : PAYMENT_ACCOUNTS.find(a => a.currency === 'NGN') || PAYMENT_ACCOUNTS[0]

  const doSubmit = async () => {
    setLoading(true)
    try {
      const result = await subscribeToProduct({
        productId: product.id,
        productName: product.name,
        amount,
        currency: product.currency,
        proofFile: proof,
      })
      setSubRef(result.subscription?.reference || '')
      onSuccess(result.subscription)
      setModalStep('submitted')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Submission failed. Please try again.'
      alert(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Gate: not logged in ───────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3">🔐</div>
        <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Sign in to subscribe</p>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>You need a Prime Capital account to invest.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/login" onClick={onClose}><GoldButton>Sign In</GoldButton></Link>
          <Link to="/signup" onClick={onClose}><GoldButton outline>Create Account</GoldButton></Link>
        </div>
      </div>
    )
  }

  // ── Gate: KYC not submitted ───────────────────────────────────────────────
  if (kycStatus === KYC_STATUS.NOT_SUBMITTED) {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3">📋</div>
        <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>KYC Required</p>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          You must complete identity verification (KYC) before you can subscribe to any investment product.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/kyc" onClick={onClose}><GoldButton>Complete KYC →</GoldButton></Link>
          <GoldButton outline onClick={onClose}>Browse Only</GoldButton>
        </div>
      </div>
    )
  }

  // ── Gate: KYC pending ─────────────────────────────────────────────────────
  if (kycStatus === KYC_STATUS.PENDING) {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3">⏳</div>
        <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>KYC Under Review</p>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Your KYC documents are being reviewed by our compliance team. You will be able to subscribe once approved.
        </p>
        <GoldButton outline onClick={onClose}>Close</GoldButton>
      </div>
    )
  }

  // ── Gate: KYC denied ──────────────────────────────────────────────────────
  if (kycStatus === KYC_STATUS.DENIED) {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3">❌</div>
        <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>KYC Verification Failed</p>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Your KYC was not approved. Please resubmit your documents to continue.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/kyc" onClick={onClose}><GoldButton>Resubmit KYC →</GoldButton></Link>
          <GoldButton outline onClick={onClose}>Close</GoldButton>
        </div>
      </div>
    )
  }

  // ── Step 1: Enter amount ──────────────────────────────────────────────────
  if (modalStep === 'amount') {
    return (
      <div className="space-y-4">
        {/* Product summary */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} className="rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div style={{ color: 'var(--text-muted)' }} className="text-xs">Product</div>
              <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{product.name}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)' }} className="text-xs">Expected ROI</div>
              <div className="font-bold text-xs" style={{ color: '#B8860B' }}>{product.roi}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)' }} className="text-xs">Minimum</div>
              <div className="font-bold text-xs" style={{ color: '#B8860B' }}>{product.minAmountDisplay}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)' }} className="text-xs">Duration</div>
              <div className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{product.duration}</div>
            </div>
          </div>
        </div>

        <Input
          label={`Investment Amount (${product.currency === 'USD' ? 'USD $' : '₦ NGN'})`}
          type="number"
          min={product.minAmount}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={`Minimum ${product.minAmountDisplay}`}
        />

        <GoldButton
          onClick={() => setModalStep('upload')}
          className="w-full"
          disabled={!amount || Number(amount) < product.minAmount}
        >
          Continue to Payment →
        </GoldButton>
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Min. amount: {product.minAmountDisplay}
        </p>
      </div>
    )
  }

  // ── Step 2: Payment + upload proof ───────────────────────────────────────
  if (modalStep === 'upload') {
    // No USD account configured — show a clear message instead of wrong account
    if (product.currency === 'USD' && !paymentAccount) {
      return (
        <div className="text-center py-4">
          <div className="text-4xl mb-3">💵</div>
          <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>USD Account Coming Soon</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            Our USD payment account is being set up. Please contact us directly to invest in this product.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="tel:08100276250"><GoldButton>Call Us</GoldButton></a>
            <GoldButton outline onClick={onClose}>Close</GoldButton>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Amount confirmation */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} className="rounded-xl p-3 flex justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>Investment Amount</span>
          <span className="font-bold" style={{ color: '#B8860B' }}>
            {product.currency === 'USD' ? 'USD ' : '₦'}{Number(amount).toLocaleString()}
          </span>
        </div>

        <PaymentDetails account={paymentAccount} />

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }} className="rounded-xl p-3">
          <p className="text-xs text-blue-800 font-medium mb-1">📌 Instructions:</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Transfer exactly <strong>{product.currency === 'USD' ? 'USD ' : '₦'}{Number(amount).toLocaleString()}</strong> to the account above</li>
            <li>Save your transfer receipt / screenshot</li>
            <li>Upload the receipt below and submit</li>
            <li>Our team will review and activate your investment</li>
          </ol>
        </div>

        <Input
          label="Upload Payment Receipt * (JPG, PNG or PDF)"
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={e => setProof(e.target.files[0])}
        />

        <div className="flex gap-3">
          <GoldButton outline onClick={() => setModalStep('amount')} className="flex-1">← Back</GoldButton>
          <GoldButton onClick={doSubmit} className="flex-1" disabled={!proof || loading}>
            {loading ? 'Submitting…' : 'Submit Subscription'}
          </GoldButton>
        </div>
      </div>
    )
  }

  // ── Step 3: Submitted — awaiting staff review via D365 ────────────────────
  if (modalStep === 'submitted') {
    return (
      <div className="text-center py-4">
        <div className="text-5xl mb-4">📨</div>
        <h4 className="text-lg font-bold font-serif mb-2" style={{ color: '#B8860B' }}>Subscription Submitted!</h4>
        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          Your payment receipt has been received for <strong>{product?.name}</strong>.
        </p>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Reference: <strong>{subRef}</strong></p>

        {/* What happens next */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} className="rounded-xl p-4 mt-4 text-left mb-5">
          <p className="text-xs font-semibold mb-3" style={{ color: '#B8860B' }}>What happens next?</p>
          <ol className="text-xs space-y-2 list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
            <li>Our operations team verifies your payment receipt</li>
            <li>Your subscription is reviewed and approved in our system</li>
            <li>You'll receive an email & in-app notification once activated</li>
            <li>Your dashboard will show the active investment</li>
          </ol>
        </div>

        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }} className="rounded-xl p-3 mb-5 text-left">
          <p className="text-xs" style={{ color: '#92400e' }}>
            ⏱ Review typically takes <strong>1–2 business days</strong>. You will be notified once your investment is activated.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link to="/dashboard" onClick={onClose}><GoldButton>View Dashboard</GoldButton></Link>
          <GoldButton outline onClick={onClose}>Browse More</GoldButton>
        </div>
      </div>
    )
  }

  return null
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Products() {
  const { user, updateSubscription, addNotification } = useAuth()
  const [filter, setFilter] = useState('All')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [products, setProducts] = useState([])
  // Derive categories dynamically from loaded products — must be after products state
  const dynamicCategories = ['All', ...Array.from(new Set((products || []).map(p =>
    p.product_type === 'Sharia' || p.type === 'Sharia' ? 'Sharia' : (p.product_category || p.category || 'Portfolio')
  ))).sort()]

  // Load products from backend on mount
  useEffect(() => {
    fetchProducts()
      .then(data => {
        const normalised = (Array.isArray(data) ? data : []).map(p => ({
          ...p,
          minAmount: p.min_amount ?? p.minAmount ?? 0,
          minAmountDisplay: p.min_amount_display ?? p.minAmountDisplay ?? '',
          roi: p.roi_display ?? p.roi ?? '',
          duration: p.duration ?? '',
          risk: p.risk_level ?? p.risk ?? '',
          targetInvestors: p.target_investors ?? p.targetInvestors ?? '',
          features: p.features ?? [],
          type: p.product_type ?? p.type ?? 'Conventional',
          category: p.category ?? 'General',
        }))
        setProducts(normalised)
      })
      .catch(() => setProducts([]))
  }, [])

  const kycStatus = user?.kycStatus || KYC_STATUS.NOT_SUBMITTED

  const handleSuccess = (subscription) => {
    updateSubscription(subscription)
    addNotification({
      type: 'sub_pending',
      title: 'Subscription Under Review ⏳',
      message: `Your subscription to ${subscription.productName} has been submitted. Our team will review your payment receipt and activate your investment shortly.`,
    })
  }

  const filtered = filter === 'All' ? products
    : filter === 'Sharia'
      ? products.filter(p => p.product_type === 'Sharia' || p.type === 'Sharia')
      : products.filter(p => (p.product_category || p.category) === filter)

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 80px)' }} className="py-12 px-6">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold font-serif mb-3" style={{ color: '#B8860B' }}>Investment Products</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Premium investment products · Conventional & Sharia-compliant · NGN & USD</p>
        </div>

        {/* KYC status notice */}
        {user && kycStatus !== KYC_STATUS.APPROVED && (
          <div style={{
            background: kycStatus === KYC_STATUS.PENDING ? '#eff6ff' : kycStatus === KYC_STATUS.DENIED ? '#fef2f2' : '#fef3c7',
            border: `1px solid ${kycStatus === KYC_STATUS.PENDING ? '#bfdbfe' : kycStatus === KYC_STATUS.DENIED ? '#fecaca' : '#fde68a'}`,
          }} className="rounded-2xl p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {kycStatus === KYC_STATUS.PENDING ? '⏳' : kycStatus === KYC_STATUS.DENIED ? '❌' : '⚠️'}
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: kycStatus === KYC_STATUS.PENDING ? '#1e40af' : kycStatus === KYC_STATUS.DENIED ? '#dc2626' : '#92400e' }}>
                  {kycStatus === KYC_STATUS.PENDING ? 'KYC Under Review | You can browse but cannot subscribe yet'
                    : kycStatus === KYC_STATUS.DENIED ? 'KYC Failed | Please resubmit your documents to invest'
                    : 'KYC Required | Verify your identity to start investing'}
                </p>
              </div>
            </div>
            <Link to="/kyc">
              <GoldButton size="sm">
                {kycStatus === KYC_STATUS.PENDING ? 'View Status' : kycStatus === KYC_STATUS.DENIED ? 'Resubmit KYC' : 'Complete KYC'}
              </GoldButton>
            </Link>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {dynamicCategories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={filter === cat
                ? { background: 'linear-gradient(135deg, #B8860B, #D4A017)', color: '#fff' }
                : { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-all hover:border-yellow-600">
              {cat}{cat !== 'All' && ` (${(cat === 'Sharia' ? products.filter(p => p.product_type === 'Sharia' || p.type === 'Sharia') : products.filter(p => (p.product_category || p.category) === cat)).length})`}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" style={{ alignItems: 'start' }}>
          {filtered.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onSubscribe={setSelectedProduct}
              kycStatus={kycStatus}
            />
          ))}
        </div>
      </div>

      {/* Subscribe Modal */}
      <Modal
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={`Subscribe | ${selectedProduct?.name || ''}`}
      >
        <SubscribeModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSuccess={handleSuccess}
        />
      </Modal>
    </div>
  )
}
