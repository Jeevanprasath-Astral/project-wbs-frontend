import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmtDate, fmtHours } from '../../utils/helpers'
import api from '../../utils/api'
import { getProjectsList, getUsersList, getGlobalTeams, getProjectCustomMilestones } from '../../utils/masterData'
import clsx from 'clsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAppStore } from '../../store'

const today = () => new Date().toISOString().split('T')[0]
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }

export default function WorkHours() {
  const navigate = useNavigate()
  const currentUser = useAppStore(s => s.user)
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLog, setShowLog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [activeAssignments, setActiveAssignments] = useState([])
  const [teams, setTeams] = useState([])
  const [period, setPeriod] = useState('daily')
  const [filters, setFilters] = useState({ project_id:'', user_id:'', team:'', team_id:'', milestone_num:'', date_from: daysAgo(30), date_to: today() })
  const [form, setForm] = useState({ project_id:'', assignment_id:'', task_name:'', date: today(), start_time:'', end_time:'', hours_spent:'', assigned_hours:'', buffer_hours:'', buffer_category:'', notes:'',
    custom_milestone_id:'', custom_task_id:'', custom_subtask_id:'', activity_id:'' })
  const [cmMilestones, setCmMilestones] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k,v]) => v && params.append(k, v))
      const sParams = new URLSearchParams(params)
      sParams.append('period', period)
      const [rRes, sRes, projectsData, usersData, aRes, teamsData] = await Promise.all([
        api.get(`/work-hours?${params}`),
        api.get(`/work-hours/summary?${sParams}`),
        getProjectsList(),
        getUsersList(),
        api.get('/global/assignments'),
        getGlobalTeams().catch(() => []),
      ])
      setRecords(rRes.data)
      setSummary(sRes.data)
      setProjects(projectsData)
      setUsers(usersData)
      setActiveAssignments(aRes.data.filter(a => a.status !== 'Completed'))
      setTeams(teamsData)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters, period])
  const setFilter = (k, v) => setFilters(f => ({...f, [k]: v}))
  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  // Load the Milestone → Task → Subtask → Activity tree whenever the project changes,
  // so hours can be logged against the exact level configured in Milestone Configuration.
  useEffect(() => {
    if (!form.project_id) { setCmMilestones([]); return }
    getProjectCustomMilestones(form.project_id).then(setCmMilestones).catch(() => setCmMilestones([]))
  }, [form.project_id])

  const selMilestone = cmMilestones.find(m => String(m.id) === String(form.custom_milestone_id))
  const selTask = selMilestone?.tasks.find(t => String(t.id) === String(form.custom_task_id))
  const selSubtask = selTask?.subtasks.find(s => String(s.id) === String(form.custom_subtask_id))

  const pickLevel = (k, v) => {
    setForm(f => {
      const next = {...f, [k]: v}
      // Selecting a level clears the deeper levels and (if not already typed) suggests a task name.
      if (k === 'custom_milestone_id') { next.custom_task_id=''; next.custom_subtask_id=''; next.activity_id='' }
      if (k === 'custom_task_id') { next.custom_subtask_id=''; next.activity_id='' }
      if (k === 'custom_subtask_id') { next.activity_id='' }
      return next
    })
  }

  const handleLog = async () => {
    if (!form.task_name || !form.date) return
    setSaving(true)
    const level = form.activity_id ? 'Activity' : form.custom_subtask_id ? 'Subtask' : form.custom_task_id ? 'Task' : form.custom_milestone_id ? 'Milestone' : null
    try {
      await api.post('/work-hours', {
        ...form,
        project_id: form.project_id ? parseInt(form.project_id) : null,
        assignment_id: form.assignment_id ? parseInt(form.assignment_id) : null,
        level,
        custom_milestone_id: form.custom_milestone_id ? parseInt(form.custom_milestone_id) : null,
        custom_task_id: form.custom_task_id ? parseInt(form.custom_task_id) : null,
        custom_subtask_id: form.custom_subtask_id ? parseInt(form.custom_subtask_id) : null,
        activity_id: form.activity_id ? parseInt(form.activity_id) : null,
        start_time: form.start_time ? `${form.date}T${form.start_time}:00` : null,
        end_time: form.end_time ? `${form.date}T${form.end_time}:00` : null,
        hours_spent: parseFloat(form.hours_spent) || 0,
        assigned_hours: parseFloat(form.assigned_hours) || 0,
        buffer_hours: parseFloat(form.buffer_hours) || 0,
        buffer_category: form.buffer_category || null,
      })
      showMsg('Work hours logged successfully! ⏱️ It will also reflect in Milestone Configuration, Deadlines & Timesheet.')
      setShowLog(false)
      setForm({ project_id:'', assignment_id:'', task_name:'', date: today(), start_time:'', end_time:'', hours_spent:'', assigned_hours:'', buffer_hours:'', buffer_category:'', notes:'',
        custom_milestone_id:'', custom_task_id:'', custom_subtask_id:'', activity_id:'' })
      load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to log hours', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return
    await api.delete(`/work-hours/${id}`)
    load()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-violet-600 text-sm transition-colors">🏠 Home</button>
            <span className="text-gray-200">/</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#10b981,#3b82f6)'}}>⏱️</div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Work Hours Tracking</h1>
                <p className="text-xs text-gray-400">Track time spent across tasks and projects</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-violet-600 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 flex items-center gap-2">
            🗓️ <span>Log actual hours via <strong>Timesheet Calendar → Log</strong></span>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5">

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-6 gap-3 mb-5 stagger">
            {[
              {icon:'⏱️', label:'Total Time Taken', value:`${fmtHours(summary.total_hours)}h`, color:'from-violet-100 to-purple-100'},
              {icon:'📋', label:'Assigned Hours', value:`${fmtHours(summary.total_assigned)}h`, color:'from-blue-100 to-indigo-100'},
              {icon:'⏳', label:'Buffer Time', value:`${fmtHours(summary.total_buffer_hours)}h`, color:'from-rose-100 to-pink-100'},
              {icon:'✅', label:'Actual Working Hours', value:`${fmtHours(summary.total_actual_working_hours)}h`, color:'from-cyan-100 to-sky-100'},
              {icon:'📊', label:'Utilization Rate', value:`${summary.utilization}%`, color:'from-emerald-100 to-teal-100'},
              {icon:'📝', label:'Total Records', value:summary.total_records, color:'from-amber-100 to-orange-100'},
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 border border-white shadow-sm animate-fade-up`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="grid grid-cols-6 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">🏢 Project</label>
              <select className="select text-xs h-8" value={filters.project_id} onChange={e => setFilter('project_id', e.target.value)}>
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">👤 Employee</label>
              <select className="select text-xs h-8" value={filters.user_id} onChange={e => setFilter('user_id', e.target.value)}>
                <option value="">All employees</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">👥 Team</label>
              <select className="select text-xs h-8" value={filters.team} onChange={e => setFilter('team', e.target.value)}>
                <option value="">All teams</option>
                <option value="Functional Consultant">🧩 FC</option>
                <option value="Technical Team">⚙️ TT</option>
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
            <div className="flex items-end gap-1">
              {[{l:'7d',n:7},{l:'30d',n:30},{l:'3M',n:90}].map(r => (
                <button key={r.l} onClick={() => setFilters(f=>({...f,date_from:daysAgo(r.n),date_to:today()}))}
                  className="btn text-xs h-8 flex-1">{r.l}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-6 gap-3 mt-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">🧑‍🤝‍🧑 Team Hub</label>
              <select className="select text-xs h-8" value={filters.team_id} onChange={e => setFilter('team_id', e.target.value)}>
                <option value="">All teams</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">🏁 Milestone</label>
              <select className="select text-xs h-8" value={filters.milestone_num} onChange={e => setFilter('milestone_num', e.target.value)}>
                <option value="">All milestones</option>
                {[...new Set(activeAssignments.map(a => a.milestone_num).filter(Boolean))].sort((a,b)=>a-b).map(n => (
                  <option key={n} value={n}>M{String(n).padStart(2,'0')}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">📈 Time analysis view</label>
              <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
                {[{k:'daily',l:'Daily'},{k:'weekly',l:'Weekly'},{k:'monthly',l:'Monthly'}].map(p => (
                  <button key={p.k} onClick={() => setPeriod(p.k)}
                    className={clsx('px-3 py-1 rounded-lg text-xs font-medium flex-1 transition-all',
                      period === p.k ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div className={clsx('mb-4 px-4 py-2.5 rounded-xl text-sm animate-fade-up',
            msg.type==='error'?'bg-rose-50 text-rose-600':'bg-emerald-50 text-emerald-700')}>
            {msg.text}
          </div>
        )}

        {/* Charts + tables */}
        {!loading && summary && (
          <div className="grid grid-cols-3 gap-4 mb-5">
            {/* By employee chart */}
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-sm font-semibold text-gray-800 mb-4">⏱️ Hours by Employee</div>
              {summary.chart_data?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={summary.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{fontSize:10}} />
                    <YAxis tick={{fontSize:10}} />
                    <Tooltip contentStyle={{borderRadius:'12px',fontSize:'11px'}} />
                    <Legend wrapperStyle={{fontSize:'11px'}} />
                    <Bar dataKey="hours" name="Logged Hours" fill="#7c3aed" radius={[4,4,0,0]} />
                    <Bar dataKey="assigned" name="Assigned Hours" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48 text-gray-400 text-xs">No data yet</div>}
            </div>

            {/* Top tasks */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-sm font-semibold text-gray-800 mb-4">📋 Top Tasks by Hours</div>
              <div className="space-y-2">
                {summary.by_task?.slice(0,8).map((t,i) => (
                  <div key={t.name} className="flex items-center gap-2">
                    <div className="text-xs text-gray-400 w-4">{i+1}</div>
                    <div className="text-xs text-gray-700 flex-1 truncate">{t.name}</div>
                    <div className="text-xs font-bold text-violet-600">{fmtHours(t.total_hours)}h</div>
                  </div>
                ))}
                {!summary.by_task?.length && <div className="text-xs text-gray-400 text-center py-4">No records yet</div>}
              </div>
            </div>
          </div>
        )}

        {/* Team-wise + time-analysis */}
        {!loading && summary && (
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-sm font-semibold text-gray-800 mb-4">🧑‍🤝‍🧑 Team-wise Hours</div>
              <div className="space-y-2">
                {summary.by_team?.map(t => (
                  <div key={t.name} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <div className="text-xs font-medium text-gray-700">{t.name}</div>
                    <div className="text-xs text-gray-500">
                      <span className="font-bold text-violet-600">{fmtHours(t.actual_working_hours)}h</span> actual · {fmtHours(t.buffer_hours)}h buffer
                    </div>
                  </div>
                ))}
                {!summary.by_team?.length && <div className="text-xs text-gray-400 text-center py-4">No records yet</div>}
              </div>
            </div>
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="text-sm font-semibold text-gray-800 mb-4">📈 {period.charAt(0).toUpperCase()+period.slice(1)} Time Analysis</div>
              {summary.time_series?.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={summary.time_series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" tick={{fontSize:10}} />
                    <YAxis tick={{fontSize:10}} />
                    <Tooltip contentStyle={{borderRadius:'12px',fontSize:'11px'}} />
                    <Legend wrapperStyle={{fontSize:'11px'}} />
                    <Bar dataKey="actual_working_hours" name="Actual Working Hours" fill="#0891b2" radius={[4,4,0,0]} />
                    <Bar dataKey="buffer_hours" name="Buffer Time" fill="#f43f5e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-44 text-gray-400 text-xs">No data yet</div>}
            </div>
          </div>
        )}

        {/* Records table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-semibold text-white"
               style={{gridTemplateColumns:'1.3fr 1.3fr 1.6fr 0.9fr 0.9fr 0.9fr 0.8fr 0.9fr 1fr 0.8fr'}}>
            <div>Employee</div><div>Project</div><div>Task</div>
            <div>Date</div><div>Start</div><div>End</div>
            <div>Total</div><div>Buffer</div><div>Actual</div><div>Action</div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-emerald-400 animate-pulse">
              <div className="text-3xl mb-2">⏱️</div>
              <div className="text-xs">Loading work hours...</div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3 animate-float">⏱️</div>
              <p className="text-sm font-medium text-gray-700 mb-1">No work hours logged yet</p>
              <p className="text-xs text-gray-400 mb-4">Start tracking time spent on tasks</p>
              <p className="text-xs text-violet-500">Use Timesheet Calendar → 🗓️ Log to log your first entry</p>
            </div>
          ) : records.map((r, i) => (
            <div key={r.id}
              className={clsx('grid px-4 py-3 items-center border-b border-gray-50 last:border-0 text-xs hover:bg-emerald-50/20 transition-colors',
                i%2===0?'bg-white':'bg-slate-50/30')}
              style={{gridTemplateColumns:'1.3fr 1.3fr 1.6fr 0.9fr 0.9fr 0.9fr 0.8fr 0.9fr 1fr 0.8fr'}}>
              <div>
                <div className="font-semibold text-gray-800">{r.user_name}</div>
                <div className="text-gray-400">{r.team_name || r.user_role}</div>
              </div>
              <div className="text-gray-700 truncate">{r.project_name}</div>
              <div className="text-gray-700 truncate font-medium">
                {r.task_name}
                {r.milestone_num && <div className="text-gray-400">M{String(r.milestone_num).padStart(2,'0')}</div>}
              </div>
              <div className="text-gray-500">{r.date}</div>
              <div className="text-gray-500">{r.start_time ? new Date(r.start_time).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}) : '—'}</div>
              <div className="text-gray-500">{r.end_time ? new Date(r.end_time).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}) : '—'}</div>
              <div className="font-semibold text-gray-600">{fmtHours(r.hours_spent)}h</div>
              <div className="text-rose-500">{fmtHours(r.buffer_hours || 0)}h</div>
              <div className="font-bold text-cyan-600">{fmtHours(r.actual_working_hours)}h</div>
              <div>
                <button onClick={() => handleDelete(r.id)} className="btn text-xs py-1 px-2 hover:text-rose-600 hover:border-rose-200">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log hours is now centralised in Timesheet Calendar → 🗓️ Log button */}
    </div>
  )
}
