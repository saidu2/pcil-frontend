// src/utils/api.js
// Axios instance used by AuthContext and other client-side code.
// Default export is the axios instance (used by AuthContext interceptors).
// Named exports kept for backwards compatibility with Products.jsx, KYC.jsx etc.

import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach Bearer token to every request from sessionStorage
api.interceptors.request.use(config => {
  const t = sessionStorage.getItem('pcil-token')
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

export default api

// ── Named exports ─────────────────────────────────────────────────────────────

export const loginUser = async ({ email, password }) => {
  const res = await api.post('/auth/login', { email, password })
  return { success: true, ...res.data }
}

export const registerUser = async (data) => {
  const res = await api.post('/auth/register', data)
  return { success: true, ...res.data }
}

export const submitKYC = async (formData) => {
  const res = await api.post('/kyc', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return { success: true, ...res.data }
}

export const resubmitKYC = async (formData) => {
  const res = await api.post('/kyc/resubmit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return { success: true, ...res.data }
}

export const fetchProducts = async () => {
  const res = await api.get('/products')
  return res.data
}

export const subscribeToProduct = async ({ productId, amount, currency, proofFile }) => {
  const subRes = await api.post('/subscriptions', {
    product_id: String(productId),
    amount: Number(amount),
    currency: currency || 'NGN',
  })
  const sub = subRes.data
  if (proofFile) {
    const fd = new FormData()
    fd.append('file', proofFile)
    await api.post(`/subscriptions/${sub.id}/receipt`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }
  return { success: true, subscription: sub }
}

export const submitRedemption = async ({ subscriptionId, amount }) => {
  const res = await api.post('/redemptions', { subscription_id: subscriptionId, amount })
  return { success: true, ...res.data }
}

export const fetchPortfolio = async () => {
  const res = await api.get('/nav/my-portfolio')
  return res.data
}

export const fetchNotifications = async () => {
  const res = await api.get('/notifications')
  return { success: true, notifications: res.data }
}

export const markNotificationsRead = async () => {
  await api.patch('/notifications/read-all')
  return { success: true }
}
