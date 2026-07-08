import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../utils/api'
import { getUsersList, getProjectCustomMilestones } from '../../utils/masterData'
import { fmtHours } from '../../utils/helpers'
import clsx from 'clsx'
import { useAppStore } from '../../store'

const today = () => new Date().toISOString().split('T')[0]
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }

// Project-scoped Working Hours module. Previously the only place to log
// Working Hours was the Global Hub's Work Hours page (with a free-pick
// Project dropdown) — there was no way to log or review hours from inside
// a Project at all, which is what made the module "not function properly"
// in the Project context. This page is locked to the current project and
// is calculated from the two interlinked sources the requirement calls
// out explicitly: Milestone Time Management (granular Milestone/Task/
// Subtask/Activity links) and General Task Time Management (hours logged
// against a Task Assignment that isn't tied to the Milestone hierarchy).
export default function WorkingHours() {
  const { id: projectId } = useParams()
  const activeProject = useAppStore(s => s.activeProject)
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [users, setUsers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [cmMilestones, setCmMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLog, setShowLog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [filters, setFilters] = useState({ user_id:'', date_from: daysAgo(30), date_to: today() })
  const [form, setForm] = useState({ assignment_id:'', task_name:'', date: today(), start_time:'', end_time:'', hours_spent:'', assigned_hours:'', buffer_hours:'', buffer_category:'', notes:'',
    custom_milestone_id:'', custom_task_id:'', custom_subtask_id:'', activity_id:'' })

  // Request-sequencing guard: switching the Employee/From/To filters fires a
  // new load() before the previous one's network calls have resolved. Without
  // this, an earlier (broader/unfiltered) response can resolve *after* a
  // later (filtered) one and silently overwrite the screen with stale data —
  // e.g. picking an employee shows another employee's hours until you
  // happen to re-trigger a fetch. Only the most recently *started* call is
  // allowed to commit its results.
  const loadSeq = useRef(0)

  const load = async () => {
    const mySeq = ++loadSeq.current
    setLoading(true)
    try {
      const params = new URLSearchParams({ project_id: projectId })
      Object.entries(filters).forEach(([k,v]) => v && params.append(k, v))
      const [rRes, sRes, usersData, aRes, msData] = await Promise.all([
        api.get(`/work-hours?${params}`),
        api.get(`/work-hours/summary?${params}`),
        getUsersList(),
        api.get(`/projects/${projectId}/assignments`),
        getProjectCustomMilestones(projectId),
      ])
      if (mySeq !== loadSeq.current) return // a newer filter change superseded this request
      setRecords(rRes.data)
      setSummary(sRes.data)
      setUsers(usersData)
      setAssignments(aRes.data.filter(a => a.status !== 'Completed'))
      setCmMilestones(msData)
    } catch(e) { console.error(e) }
    finally { if (mySeq === loadSeq.current) setLoading(false) }
  }

  useEffect(() => { load() }, [projectId, filters])
  const setFilter = (k, v) => setFilters(f => ({...f, [k]: v}))
  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const selMilestone = cmMilestones.find(m => String(m.id) === String(form.custom_milestone_id))
  const selTask = selMilestone?.tasks.find(t => String(t.id) === String(form.custom_task_id))
  const selSubtask = selTask?.subtasks.find(s => String(s.id) === String(form.custom_subtask_id))

  const pickLevel = (k, v) => {
    setForm(f => {
      const next = {...f, [k]: v}
      if (k === 'custom_milestone_id') { next.custom_task_id=''; next.custom_subtask_id=''; next.activity_id='' }
      if (k === 'custom_task_id') { next.custom_subtask_id=''; next.activity_id='' }
      if (k === 'custom_subtask_id') { next.activity_id='' }
      return next
    })
  }

  // Milestone Time Management = entries logged against any granular
  // Milestone Configuration level (custom_milestone_id/task/subtask/activity),
  // OR against a Task Assignment that itself belongs to a milestone
  // (assignment.milestone_num set — shown as "(M01)" etc. in the Assignments
  // module). General Task Time Management = entries tied to an assignment
  // that the Assignments module itself labels "(General)" (no milestone_num),
  // or true freeform entries with no link at all. Hours logged from the
  // Global Timesheet are out of scope here — this page only reflects entries
  // tied to *this project's* Assignment module / Milestone Configuration.
  const isMilestoneLinked = r => !!(r.custom_milestone_id || r.custom_task_id || r.custom_subtask_id || r.activity_id || (r.assignment_id && r.milestone_num))
  const msRecords  = records.filter(isMilestoneLinked)
  const genRecords = records.filter(r => !isMilestoneLinked(r))
  const sumActual = rows => Math.round(rows.reduce((s,r) => s + (r.actual_working_hours || 0), 0) * 100) / 100
  const sumTotal  = rows => Math.round(rows.reduce((s,r) => s + (r.hours_spent || 0), 0) * 100) / 100

  const resetForm = () => setForm({ assignment_id:'', task_name:'', date: today(), start_time:'', end_time:'', hours_spent:'', assigned_hours:'', buffer_hours:'', buffer_category:'', notes:'',
    custom_milestone_id:'', custom_task_id:'', custom_subtask_id:'', activity_id:'' })

  const handleLog = async () => {
    if (!form.task_name || !form.date) return
    setSaving(true)
    const level = form.activity_id ? 'Activity' : form.custom_subtask_id ? 'Subtask' : form.custom_task_id ? 'Task' : form.custom_milestone_id ? 'Milestone' : null
    try {
      await api.post('/work-hours', {
        ...form,
        project_id: parseInt(projectId),
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
      showMsg('Working hours logged! It now reflects in Milestone Configuration, Team Workload & Deadlines.')
      setShowLog(false)
      resetForm()
      load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to log hours', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (rid) => {
    if (!window.confirm('Delete this record?')) return
    await api.delete(`/work-hours/${rid}`)
    load()
  }

  if (loading && !records.length) return (
    <div className="flex items-center justify-center h-64 text-emerald-400">
      <div className="text-center animate-pulse">
        <div className="text-4xl mb-3">⏱️</div>
        <div className="text-sm font-medium">Loading working hours...</div>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
               style={{ background: 'linear-gradient(135deg,#10b981,#3b82f6)' }}>⏱️</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Working Hours</h1>
            <p className="text-xs text-gray-400">{activeProject?.name || 'This project'} · Milestone + General Task time tracking</p>
          </div>
        </div>
        <button onClick={() => setShowLog(true)} className="btn btn-primary text-xs">⏱️ Log hours</button>
      </div>

      {msg && (
        <div className={clsx('mb-4 px-4 py-2.5 rounded-xl text-sm animate-fade-up',
          msg.type==='error'?'bg-rose-50 text-rose-600':'bg-emerald-50 text-emerald-700')}>
          {msg.text}
        </div>
      )}

      {/* Overall summary */}
      {summary && (
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[
            {icon:'⏱️', label:'Total Time Taken', value:fmtHours(summary.total_hours), color:'from-violet-100 to-purple-100'},
            {icon:'📋', label:'Assigned Hours', value:fmtHours(summary.total_assigned), color:'from-blue-100 to-indigo-100'},
            {icon:'⏳', label:'Buffer Time', value:fmtHours(summary.total_buffer_hours), color:'from-rose-100 to-pink-100'},
            {icon:'✅', label:'Actual Working Hours', value:fmtHours(summary.total_actual_working_hours), color:'from-cyan-100 to-sky-100'},
            {icon:'📊', label:'Utilization', value:`${summary.utilization}%`, color:'from-emerald-100 to-teal-100'},
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 border border-white shadow-sm`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-gray-900 mb-0.5">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Milestone Time Management vs General Task Time Management split */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-violet-700">🏁 Milestone Time Management</div>
            <span className="text-xs text-gray-400">{msRecords.length} records</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-violet-600">{fmtHours(sumActual(msRecords))}h</span>
            <span className="text-xs text-gray-400">actual of {fmtHours(sumTotal(msRecords))}h logged</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Hours logged directly against a Milestone / Task / Subtask / Activity.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-amber-700">⭐ General Task Time Management</div>
            <span className="text-xs text-gray-400">{genRecords.length} records</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{fmtHours(sumActual(genRecords))}h</span>
            <span className="text-xs text-gray-400">actual of {fmtHours(sumTotal(genRecords))}h logged</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Hours logged against a standalone / General task assignment, not tied to a Milestone.</p>
        </div>
      </div>

      {/* By person — Actual Hours calculated separately for each person
          within this project (testing feedback: "working hours should be
          calculated separately for each person and each project"). The
          backend already grouped this by employee for the date range/
          filters in effect; this surfaces it instead of leaving it unused. */}
      {summary?.by_employee?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="text-sm font-semibold text-gray-700 mb-3">👥 By person — {activeProject?.name || 'this project'}</div>
          <div className="grid grid-cols-1 gap-2">
            {[...summary.by_employee].sort((a,b) => b.actual_working_hours - a.actual_working_hours).map(e => (
              <div key={e.name} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50/60 border border-gray-50">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
                  {e.name?.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">{e.name}</div>
                  <div className="text-xs text-gray-400">{e.role} · {e.records} record{e.records===1?'':'s'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-cyan-600">{fmtHours(e.actual_working_hours)}h</div>
                  <div className="text-xs text-gray-400">of {fmtHours(e.total_hours)}h logged</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">👤 Employee</label>
            <select className="select text-xs h-8" value={filters.user_id} onChange={e => setFilter('user_id', e.target.value)}>
              <option value="">All employees</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
      </div>

      {/* Records table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-semibold text-white"
             style={{gridTemplateColumns:'1.2fr 1.7fr 0.7fr 0.9fr 0.9fr 0.8fr 0.8fr 0.9fr 0.7fr'}}>
          <div>Employee</div><div>Task / Level</div><div>Type</div>
          <div>Date</div><div>Total</div><div>Buffer</div><div>Actual</div><div>Notes</div><div>Action</div>
        </div>
        {records.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 animate-float">⏱️</div>
            <p className="text-sm font-medium text-gray-700 mb-1">No working hours logged yet</p>
            <p className="text-xs text-gray-400 mb-4">Log time against a Milestone level or a General task assignment</p>
            <button onClick={() => setShowLog(true)} className="btn btn-primary text-xs">⏱️ Log first entry</button>
          </div>
        ) : records.map((r, i) => (
          <div key={r.id}
            className={clsx('grid px-4 py-3 items-center border-b border-gray-50 last:border-0 text-xs hover:bg-emerald-50/20 transition-colors',
              i%2===0?'bg-white':'bg-slate-50/30')}
            style={{gridTemplateColumns:'1.2fr 1.7fr 0.7fr 0.9fr 0.9fr 0.8fr 0.8fr 0.9fr 0.7fr'}}>
            <div>
              <div className="font-semibold text-gray-800">{r.user_name}</div>
              <div className="text-gray-400">{r.user_role}</div>
            </div>
            <div className="text-gray-700 truncate font-medium">{r.task_name}</div>
            <div>
              {isMilestoneLinked(r)
                ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">🏁 {r.level || 'Milestone'}</span>
                : <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">⭐ General Task</span>}
            </div>
            <div className="text-gray-500">{r.date}</div>
            <div className="font-semibold text-gray-600">{fmtHours(r.hours_spent)}h</div>
            <div className="text-rose-500">{fmtHours(r.buffer_hours || 0)}h</div>
            <div className="font-bold text-cyan-600">{fmtHours(r.actual_working_hours)}h</div>
            <div className="text-gray-400 truncate">{r.notes || '—'}</div>
            <div>
              <button onClick={() => handleDelete(r.id)} className="btn text-xs py-1 px-2 hover:text-rose-600 hover:border-rose-200">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Log Hours Modal */}
      {showLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2"><span className="text-xl">⏱️</span><h2 className="text-sm font-semibold">Log Working Hours</h2></div>
              <button onClick={() => setShowLog(false)} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📅 Date <span className="text-rose-500">*</span></label>
                <input type="date" className="input text-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📋 Task name <span className="text-rose-500">*</span></label>
                <input className="input text-sm" placeholder="e.g. FRD review, Dashboard development"
                  value={form.task_name} onChange={e => setForm({...form, task_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">⭐ Linked task assignment (General Task Time Management)</label>
                <select className="select text-sm" value={form.assignment_id} onChange={e => setForm({...form, assignment_id: e.target.value})}>
                  <option value="">— Not linked —</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>{a.title} {a.milestone_num ? `(M${String(a.milestone_num).padStart(2,'0')})` : '(General Task)'}</option>
                  ))}
                </select>
              </div>

              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-2">
                <label className="block text-xs font-semibold text-violet-700">🏁 Milestone Time Management (optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select className="select text-xs h-8" value={form.custom_milestone_id} onChange={e => pickLevel('custom_milestone_id', e.target.value)}>
                    <option value="">Milestone…</option>
                    {cmMilestones.map(m => <option key={m.id} value={m.id}>M{String(m.num).padStart(2,'0')} — {m.name}</option>)}
                  </select>
                  <select className="select text-xs h-8" value={form.custom_task_id} onChange={e => pickLevel('custom_task_id', e.target.value)} disabled={!selMilestone}>
                    <option value="">Task…</option>
                    {selMilestone?.tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select className="select text-xs h-8" value={form.custom_subtask_id} onChange={e => pickLevel('custom_subtask_id', e.target.value)} disabled={!selTask}>
                    <option value="">Subtask…</option>
                    {selTask?.subtasks.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select className="select text-xs h-8" value={form.activity_id} onChange={e => setForm({...form, activity_id: e.target.value})} disabled={!selSubtask?.activities?.length}>
                    <option value="">Activity (optional)…</option>
                    {selSubtask?.activities?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <p className="text-xs text-violet-500">Leave blank to log this as a General Task entry instead.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">🕐 Start time</label>
                  <input type="time" className="input text-sm" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">🕐 End time</label>
                  <input type="time" className="input text-sm" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">⏱️ Hours spent</label>
                  <input type="number" step="0.5" className="input text-sm" placeholder="e.g. 2.5"
                    value={form.hours_spent} onChange={e => setForm({...form, hours_spent: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">📋 Assigned hours</label>
                  <input type="number" step="0.5" className="input text-sm" placeholder="e.g. 4"
                    value={form.assigned_hours} onChange={e => setForm({...form, assigned_hours: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">⏳ Buffer time (hrs)</label>
                  <input type="number" step="0.25" className="input text-sm" placeholder="e.g. 0.5"
                    value={form.buffer_hours} onChange={e => setForm({...form, buffer_hours: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">📂 Buffer category</label>
                  <select className="select text-sm" value={form.buffer_category} onChange={e => setForm({...form, buffer_category: e.target.value})}>
                    <option value="">— None —</option>
                    <option value="Break">Break</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Rework">Rework</option>
                    <option value="Blocked / Waiting">Blocked / Waiting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              {form.hours_spent && form.buffer_hours && (
                <div className="text-xs text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-xl px-3 py-2">
                  ✅ Actual working hours: <strong>{fmtHours(Math.max((parseFloat(form.hours_spent)||0) - (parseFloat(form.buffer_hours)||0), 0))}h</strong>
                  {' '}({fmtHours(form.hours_spent)}h total − {fmtHours(form.buffer_hours)}h buffer)
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📝 Notes</label>
                <textarea className="textarea text-sm" rows={2} placeholder="What did you work on?"
                  value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button className="btn text-xs" onClick={() => setShowLog(false)}>Cancel</button>
              <button className="btn btn-primary text-xs" onClick={handleLog}
                disabled={!form.task_name || !form.date || saving}>
                {saving ? <><span className="animate-spin">⟳</span> Logging…</> : <>⏱️ Log hours</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
