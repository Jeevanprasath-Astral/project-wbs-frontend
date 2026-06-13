import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import api from '../utils/api'

const DEMO = [
  { label: 'Admin', icon: '👑', email: 'admin@wbs.com',    password: 'admin123', color: 'from-violet-500 to-purple-600' },
  { label: 'Functional Consultant', icon: '🧩', email: 'fc@wbs.com', password: 'fc123', color: 'from-blue-500 to-indigo-600' },
  { label: 'Technical Team', icon: '⚙️', email: 'tech@wbs.com', password: 'tech123', color: 'from-emerald-500 to-teal-600' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAppStore((s) => s.setUser)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/login', form)
      setUser(res.data.user, res.data.token)
      navigate('/projects')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

      {/* Animated background orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 rounded-full opacity-20 animate-float"
           style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-15"
           style={{ background: 'radial-gradient(circle, #4f46e5, transparent)', animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-10 animate-float"
           style={{ background: 'radial-gradient(circle, #818cf8, transparent)', transform: 'translate(-50%,-50%)', animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10 animate-fade-up">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 animate-float"
               style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 20px 60px rgba(124,58,237,0.5)' }}>
            <span className="text-4xl">📋</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Project <span style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WBS</span></h1>
          <p className="text-slate-400 text-sm">Requirement & Tracking System</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6 border border-white/10 backdrop-blur-xl"
             style={{ background: 'rgba(255,255,255,0.07)' }}>

          <h2 className="text-white font-semibold text-lg mb-5">Welcome back 👋</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
                <input
                  className="w-full h-11 pl-9 pr-4 rounded-xl border border-white/10 bg-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  type="email" placeholder="you@company.com"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔐</span>
                <input
                  className="w-full h-11 pl-9 pr-10 rounded-xl border border-white/10 bg-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors text-xs">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/20 border border-rose-500/30 px-3 py-2.5 rounded-xl">
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}>
              {loading ? <><span className="animate-spin">⟳</span> Signing in…</> : <><span>🚀</span> Sign in</>}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-5 pt-5 border-t border-white/10">
            <p className="text-xs text-slate-400 mb-3 font-medium">✨ Quick access — Demo accounts</p>
            <div className="space-y-2">
              {DEMO.map(d => (
                <button key={d.email} type="button"
                  onClick={() => setForm({ email: d.email, password: d.password })}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-200 text-left group">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${d.color} flex items-center justify-center text-sm flex-shrink-0`}>
                    {d.icon}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">{d.label}</div>
                    <div className="text-xs text-slate-500">{d.email}</div>
                  </div>
                  <span className="ml-auto text-slate-500 group-hover:text-slate-300 text-xs transition-colors">Click to fill →</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          🔒 Secure login • Your data is protected
        </p>
      </div>
    </div>
  )
}
