import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import axonLogo from '../assets/axon-logo.png'

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#eef2f7' }}>
      <div className="w-full max-w-sm px-4">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={axonLogo} alt="Axon" style={{ height: 72, objectFit: 'contain' }} />
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: 32,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0'
        }}>
          {sent ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>📬</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
                Check your inbox
              </h2>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>
                If <strong>{email}</strong> is registered, you will receive a
                password reset link shortly. The link expires in 15 minutes.
              </p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 20px' }}>
                Didn't receive it? Check your spam folder or try again.
              </p>
              <Link to="/login" style={{
                display: 'inline-block', fontSize: 14, fontWeight: 600,
                color: '#1d6ec6', textDecoration: 'none'
              }}>
                &larr; Back to Login
              </Link>
            </div>
          ) : (
            /* ── Request form ── */
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                  Forgot password?
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Enter your office email and we'll send a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Email address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }}>✉</span>
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%', height: 44, paddingLeft: 34, paddingRight: 14,
                        borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc',
                        color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.15s,box-shadow 0.15s'
                      }}
                      onFocus={e => { e.target.style.borderColor = '#1d6ec6'; e.target.style.boxShadow = '0 0 0 3px rgba(29,110,198,0.14)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#dc2626',
                    background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 12px', borderRadius: 10
                  }}>
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', height: 46, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#1d6ec6,#0d3e7a)', color: '#fff',
                    fontSize: 15, fontWeight: 700, letterSpacing: '0.01em',
                    boxShadow: '0 4px 16px rgba(29,110,198,0.38)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginTop: 8, opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s'
                  }}
                >
                  {loading
                    ? <><span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>⟳</span> Sending…</>
                    : 'Send reset link'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Link to="/login" style={{ fontSize: 13, color: '#1d6ec6', textDecoration: 'none', fontWeight: 500 }}>
                  &larr; Back to Login
                </Link>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 20, letterSpacing: '0.04em' }}>
          🔒 Secure &nbsp;·&nbsp; Protected by Connectome
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
