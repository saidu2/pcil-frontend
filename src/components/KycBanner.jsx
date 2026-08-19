import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { KYC_STATUS } from '../data/constants'

export default function KycBanner() {
  const { user } = useAuth()
  if (!user) return null

  const { kycStatus, kycDeniedReason } = user

  if (kycStatus === KYC_STATUS.NOT_SUBMITTED) {
    return (
      <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a' }} className="px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <p className="text-sm font-medium text-amber-800">
              Your identity has not been verified. Complete KYC to start investing.
            </p>
          </div>
          <Link to="/kyc"
            style={{ background: '#B8860B', color: '#fff' }}
            className="text-xs font-semibold px-4 py-2 rounded-lg whitespace-nowrap hover:opacity-90 transition-opacity self-start sm:self-auto">
            Complete KYC →
          </Link>
        </div>
      </div>
    )
  }

  if (kycStatus === KYC_STATUS.PENDING) {
    return (
      <div style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }} className="px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <span className="animate-spin text-sm">⏳</span>
          <p className="text-sm text-blue-800">
            <span className="font-semibold">KYC Under Review</span>: Our team is verifying your documents. This takes less than 24 hours. You can browse products but cannot subscribe yet.
          </p>
        </div>
      </div>
    )
  }

  if (kycStatus === KYC_STATUS.DENIED) {
    return (
      <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }} className="px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <span>❌</span>
            <div>
              <p className="text-sm font-semibold text-red-800">KYC Verification Failed</p>
              {kycDeniedReason && <p className="text-xs text-red-700 mt-0.5">Reason: {kycDeniedReason}</p>}
            </div>
          </div>
          <Link to="/kyc"
            style={{ background: '#dc2626', color: '#fff' }}
            className="text-xs font-semibold px-4 py-2 rounded-lg whitespace-nowrap hover:opacity-90 self-start sm:self-auto">
            Resubmit KYC →
          </Link>
        </div>
      </div>
    )
  }

  if (kycStatus === KYC_STATUS.APPROVED) {
    return null // No banner needed
  }

  return null
}
