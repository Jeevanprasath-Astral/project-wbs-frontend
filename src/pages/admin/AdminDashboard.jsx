import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fmtDate, fmtDateTime, daysLeft } from '../../utils/helpers'
import { DashboardSkeleton } from '../../components/common/SkeletonLoader'
import api from '../../utils/api'
import clsx from 'clsx'

const MS_ICONS = ['🚀','🤝','🔍','📝','⚙️','🧪','📦','✅','🌟','🛡️']

const StatusPill = ({ status }) => {
  const map = {
    'Completed':   { cls: 'badge-done', icon: '✅' },
    'In Progress': { cls: 'badge-prog', icon: '⚡' },
    'Overdue':     { cls: 'badge-over', icon: '🔥' },
    'Not Started': { cls: 'badge-todo', icon: '⏸️' },
    'On Hold':     { cls: 'badge-hold', icon: '⏳' },
  }
  const s = map[status] || map['Not Started']
  return <span className={s.cls}>{s.icon} {status}</span>
}

const progressColor = (pct) => {
  if (pct === 100) return 'from-emerald-400 to-teal-500'
  if (pct >= 50)   return 'from-amber-400 to-orange-500'
  if (pct > 0)     return 'from-violet-400 to-indigo-500'
  return null
}

const MetricCard = ({ icon, label, value, sub, gradient, delay = 0 }) => (
  <div className="metric-card animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-3 bg-gradient-to-br ${gradient}`}>
      {icon}
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
    <div className="text-xs font-medium text-gray-500">{label}</div>
    {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
  </div>
)

export default function AdminDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.get(`/projects/${id}/dashboard`),
      api.get(`/projects/${id}/assignments/summary`).catch(() => ({ data: null })),
    ])
      .then(([dashRes, assignRes]) => {
        setData({ ...dashRes.data, assignmentSummary: assignRes.data })
      })
      .catch(err => {
        console.error('Dashboard error:', err)
        setError(err.response?.data?.detail || 'Failed to load dashboard')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <DashboardSkeleton />
  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center animate-fade-up">
        <div className="text-5xl mb-3">⚠️</div>
        <p className="text-sm font-medium text-rose-600 mb-2">{error}</p>
        <p className="text-xs text-gray-400 mb-4">Check that your backend is running at localhost:8000</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary text-xs">
          🔄 Retry
        </button>
      </div>
    </div>
  )

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <div className="text-5xl mb-3">📭</div>
        <p className="text-sm">No dashboard data available</p>
      </div>
    </div>
  )

  const { summary, milestones, notifications, workload, deadlines, audit } = data

  return (
    <div className="space-y-5 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Dashboard <span className="text-2xl">📊</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Live project overview & tracking</p>
        </div>
        <button onClick={() => navigate(`/projects/${id}/export`)}
          className="btn btn-primary text-xs">
          ⬇️ Export report
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-5 gap-3 stagger">
        <MetricCard icon="🏁" label="Total Milestones" value={summary.total} sub="10 phases" gradient="from-violet-100 to-purple-100" delay={0} />
        <MetricCard icon="✅" label="Completed" value={summary.completed} sub="on schedule" gradient="from-emerald-100 to-teal-100" delay={50} />
        <MetricCard icon="⚡" label="In Progress" value={summary.in_progress} sub="active now" gradient="from-amber-100 to-orange-100" delay={100} />
        <MetricCard icon="🔥" label="Overdue" value={summary.overdue} sub="needs action" gradient="from-rose-100 to-pink-100" delay={150} />
        <MetricCard icon="🎯" label="Overall Progress" value={`${summary.progress}%`} sub={`${summary.done_tasks}/${summary.total_tasks} tasks`} gradient="from-blue-100 to-indigo-100" delay={200} />
      </div>

      {/* Assignment summary strip */}
      {data.assignmentSummary && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 flex items-center gap-4 flex-wrap animate-fade-up">
          <div className="flex items-center gap-2 text-white">
            <span className="text-xl">📌</span>
            <span className="text-sm font-semibold">Task Assignments</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label:'Total', value: data.assignmentSummary.total, bg:'bg-white/20' },
              { label:'In Progress', value: data.assignmentSummary.in_progress, bg:'bg-amber-400/30' },
              { label:'Completed', value: data.assignmentSummary.completed, bg:'bg-emerald-400/30' },
              { label:'Overdue', value: data.assignmentSummary.overdue, bg:'bg-rose-400/30' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl px-3 py-1.5 text-center`}>
                <div className="text-white font-bold text-sm">{s.value}</div>
                <div className="text-white/70 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate(`/projects/${id}/assignments`)}
            className="ml-auto text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl transition-colors font-medium">
            View all →
          </button>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-2 gap-4">

        {/* Milestone tracker */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏁</span>
              <span className="text-sm font-semibold text-gray-800">Milestone Tracker</span>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">10 phases</span>
          </div>
          <div className="space-y-2">
            {milestones.map((ms, i) => (
              <div key={ms.num} onClick={() => navigate(`/projects/${id}/milestone/${ms.num}`)}
                className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-violet-50 cursor-pointer transition-all group">
                <span className="text-base">{MS_ICONS[i]}</span>
                <span className="text-xs text-gray-700 flex-1 truncate group-hover:text-violet-700 font-medium">
                  {String(ms.num).padStart(2,'0')} {ms.name}
                </span>
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                  {ms.progress > 0 && (
                    <div className={`h-1.5 rounded-full bg-gradient-to-r ${progressColor(ms.progress)}`}
                         style={{ width: `${ms.progress}%` }} />
                  )}
                </div>
                <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{ms.progress}%</span>
                <StatusPill status={ms.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Notifications */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <span className="text-sm font-semibold text-gray-800">Notifications</span>
              </div>
              {notifications?.filter(n => !n.read).length > 0 && (
                <span className="text-xs bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full font-medium">
                  {notifications.filter(n => !n.read).length} new
                </span>
              )}
            </div>
            <div className="space-y-2">
              {(notifications || []).slice(0,4).map(n => {
                const icons = { overdue:'🔥', reminder:'⏰', completed:'🎉', assignment:'📌', started:'🚀' }
                const bgs = { overdue:'bg-rose-50 border-rose-100', reminder:'bg-amber-50 border-amber-100', completed:'bg-emerald-50 border-emerald-100', assignment:'bg-blue-50 border-blue-100' }
                return (
                  <div key={n.id} className={clsx('flex items-start gap-2 p-2.5 rounded-xl border', bgs[n.type] || 'bg-gray-50 border-gray-100')}>
                    <span className="text-base flex-shrink-0">{icons[n.type] || '📣'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-700 leading-snug">{n.message}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{fmtDateTime(n.created_at)}</div>
                    </div>
                  </div>
                )
              })}
              {(!notifications || notifications.length === 0) && (
                <div className="text-center py-4 text-gray-400">
                  <div className="text-2xl mb-1">🎉</div>
                  <div className="text-xs">All caught up!</div>
                </div>
              )}
            </div>
          </div>

          {/* Overdue */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-semibold text-gray-800">Overdue Items</span>
              {(data.overdue_items || []).length > 0 && (
                <span className="ml-auto text-xs bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full font-medium">
                  {data.overdue_items.length} item{data.overdue_items.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {(data.overdue_items || []).length === 0 ? (
              <div className="text-center py-3 text-gray-400">
                <div className="text-2xl mb-1">✨</div>
                <div className="text-xs">Nothing overdue!</div>
              </div>
            ) : (
              (data.overdue_items || []).map(item => (
                <div key={item.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-base">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.assignee}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-rose-600 font-medium">{fmtDate(item.due_date)}</div>
                    <div className="text-xs text-rose-400">{Math.abs(daysLeft(item.due_date))}d late</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Workload */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">👥</span>
            <span className="text-sm font-semibold text-gray-800">Team Workload</span>
          </div>
          <div className="space-y-2.5">
            {(workload || []).map((w, i) => (
              <div key={w.user_id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                     style={{ background: `hsl(${i * 60 + 240}, 70%, 55%)` }}>
                  {w.name?.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">{w.name}</div>
                  <div className="text-xs text-gray-400 truncate">{w.role}</div>
                </div>
                <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={clsx('h-1.5 rounded-full',
                    w.tasks > 8 ? 'bg-rose-400' : w.tasks > 5 ? 'bg-amber-400' : 'bg-emerald-400')}
                    style={{ width: `${Math.min(w.tasks * 10, 100)}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-12 text-right">{w.tasks} tasks</span>
              </div>
            ))}
            {(!workload || workload.length === 0) && (
              <div className="text-center py-3 text-gray-400 text-xs">No team members yet</div>
            )}
          </div>
        </div>

        {/* Deadlines */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📅</span>
            <span className="text-sm font-semibold text-gray-800">Upcoming Deadlines</span>
          </div>
          <div className="space-y-2">
            {(deadlines || []).map(d => {
              const left = daysLeft(d.due_date)
              return (
                <div key={d.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">{d.name}</div>
                    <div className="text-xs text-gray-400 truncate">👤 {d.assignee}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={clsx('text-xs font-medium',
                      left <= 2 ? 'text-rose-600' : left <= 5 ? 'text-amber-600' : 'text-gray-500')}>
                      {fmtDate(d.due_date)}
                    </div>
                    <div className="text-xs text-gray-400">{left}d left</div>
                  </div>
                </div>
              )
            })}
            {(!deadlines || deadlines.length === 0) && (
              <div className="text-center py-3 text-gray-400 text-xs">
                <div className="text-2xl mb-1">🗓️</div>No upcoming deadlines
              </div>
            )}
          </div>
        </div>

        {/* Audit */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📋</span>
            <span className="text-sm font-semibold text-gray-800">Recent Activity</span>
          </div>
          <div className="space-y-2">
            {(audit || []).slice(0,6).map(a => (
              <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-5 h-5 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 text-xs">
                  {a.actor === 'System' ? '🤖' : '👤'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">{a.actor}</div>
                  <div className="text-xs text-gray-400 truncate">{a.description}</div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">{fmtDateTime(a.created_at)?.split(',')[1]?.trim()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
