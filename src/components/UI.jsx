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
      <RadialSpinner size={40} />
    </div>
  )
}

// ─── RADIAL SPINNER ───────────────────────────────────────────────────────────
// 12 tapered gold blades, each fading in turn to create a radiating,
// rotating look (matches the brand's loading reference art). Built from
// 12 static bars whose opacity cycles on a staggered delay, rather than a
// single spinning ring — reads as "radiating" rather than just "spinning".
// Works on both light and dark backgrounds: the lit blade uses the bright
// brand gold, the trailing blades fade toward transparent rather than
// toward a fixed grey, so it never clashes with either theme's background.
let _radialSpinnerStyleInjected = false
function ensureRadialSpinnerStyles() {
  if (_radialSpinnerStyleInjected || typeof document === 'undefined') return
  _radialSpinnerStyleInjected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes radial-spinner-fade {
      0%   { opacity: 1; }
      100% { opacity: 0.15; }
    }
    .radial-spinner-blade {
      animation: radial-spinner-fade 1s linear infinite;
      transform-origin: center;
    }
  `
  document.head.appendChild(style)
}

export function RadialSpinner({ size = 40, label }) {
  ensureRadialSpinnerStyles()
  const blades = Array.from({ length: 12 })
  const cx = 50, cy = 50
  const outerR = 44, innerR = 22
  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-label={label || 'Loading'}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 0 6px rgba(212,160,23,0.45))' }}>
        <defs>
          <linearGradient id="radial-spinner-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4A017" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
        </defs>
        {blades.map((_, i) => {
          const angle = (360 / blades.length) * i
          return (
            <rect
              key={i}
              className="radial-spinner-blade"
              x={cx - 3}
              y={cy - outerR}
              width={6}
              height={outerR - innerR}
              rx={3}
              fill="url(#radial-spinner-gold)"
              transform={`rotate(${angle} ${cx} ${cy})`}
              style={{ animationDelay: `${-(i * (1 / blades.length))}s` }}
            />
          )
        })}
      </svg>
      {label && (
        <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      )}
    </div>
  )
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
