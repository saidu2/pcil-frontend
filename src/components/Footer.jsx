import { Link } from 'react-router-dom'
import { COMPANY } from '../data/constants'

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }} className="px-6 py-14 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src="/pci-logo.png" alt="Prime Capital & Investment Ltd" className="w-11 h-11 object-contain rounded-xl" style={{ background: '#fff', padding: 2 }} />
              <div>
                <div style={{ color: '#B8860B' }} className="font-bold text-base font-serif">Prime Capital & Investment Ltd</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Licensed by SEC Nigeria</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
              Trusted Nigerian investment management firm offering conventional and Sharia-compliant investment products to retail, HNI, and institutional investors.
            </p>

            {/* Contact */}
            <div className="space-y-2">
              <a href={`mailto:${COMPANY.email}`} className="flex items-center gap-2 text-sm hover:text-yellow-600 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <span>✉️</span> {COMPANY.email}
              </a>
              <a href={`tel:${COMPANY.phone}`} className="flex items-center gap-2 text-sm hover:text-yellow-600 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <span>📞</span> {COMPANY.phone}
              </a>
              <a href={`https://wa.me/${COMPANY.whatsapp}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm hover:text-yellow-600 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <span>💬</span> WhatsApp: {COMPANY.phone}
              </a>
              <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="mt-0.5">📍</span>
                <span>{COMPANY.address}</span>
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-semibold text-sm mb-4" style={{ color: '#B8860B' }}>Products</h4>
            <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Link to="/products?cat=Fixed+Income" className="hover:text-yellow-600 transition-colors">Fixed Income</Link>
              <Link to="/products?cat=Equity" className="hover:text-yellow-600 transition-colors">Equity</Link>
              <Link to="/products?cat=FX+%2F+Dollar" className="hover:text-yellow-600 transition-colors">FX / Dollar</Link>
              <Link to="/products?cat=Sharia" className="hover:text-yellow-600 transition-colors">Sharia-Compliant</Link>
            </div>
          </div>

          {/* Investor */}
          <div>
            <h4 className="font-semibold text-sm mb-4" style={{ color: '#B8860B' }}>Investor</h4>
            <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Link to="/signup" className="hover:text-yellow-600 transition-colors">Open Account</Link>
              <Link to="/kyc" className="hover:text-yellow-600 transition-colors">KYC Verification</Link>
              <Link to="/quiz" className="hover:text-yellow-600 transition-colors">Risk Assessment</Link>
              <Link to="/dashboard" className="hover:text-yellow-600 transition-colors">My Dashboard</Link>
              <a href={`mailto:${COMPANY.email}`} className="hover:text-yellow-600 transition-colors">Contact Us</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid var(--border)' }} className="pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Prime Capital & Investment Ltd. All rights reserved.
          </p>
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Licensed & Regulated by the Securities & Exchange Commission (SEC) Nigeria. Capital at risk. Past performance is not indicative of future returns.
          </p>
          <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <a href="#" className="hover:text-yellow-600">Privacy Policy</a>
            <a href="#" className="hover:text-yellow-600">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
