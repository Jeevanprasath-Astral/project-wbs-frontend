import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from '../store'
import { isTeamManager } from '../utils/permissions'
import api from '../utils/api'
import clsx from 'clsx'

const NAV = [
  { icon: '🏁', emoji: true, label: 'Milestone Config', path: 'configure-milestones' },
  { icon: '👥', emoji: true, label: 'Team',             path: 'team',          teamManagerOnly: true },
  { icon: '📌', emoji: true, label: 'Assignments',      path: 'assignments' },
  { icon: '⏱️', emoji: true, label: 'Working Hours',    path: 'working-hours' },
  { icon: '💰', emoji: true, label: 'Cost Management',  path: 'cost-management' },
  { icon: '🔔', emoji: true, label: 'Notifications',    path: 'notifications', badge: true },
  { icon: '📋', emoji: true, label: 'Audit log',        path: 'audit',         adminOnly: true },
  { icon: '⬇️', emoji: true, label: 'Export',           path: 'export' },
  { icon: '📊', emoji: true, label: 'Dashboard',        path: 'dashboard' },
]

export default function AppLayout() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, activeProject, unreadCount, setUnreadCount, logout } = useAppStore()

  // Poll unread notification count every 60 s so the badge stays live
  useEffect(() => {
    if (!id) return
    const fetchCount = () => {
      api.get(`/projects/${id}/notifications`)
        .then(r => {
          const unread = Array.isArray(r.data) ? r.data.filter(n => !n.read).length : 0
          setUnreadCount(unread)
        })
        .catch(() => {})
    }
    fetchCount()
    const timer = setInterval(fetchCount, 60_000)
    return () => clearInterval(timer)
  }, [id])

  const base = `/projects/${id}`
  const isActive = (path) => location.pathname.includes(path.split('/')[0])
  const goTo = (path) => navigate(`${base}/${path}`)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 flex flex-col overflow-y-auto sidebar-dark">

        {/* Logo + project */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              📋
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">Project WBS</div>
              <div className="text-xs text-slate-400 truncate max-w-[120px]">
                {activeProject?.name || 'No project'}
              </div>
            </div>
          </div>
          {activeProject && (
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span className="text-violet-400 font-medium">{activeProject?.progress || 0}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-1.5 rounded-full transition-all duration-700"
                     style={{ width: `${activeProject?.progress || 0}%`, background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 py-3 px-2">
          <div className="text-xs text-slate-600 px-2 pt-1 pb-2 uppercase tracking-wider font-medium">Main</div>
          {NAV.filter(n => (!n.adminOnly || user?.role === 'Admin') && (!n.teamManagerOnly || isTeamManager(user))).map((n) => {
            const active = isActive(n.path)
            return (
              <button key={n.path} onClick={() => goTo(n.path)}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all duration-200 mb-0.5',
                  active ? 'text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
                style={active ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.3))', border: '1px solid rgba(139,92,246,0.3)' } : {}}>
                <span className="text-base">{n.icon}</span>
                <span className="flex-1">{n.label}</span>
                {n.badge && unreadCount > 0 && (
                  <span className="text-xs bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-medium">{unreadCount}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              {user?.name?.slice(0,2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{user?.name || 'User'}</div>
              <div className="text-xs text-slate-500 truncate">{user?.role || ''}</div>
            </div>
            <button onClick={logout} title="Logout"
              className="text-slate-500 hover:text-rose-400 transition-colors text-base">🚪</button>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <button onClick={() => navigate('/')} className="hover:text-violet-600 transition-colors">🏠 Home</button>
            <span className="text-gray-200">/</span>
            <button onClick={() => navigate('/projects')} className="hover:text-violet-600 transition-colors">Projects</button>
            <span className="text-gray-200">/</span>
            <span className="text-gray-700 font-semibold">{activeProject?.name || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => goTo('notifications')}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-100 transition-all">
              🔔
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 border border-white" />
              )}
            </button>
            <button onClick={() => navigate('/projects')}
              className="text-xs text-gray-400 hover:text-violet-600 transition-colors px-2 py-1">
              ← Projects
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
