// ─── SHARED UI COMPONENTS ─────────────────────────────────────────────────────

export function GoldButton({ children, onClick, outline, className = '', type = 'button', disabled, size = 'md' }) {
  const sizes = { sm: 'px-4 py-2 text-xs', md: 'px-6 py-3 text-sm', lg: 'px-8 py-4 text-base' }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={outline
        ? { border: '1.5px solid #B8860B', color: '#B8860B', background: 'transparent' }
        : { background: 'linear-gradient(135deg, #B8860B, #D4A017)', color: '#000' }}
      className={`${sizes[size]} rounded-xl font-semibold transition-all hover:opacity-85 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({ label, type = 'text', value, onChange, placeholder, accept, required, min }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        accept={accept}
        required={required}
        min={min}
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        className="w-full px-4 py-3 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-yellow-600 transition-colors"
      />
    </div>
  )
}

export function Select({ label, value, onChange, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <select
        value={value}
        onChange={onChange}
        required={required}
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-yellow-600 transition-colors"
      >
        {children}
      </select>
    </div>
  )
}

export function Card({ children, className = '', hover = false }) {
  return (
    <>
      {hover && (
        <style>{`
          .card-hover {
            background: var(--bg-card);
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          }
          .card-hover:hover {
            border-color: #B8860B;
            transform: translateY(-5px) scale(1.015);
            box-shadow: 0 16px 40px rgba(184,134,11,0.2), 0 4px 12px rgba(0,0,0,0.15);
          }
        `}</style>
      )}
      <div
        style={!hover ? {
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        } : undefined}
        className={`rounded-2xl ${hover ? 'card-hover' : ''} ${className}`}
      >
        {children}
      </div>
    </>
  )
}

export function Badge({ type }) {
  const configs = {
    Sharia: { bg: '#dcfce7', color: '#166534' },
    Conventional: { bg: '#dbeafe', color: '#1e40af' },
    'FX / Dollar': { bg: '#fef3c7', color: '#92400e' },
    Equity: { bg: '#ede9fe', color: '#5b21b6' },
    'Fixed Income': { bg: '#d1fae5', color: '#065f46' },
  }
  const c = configs[type] || { bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ background: c.bg, color: c.color }} className="text-xs font-semibold px-2.5 py-1 rounded-full">
      {type}
    </span>
  )
}

export function RiskBadge({ risk }) {
  const colors = {
    Conservative: { color: '#15803d' },
    Balanced: { color: '#b45309' },
    Aggressive: { color: '#dc2626' },
    Custom: { color: '#7c3aed' },
  }
  const c = colors[risk] || colors.Balanced
  return <span style={c} className="text-xs font-semibold">{risk}</span>
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}
        className="rounded-2xl w-full max-w-md p-6 relative shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 hover:opacity-60 transition-opacity" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-xl font-bold mb-5 font-serif" style={{ color: '#B8860B' }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingIndicator size={40} />
    </div>
  )
}

// ─── LOADING INDICATOR ────────────────────────────────────────────────────────
// A spinning hourglass paired with progressing dots ("Signing in.", "..", "...").
// Deliberately simple and high-contrast rather than subtle — a small radiating
// spinner tried earlier was too fine-grained to read as motion at button size.
// Both pieces use plain CSS transform/opacity keyframes (no JS animation loop,
// no injected global stylesheet) so they render reliably everywhere. Works on
// both light and dark backgrounds since it uses the brand gold, not theme-vs-
// background dependent colors.
let _loadingDotIndex = 0 // not used for animation timing; kept for potential future variants

export function LoadingIndicator({ size = 22, label = 'Signing in', showLabel = true }) {
  return (
    <span
      className="flex items-center justify-center gap-2"
      role="status"
      aria-label={label}
      style={{
        background: 'rgba(0,0,0,0.75)',
        borderRadius: 999,
        padding: '6px 16px',
      }}
    >
      <style>{`
        @keyframes hourglass-flip {
          0%   { transform: rotate(0deg); }
          45%  { transform: rotate(180deg); }
          55%  { transform: rotate(180deg); }
          100% { transform: rotate(360deg); }
        }
        .hourglass-spin {
          display: inline-block;
          animation: hourglass-flip 1.6s ease-in-out infinite;
        }
        @keyframes loading-dot-fade {
          0%, 20%  { opacity: 0; }
          50%      { opacity: 1; }
          100%     { opacity: 0; }
        }
        .loading-dot {
          animation: loading-dot-fade 1.4s ease-in-out infinite;
        }
        .loading-dot:nth-child(1) { animation-delay: 0s; }
        .loading-dot:nth-child(2) { animation-delay: 0.2s; }
        .loading-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      <span className="hourglass-spin" style={{ fontSize: size, lineHeight: 1 }}>⏳</span>
      {showLabel && (
        <span className="font-semibold" style={{ fontSize: Math.max(12, size * 0.6), color: '#F5D061' }}>
          {label}
          <span className="loading-dot" style={{ color: '#F5D061' }}>.</span>
          <span className="loading-dot" style={{ color: '#F5D061' }}>.</span>
          <span className="loading-dot" style={{ color: '#F5D061' }}>.</span>
        </span>
      )}
    </span>
  )
}

// Kept for compatibility with existing imports — now an alias for the new indicator.
export function RadialSpinner({ size = 40, label }) {
  return <LoadingIndicator size={size * 0.55} label={label || 'Loading'} showLabel={!!label} />
}

export function SuccessScreen({ title, message, onClose }) {
  return (
    <div className="text-center py-6">
      <div className="text-5xl mb-4">✅</div>
      <h4 className="text-lg font-bold mb-2" style={{ color: '#B8860B' }}>{title}</h4>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {onClose && <GoldButton onClick={onClose}>Close</GoldButton>}
    </div>
  )
}
