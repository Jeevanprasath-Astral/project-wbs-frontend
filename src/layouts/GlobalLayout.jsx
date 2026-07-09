import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../store'
import { canAccessFinancialSettings } from '../utils/permissions'
import clsx from 'clsx'

const GLOBAL_NAV = [
  { icon: '📊', label: 'Dashboard',          path: '/global/dashboard' },
  { icon: '📌', label: 'Task Assignments',   path: '/global/assignments' },
  { icon: '📅', label: 'Deadlines',          path: '/global/deadlines' },
  { icon: '👥', label: 'Team Workload',      path: '/global/workload' },
  { icon: '⏱️', label: 'Work Hours',       path: '/global/hours' },
  { icon: '🗓️', label: 'Timesheet Calendar', path: '/global/timesheet' },
  { icon: '🤝', label: 'Team Hub',           path: '/global/team' },
]

const REPORT_NAV = [
  { icon: '📊', label: 'Project Reports',   path: '/global/reports' },
  { icon: '💹', label: 'Profitability',     path: '/global/profitability' },
  { icon: '⏰', label: 'Team Utilization',      path: '/global/team-utilization' },
  { icon: '💰', label: 'Cost Breakdown',    path: '/global/cost-breakdown' },
  { icon: '🧾', label: 'Billing Statement', path: '/global/billing-statement' },
]

const SETTINGS_NAV = [
  { icon: '⚙️', label: 'Financial Settings', path: '/global/financial-settings' },
]

export default function GlobalLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAppStore()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="w-52 flex-shrink-0 flex flex-col sidebar-dark">
        <div className="p-4 border-b border-white/10">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 w-full hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                 style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
              🌐
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-white">Global Hub</div>
              <div className="text-xs text-slate-400">← Back to Home</div>
            </div>
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          <div className="text-xs text-slate-600 px-2 pt-1 pb-2 uppercase tracking-wider font-medium">Global Modules</div>
          {GLOBAL_NAV.map(n => {
            const active = location.pathname === n.path
            return (
              <button key={n.path} onClick={() => navigate(n.path)}
                className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all duration-200 mb-0.5',
                  active ? 'text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5')}
                style={active ? {background:'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(79,70,229,0.3))',border:'1px solid rgba(139,92,246,0.3)'} : {}}>
                <span className="text-base">{n.icon}</span>
                <span className="flex-1">{n.label}</span>
              </button>
            )
          })}

          {/* Reports section */}
          <div className="text-xs text-slate-600 px-2 pt-4 pb-2 uppercase tracking-wider font-medium">Reports</div>
          {REPORT_NAV.map(n => {
            const active = location.pathname === n.path
            return (
              <button key={n.path} onClick={() => navigate(n.path)}
                className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all duration-200 mb-0.5',
                  active ? 'text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5')}
                style={active ? {background:'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(79,70,229,0.3))',border:'1px solid rgba(139,92,246,0.3)'} : {}}>
                <span className="text-base">{n.icon}</span>
                <span className="flex-1">{n.label}</span>
              </button>
            )
          })}

          {/* Financial Settings - Admin + HR */}
          {canAccessFinancialSettings(user) && (
            <>
              <div className="text-xs text-slate-600 px-2 pt-4 pb-2 uppercase tracking-wider font-medium">Settings</div>
              {SETTINGS_NAV.map(n => {
                const active = location.pathname === n.path
                return (
                  <button key={n.path} onClick={() => navigate(n.path)}
                    className={clsx('w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all duration-200 mb-0.5',
                      active ? 'text-white font-medium' : 'text-slate-400 hover:text-white hover:bg-white/5')}
                    style={active ? {background:'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(79,70,229,0.3))',border:'1px solid rgba(139,92,246,0.3)'} : {}}>
                    <span className="text-base">{n.icon}</span>
                    <span className="flex-1">{n.label}</span>
                  </button>
                )
              })}
            </>
          )}

          <div className="text-xs text-slate-600 px-2 pt-4 pb-2 uppercase tracking-wider font-medium">Navigation</div>
          <button onClick={() => navigate('/projects')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <span className="text-base">🏗️</span><span>All Projects</span>
          </button>
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                 style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
              {user?.name?.slice(0,2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{user?.name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.role}</div>
            </div>
            <button onClick={logout} className="text-slate-500 hover:text-rose-400 transition-colors text-base">🚪</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
