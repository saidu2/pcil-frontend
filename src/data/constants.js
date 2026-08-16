// ─── PRIME CAPITAL & INVESTMENT LTD ──────────────────────────────────────────
// Hardcoded company details. Update here when anything changes.

export const COMPANY = {
  name: 'Prime Capital & Investment Ltd',
  shortName: 'Prime Capital',
  email: 'info@primecapital.ng',
  phone: '08100276250',
  whatsapp: '2348100276250', // international format for wa.me link
  address: 'No. 3 Sankuru Close, Off Rima Street, Maitama, Abuja',
  city: 'Abuja, Nigeria',
  regulator: 'Securities & Exchange Commission (SEC) Nigeria',
  website: 'www.primecapital.ng',
}

// ─── PAYMENT / CUSTODIAN BANK DETAILS ────────────────────────────────────────
// Shown to clients during subscription. Update here if account details change.

export const PAYMENT_ACCOUNTS = [
  {
    id: 'zenith-ngn',
    bank: 'Zenith Bank',
    accountName: 'Prime Capital & Investment Ltd',
    accountNumber: '2019283746',
    currency: 'NGN',
    label: 'Naira (₦) Investments',
    instruction: 'Transfer your investment amount to the account below, then upload your payment receipt.',
  },
  // Add USD account here when available:
  // {
  //   id: 'zenith-usd',
  //   bank: 'Zenith Bank',
  //   accountName: 'Prime Capital & Investment Ltd',
  //   accountNumber: 'XXXXXXXXXX',
  //   currency: 'USD',
  //   label: 'Dollar ($) Investments',
  //   instruction: 'Transfer your USD investment to the account below, then upload your payment receipt.',
  // },
]

// ─── KYC STATUS CONSTANTS ─────────────────────────────────────────────────────
export const KYC_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
}

// ─── SUBSCRIPTION STATUS CONSTANTS ───────────────────────────────────────────
export const SUB_STATUS = {
  PENDING_PAYMENT: 'pending_payment',       // Awaiting client proof of payment
  PENDING_REVIEW: 'pending_review',         // Proof uploaded, staff reviewing
  ACTIVE: 'active',                         // Approved & active investment
  DENIED: 'denied',                         // Subscription denied by staff
  MATURED: 'matured',                       // Investment tenure completed
  REDEEMED: 'redeemed',                     // Client redeemed
}

// ─── D365 WEBHOOK EVENTS (for future integration) ─────────────────────────────
// When D365 is ready, it will POST these event types to your backend:
// { event: 'KYC_APPROVED', userId: '...', timestamp: '...' }
// { event: 'KYC_DENIED',   userId: '...', reason: '...', timestamp: '...' }
// { event: 'SUB_APPROVED', subscriptionId: '...', userId: '...', timestamp: '...' }
// { event: 'SUB_DENIED',   subscriptionId: '...', reason: '...', timestamp: '...' }
export const D365_EVENTS = {
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_DENIED: 'KYC_DENIED',
  SUB_APPROVED: 'SUB_APPROVED',
  SUB_DENIED: 'SUB_DENIED',
}
