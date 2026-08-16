// src/context/SystemAlertContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Fetches the active system alert from the backend and provides it to the
// entire app so the banner can show on every page (client + admin).
// Also used by AdminPanel SystemAlertSection to update the alert.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const SystemAlertCtx = createContext(null)

export function SystemAlertProvider({ children }) {
  const [alert, setAlert] = useState({ active: false, message: '', severity: 'info' })
  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

  // Fetch on mount and every 60 seconds — no auth needed for public endpoint
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API}/system/alert`)
      if (res.ok) {
        const data = await res.json()
        setAlert({
          active:   data.active   ?? false,
          message:  data.message  ?? '',
          severity: data.severity ?? 'info',
        })
      }
    } catch { /* silently fail */ }
  }, [API])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  // Admin update helpers (used by SystemAlertSection inside AdminPanel)
  const updateAlert  = (patch) => setAlert(prev => ({ ...prev, ...patch }))
  const publishAlert = () => setAlert(prev => ({ ...prev, active: true }))
  const dismissAlert = () => setAlert(prev => ({ ...prev, active: false }))

  return (
    <SystemAlertCtx.Provider value={{ alert, updateAlert, publishAlert, dismissAlert, refresh }}>
      {children}
    </SystemAlertCtx.Provider>
  )
}

export const useSystemAlert = () => {
  const ctx = useContext(SystemAlertCtx)
  if (!ctx) throw new Error('useSystemAlert must be inside SystemAlertProvider')
  return ctx
}
