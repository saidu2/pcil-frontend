// src/context/AuthContext.jsx
// Fetches real data from the FastAPI backend.
// User profile, KYC status, subscriptions, and redemptions all come from the API.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const AuthContext = createContext()

// Attach token from sessionStorage to every outgoing request
api.interceptors.request.use(config => {
  const t = sessionStorage.getItem('pcil-token')
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

// Normalise backend snake_case to the camelCase the Dashboard/UI already uses
function normaliseUser(u) {
  return {
    id:               u.id,
    name:             u.full_name,
    full_name:        u.full_name,
    email:            u.email,
    phone:            u.phone || '',
    accountType:      u.account_type,
    kycStatus:        u.kyc_status,
    kycDeniedReason:  u.kyc_denied_reason || '',
    isActive:         u.is_active,
    isVerified:       u.is_verified,
    mfaEnabled:       u.mfa_enabled || false,  // NEW — needed for the Settings/MFA screen
    avatarUrl:        u.avatar_url || null,
    createdAt:        u.created_at,
  }
}

function normaliseSub(s) {
  return {
    id:           s.id,
    productId:    s.product_id,
    productName:  s.product_name || s.productName || 'Investment Product',
    amount:       s.amount,
    currency:     s.currency,
    reference:    s.reference,
    status:       s.status,
    receiptUrl:   s.receipt_url,
    activatedAt:  s.activated_at,
    maturityDate: s.maturity_date,
    submittedAt:  s.submitted_at,
  }
}

function normaliseRedemption(r) {
  return {
    id:           r.id,
    subscriptionId: r.subscription_id,
    productId:    r.product_id,
    productName:  r.product_name || 'Investment Product',
    amount:       r.amount,
    currency:     r.currency,
    reference:    r.reference,
    status:       r.status,
    penalty:      r.penalty,
    netAmount:    r.net_amount,
    isPremature:  r.is_premature,
    requestedAt:  r.requested_at,
    submittedAt:  r.requested_at, // alias for transaction list
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(() => sessionStorage.getItem('pcil-token') || null)
  const [subscriptions, setSubs]       = useState([])
  const [redemptions, setRedemptions]  = useState([])
  const [notifications, setNotifs]     = useState([])
  const [portfolios, setPortfolios]    = useState([])   // private portfolio holdings + valuation history
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [loading, setLoading]          = useState(!!sessionStorage.getItem('pcil-token'))

  // ── Fetch current user profile from backend ─────────────────────────────
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      const normalised = normaliseUser(data)
      setUser(normalised)
      return normalised
    } catch (err) {
      // Only log out on 401 — not on network errors or server hiccups
      if (err?.response?.status === 401) {
        setUser(null)
        setToken(null)
        sessionStorage.removeItem('pcil-token')
      }
      return null
    }
  }, [])

  // ── Fetch subscriptions ─────────────────────────────────────────────────
  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data } = await api.get('/subscriptions')
      const normalised = (data || []).map(normaliseSub)
      setSubs(normalised)
      return normalised
    } catch {
      setSubs([])
      return []
    }
  }, [])

  // ── Fetch redemptions ───────────────────────────────────────────────────
  const fetchRedemptions = useCallback(async () => {
    try {
      const { data } = await api.get('/redemptions')
      const normalised = (data || []).map(normaliseRedemption)
      setRedemptions(normalised)
      return normalised
    } catch {
      setRedemptions([])
      return []
    }
  }, [])

  // ── Fetch notifications ─────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications')
      setNotifs(data || [])
    } catch {
      setNotifs([])
    }
  }, [])

  // ── Fetch private portfolio holdings + valuation history ────────────────
  const fetchPortfolios = useCallback(async () => {
    try {
      const { data } = await api.get('/portfolio/my-holdings')
      setPortfolios(data || [])
      return data || []
    } catch {
      setPortfolios([])
      return []
    }
  }, [])

  // ── Refresh all client data ─────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchMe(), fetchSubscriptions(), fetchRedemptions(), fetchNotifications(), fetchPortfolios()])
  }, [fetchMe, fetchSubscriptions, fetchRedemptions, fetchNotifications, fetchPortfolios])

  // ── On mount only: restore session from sessionStorage ─────────────────
  useEffect(() => {
    const savedToken = sessionStorage.getItem('pcil-token')
    if (!savedToken) { setLoading(false); return }
    setLoading(true)
    refreshAll().finally(() => setLoading(false))
  }, [])

  // ── Poll notifications every 30s while logged in ─────────────────────────
  useEffect(() => {
    if (!token) return
    const id = setInterval(() => fetchNotifications(), 30_000)
    return () => clearInterval(id)
  }, [token, fetchNotifications])

  // ── Login ───────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })

    // MFA second step required — don't issue a real token yet
    if (data.mfa_required) {
      return { mfaRequired: true, mfaToken: data.mfa_token }
    }

    const t = data.access_token
    sessionStorage.setItem('pcil-token', t)
    setToken(t)
    setMustChangePassword(!!data.must_change_password)
    const me = await fetchMe()
    await Promise.all([fetchSubscriptions(), fetchRedemptions(), fetchNotifications(), fetchPortfolios()])
    return { user: me, mustChangePassword: !!data.must_change_password }
  }

  // ── MFA login verify (NEW in v11) ────────────────────────────────────────
  const loginMfaVerify = async (mfaToken, code) => {
    const { data } = await api.post('/auth/mfa/login-verify', {
      mfa_token: mfaToken,
      code,
    })
    const t = data.access_token
    sessionStorage.setItem('pcil-token', t)
    setToken(t)
    setMustChangePassword(!!data.must_change_password)
    const me = await fetchMe()
    await Promise.all([fetchSubscriptions(), fetchRedemptions(), fetchNotifications(), fetchPortfolios()])
    return { user: me, mustChangePassword: !!data.must_change_password }
  }

  // ── Forgot / reset password (NEW) ───────────────────────────────────────
  // Always resolves the same way whether or not the email exists, matching
  // the backend, so nobody can use this to discover who has an account.
  const forgotPassword = async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  }

  const resetPasswordWithToken = async (token, newPassword) => {
    const { data } = await api.post('/auth/reset-password', {
      token, new_password: newPassword,
    })
    return data
  }

  // ── Email verification (NEW) ────────────────────────────────────────────
  const verifyEmail = async (token) => {
    const { data } = await api.post('/auth/verify-email', { token })
    await fetchMe()   // refresh so isVerified updates immediately
    return data
  }

  const resendVerification = async () => {
    const { data } = await api.post('/auth/resend-verification')
    return data
  }

  // ── Avatar (NEW) ────────────────────────────────────────────────────────
  // Replaces the previous browser-only avatar, which never left the device
  // it was uploaded on. Stored server-side now, so it follows the client.
  const uploadAvatar = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/auth/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    setUser(normaliseUser(data))
    return data
  }

  const removeAvatar = async () => {
    const { data } = await api.delete('/auth/avatar')
    setUser(normaliseUser(data))
    return data
  }

  // ── MFA setup/verify/disable (NEW in v11 — client opt-in) ──────────────
  const mfaSetup = async () => {
    const { data } = await api.post('/auth/mfa/setup')
    return data // { secret, qr_code, otpauth_uri }
  }

  const mfaVerify = async (code) => {
    const { data } = await api.post('/auth/mfa/verify', { code })
    await fetchMe()
    return data
  }

  const mfaDisable = async (code) => {
    const { data } = await api.post('/auth/mfa/disable', { code })
    await fetchMe()
    return data
  }

  // ── Register ────────────────────────────────────────────────────────────
  const register = async ({ full_name, email, phone, password }) => {
    const { data } = await api.post('/auth/register', { full_name, email, phone, password })
    const t = data.access_token
    sessionStorage.setItem('pcil-token', t)
    setToken(t)
    setLoading(true)
    try {
      const me = await fetchMe()
      return { user: me, emailVerificationRequired: !!data.email_verification_required }
    } finally {
      setLoading(false)
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null)
    setToken(null)
    setSubs([])
    setRedemptions([])
    setNotifs([])
    setMustChangePassword(false)
    sessionStorage.removeItem('pcil-token')
  }

  // ── Change Password (NEW in v11 — forced temp-password flow) ───────────
  const changePassword = async (currentPassword, newPassword) => {
    const { data } = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    setMustChangePassword(false)
    return data
  }

  // ── Submit redemption ───────────────────────────────────────────────────
  // Two shapes: subscription-level (subscriptionId + amount, unchanged) or
  // equity-holding (holdingId + units, no amount — the real price is set
  // by admin later, at approval).
  const submitRedemption = async ({ subscriptionId, amount, holdingId, units, note }) => {
    const body = holdingId
      ? { subscription_id: subscriptionId, holding_id: holdingId, units, note: note || '' }
      : { subscription_id: subscriptionId, amount, note: note || '' }
    const { data } = await api.post('/redemptions', body)
    await fetchRedemptions()
    await fetchSubscriptions()
    return data
  }

  // ── Notifications ───────────────────────────────────────────────────────
  const markNotificationRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {}
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read)
    await Promise.all(unread.map(n => markNotificationRead(n.id)))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  // ── Submit KYC ──────────────────────────────────────────────────────────────
  const submitKyc = async (formData) => {
    // Step 1: Submit the JSON form data
    const { data } = await api.post('/kyc/submit', formData)

    // Step 2: Upload any documents found in extra_data or top-level
    // Documents are File objects stored in the payload under extra_data
    const docMap = {
      passportPhoto:   'passport_photo',
      idDocument:      'id_document',
      utilityBill:     'utility_bill',
      cacCertificate:  'cac_certificate',
      boardResolution: 'board_resolution',
      memorandum:      'memorandum',
      scumlCertificate: 'scuml_certificate',  // NEW — was collected on the corporate form but never had anywhere to go
      tinCertificate:   'tin_certificate',    // NEW — same as above
      directorSignature: 'board_resolution_director_signature',  // NEW
      secretarySignature: 'board_resolution_secretary_signature',  // NEW
      minorPassportPhoto: 'minor_passport_photo',      // NEW — Minor's own photo, distinct from guardian's
      minorBirthCertificate: 'minor_birth_certificate', // NEW
      jointPassportPhoto: 'joint_passport_photo',       // NEW — Joint partner's photo, distinct from primary applicant's
      jointIdDocument: 'joint_id_document',             // NEW
    }

    // Collect all File objects from the payload (they won't be in JSON, passed separately)
    // KYC.jsx passes files via window.__kycFiles set before calling submitKyc
    const files = window.__kycFiles || {}
    window.__kycFiles = null  // clear after use

    for (const [key, docType] of Object.entries(docMap)) {
      const file = files[key]
      if (file instanceof File) {
        try {
          const fd = new FormData()
          fd.append('file', file)
          await api.post(`/kyc/documents/upload?document_type=${docType}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        } catch (err) {
          console.warn(`Failed to upload ${key}:`, err.message)
          // Don't block submission if a document upload fails
        }
      }
    }

    // Per-signatory uploads (Corporate — Signatory A/B/C/D each have their
    // own passport photo + signature). NEW — these were collected on the
    // form (even marked required for Signatory A) but never sent anywhere.
    // KYC.jsx passes these as window.__kycFiles.signatories = [{photo, signature}, ...]
    const signatoryFiles = files.signatories || []
    for (let i = 0; i < signatoryFiles.length; i++) {
      const { photo, signature } = signatoryFiles[i] || {}
      if (photo instanceof File) {
        try {
          const fd = new FormData()
          fd.append('file', photo)
          await api.post(`/kyc/documents/upload?document_type=signatory_${i}_photo`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        } catch (err) {
          console.warn(`Failed to upload signatory ${i} photo:`, err.message)
        }
      }
      if (signature instanceof File) {
        try {
          const fd = new FormData()
          fd.append('file', signature)
          await api.post(`/kyc/documents/upload?document_type=signatory_${i}_signature`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        } catch (err) {
          console.warn(`Failed to upload signatory ${i} signature:`, err.message)
        }
      }
    }

    await fetchMe()
    return data
  }

  // ── Legacy shims (keep components working without changes) ──────────────
  // These were used by older mock code — map to real API calls
  const addNotification = () => {}           // backend sends these server-side
  const updateSubscription = () => fetchSubscriptions()
  const updateKycStatus = () => fetchMe()

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      mustChangePassword,
      subscriptions,
      redemptions,
      notifications,
      portfolios,
      unreadCount,
      // Actions
      login,
      register,
      logout,
      changePassword,
      loginMfaVerify,
      mfaSetup,
      mfaVerify,
      mfaDisable,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPasswordWithToken,
      uploadAvatar,
      removeAvatar,
      refreshAll,
      fetchSubscriptions,
      fetchRedemptions,
      fetchMe,
      fetchNotifications,
      fetchPortfolios,
      submitKyc,
      submitRedemption,
      markNotificationRead,
      markAllRead,
      // Legacy shims
      addNotification,
      updateSubscription,
      updateKycStatus,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
