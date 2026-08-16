import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import NotificationBell from './NotificationBell'

// Shows the client's uploaded profile photo, falling back to their initial
// when they haven't set one. Used in both the desktop bar and mobile menu so
// the two can't drift apart.
function UserAvatar({ user, size = 32 }) {
  const initial = (user?.full_name || user?.name)?.charAt(0)?.toUpperCase() || '?'
  return (
    <div
      style={{
        width: size, height: size, flexShrink: 0, borderRadius: '50%', overflow: 'hidden',
        background: user?.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #A67C1A, #D4A017)',
      }}
      className="flex items-center justify-center">
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span className="text-white text-xs font-bold">{initial}</span>}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false) }
  const isActive = (path) => location.pathname === path

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/products', label: 'Products' },
    { path: '/quiz', label: 'Risk Assessment' },
  ]

  return (
    <nav style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)' }} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          {/* No background here: the logo has real transparency, so a white
              backing showed as a pale square in dark mode. */}
          <img src="/pci-logo.png" alt="Prime Capital & Investment Ltd" className="w-10 h-10 object-contain" />
          <div>
            <div style={{ color: '#A67C1A' }} className="font-bold text-base leading-tight font-serif">Prime Capital</div>
            <div className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>& Investment Ltd</div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map(({ path, label }) => (
            <Link key={path} to={path}
              style={{ color: isActive(path) ? '#A67C1A' : 'var(--text-secondary)' }}
              className="text-sm font-medium hover:text-yellow-600 transition-colors relative">
              {label}
              {isActive(path) && (
                <div className="absolute -bottom-5 left-0 right-0 h-0.5 rounded-full" style={{ background: '#A67C1A' }} />
              )}
            </Link>
          ))}
        </div>

        {/* Desktop Right */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle */}
          <button onClick={toggle}
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-input)' }}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:border-yellow-600 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {user ? (
            <>
              <NotificationBell />
              <Link to="/dashboard" style={{ color: '#A67C1A' }} className="text-sm font-semibold hover:underline">
                Dashboard
              </Link>
              <div style={{ border: '1px solid var(--border)' }} className="h-5 w-px" />
              <div className="flex items-center gap-2">
                <UserAvatar user={user} size={32} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {(user.full_name || user.name)?.split(' ')[0]}
                </span>
              </div>
              <button onClick={handleLogout}
                style={{ border: '1.5px solid var(--border)', color: 'var(--text-secondary)' }}
                className="px-3 py-2 rounded-xl text-xs font-medium hover:border-red-300 hover:text-red-500 transition-colors">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: 'var(--text-secondary)' }}
                className="text-sm font-medium hover:text-yellow-600 transition-colors">Sign In</Link>
              <Link to="/signup"
                style={{ background: 'linear-gradient(135deg, #A67C1A, #D4A017)', color: '#fff' }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile: theme + bell + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button onClick={toggle}
            style={{ border: '1px solid var(--border)', background: 'var(--bg-input)' }}
            className="w-9 h-9 rounded-xl flex items-center justify-center">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {user && <NotificationBell />}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}
          className="md:hidden px-6 py-5 flex flex-col gap-4">
          {navLinks.map(({ path, label }) => (
            <Link key={path} to={path} onClick={() => setMenuOpen(false)}
              style={{ color: isActive(path) ? '#A67C1A' : 'var(--text-secondary)' }}
              className="text-sm font-medium">{label}</Link>
          ))}
          <div style={{ borderTop: '1px solid var(--border)' }} className="pt-4">
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <UserAvatar user={user} size={32} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.full_name || user.name}</span>
                </div>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} style={{ color: '#A67C1A' }} className="text-sm font-medium">Dashboard</Link>
                <Link to="/kyc" onClick={() => setMenuOpen(false)} style={{ color: 'var(--text-secondary)' }} className="text-sm">KYC Verification</Link>
                <Link to="/settings" onClick={() => setMenuOpen(false)} style={{ color: 'var(--text-secondary)' }} className="text-sm">Account Settings</Link>
                <button onClick={handleLogout} className="text-sm text-left text-red-500">Sign Out</button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  style={{ border: '1.5px solid #A67C1A', color: '#A67C1A' }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center">Sign In</Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)}
                  style={{ background: 'linear-gradient(135deg, #A67C1A, #D4A017)', color: '#fff' }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
