import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { getProjectsList, getUsersList } from '../../utils/masterData'
import { fmtHours } from '../../utils/helpers'
import clsx from 'clsx'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, PieChart, Pie, Cell } from 'recharts'

const today = () => new Date().toISOString().split('T')[0]
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }
const COLORS_PIE = ['#7c3aed','#10b981','#f59e0b','#94a3b8','#ef4444']

export default function GlobalDashboard() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [workload, setWorkload] = useState(null)
  const [whSummary, setWhSummary] = useState(null)
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [projectStatus, setProjectStatus] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ team:'', project_id:'', employee_id:'', date_from: daysAgo(30), date_to: today() })

  const load = async () => {
    setLoading(true)
    try {
      // Shared params for endpoints whose query-param names already match
      // the filters state 1:1 (workload, project-status).
      const wParams = new URLSearchParams()
      Object.entries(filters).forEach(([k,v]) => v && wParams.append(k, v))

      // /global/assignments uses `assigned_to` instead of `employee_id` —
      // without this mapping the employee filter is silently dropped and
      // the summary cards/pie chart/By-Project breakdown ignore it.
      const aParams = new URLSearchParams()
      if (filters.project_id) aParams.append('project_id', filters.project_id)
      if (filters.team) aParams.append('team', filters.team)
      if (filters.employee_id) aParams.append('assigned_to', filters.employee_id)
      if (filters.date_from) aParams.append('date_from', filters.date_from)
      if (filters.date_to) aParams.append('date_to', filters.date_to)

      // /work-hours/summary uses `user_id` instead of `employee_id`.
      const whParams = new URLSearchParams()
      if (filters.project_id) whParams.append('project_id', filters.project_id)
      if (filters.team) whParams.append('team', filters.team)
      if (filters.employee_id) whParams.append('user_id', filters.employee_id)
      if (filters.date_from) whParams.append('date_from', filters.date_from)
      if (filters.date_to) whParams.append('date_to', filters.date_to)

      const [aRes, wRes, projectsData, usersData, whRes, psRes] = await Promise.all([
        api.get(`/global/assignments?${aParams}`),
        api.get(`/global/workload?${wParams}`),
        getProjectsList(),
        getUsersList(),
        api.get(`/work-hours/summary?${whParams}`).catch(() => ({ data: null })),
        api.get(`/global/project-status?${wParams}`).catch(() => ({ data: [] })),
      ])
      setAssignments(aRes.data)
      setWorkload(wRes.data)
      setProjects(projectsData)
      setUsers(usersData)
      setWhSummary(whRes.data)
      setProjectStatus(psRes.data || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const _loadTimer = useRef(null)
  useEffect(() => {
    clearTimeout(_loadTimer.current)
    _loadTimer.current = setTimeout(load, 300)
    return () => clearTimeout(_loadTimer.current)
  }, [filters])
  const setFilter = (k, v) => {
    if (k === 'date_from') {
      setFilters(f => ({...f, date_from: v, ...(v && f.date_to && v > f.date_to ? {date_to: v} : {})}))
    } else {
      setFilters(f => ({...f, [k]: v}))
    }
  }

  const now = new Date()
  const totalAssigned  = assignments.length
  const inProgress     = assignments.filter(a => a.status === 'In Progress').length
  const completed      = assignments.filter(a => a.status === 'Completed').length
  const overdue        = assignments.filter(a => a.is_overdue).length
  const completedOnTime= assignments.filter(a => a.status === 'Completed' && a.due_date && new Date(a.completed_at) <= new Date(a.due_date)).length
  const activeProjects = new Set(assignments.map(a => a.project_id)).size
  const activeMembers  = new Set(assignments.map(a => a.assigned_to)).size

  const pieData = [
    { name: 'Completed', value: completed },
    { name: 'In Progress', value: inProgress },
    { name: 'Not Started', value: assignments.filter(a => a.status === 'Not Started').length },
    { name: 'Overdue', value: overdue },
  ].filter(d => d.value > 0)

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
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-violet-600 text-sm transition-colors">🏠 Home</button>
            <span className="text-gray-200">/</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>📊</div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Global Dashboard</h1>
                <p className="text-xs text-gray-400">High-level overview across all projects</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <QuickRange label="7 days" from={daysAgo(7)} to={today()} />
            <QuickRange label="30 days" from={daysAgo(30)} to={today()} />
            <QuickRange label="90 days" from={daysAgo(90)} to={today()} />
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5">

        {/* Metric cards */}
        <div className="grid grid-cols-7 gap-3 mb-5 stagger">
          {[
            {icon:'📊', label:'Total Assigned', value:totalAssigned, color:'from-violet-100 to-purple-100'},
            {icon:'⚡', label:'In Progress', value:inProgress, color:'from-amber-100 to-orange-100'},
            {icon:'✅', label:'Completed', value:completed, color:'from-emerald-100 to-teal-100'},
            {icon:'🎯', label:'On Time', value:completedOnTime, color:'from-blue-100 to-cyan-100'},
            {icon:'🔥', label:'Overdue', value:overdue, color:'from-rose-100 to-pink-100'},
            {icon:'🏗️', label:'Active Projects', value:activeProjects, color:'from-indigo-100 to-violet-100'},
            {icon:'👥', label:'Active Members', value:activeMembers, color:'from-teal-100 to-emerald-100'},
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-3 text-center border border-white shadow-sm animate-fade-up`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-lg font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
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
              <input type="date" className="input text-xs h-8" value={filters.date_to} min={filters.date_from || undefined} onChange={e => setFilter('date_to', e.target.value)} />
            </div>
            <div className="flex items-end">
              <button onClick={() => setFilters({team:'',project_id:'',employee_id:'',date_from:daysAgo(30),date_to:today()})}
                className="btn text-xs h-8 w-full">🔄 Reset</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-violet-400 animate-pulse">
            <div className="text-4xl mb-3 animate-spin-slow">⚙️</div>
            <div className="text-sm">Loading dashboard...</div>
          </div>
        ) : (
          <>
            {/* Charts row */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              {/* Bar chart */}
              <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📈</span>
                  <span className="text-sm font-semibold text-gray-800">Task Performance by Employee</span>
                </div>
                {workload?.chart_data?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={workload.chart_data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{fontSize:10}} />
                      <YAxis tick={{fontSize:10}} />
                      <Tooltip contentStyle={{borderRadius:'12px',fontSize:'11px'}} />
                      <Legend wrapperStyle={{fontSize:'11px'}} />
                      <Bar dataKey="assigned" name="Assigned" fill="#7c3aed" radius={[4,4,0,0]} />
                      <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4,4,0,0]} />
                      <Bar dataKey="in_progress" name="In Progress" fill="#f59e0b" radius={[4,4,0,0]} />
                      <Line type="monotone" dataKey="overdue" name="Overdue" stroke="#ef4444" strokeWidth={2} dot={{r:3}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-400">
                    <div className="text-center">
                      <div className="text-3xl mb-2">📊</div>
                      <div className="text-xs">No data for selected period</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pie chart */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🎯</span>
                  <span className="text-sm font-semibold text-gray-800">Task Status Distribution</span>
                </div>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name,percent}) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius:'12px',fontSize:'11px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{background:COLORS_PIE[i]}} />
                            <span className="text-gray-600">{d.name}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-400">
                    <div className="text-center"><div className="text-3xl mb-2">🎯</div><div className="text-xs">No assignments yet</div></div>
                  </div>
                )}
              </div>
            </div>

            {/* Employee table */}
            {workload?.employees?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
                <div className="grid px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-semibold text-white"
                     style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr 1fr 2fr'}}>
                  <div>Employee</div><div className="text-center">Total</div><div className="text-center">✅ Done</div>
                  <div className="text-center">⚡ Active</div><div className="text-center">⏸️ Pending</div>
                  <div className="text-center">🔥 Overdue</div><div className="text-center">% Done</div><div>Progress</div>
                </div>
                {workload.employees.map((e, i) => (
                  <div key={e.user_id}
                    className={clsx('grid px-4 py-3 items-center border-b border-gray-50 last:border-0 text-xs', i%2===0?'bg-white':'bg-slate-50/30')}
                    style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr 1fr 2fr'}}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                           style={{background:`hsl(${e.user_id*60+200},65%,55%)`}}>
                        {e.name?.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{e.name}</div>
                        <div className="text-gray-400">{e.role === 'Functional Consultant' ? '🧩 FC' : e.role === 'Technical Team' ? '⚙️ TT' : e.role}</div>
                      </div>
                    </div>
                    <div className="text-center font-bold text-gray-900">{e.total}</div>
                    <div className="text-center font-semibold text-emerald-600">{e.completed}</div>
                    <div className="text-center font-semibold text-amber-600">{e.in_progress}</div>
                    <div className="text-center text-gray-500">{e.pending}</div>
                    <div className="text-center font-semibold text-rose-600">{e.overdue}</div>
                    <div className="text-center">
                      <span className={clsx('font-bold', e.completion_pct>=80?'text-emerald-600':e.completion_pct>=50?'text-amber-600':'text-rose-600')}>
                        {e.completion_pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full transition-all" style={{width:`${e.completion_pct}%`, background:e.completion_pct>=80?'#10b981':e.completion_pct>=50?'#f59e0b':'#ef4444'}} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Requirement 7(a): Project Status — Milestone Completion %, Task
                Completion %, and a per-project progress indicator (each
                project gets its own row/graph, driven by the Custom
                Milestone/Task hierarchy, not just assignments). */}
            {projectStatus.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📊</span>
                  <span className="text-sm font-semibold text-gray-800">Project Status</span>
                  <span className="text-xs text-gray-400 ml-auto">{projectStatus.length} project{projectStatus.length!==1?'s':''}</span>
                </div>
                <div className="space-y-3">
                  {projectStatus.map(p => (
                    <div key={p.project_id} className="rounded-xl border border-gray-50 p-3 hover:border-violet-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/projects/${p.project_id}/dashboard`)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-800 truncate">{p.project_name}</span>
                        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
                          p.overall_progress_pct>=80?'bg-emerald-50 text-emerald-600':p.overall_progress_pct>=40?'bg-amber-50 text-amber-600':'bg-rose-50 text-rose-600')}>
                          {p.overall_progress_pct}% overall
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>🏁 Milestones</span>
                            <span className="font-semibold text-gray-700">{p.milestone_completed}/{p.milestone_total} · {p.milestone_completion_pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-1.5 rounded-full bg-violet-500" style={{width:`${p.milestone_completion_pct}%`}} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>✅ Tasks</span>
                            <span className="font-semibold text-gray-700">{p.task_completed}/{p.task_total} · {p.task_completion_pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{width:`${p.task_completion_pct}%`}} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🏗️</span>
                  <span className="text-sm font-semibold text-gray-800">By Project</span>
                </div>
                <div className="space-y-2">
                  {projects
                    .filter(p => !filters.project_id || String(p.id) === String(filters.project_id))
                    .slice(0, 6).map(p => {
                    const pTasks = assignments.filter(a => a.project_id === p.id)
                    const pDone = pTasks.filter(a => a.status === 'Completed').length
                    const pct = pTasks.length ? Math.round(pDone/pTasks.length*100) : 0
                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="text-xs text-gray-700 flex-1 truncate font-medium">{p.name}</div>
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                          <div className="h-1.5 rounded-full bg-violet-500" style={{width:`${pct}%`}} />
                        </div>
                        <div className="text-xs text-gray-400 w-8 text-right">{pTasks.length}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">⏱️</span>
                  <span className="text-sm font-semibold text-gray-800">Work Hours Summary</span>
                </div>
                {workload?.summary ? (
                  <div className="space-y-3">
                    {[
                      {label:'Total hours logged', value:`${fmtHours(whSummary?.total_hours)}h`, icon:'⏱️'},
                      {label:'Buffer time', value:`${fmtHours(whSummary?.total_buffer_hours)}h`, icon:'⏳'},
                      {label:'Actual working hours', value:`${fmtHours(whSummary?.total_actual_working_hours)}h`, icon:'✅'},
                      {label:'Avg completion rate', value:`${workload.summary.avg_completion}%`, icon:'🎯'},
                      {label:'Active employees', value:workload.employees?.length || 0, icon:'👥'},
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{s.icon}</span> {s.label}
                        </div>
                        <div className="text-sm font-bold text-gray-900">{s.value}</div>
                      </div>
                    ))}
                    <button onClick={() => navigate('/global/hours')}
                      className="btn text-xs w-full justify-center mt-2 hover:text-violet-600 hover:border-violet-200">
                      ⏱️ View detailed work hours →
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-2xl mb-2">⏱️</div>
                    <div className="text-xs">No work hours logged yet</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
