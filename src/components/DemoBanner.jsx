/**
 * DemoBanner.jsx
 *
 * Fixed-top banner shown throughout the app when isDemoMode is true.
 * Also listens for 'demo-write-blocked' events (fired by api.js when the
 * backend returns 403 demo-read-only) and pops a floating toast above the
 * banner so the presenter knows the write was silently blocked.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'

export default function DemoBanner() {
  const isDemoMode  = useAppStore((s) => s.isDemoMode)
  const setDemoMode = useAppStore((s) => s.setDemoMode)
  const logout      = useAppStore((s) => s.logout)
  const navigate    = useNavigate()

  const [showToast, setShowToast] = useState(false)
  const [toastTimer, setToastTimer] = useState(null)

  // Listen for write-block events from api.js interceptor
  useEffect(() => {
    const handler = () => {
      setShowToast(true)
      clearTimeout(toastTimer)
      const t = setTimeout(() => setShowToast(false), 3500)
      setToastTimer(t)
    }
    window.addEventListener('demo-write-blocked', handler)
    return () => {
      window.removeEventListener('demo-write-blocked', handler)
      clearTimeout(toastTimer)
    }
  }, [toastTimer])

  if (!isDemoMode) return null

  const exitDemo = () => {
    logout()
    setDemoMode(false)
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* ── Fixed top banner ───────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between
                   bg-gradient-to-r from-violet-600 to-indigo-600
                   px-4 py-1.5 shadow-md"
        style={{ minHeight: '32px' }}
      >
        <div className="flex items-center gap-2 text-white text-xs font-medium">
          <span className="bg-white/20 rounded px-1.5 py-0.5 text-white text-[10px] font-bold tracking-wider uppercase">
            Demo
          </span>
          <span className="hidden sm:inline opacity-90">
            You are viewing a read-only demo of AXON WBS.
          </span>
          <span className="sm:hidden opacity-90">AXON WBS — Demo Mode</span>
          <span className="opacity-60 hidden md:inline">
            All data is sample data. Write actions are disabled.
          </span>
        </div>

        <button
          onClick={exitDemo}
          className="text-white/80 hover:text-white text-xs font-medium underline-offset-2 hover:underline transition ml-4 shrink-0"
        >
          Exit Demo
        </button>
      </div>

      {/* ── Write-blocked toast ────────────────────────────────────────── */}
      {showToast && (
        <div
          className="fixed top-9 left-1/2 -translate-x-1/2 z-[9998]
                     bg-amber-500 text-white text-xs font-semibold
                     px-4 py-2 rounded-full shadow-lg
                     flex items-center gap-2 animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <span>🔒</span>
          <span>This action is disabled in Demo Mode</span>
        </div>
      )}
    </>
  )
}
