import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import axonLogo from '../assets/axon-logo.png'

export default function ResetPassword() {
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const token                   = searchParams.get('token') || ''

  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew]             = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#eef2f7' }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: 32, maxWidth: 380, textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>Invalid link</h2>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>
            This password reset link is invalid or missing. Please request a new one.
          </p>
          <Link to="/forgot-password" style={{
            display: 'inline-block', background: 'linear-gradient(135deg,#1d6ec6,#0d3e7a)',
            color: '#fff', padding: '12px 24px', borderRadius: 10, textDecoration: 'none',
            fontSize: 14, fontWeight: 700
          }}>
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', height: 44, paddingLeft: 34, paddingRight: 44,
    borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc',
    color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s,box-shadow 0.15s'
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
          {success ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
                Password updated!
              </h2>
              <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>
                Your password has been changed successfully.
                You'll be redirected to login in a moment…
              </p>
              <Link to="/login" style={{
                display: 'inline-block', fontSize: 14, fontWeight: 600,
                color: '#1d6ec6', textDecoration: 'none'
              }}>
                Go to Login &rarr;
              </Link>
            </div>
          ) : (
            /* ── Reset form ── */
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                  Set new password
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    New password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }}>🔐</span>
                    <input
                      type={showNew ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1d6ec6'; e.target.style.boxShadow = '0 0 0 3px rgba(29,110,198,0.14)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                    />
                    <button type="button" onClick={() => setShowNew(s => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, padding: 0 }}>
                      {showNew ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Confirm password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }}>🔐</span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#1d6ec6'; e.target.style.boxShadow = '0 0 0 3px rgba(29,110,198,0.14)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                    />
                    <button type="button" onClick={() => setShowConfirm(s => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, padding: 0 }}>
                      {showConfirm ? '🙈' : '👁️'}
                    </button>
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
                    ? <><span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>⟳</span> Updating…</>
                    : 'Update password'}
                </button>
              </form>
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
