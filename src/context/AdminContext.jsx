// src/context/AdminContext.jsx — wired to real FastAPI backend

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AdminContext = createContext()

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// ── Separate axios instance for admin — avoids conflicts with client api.js ──
const adminApi = axios.create({ baseURL: BASE_URL, withCredentials: true })

// Store admin token in module scope
let adminToken = null

// Attach token to every admin request
adminApi.interceptors.request.use(config => {
  const tok = adminToken || sessionStorage.getItem('pcil-admin-token')
  if (tok) {
    if (!adminToken) adminToken = tok   // re-hydrate after hot-reload
    config.headers.Authorization = `Bearer ${tok}`
  }
  return config
})

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mustSetupMfa, setMustSetupMfa] = useState(false)  // NEW — nudges staff to enroll
  const [mustChangePassword, setMustChangePassword] = useState(false)  // temp password in use

  // ── Data state ─────────────────────────────────────────────────────────────
  const [clients, setClients] = useState([])
  const [kycSubmissions, setKycSubmissions] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [products, setProducts] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [juniorAdmins, setJuniorAdmins] = useState([])
  const [staffRoles, setStaffRoles] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [myTasks, setMyTasks] = useState([])
  const [portfolioHoldings, setPortfolioHoldings] = useState([])   // holdings for the currently-selected portfolio
  const [valuationHistory, setValuationHistory] = useState([])     // history for the currently-selected portfolio
  const [instruments, setInstruments] = useState([])               // master list of tradeable instruments
  const [systemSettings, setSystemSettings] = useState({})
  const [companySettings, setCompanySettings] = useState({})

  // ── Restore session on page load ───────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      // Admin panel does NOT auto-restore session on load.
      // Admin must log in every time they visit /admin.
      // This avoids conflicts with the client refresh cookie.
      setLoading(false)
    }
    restore()
  }, [])


  // ── Login ──────────────────────────────────────────────────────────────────
  const adminLogin = async (email, password) => {
    try {
      const res = await adminApi.post('/auth/admin/login', { email, password })

      // MFA second step required — don't set a token yet, hand control
      // back to the login screen to collect the code.
      if (res.data.mfa_required) {
        return { success: true, mfaRequired: true, mfaToken: res.data.mfa_token }
      }

      adminToken = res.data.access_token
      sessionStorage.setItem('pcil-admin-token', adminToken)
      const me = await adminApi.get('/auth/admin/me')
      setAdmin(me.data)
      setMustSetupMfa(!!res.data.mfa_setup_required)
      setMustChangePassword(!!res.data.must_change_password)
      return { success: true }
    } catch (err) {
      adminToken = null
      const message = err.response?.status === 401
        ? 'Invalid email or password.'
        : err.response?.data?.detail || 'Login failed. Please try again.'
      return { success: false, error: message }
    }
  }

  // ── MFA second login step (NEW) ─────────────────────────────────────────
  const adminMfaLoginVerify = async (mfaToken, code) => {
    try {
      const res = await adminApi.post('/auth/admin/mfa/login-verify', { mfa_token: mfaToken, code })
      adminToken = res.data.access_token
      sessionStorage.setItem('pcil-admin-token', adminToken)
      const me = await adminApi.get('/auth/admin/me')
      setAdmin(me.data)
      setMustSetupMfa(false)  // if MFA is already enabled, setup is obviously done
      setMustChangePassword(!!res.data.must_change_password)
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.detail || 'Invalid code. Please try again.'
      return { success: false, error: message }
    }
  }

  // ── MFA setup/verify (NEW) — mandatory for staff, nudged via mustSetupMfa ──
  const adminMfaSetup = async () => {
    const res = await adminApi.post('/auth/admin/mfa/setup')
    return res.data  // { secret, qr_code, otpauth_uri }
  }

  const adminMfaVerify = async (code) => {
    const res = await adminApi.post('/auth/admin/mfa/verify', { code })
    const me = await adminApi.get('/auth/admin/me')
    setAdmin(me.data)
    setMustSetupMfa(false)
    return res.data
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  const adminLogout = async () => {
    try { await adminApi.post('/auth/logout') } catch {}
    adminToken = null
    sessionStorage.removeItem('pcil-admin-token')
    setAdmin(null)
    setMustSetupMfa(false)
    setMustChangePassword(false)
    setClients([]); setKycSubmissions([]); setSubscriptions([])
    setRedemptions([]); setAuditLog([]); setJuniorAdmins([]); setStaffRoles([])
    setWorkflows([]); setMyTasks([])
  }

  const isSuperAdmin = admin?.role === 'super_admin'
  // Maps sidebar section ids onto StaffRole permission flags. This MUST stay
  // in step with LEGACY_SECTION_TO_FLAG in app/api/v1/deps.py — the backend
  // is what actually enforces access, this only decides what to show. If the
  // two drift, a staff member either sees a section that errors when they
  // open it, or is hidden from one they're allowed to use.
  //
  // null means "any logged-in staff member", matching the backend.
  const SECTION_TO_FLAG = {
    dashboard:     null,
    mytasks:       null,
    security:      null,
    products:      'can_manage_products',
    clients:       'can_manage_clients',
    kyc:           'can_approve_kyc',
    subscriptions: 'can_manage_subscriptions',
    redemptions:   'can_manage_redemptions',
    certificates:  'can_manage_certificates',
    maturity:      'can_manage_maturity',
    payments:      'can_manage_payments',
    fees:          'can_manage_fees',
    notifications: 'can_manage_clients',
    announcements: 'can_manage_system_settings',
    reports:       'can_view_reports',
    audit:         'can_view_audit_log',
    settings:      'can_manage_system_settings',
    systemalert:   'can_manage_system_settings',
    nav:           'can_manage_nav',
    portfolio:     'can_manage_nav',
    admins:        'can_manage_staff_users',
    roles:         'can_configure_roles',
    workflows:     'can_configure_workflows',
  }

  const hasPermission = (section) => {
    if (!admin) return false
    if (admin.role === 'super_admin') return true

    const flag = SECTION_TO_FLAG[section]
    if (flag === null) return true          // open to any logged-in staff
    if (flag === undefined) return false    // unknown section, deny by default

    // staff_role is eager-loaded onto the admin profile by /auth/admin/me
    const role = admin.staff_role
    if (!role || role.is_active === false) return false
    return Boolean(role[flag])
  }

  // ── Data Fetchers ──────────────────────────────────────────────────────────

  const fetchKyc = useCallback(async () => {
    try {
      // Fetch all clients (includes not_submitted users)
      const clientsRes = await adminApi.get('/admin/clients')
      setClients(clientsRes.data)

      // Fetch full KYC details (includes extra_data, documents, all fields)
      const kycRes = await adminApi.get('/admin/kyc')

      // Merge: start with all clients, overlay full KYC data where available
      const kycMap = {}
      kycRes.data.forEach(k => { kycMap[String(k.user_id)] = k })

      const merged = clientsRes.data.map(c => {
        const fullKyc = kycMap[String(c.id) || String(c.user_id)]
        if (fullKyc) return { ...c, ...fullKyc, id: c.id, user_id: c.id }
        return c
      })
      setKycSubmissions(merged)
    } catch (err) {
      console.error('fetchKyc failed:', err.response?.status, err.response?.data)
    }
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/clients')
      setClients(res.data)
      // Populate kycSubmissions so KYC section shows all users
      setKycSubmissions(res.data)
    } catch (err) {
      console.error('fetchClients failed:', err.response?.status)
    }
  }, [])

  const fetchSubscriptions = useCallback(async (statusFilter = null) => {
    try {
      const url = statusFilter ? `/admin/subscriptions?status_filter=${statusFilter}` : '/admin/subscriptions'
      const res = await adminApi.get(url)
      setSubscriptions(res.data)
    } catch (err) {
      console.error('fetchSubscriptions failed:', err.response?.status)
    }
  }, [])

  const fetchRedemptions = useCallback(async (statusFilter = null) => {
    try {
      const url = statusFilter ? `/admin/redemptions?status_filter=${statusFilter}` : '/admin/redemptions'
      const res = await adminApi.get(url)
      setRedemptions(res.data)
    } catch (err) {
      console.error('fetchRedemptions failed:', err.response?.status)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/products')
      setProducts(res.data)
    } catch (err) {
      console.error('fetchProducts failed:', err.response?.status)
    }
  }, [])

  const fetchAuditLog = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/audit-log')
      setAuditLog(res.data)
    } catch (err) {
      console.error('fetchAuditLog failed:', err.response?.status)
    }
  }, [])

  const fetchJuniorAdmins = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/users')
      setJuniorAdmins(res.data)
    } catch (err) {
      console.error('fetchJuniorAdmins failed:', err.response?.status)
    }
  }, [])

  const fetchStaffRoles = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/staff-roles')
      setStaffRoles(res.data)
    } catch (err) {
      console.error('fetchStaffRoles failed:', err.response?.status)
    }
  }, [])

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/workflows')
      setWorkflows(res.data)
    } catch (err) {
      console.error('fetchWorkflows failed:', err.response?.status)
    }
  }, [])

  const fetchMyTasks = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/workflows/instances/my-tasks')
      setMyTasks(res.data)
    } catch (err) {
      console.error('fetchMyTasks failed:', err.response?.status)
    }
  }, [])

  // ── Private Portfolio (NEW) ─────────────────────────────────────────────
  const fetchPortfolioHoldings = useCallback(async (subscriptionId) => {
    try {
      const res = await adminApi.get(`/admin/portfolio/subscriptions/${subscriptionId}/holdings`)
      setPortfolioHoldings(res.data)
    } catch (err) {
      console.error('fetchPortfolioHoldings failed:', err.response?.status)
    }
  }, [])

  const fetchValuationHistory = useCallback(async (subscriptionId) => {
    try {
      const res = await adminApi.get(`/admin/portfolio/subscriptions/${subscriptionId}/valuations`)
      setValuationHistory(res.data)
    } catch (err) {
      console.error('fetchValuationHistory failed:', err.response?.status)
    }
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await adminApi.get('/system/announcements')
      setAnnouncements(res.data)
    } catch (err) {
      console.error('fetchAnnouncements failed:', err.response?.status)
    }
  }, [])

  const fetchSystemSettings = useCallback(async () => {
    try {
      const res = await adminApi.get('/system/alert')
      setSystemSettings(res.data)
    } catch (err) {
      console.error('fetchSystemSettings failed:', err.response?.status)
    }
  }, [])

  // Separate from fetchSystemSettings above, which only reads the public
  // alert banner state. This reads the full company settings record,
  // including client dashboard visibility controls.
  const fetchCompanySettings = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/settings/company')
      setCompanySettings(res.data)
      return res.data
    } catch (err) {
      console.error('fetchCompanySettings failed:', err.response?.status)
      return null
    }
  }, [])


  // ── Poll KYC + subscriptions every 30s while admin is logged in ────────────
  useEffect(() => {
    if (!admin) return
    const id = setInterval(() => {
      fetchKyc()
      fetchSubscriptions()
      fetchRedemptions()
      fetchMyTasks()
    }, 30_000)
    return () => clearInterval(id)
  }, [admin, fetchKyc, fetchSubscriptions, fetchRedemptions, fetchMyTasks])

  // ── KYC Actions ────────────────────────────────────────────────────────────
  const overrideKyc = async (kycId, action, reason = '') => {
    await adminApi.patch(`/admin/kyc/${kycId}/override`, { status: action, reason })
    await fetchKyc()
  }

  // ── Subscription Actions ───────────────────────────────────────────────────
  const activateSubscription = async (subId, maturityDate) => {
    await adminApi.patch(`/admin/subscriptions/${subId}/action`, {
      action: 'activate',
      maturity_date: maturityDate,
    })
    await fetchSubscriptions()
  }

  const denySubscription = async (subId, reason) => {
    await adminApi.patch(`/admin/subscriptions/${subId}/action`, {
      action: 'deny',
      reason: reason,
    })
    await fetchSubscriptions()
  }

  // ── Redemption Actions ─────────────────────────────────────────────────────
  // salePrice: only used (and required by the backend) when completing an
  // equity-holding redemption — the real price the sale executed at.
  const processRedemption = async (redemptionId, action, note = '', salePrice = null) => {
    const params = { action, note }
    if (salePrice != null) params.sale_price = salePrice
    await adminApi.patch(`/admin/redemptions/${redemptionId}/process`, null, { params })
    await fetchRedemptions()
  }

  // ── Product Actions ────────────────────────────────────────────────────────
  const createProduct = async (data) => {
    await adminApi.post('/admin/products', data)
    await fetchProducts()
  }

  const updateProduct = async (id, data) => {
    await adminApi.patch(`/admin/products/${id}`, data)
    await fetchProducts()
  }

  const deleteProduct = async (id) => {
    await adminApi.delete(`/admin/products/${id}`)
    await fetchProducts()
  }

  // ── Notification / Announcement Actions ───────────────────────────────────
  const sendNotification = async (data) => {
    await adminApi.post('/admin/notifications/send', data)
  }

  const createAnnouncement = async (data) => {
    await adminApi.post('/admin/announcements', data)
    await fetchAnnouncements()
  }

  const toggleAnnouncement = async (id) => {
    await adminApi.patch(`/admin/announcements/${id}`)
    await fetchAnnouncements()
  }

  // ── Settings Actions ───────────────────────────────────────────────────────
  const updateAlertBanner = async (data) => {
    await adminApi.patch('/admin/settings/alert', data)
    await fetchSystemSettings()
  }

  const updateCompanySettings = async (data) => {
    await adminApi.patch('/admin/settings/company', data)
    await fetchCompanySettings()
  }

  const updateFeeConfig = async (data) => {
    await adminApi.patch('/admin/settings/fees', data)
  }

  // ── Junior Admin Actions ───────────────────────────────────────────────────
  const createJuniorAdmin = async (data) => {
    await adminApi.post('/admin/users', data)
    await fetchJuniorAdmins()
  }

  const updateJuniorAdmin = async (id, data) => {
    await adminApi.patch(`/admin/users/${id}`, data)
    await fetchJuniorAdmins()
  }

  const toggleJuniorAdmin = async (id, currentlyActive) => {
    await adminApi.patch(`/admin/users/${id}`, { is_active: !currentlyActive })
    await fetchJuniorAdmins()
  }

  const deleteJuniorAdmin = async (id) => {
    await adminApi.delete(`/admin/users/${id}`)
    await fetchJuniorAdmins()
  }

  // ── Password management (NEW) ───────────────────────────────────────────
  // Returns { temp_password, ... } which is shown ONCE — it's hashed
  // server-side immediately and cannot be retrieved again.
  const resetStaffPassword = async (adminId, newPassword = null) => {
    const res = await adminApi.patch(`/admin/users/${adminId}/reset-password`, {
      new_password: newPassword || null,
    })
    await fetchJuniorAdmins()
    return res.data
  }

  const resetClientPassword = async (userId, newPassword = null) => {
    const res = await adminApi.patch(`/admin/clients/${userId}/reset-password`, {
      new_password: newPassword || null,
    })
    await fetchClients()
    return res.data
  }

  // Staff changing their own password. Clears any forced-change flag.
  const adminChangePassword = async (currentPassword, newPassword) => {
    const res = await adminApi.post('/auth/admin/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    setMustChangePassword(false)
    return res.data
  }

  // ── Staff Role Actions (NEW in v11) ────────────────────────────────────────
  const createStaffRole = async (data) => {
    await adminApi.post('/admin/staff-roles', data)
    await fetchStaffRoles()
  }

  const updateStaffRole = async (id, data) => {
    await adminApi.patch(`/admin/staff-roles/${id}`, data)
    await fetchStaffRoles()
  }

  const deleteStaffRole = async (id) => {
    await adminApi.delete(`/admin/staff-roles/${id}`)
    await fetchStaffRoles()
    await fetchJuniorAdmins() // any staff who had this role now show as unassigned
  }

  const assignStaffRole = async (adminId, staffRoleId) => {
    await adminApi.patch(`/admin/users/${adminId}/role`, { staff_role_id: staffRoleId })
    await fetchJuniorAdmins()
  }

  // ── Client Account Creation (NEW in v11) ───────────────────────────────────
  const createClient = async (data) => {
    // Returns { id, full_name, email, temp_password, message } — temp_password
    // is only ever visible in this response, caller must show/copy it now.
    const res = await adminApi.post('/admin/clients', data)
    await fetchClients()
    return res.data
  }

  // ── Workflow Configuration (NEW in v11) ────────────────────────────────────
  const createWorkflow = async (data) => {
    await adminApi.post('/admin/workflows', data)
    await fetchWorkflows()
  }

  const updateWorkflow = async (id, data) => {
    await adminApi.patch(`/admin/workflows/${id}`, data)
    await fetchWorkflows()
  }

  const deleteWorkflow = async (id) => {
    await adminApi.delete(`/admin/workflows/${id}`)
    await fetchWorkflows()
  }

  const addWorkflowStep = async (workflowId, data) => {
    await adminApi.post(`/admin/workflows/${workflowId}/steps`, data)
    await fetchWorkflows()
  }

  const updateWorkflowStep = async (workflowId, stepId, data) => {
    await adminApi.patch(`/admin/workflows/${workflowId}/steps/${stepId}`, data)
    await fetchWorkflows()
  }

  const deleteWorkflowStep = async (workflowId, stepId) => {
    await adminApi.delete(`/admin/workflows/${workflowId}/steps/${stepId}`)
    await fetchWorkflows()
  }

  // ── My Tasks — act on a workflow instance (NEW in v11) ─────────────────────
  const actOnTask = async (instanceId, action, note = '') => {
    await adminApi.patch(`/admin/workflows/instances/${instanceId}/action`, { action, note })
    await fetchMyTasks()
  }

  // Fetches a KYC document through an authenticated request and returns a
  // temporary in-browser blob URL. The real storage location is never exposed,
  // which is what lets identity documents live in a private bucket.
  const viewKycDocument = async (kycId, docType) => {
    const res = await adminApi.get(`/admin/kyc/${kycId}/document`, {
      params: { doc_type: docType },
      responseType: 'blob',
    })
    return window.URL.createObjectURL(res.data)
  }

  // ── KYC PDF export — for D365 onboarding (NEW in v11) ──────────────────────
  const downloadKycPdf = async (kycId, clientName = 'client') => {
    const response = await adminApi.get(`/admin/kyc/${kycId}/export-pdf`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `KYC_${clientName.replace(/\s+/g, '_')}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  // ── Private Portfolio Actions (NEW) ─────────────────────────────────────
  const addHolding = async (subscriptionId, data) => {
    await adminApi.post(`/admin/portfolio/subscriptions/${subscriptionId}/holdings`, data)
    await fetchPortfolioHoldings(subscriptionId)
  }

  const redeemHolding = async (holdingId, subscriptionId, data) => {
    await adminApi.patch(`/admin/portfolio/holdings/${holdingId}/redeem`, data)
    await fetchPortfolioHoldings(subscriptionId)
  }

  const editHolding = async (holdingId, subscriptionId, data) => {
    await adminApi.patch(`/admin/portfolio/holdings/${holdingId}`, data)
    await fetchPortfolioHoldings(subscriptionId)
  }

  // ── Instruments master list (NEW) ───────────────────────────────────────
  const fetchInstruments = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/portfolio/instruments')
      setInstruments(res.data)
      return res.data
    } catch (err) {
      console.error('fetchInstruments failed:', err.response?.status)
      return []
    }
  }, [])

  const renameInstrument = async (oldName, newName) => {
    const res = await adminApi.patch('/admin/portfolio/instruments/rename', {
      old_name: oldName, new_name: newName,
    })
    await fetchInstruments()
    return res.data
  }

  const downloadPriceTemplate = async () => {
    const response = await adminApi.get('/admin/portfolio/prices/template', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'closing_prices_template.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  // confirm=false previews (parsed/matched/unmatched/skipped) without saving
  const uploadPrices = async (file, priceDate, confirm = false) => {
    const fd = new FormData()
    fd.append('file', file)
    const params = new URLSearchParams({ confirm: String(confirm) })
    if (priceDate) params.append('price_date', priceDate)
    const res = await adminApi.post(`/admin/portfolio/prices/upload?${params}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  // confirm=false returns a preview (matched/unmatched instrument names)
  // without saving anything — call again with confirm=true to actually save.
  const submitPrices = async (entries, priceDate, confirm = false) => {
    const res = await adminApi.post(
      `/admin/portfolio/prices/batch?confirm=${confirm}`,
      { entries, price_date: priceDate }
    )
    return res.data
  }

  const runValuation = async (subscriptionIds = null, valuationDate = null) => {
    const res = await adminApi.post('/admin/portfolio/run-valuation', {
      subscription_ids: subscriptionIds,
      valuation_date: valuationDate,
    })
    return res.data
  }

  // ── Export Report ──────────────────────────────────────────────────────────
  const exportReport = async (type) => {
    const response = await adminApi.get(`/admin/reports/export?type=${type}`, {
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `pcil_${type}_report.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  // Backward-compat stub — audit log is now written server-side automatically
  const addAuditLog = () => {}

  if (loading) return null

  return (
    <AdminContext.Provider value={{
      // Auth
      admin, adminLogin, adminLogout, isSuperAdmin, hasPermission,
      mustSetupMfa, adminMfaLoginVerify, adminMfaSetup, adminMfaVerify,
      mustChangePassword, resetStaffPassword, resetClientPassword, adminChangePassword,

      // Data
      clients, kycSubmissions, subscriptions, redemptions,
      products, announcements, auditLog, juniorAdmins, staffRoles,
      workflows, myTasks, systemSettings, companySettings,
      portfolioHoldings, valuationHistory, instruments,

      // Fetchers
      fetchClients, fetchKyc, fetchSubscriptions, fetchRedemptions,
      fetchProducts, fetchAuditLog, fetchJuniorAdmins, fetchStaffRoles,
      fetchWorkflows, fetchMyTasks,
      fetchPortfolioHoldings, fetchValuationHistory,
      fetchAnnouncements, fetchSystemSettings, fetchCompanySettings,

      // KYC
      overrideKyc,

      // Subscriptions
      activateSubscription, denySubscription,

      // Redemptions
      processRedemption,

      // Products
      createProduct, updateProduct, deleteProduct,

      // Notifications & Announcements
      sendNotification, createAnnouncement, toggleAnnouncement,

      // Settings
      updateAlertBanner, updateCompanySettings, updateFeeConfig,

      // Admin users
      createJuniorAdmin, updateJuniorAdmin, toggleJuniorAdmin, deleteJuniorAdmin,

      // Staff roles (NEW in v11)
      createStaffRole, updateStaffRole, deleteStaffRole, assignStaffRole,

      // Client creation (NEW in v11)
      createClient,

      // Workflows (NEW in v11)
      createWorkflow, updateWorkflow, deleteWorkflow,
      addWorkflowStep, updateWorkflowStep, deleteWorkflowStep, actOnTask, downloadKycPdf, viewKycDocument,
      addHolding, redeemHolding, submitPrices, runValuation,
      editHolding, downloadPriceTemplate, uploadPrices,
      fetchInstruments, renameInstrument,

      // Audit (compat)
      addAuditLog,

      // Reports
      exportReport,
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => useContext(AdminContext)
