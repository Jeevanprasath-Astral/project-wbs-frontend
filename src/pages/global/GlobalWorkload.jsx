import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { getProjectsList, getUsersList } from '../../utils/masterData'
import { fmtHours } from '../../utils/helpers'
import clsx from 'clsx'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'

const today = () => new Date().toISOString().split('T')[0]
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }

export default function GlobalWorkload() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [whSummary, setWhSummary] = useState(null)
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState('stacked') // 'stacked' | 'combo'
  const [filters, setFilters] = useState({ team:'', project_id:'', employee_id:'', date_from: daysAgo(7), date_to: today() })

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k,v]) => v && params.append(k, v))
      // Working Hours & Buffer Time summary uses user_id (not employee_id) for the person filter
      const whParams = new URLSearchParams()
      if (filters.team) whParams.append('team', filters.team)
      if (filters.project_id) whParams.append('project_id', filters.project_id)
      if (filters.employee_id) whParams.append('user_id', filters.employee_id)
      if (filters.date_from) whParams.append('date_from', filters.date_from)
      if (filters.date_to) whParams.append('date_to', filters.date_to)
      const [wRes, projectsData, usersData, whRes] = await Promise.all([
        api.get(`/global/workload?${params}`),
        getProjectsList(),
        getUsersList(),
        api.get(`/work-hours/summary?${whParams}`).catch(() => ({ data: null })),
      ])
      setData(wRes.data)
      setProjects(projectsData)
      setUsers(usersData)
      setWhSummary(whRes.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters])
  const setFilter = (k, v) => setFilters(f => ({...f, [k]: v}))

  const COLORS = { assigned:'#7c3aed', completed:'#10b981', in_progress:'#f59e0b', pending:'#94a3b8', on_hold:'#0ea5e9', overdue:'#ef4444' }

  const QuickRange = ({ label, from, to }) => (
    <button onClick={() => setFilters(f => ({...f, date_from: from, date_to: to}))}
      className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
        filters.date_from === from && filters.date_to === to
          ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-violet-300')}>
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/projects')} className="text-gray-400 hover:text-violet-600 text-sm transition-colors">← Projects</button>
            <span className="text-gray-200">/</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#10b981,#3b82f6)'}}>👥</div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Global Team Workload</h1>
                <p className="text-xs text-gray-400">Consolidated view across all projects and teams</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <QuickRange label="Last 7 days" from={daysAgo(7)} to={today()} />
            <QuickRange label="Last 14 days" from={daysAgo(14)} to={today()} />
            <QuickRange label="Last 30 days" from={daysAgo(30)} to={today()} />
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5">

        {/* Summary metrics */}
        {data?.summary && (
          <div className="grid grid-cols-9 gap-3 mb-5 stagger">
            {[
              {icon:'📊', label:'Total Assigned', value:data.summary.total_assigned, color:'from-violet-100 to-purple-100'},
              {icon:'⭐', label:'General Tasks', value:data.summary.total_general, color:'from-amber-100 to-orange-100'},
              {icon:'🏁', label:'Milestone Tasks', value:data.summary.total_milestone, color:'from-indigo-100 to-violet-100'},
              {icon:'✅', label:'Completed', value:data.summary.total_completed, color:'from-emerald-100 to-teal-100'},
              {icon:'⚡', label:'In Progress', value:data.summary.total_in_progress, color:'from-amber-100 to-orange-100'},
              {icon:'⏸️', label:'Pending', value:data.summary.total_pending, color:'from-slate-100 to-gray-100'},
              {icon:'⏯️', label:'On Hold', value:data.summary.total_on_hold, color:'from-sky-100 to-cyan-100'},
              {icon:'🔥', label:'Overdue', value:data.summary.total_overdue, color:'from-rose-100 to-pink-100'},
              {icon:'🎯', label:'Avg Completion', value:`${data.summary.avg_completion}%`, color:'from-blue-100 to-indigo-100'},
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-3 text-center border border-white shadow-sm animate-fade-up`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🔍</span>
            <span className="text-xs font-semibold text-gray-700">Filters & Date Range</span>
          </div>
          <div className="grid grid-cols-6 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">👥 Team</label>
              <select className="select text-xs h-8" value={filters.team} onChange={e => setFilter('team', e.target.value)}>
                <option value="">All teams</option>
                <option value="Functional Consultant">🧩 FC</option>
                <option value="Technical Team">⚙️ TT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">👤 Employee</label>
              <select className="select text-xs h-8" value={filters.employee_id} onChange={e => setFilter('employee_id', e.target.value)}>
                <option value="">All employees</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">🏢 Project</label>
              <select className="select text-xs h-8" value={filters.project_id} onChange={e => setFilter('project_id', e.target.value)}>
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">📅 From</label>
              <input type="date" className="input text-xs h-8" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">📅 To</label>
              <input type="date" className="input text-xs h-8" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">📈 Chart type</label>
              <select className="select text-xs h-8" value={chartType} onChange={e => setChartType(e.target.value)}>
                <option value="stacked">Stacked Bar</option>
                <option value="combo">Bar + Line</option>
              </select>
            </div>
          </div>
        </div>

        {/* Working Hours & Buffer Time */}
        {whSummary && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⏱️</span>
              <span className="text-sm font-semibold text-gray-800">Working Hours & Buffer Time</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-3 text-center border border-white">
                <div className="text-lg font-bold text-gray-900">{fmtHours(whSummary.total_hours)}h</div>
                <div className="text-xs text-gray-500">Total Time Logged</div>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-3 text-center border border-white">
                <div className="text-lg font-bold text-gray-900">{fmtHours(whSummary.total_buffer_hours)}h</div>
                <div className="text-xs text-gray-500">⏳ Buffer Time</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3 text-center border border-white">
                <div className="text-lg font-bold text-gray-900">{fmtHours(whSummary.total_actual_working_hours)}h</div>
                <div className="text-xs text-gray-500">✅ Actual Working Hours</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">🏷️ By Team</div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {(whSummary.by_team || []).length === 0 ? (
                    <div className="text-xs text-gray-400">No hours logged yet</div>
                  ) : whSummary.by_team.map(t => (
                    <div key={t.name} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                      <span className="font-medium text-gray-700">{t.name}</span>
                      <span className="text-gray-500">
                        <span className="text-emerald-600 font-semibold">{fmtHours(t.actual_working_hours)}h</span> actual · <span className="text-rose-500">{fmtHours(t.buffer_hours)}h</span> buffer
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">👤 By Employee</div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {(whSummary.by_employee || []).length === 0 ? (
                    <div className="text-xs text-gray-400">No hours logged yet</div>
                  ) : whSummary.by_employee.map(e => (
                    <div key={e.name} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                      <span className="font-medium text-gray-700">{e.name}</span>
                      <span className="text-gray-500">
                        <span className="text-emerald-600 font-semibold">{fmtHours(e.actual_working_hours)}h</span> actual · <span className="text-rose-500">{fmtHours(e.buffer_hours)}h</span> buffer
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-violet-400 animate-pulse">
            <div className="text-4xl mb-3 animate-spin-slow">⚙️</div>
            <div className="text-sm font-medium">Calculating workload...</div>
          </div>
        ) : !data || data.employees.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3 animate-float">👥</div>
            <p className="text-sm font-medium text-gray-700 mb-1">No workload data found</p>
            <p className="text-xs text-gray-400">Assign tasks to team members to see workload metrics</p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📈</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {chartType === 'stacked' ? 'Workload Distribution (Stacked Bar)' : 'Workload vs Completion (Bar + Line)'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {Object.entries(COLORS).map(([k,v]) => (
                    <span key={k} className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{background:v}} />
                      <span className="text-gray-500 capitalize">{k.replace('_',' ')}</span>
                    </span>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'stacked' ? (
                  <BarChart data={data.chart_data} margin={{top:5,right:20,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{fontSize:11}} />
                    <YAxis tick={{fontSize:11}} />
                    <Tooltip contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb',fontSize:'12px'}} />
                    <Legend wrapperStyle={{fontSize:'12px'}} />
                    <Bar dataKey="completed"  name="Completed"   stackId="a" fill={COLORS.completed}  radius={[0,0,0,0]} />
                    <Bar dataKey="in_progress" name="In Progress" stackId="a" fill={COLORS.in_progress} />
                    <Bar dataKey="pending"    name="Pending"     stackId="a" fill={COLORS.pending} />
                    <Bar dataKey="on_hold"    name="On Hold"     stackId="a" fill={COLORS.on_hold} />
                    <Bar dataKey="overdue"    name="Overdue"     stackId="a" fill={COLORS.overdue} radius={[4,4,0,0]} />
                  </BarChart>
                ) : (
                  <ComposedChart data={data.chart_data} margin={{top:5,right:20,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{fontSize:11}} />
                    <YAxis tick={{fontSize:11}} />
                    <Tooltip contentStyle={{borderRadius:'12px',border:'1px solid #e5e7eb',fontSize:'12px'}} />
                    <Legend wrapperStyle={{fontSize:'12px'}} />
                    <Bar dataKey="assigned"   name="Assigned"   fill={COLORS.assigned}   radius={[4,4,0,0]} />
                    <Bar dataKey="in_progress" name="In Progress" fill={COLORS.in_progress} radius={[4,4,0,0]} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke={COLORS.completed} strokeWidth={2.5} dot={{r:4}} />
                    <Line type="monotone" dataKey="overdue" name="Overdue" stroke={COLORS.overdue} strokeWidth={2} strokeDasharray="5 5" dot={{r:3}} />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Employee table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-semibold text-white"
                   style={{gridTemplateColumns:'1.4fr 0.7fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 1.8fr'}}>
                <div>Employee</div><div className="text-center">Total</div>
                <div className="text-center">⭐ General</div><div className="text-center">🏁 Milestone</div>
                <div className="text-center">✅ Done</div><div className="text-center">⚡ Active</div>
                <div className="text-center">⏸️ Pending</div><div className="text-center">⏯️ On Hold</div><div className="text-center">🔥 Overdue</div>
                <div>Progress</div>
              </div>

              {data.employees.map((e, i) => (
                <div key={e.user_id}
                  className={clsx('grid px-4 py-3 items-center border-b border-gray-50 last:border-0 hover:bg-emerald-50/20 transition-colors text-xs',
                    i%2===0?'bg-white':'bg-slate-50/30')
                  }
                  style={{gridTemplateColumns:'1.4fr 0.7fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 1.8fr'}}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                         style={{background:`hsl(${e.user_id*60+200},65%,55%)`}}>
                      {e.name?.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{e.name}</div>
                      <div className="text-gray-400">{e.role === 'Functional Consultant' ? '🧩 FC' : e.role === 'Technical Team' ? '⚙️ TT' : e.role}</div>
                    </div>
                  </div>
                  <div className="text-center font-bold text-gray-900">{e.total}</div>
                  <div className="text-center font-semibold text-amber-600">{e.general_count}</div>
                  <div className="text-center font-semibold text-violet-600">{e.milestone_count}</div>
                  <div className="text-center font-semibold text-emerald-600">{e.completed}</div>
                  <div className="text-center font-semibold text-amber-600">{e.in_progress}</div>
                  <div className="text-center text-gray-500">{e.pending}</div>
                  <div className="text-center font-semibold text-sky-600">{e.on_hold}</div>
                  <div className="text-center font-semibold text-rose-600">{e.overdue}</div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-2 rounded-full transition-all duration-700"
                             style={{width:`${e.completion_pct}%`,
                               background: e.completion_pct >= 80 ? '#10b981' : e.completion_pct >= 50 ? '#f59e0b' : '#ef4444'}} />
                      </div>
                      <span className="text-xs text-gray-400 w-8">{e.completion_pct}%</span>
                    </div>
                    <div className="flex gap-0.5 mt-1">
                      {e.completed > 0 && <div className="h-1 rounded-full bg-emerald-400" style={{width:`${(e.completed/e.total)*100}%`}} title={`${e.completed} completed`} />}
                      {e.in_progress > 0 && <div className="h-1 rounded-full bg-amber-400" style={{width:`${(e.in_progress/e.total)*100}%`}} />}
                      {e.pending > 0 && <div className="h-1 rounded-full bg-gray-300" style={{width:`${(e.pending/e.total)*100}%`}} />}
                      {e.on_hold > 0 && <div className="h-1 rounded-full bg-sky-400" style={{width:`${(e.on_hold/e.total)*100}%`}} />}
                      {e.overdue > 0 && <div className="h-1 rounded-full bg-rose-400" style={{width:`${(e.overdue/e.total)*100}%`}} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
