import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fmtDate, fmtDateTime, daysLeft, fmtHours } from '../../utils/helpers'
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
  const [whSummary, setWhSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.get(`/projects/${id}/dashboard`),
      api.get(`/projects/${id}/assignments/summary`).catch(() => ({ data: null })),
      api.get(`/work-hours/summary?project_id=${id}`).catch(() => ({ data: null })),
    ])
      .then(([dashRes, assignRes, whRes]) => {
        setData({ ...dashRes.data, assignmentSummary: assignRes.data })
        setWhSummary(whRes.data)
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
        <MetricCard icon="🏁" label="Total Milestones" value={summary.total} sub={`${summary.total} selected`} gradient="from-violet-100 to-purple-100" delay={0} />
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
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{milestones.length} milestone{milestones.length === 1 ? '' : 's'}</span>
          </div>
          <div className="space-y-2">
            {milestones.map((ms, i) => (
              <div key={ms.num} onClick={() => navigate(`/projects/${id}/milestone/${ms.num}`)}
                className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-violet-50 cursor-pointer transition-all group">
                <span className="text-base">{MS_ICONS[i % MS_ICONS.length]}</span>
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

          {/* Notifications — Req 2: count only per user, click to view detail,
              unread shown with a highlighted indicator. Full messages live on
              the dedicated Notifications page (grouped, expandable there). */}
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
            <div className="space-y-1.5">
              {(() => {
                const groups = {}
                for (const n of (notifications || [])) {
                  const key = n.user_name || 'General'
                  if (!groups[key]) groups[key] = []
                  groups[key].push(n)
                }
                const names = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length)
                return names.map(name => {
                  const group = groups[name]
                  const unreadCount = group.filter(n => !n.read).length
                  return (
                    <button
                      key={name}
                      onClick={() => navigate(`/projects/${id}/notifications`)}
                      className={clsx(
                        'w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-colors hover:bg-violet-50/40',
                        unreadCount > 0 ? 'bg-violet-50/50 border-violet-100' : 'bg-gray-50 border-gray-100'
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 bg-white shadow-sm text-violet-600">
                        {name === 'General' ? '🔔' : name.slice(0,1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700 truncate flex items-center gap-1.5">
                          {name}
                          {unreadCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />}
                        </div>
                        <div className="text-xs text-gray-400">{group.length} notification{group.length!==1?'s':''}</div>
                      </div>
                      <span className={clsx(
                        'text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0',
                        unreadCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-violet-100 text-violet-700'
                      )}>
                        {group.length}
                      </span>
                    </button>
                  )
                })
              })()}
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
      <div className={clsx('grid gap-4', whSummary ? 'grid-cols-4' : 'grid-cols-3')}>

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
                <span className="text-xs font-medium text-violet-600 w-14 text-right" title="Milestone-based tasks">
                  🏁 {w.milestone_tasks?.total ?? 0}
                </span>
                <span className="text-xs font-medium text-amber-600 w-12 text-right" title="General tasks">
                  ⭐ {w.general_tasks?.total ?? 0}
                </span>
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

        {/* Working Hours & Buffer Time */}
        {whSummary && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏱️</span>
                <span className="text-sm font-semibold text-gray-800">Working Hours</span>
              </div>
              <button onClick={() => navigate(`/projects/${id}/working-hours`)}
                className="text-xs text-violet-500 hover:text-violet-700 font-medium">View all →</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <div className="bg-cyan-50 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-gray-900">{fmtHours(whSummary.total_hours)}h</div>
                <div className="text-xs text-gray-400">Logged</div>
              </div>
              <div className="bg-rose-50 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-gray-900">{fmtHours(whSummary.total_buffer_hours)}h</div>
                <div className="text-xs text-gray-400">Buffer</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2 text-center">
                <div className="text-sm font-bold text-gray-900">{fmtHours(whSummary.total_actual_working_hours)}h</div>
                <div className="text-xs text-gray-400">Actual</div>
              </div>
            </div>
            <div className="space-y-1.5">
              {(whSummary.by_employee || []).slice(0,5).map(e => (
                <div key={e.name} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 truncate">{e.name}</span>
                  <span className="font-medium text-emerald-600">{fmtHours(e.actual_working_hours)}h</span>
                </div>
              ))}
              {(!whSummary.by_employee || whSummary.by_employee.length === 0) && (
                <div className="text-center py-2 text-gray-400 text-xs">No hours logged yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
