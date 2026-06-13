import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { fmtDate } from '../utils/helpers'
import api from '../utils/api'
import clsx from 'clsx'

const STATUS_CONFIG = {
  'Completed':   { cls: 'badge-done', icon: '✅' },
  'In Progress': { cls: 'badge-prog', icon: '⚡' },
  'Not Started': { cls: 'badge-todo', icon: '⏸️' },
  'On Hold':     { cls: 'badge-hold', icon: '⏳' },
}

const PROJ_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
]

export default function ProjectsPage() {
  const navigate = useNavigate()
  const setActiveProject = useAppStore(s => s.setActiveProject)
  const user = useAppStore(s => s.user)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data)).catch(() => setProjects([])).finally(() => setLoading(false))
  }, [])

  const open = (p) => { setActiveProject(p); navigate(`/projects/${p.id}/dashboard`) }

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 100%)' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-up">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                   style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
                📋
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                My Projects <span className="text-gray-400 text-lg font-normal">({projects.length})</span>
              </h1>
            </div>
            <p className="text-sm text-gray-500 ml-13">
              Welcome back, <span className="font-medium text-violet-600">{user?.name}</span> 👋
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
            ✨ New project
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                  <div className="flex-1">
                    <div className="h-4 w-48 bg-gray-200 rounded-xl mb-2" />
                    <div className="h-3 w-32 bg-gray-100 rounded-xl" />
                  </div>
                  <div className="w-24 h-2 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 animate-fade-up">
            <div className="text-7xl mb-4 animate-float">🚀</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No projects yet</h2>
            <p className="text-gray-500 text-sm mb-6">Create your first project to get started</p>
            <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
              ✨ Create first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 stagger">
            {projects.map((p, i) => {
              const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG['Not Started']
              const color = PROJ_COLORS[i % PROJ_COLORS.length]
              return (
                <div key={p.id} onClick={() => open(p)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all duration-200 overflow-hidden animate-fade-up group">
                  <div className="flex items-center gap-4 p-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg`}>
                      {p.name?.slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">{p.name}</span>
                        <span className={sc.cls}>{sc.icon} {p.status}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        🏢 {p.client} &nbsp;·&nbsp; 👤 {p.owner}
                        {p.start_date && <> &nbsp;·&nbsp; 📅 {fmtDate(p.start_date)} → {fmtDate(p.end_date)}</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900">{p.progress || 0}%</div>
                        <div className="text-xs text-gray-400">complete</div>
                      </div>
                      <div className="w-20">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-2 rounded-full bg-gradient-to-r ${color} transition-all`}
                               style={{ width: `${p.progress || 0}%` }} />
                        </div>
                      </div>
                      <span className="text-gray-300 group-hover:text-violet-400 transition-colors text-lg">→</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
