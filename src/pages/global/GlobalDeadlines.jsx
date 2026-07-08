import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmtDate } from '../../utils/helpers'
import api from '../../utils/api'
import { getProjectsList, getUsersList } from '../../utils/masterData'
import clsx from 'clsx'

const DAYS_COLOR = (days) => {
  if (days <= 1) return 'text-rose-600 font-bold'
  if (days <= 3) return 'text-rose-500 font-medium'
  if (days <= 5) return 'text-amber-600 font-medium'
  return 'text-gray-600'
}

const DAYS_BG = (days) => {
  if (days <= 1) return 'bg-rose-100 text-rose-700 border-rose-200'
  if (days <= 3) return 'bg-orange-50 text-orange-700 border-orange-200'
  if (days <= 5) return 'bg-amber-50 text-amber-700 border-amber-100'
  return 'bg-emerald-50 text-emerald-700 border-emerald-100'
}

export default function GlobalDeadlines() {
  const navigate = useNavigate()
  const [deadlines, setDeadlines] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ project_id:'', team:'', assigned_to:'', priority:'', status:'', days: 7 })
  const [activeTab, setActiveTab] = useState('total')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k,v]) => v && params.append(k, v))
      const [dRes, projectsData, usersData] = await Promise.all([
        api.get(`/global/deadlines?${params}`),
        getProjectsList(),
        getUsersList(),
      ])
      setDeadlines(dRes.data)
      setProjects(projectsData)
      setUsers(usersData)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters])
  const setFilter = (k, v) => setFilters(f => ({...f, [k]: v}))

  const urgent   = deadlines.filter(d => d.days_remaining <= 2)
  const upcoming = deadlines.filter(d => d.days_remaining > 2 && d.days_remaining <= 5)
  const normal   = deadlines.filter(d => d.days_remaining > 5)

  const TAB_SETS = { critical: urgent, soon: upcoming, upcoming: normal, total: deadlines }
  const visibleDeadlines = TAB_SETS[activeTab] || deadlines

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/projects')} className="text-gray-400 hover:text-violet-600 text-sm transition-colors">← Projects</button>
            <span className="text-gray-200">/</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#f59e0b,#ef4444)'}}>📅</div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Global Upcoming Deadlines</h1>
                <p className="text-xs text-gray-400">Deadlines across all projects — next {filters.days} days</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Show next:</span>
            {[3,7,14].map(d => (
              <button key={d} onClick={() => setFilter('days', d)}
                className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                  filters.days === d ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-violet-300')}>
                {d} days
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5">

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { key:'critical', icon:'🔥', label:'Critical (≤2 days)', value: urgent.length, color:'from-rose-500 to-pink-600', text:'text-white' },
            { key:'soon', icon:'⚠️', label:'Soon (3-5 days)', value: upcoming.length, color:'from-amber-400 to-orange-500', text:'text-white' },
            { key:'upcoming', icon:'📅', label:'Upcoming (5-7 days)', value: normal.length, color:'from-blue-500 to-indigo-600', text:'text-white' },
            { key:'total', icon:'📊', label:'Total deadlines', value: deadlines.length, color:'from-violet-600 to-purple-700', text:'text-white' },
          ].map(s => (
            <button key={s.key} onClick={() => setActiveTab(s.key)}
              className={clsx(`bg-gradient-to-br ${s.color} rounded-2xl p-4 shadow-lg animate-fade-up text-left transition-transform`,
                activeTab === s.key ? 'ring-2 ring-offset-2 ring-violet-400 scale-[1.02]' : 'hover:scale-[1.01]')}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.text} mb-0.5`}>{s.value}</div>
              <div className={`text-xs ${s.text} opacity-80`}>{s.label}</div>
            </button>
          ))}
        </div>
        <div className="mb-3 text-xs text-gray-400">
          Showing: <span className="font-semibold text-gray-600">
            {activeTab === 'critical' ? 'Critical (≤2 days)' : activeTab === 'soon' ? 'Soon (3-5 days)' : activeTab === 'upcoming' ? 'Upcoming (5-7 days)' : 'All deadlines'}
          </span>
          {activeTab !== 'total' && (
            <button onClick={() => setActiveTab('total')} className="ml-2 text-violet-600 hover:underline">Clear</button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🔍</span>
            <span className="text-xs font-semibold text-gray-700">Filters</span>
            {Object.entries(filters).some(([k,v]) => k !== 'days' && v) && (
              <button onClick={() => setFilters(f => ({...f, project_id:'', team:'', assigned_to:'', priority:'', status:''}))}
                className="ml-auto text-xs text-violet-600 hover:underline">Clear filters</button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">🏢 Project</label>
              <select className="select text-xs h-8" value={filters.project_id} onChange={e => setFilter('project_id', e.target.value)}>
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">👥 Team</label>
              <select className="select text-xs h-8" value={filters.team} onChange={e => setFilter('team', e.target.value)}>
                <option value="">All teams</option>
                <option>Functional Consultant</option>
                <option>Technical Team</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">👤 Assigned to</label>
              <select className="select text-xs h-8" value={filters.assigned_to} onChange={e => setFilter('assigned_to', e.target.value)}>
                <option value="">All people</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">🔴 Priority</label>
              <select className="select text-xs h-8" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
                <option value="">All priorities</option>
                {['High','Medium','Low'].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">📊 Status</label>
              <select className="select text-xs h-8" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
                <option value="">All statuses</option>
                {['Not Started','In Progress','Completed'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Deadlines table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-semibold text-white"
               style={{gridTemplateColumns:'1.5fr 1.5fr 2fr 1.2fr 1fr 1fr 1fr 1fr'}}>
            <div>Project</div><div>Milestone</div><div>Task</div>
            <div>Assigned To</div><div>Team</div><div>Due Date</div>
            <div>Days Left</div><div>Status</div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-amber-400 animate-pulse">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-xs">Loading deadlines...</div>
            </div>
          ) : visibleDeadlines.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3 animate-float">🎉</div>
              <p className="text-sm font-medium text-gray-700 mb-1">No {activeTab !== 'total' ? 'matching' : 'upcoming'} deadlines!</p>
              <p className="text-xs text-gray-400">All tasks are on track for the next {filters.days} days</p>
            </div>
          ) : visibleDeadlines.map((d, i) => (
            <div key={`${d.type}-${i}`}
              className={clsx('grid px-4 py-3 items-center border-b border-gray-50 last:border-0 hover:bg-amber-50/20 transition-colors text-xs',
                i%2===0?'bg-white':'bg-slate-50/30',
                d.days_remaining <= 2 && 'border-l-2 border-rose-400')}
              style={{gridTemplateColumns:'1.5fr 1.5fr 2fr 1.2fr 1fr 1fr 1fr 1fr'}}>
              <div>
                <div className="font-semibold text-gray-800 truncate">{d.project_name}</div>
                <div className="text-gray-400 truncate">{d.project_client}</div>
              </div>
              <div className="font-medium text-violet-700">
                {d.milestone_num ? `M${String(d.milestone_num).padStart(2,'0')}` : '—'} {d.milestone_name !== '—' ? d.milestone_name : ''}
              </div>
              <div className="text-gray-700 truncate">{d.task_name !== '—' ? d.task_name : <span className="text-gray-400">Milestone deadline</span>}</div>
              <div className="font-medium text-gray-700">{d.assigned_to}</div>
              <div className="text-gray-500 text-xs">{d.team === 'Functional Consultant' ? '🧩 FC' : d.team === 'Technical Team' ? '⚙️ TT' : d.team}</div>
              <div className={DAYS_COLOR(d.days_remaining)}>{fmtDate(d.due_date)}</div>
              <div>
                <span className={clsx('px-2 py-0.5 rounded-full border text-xs font-medium', DAYS_BG(d.days_remaining))}>
                  {d.days_remaining === 0 ? '🔥 Today!' : d.days_remaining === 1 ? '⚡ Tomorrow' : `${d.days_remaining}d left`}
                </span>
              </div>
              <div>
                <span className={clsx('badge-todo',
                  d.status==='Completed'?'badge-done':d.status==='In Progress'?'badge-prog':'badge-todo')}>
                  {d.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-400 text-right">{visibleDeadlines.length} of {deadlines.length} deadlines in next {filters.days} days</div>
      </div>
    </div>
  )
}
