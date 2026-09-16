/**
 * DemoEntry.jsx
 * Public route — /demo — no login required.
 *
 * Flow:
 *  1. Fetch /auth/demo-token  (no credentials)
 *  2. Store user + token in Zustand, set isDemoMode = true
 *  3. Navigate directly to the demo project dashboard
 *     OR to /projects if the backend returned no project_id yet
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import api from '../utils/api'

export default function DemoEntry() {
  const navigate    = useNavigate()
  const setUser     = useAppStore((s) => s.setUser)
  const setDemoMode = useAppStore((s) => s.setDemoMode)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get('/auth/demo-token')
        if (cancelled) return

        // Persist session identically to the normal login flow
        setUser(data.user, data.token)
        setDemoMode(true)

        const dest = data.project_id
          ? `/projects/${data.project_id}/dashboard`
          : '/projects'
        navigate(dest, { replace: true })
      } catch (err) {
        if (!cancelled) {
          const msg =
            err.response?.data?.detail ||
            'Demo environment is not available right now. Please try again or contact the team.'
          setError(msg)
          setLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-100 gap-6 px-4">
        {/* Spinner */}
        <div className="w-14 h-14 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
        <p className="text-lg font-semibold text-violet-800 tracking-wide">
          Loading AXON Demo…
        </p>
        <p className="text-sm text-violet-500">Preparing your demo environment</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 gap-6 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Demo Unavailable</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">{error}</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}
