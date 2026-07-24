import { useEffect, useState } from 'react'
import ConfirmModal from '../../components/common/ConfirmModal'
import { useParams } from 'react-router-dom'
import { fmtDate, fmtDateTime, fmtHours } from '../../utils/helpers'
import api from '../../utils/api'
import { getProjectTeam, getProjectCustomMilestones } from '../../utils/masterData'
import { useAppStore } from '../../store'
import { isElevated } from '../../utils/permissions'
import clsx from 'clsx'
import { dateRangeError } from '../../utils/dateRange'

const PRIORITY_CONFIG = {
  'High':   { cls: 'bg-rose-50 text-rose-700 border-rose-100',   icon: '🔴' },
  'Medium': { cls: 'bg-amber-50 text-amber-700 border-amber-100', icon: '🟡' },
  'Low':    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: '🟢' },
}
const STATUS_CONFIG = {
  'Not Started': { cls: 'badge-todo', icon: '⏸️' },
  'In Progress': { cls: 'badge-prog', icon: '⚡' },
  'Completed':   { cls: 'badge-done', icon: '✅' },
  'On Hold':     { cls: 'badge-hold', icon: '⏳' },
}
const MS_ICONS = ['🚀','🤝','🔍','📝','⚙️','🧪','📦','✅','🌟','🛡️']

// An assignment is a "General Task" when it isn't tied to any Milestone/Task
// in the Milestone Configuration hierarchy. Shared by the card (manual
// actual-time editor) and the page-level General/Milestone tab split below,
// so both always agree on what counts as which.
const isGeneralTask = (a) => !a.milestone_num && !a.custom_task_id

// Splits an ISO datetime ("2026-06-23T09:30:00") into separate date/time
// strings for the <input type="date"> + <input type="time"> pair below.
const splitDT = (iso) => iso ? { date: iso.slice(0, 10), time: iso.slice(11, 16) } : { date: '', time: '' }

function AssignmentCard({ a, onStatusChange, onDelete, isAdmin }) {
  const pc = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG['Medium']
  const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG['Not Started']
  const isOverdue = a.due_date && new Date(a.due_date) < new Date() && a.status !== 'Completed'
  // General task = not tied to any Milestone/Task in the Milestone
  // Configuration hierarchy. Actual Hours for ANY assignment (Milestone-tied
  // or General) come from Working Hours entries logged against it — General
  // tasks log via the "Linked task assignment" picker in Working Hours,
  // Milestone-tied tasks via the Milestone Configuration link. Actual
  // Start/End below is only a manual fallback for General tasks that have
  // no Working Hours entries logged yet at all.
  const isGeneral = isGeneralTask(a)

  return (
    <div className={clsx('bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all duration-200 animate-fade-up',
      isOverdue ? 'border-rose-200' : 'border-gray-100')}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium', pc.cls)}>
              {pc.icon} {a.priority}
            </span>
            <span className={sc.cls}>{sc.icon} {a.status}</span>
            {isOverdue && <span className="text-xs bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full font-medium">🔥 Overdue</span>}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{a.title}</h3>
        </div>
        {isAdmin && (
          <button onClick={() => onDelete(a.id)}
            className="text-gray-300 hover:text-rose-400 transition-colors flex-shrink-0 text-sm">🗑️</button>
        )}
      </div>

      {/* Description */}
      {a.description && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2">{a.description}</p>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-xs">
          <span className="text-gray-400">👤 Assigned to</span>
          <div className="font-medium text-gray-700 truncate">{a.assigned_to_name}</div>
          <div className="text-gray-400 truncate">{a.assigned_to_role}</div>
        </div>
        <div className="text-xs">
          <span className="text-gray-400">📌 Assigned by</span>
          <div className="font-medium text-gray-700 truncate">{a.assigned_by_name}</div>
          <div className="text-gray-400">{fmtDate(a.created_at)}</div>
        </div>
        {a.due_date && (
          <div className="text-xs">
            <span className="text-gray-400">📅 Due date</span>
            <div className={clsx('font-medium', isOverdue ? 'text-rose-600' : 'text-gray-700')}>
              {fmtDate(a.due_date)}
            </div>
          </div>
        )}
        <div className="text-xs">
          <span className="text-gray-400">🏁 Milestone</span>
          <div className="font-medium text-gray-700">
            {a.milestone_num
              ? <>{MS_ICONS[(a.milestone_num - 1) % MS_ICONS.length]} M{String(a.milestone_num).padStart(2,'0')}</>
              : <span className="text-gray-400">⭐ General Task</span>}
          </div>
        </div>
        <div className="text-xs">
          <span className="text-gray-400">🧩 Task</span>
          <div className="font-medium text-gray-700 truncate">
            {a.task_name && a.task_name !== 'General' ? a.task_name : <span className="text-gray-400">⭐ General Task</span>}
          </div>
        </div>
        {/* Planned date & time — entered up-front at assignment time, so the
            assignee knows when the work is expected to happen, separate
            from the (optional) hard due date. */}
        {(a.planned_start || a.planned_end) && (
          <div className="text-xs col-span-2">
            <span className="text-gray-400">🗓️ Planned</span>
            <div className="font-medium text-gray-700">
              {a.planned_start ? fmtDateTime(a.planned_start) : '—'}
              {' → '}
              {a.planned_end ? fmtDateTime(a.planned_end) : '—'}
            </div>
          </div>
        )}
      </div>

      {/* Actual hours — read-only total from Timesheet Calendar WorkHours entries */}
      <div className="flex items-center justify-between text-xs bg-cyan-50 border border-cyan-100 rounded-xl px-3 py-2 mb-2">
        <span className="text-cyan-700 font-medium">⏱️ Total actual hours</span>
        <span className="text-cyan-700 font-bold">{fmtHours(a.actual_hours)}h</span>
      </div>
      <div className="text-[11px] text-gray-400 mb-3 px-0.5">
        Log actual hours via Timesheet Calendar → 🗓️ Log
      </div>

      {/* Status update */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
        <span className="text-xs text-gray-400 flex-shrink-0">Update status:</span>
        <select
          className="select text-xs h-7 flex-1"
          value={a.status}
          onChange={e => onStatusChange(a.id, e.target.value)}>
          {['Not Started','In Progress','Completed','On Hold'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function AssignmentsPage() {
  const { id } = useParams()
  const user = useAppStore(s => s.user)
  // Backend only allows Admin/Functional Consultant to create assignments
  // (assignments.py: create_assignment 403s for any other role). The page
  // itself stayed open to every role (so Technical Team/Client can still see
  // assignments made *to* them), but the "Assign task" entry point wasn't
  // gated to match — so a Technical Team/Client user could fill out the
  // whole form and only find out it was rejected from a toast that
  // auto-dismisses in a few seconds, which read as "nothing happened."
  // Hiding the entry point for ineligible roles fixes that at the source.
  const canAssign = isElevated(user) || user?.role === 'Associate' || user?.role === 'Functional Consultant' || user?.role === 'Technical Team'
  // Backend's delete_assignment only allows Admin/FC Lead/TC Lead (not plain
  // Functional Consultant) — keep the Delete button's visibility in sync.
  const canDelete = isElevated(user)
  const [assignments, setAssignments] = useState([])
  const [team, setTeam] = useState([])
  const [customMilestones, setCustomMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  // General Tasks / Milestone Tasks tabs — keeps the two categories visually
  // separate instead of interleaved in one list, per the "organize task
  // management" request. Defaults to General since that's the simpler,
  // always-available bucket (every project has General tasks; not every
  // project has Milestones configured yet).
  const [activeTab, setActiveTab] = useState('general')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTeam, setFilterTeam] = useState('all')
  const [saving, setSaving] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const [message, setMessage] = useState(null)
  const [categories, setCategories] = useState([])
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [savingCat, setSavingCat] = useState(false)
  const DEFAULT_CATEGORIES = ['Business Development', 'Research & Development', 'Learning & Development']
  const [form, setForm] = useState({
    title: '', description: '', assigned_to: '',
    milestone_num: '', custom_task_id: '', priority: 'Medium', due_date: '', remarks: '', status: 'Not Started',
    category: '',
    // Planned date & time — entered up-front at assignment time (testing
    // feedback: "the planned date and time can be entered during
    // assignment"). Split into separate date + time inputs in the form for
    // usability, then combined into one ISO datetime before POSTing.
    planned_start_date: '', planned_start_time: '', planned_end_date: '', planned_end_time: '',
  })

  // Tasks available for the currently-selected Milestone in the form — used
  // to populate the Task dropdown. Empty when "General" is selected as the
  // Milestone (standalone task, not tied to the Milestone/Task hierarchy).
  const selectedMs = customMilestones.find(ms => String(ms.num) === String(form.milestone_num))
  const tasksForMs = selectedMs?.tasks || []
  const allCategories = [...DEFAULT_CATEGORIES, ...categories.map(c => c.name).filter(n => !DEFAULT_CATEGORIES.includes(n))]

  const loadCategories = async () => {
    try {
      const r = await api.get('/global/assignment-categories')
      setCategories(r.data)
    } catch(e) { console.error(e) }
  }

  const load = async () => {
    try {
      const [aRes, teamData, msData] = await Promise.all([
        api.get(`/projects/${id}/assignments`),
        getProjectTeam(id),
        getProjectCustomMilestones(id).catch(() => []),
      ])
      setAssignments(aRes.data)
      setTeam(teamData)
      setCustomMilestones(msData)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(); loadCategories() }, [id])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    // Errors stay up longer than success toasts — a 3s success confirmation
    // disappearing quickly is fine, but a failed "Assign task" needs enough
    // time to actually be read, or it looks like the click did nothing.
    setTimeout(() => setMessage(null), type === 'error' ? 6000 : 3000)
  }

  const resetForm = () => setForm({
    title:'', description:'', assigned_to:'', milestone_num:'', custom_task_id:'', priority:'Medium', due_date:'', remarks:'', status:'Not Started',
    category: '',
    planned_start_date:'', planned_start_time:'', planned_end_date:'', planned_end_time:'',
  })

  const handleCreateCategory = async () => {
    const name = newCatName.trim()
    if (!name) return
    setSavingCat(true)
    try {
      await api.post('/global/assignment-categories', { name })
      setNewCatName('')
      setShowCatModal(false)
      await loadCategories()
      setForm(f => ({...f, category: name}))
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to create category', 'error') }
    finally { setSavingCat(false) }
  }

  const handleCreate = async () => {
    // Previously this silently `return`ed when title/assigned_to were
    // missing, AND the button was `disabled` for the same condition. A
    // disabled <button> never fires onClick at all, so clicking it produced
    // literally no visible reaction — no toast, no network request, nothing
    // — which looked exactly like "the Assign task button doesn't work".
    // The button is no longer disabled for this case (see below); instead
    // we surface a real, visible error so a missing field is obvious.
    if (!form.title) { showMsg('Please enter a task title.', 'error'); return }
    if (!form.assigned_to) { showMsg('Please select who to assign this task to.', 'error'); return }
    if (form.planned_start_date && form.planned_end_date) {
      const drErr = dateRangeError(form.planned_start_date, form.planned_end_date)
      if (drErr) { showMsg('Planned ' + drErr, 'error'); return }
    }
    setSaving(true)
    try {
      // Pull the raw planned_*_date/time scratch fields out of the payload —
      // they're form-input state only, not part of the API schema. Sending
      // them too was harmless (FastAPI ignores unknown fields) but this keeps
      // the request to exactly what the backend expects.
      const { planned_start_date, planned_start_time, planned_end_date, planned_end_time, ...rest } = form
      await api.post(`/projects/${id}/assignments`, {
        ...rest,
        assigned_to: parseInt(form.assigned_to),
        milestone_num: form.milestone_num ? parseInt(form.milestone_num) : null,
        custom_task_id: form.custom_task_id ? parseInt(form.custom_task_id) : null,
        due_date: form.due_date || null,
        // Date + time are both required for a planned value to be saved —
        // time alone isn't enough to compute working hours against (req:
        // "working hours should be calculated based on both date and time").
        planned_start: (planned_start_date && planned_start_time)
          ? `${planned_start_date}T${planned_start_time}:00` : null,
        planned_end: (planned_end_date && planned_end_time)
          ? `${planned_end_date}T${planned_end_time}:00` : null,
      })
      showMsg('Task assigned successfully! 🎉')
      setShowModal(false)
      resetForm()
      load()
    } catch (e) {
      // FastAPI validation errors (422) return `detail` as an ARRAY of
      // {loc, msg, type} objects, not a string. Handing that array straight to
      // showMsg → rendered as {message.text} in JSX would throw "Objects are
      // not valid as a React child" and crash the render — so the click would
      // look like it did nothing at all, with zero visible error. Flatten it
      // to a readable string so a real error always shows up.
      const detail = e.response?.data?.detail
      const text = Array.isArray(detail)
        ? detail.map(d => (d.loc ? `${d.loc[d.loc.length - 1]}: ${d.msg}` : d.msg || JSON.stringify(d))).join('; ')
        : (typeof detail === 'string' ? detail : 'Failed to assign task')
      showMsg(text, 'error')
    } finally { setSaving(false) }
  }

  const handleStatusChange = async (aid, status) => {
    try {
      await api.patch(`/projects/${id}/assignments/${aid}`, { status })
      setAssignments(prev => prev.map(a => a.id === aid ? { ...a, status } : a))
      if (status === 'Completed') showMsg('Task marked as completed! ✅')
    } catch (e) { showMsg('Failed to update status', 'error') }
  }

  const handleDelete = (aid) => {
    setConfirmState({ title: 'Delete assignment?', message: 'This cannot be undone.', onConfirm: async () => { try {
      await api.delete(`/projects/${id}/assignments/${aid}`)
      setAssignments(prev => prev.filter(a => a.id !== aid))
      showMsg('Assignment deleted')
      load()
    } catch (e) { showMsg('Failed to delete', 'error') } } })
  }

  // Split by tab first — General Tasks vs Milestone Tasks never mix, so the
  // status/team filters and the summary cards below operate on just the
  // active tab's slice, not the whole project's assignments.
  const tabAssignments = assignments.filter(a => activeTab === 'general' ? isGeneralTask(a) : !isGeneralTask(a))
  const generalCount   = assignments.filter(isGeneralTask).length
  const milestoneCount = assignments.length - generalCount

  const filtered = tabAssignments.filter(a => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    const matchTeam   = filterTeam === 'all'   || a.team === filterTeam
    return matchStatus && matchTeam
  })

  // Status-breakdown summary cards — computed client-side from the active
  // tab's assignments (rather than a separate backend /summary call) so they
  // can never drift out of sync with what's actually shown below, and so
  // switching tabs/filters updates them instantly.
  const tabSummary = {
    total:       tabAssignments.length,
    not_started: tabAssignments.filter(a => a.status === 'Not Started').length,
    in_progress: tabAssignments.filter(a => a.status === 'In Progress').length,
    completed:   tabAssignments.filter(a => a.status === 'Completed').length,
    on_hold:     tabAssignments.filter(a => a.status === 'On Hold').length,
    overdue:     tabAssignments.filter(a => a.due_date && new Date(a.due_date) < new Date() && a.status !== 'Completed').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-violet-400">
      <div className="text-center animate-pulse">
        <div className="text-4xl mb-3 animate-float">📌</div>
        <div className="text-sm font-medium">Loading assignments...</div>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
               style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            📌
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Task Assignments</h1>
            <p className="text-xs text-gray-400">{assignments.length} total assignments · {generalCount} General · {milestoneCount} Milestone</p>
          </div>
        </div>
        {canAssign ? (
          <button onClick={() => setShowModal(true)} className="btn btn-primary text-xs">
            ➕ Assign task
          </button>
        ) : (
          <span className="text-xs text-gray-400" title="Only Admin or Functional Consultant can assign tasks">
            🔒 Only Admin / Functional Consultant can assign tasks
          </span>
        )}
      </div>

      {/* Message — fixed + z-[100] so it floats ABOVE the "Assign new task"
          modal (z-50). Previously this rendered inline in the page body, so
          while the modal was open (which is exactly when create/update errors
          happen) the modal's backdrop completely hid it: a failed "Assign
          task" click looked like nothing happened at all, with no visible
          error. */}
      {message && (
        <div className={clsx('fixed top-4 right-4 z-[100] shadow-lg mb-4 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 animate-fade-up max-w-sm',
          message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      {/* General Tasks / Milestone Tasks tabs — these two categories are kept
          strictly separate (never interleaved) so each list is easier to
          scan; switching tabs also re-scopes the status/team filters and the
          summary cards below to just that category. */}
      <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-100 p-1 shadow-sm mb-4 w-fit">
        <button onClick={() => setActiveTab('general')}
          className={clsx('px-4 py-2 rounded-lg text-xs font-semibold transition-all',
            activeTab === 'general' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-700')}>
          ⭐ General Tasks ({generalCount})
        </button>
        <button onClick={() => setActiveTab('milestone')}
          className={clsx('px-4 py-2 rounded-lg text-xs font-semibold transition-all',
            activeTab === 'milestone' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
          🏁 Milestone Tasks ({milestoneCount})
        </button>
      </div>

      {/* Summary cards — scoped to the active tab */}
      <div className="grid grid-cols-6 gap-3 mb-5 stagger">
        {[
          { icon:'📊', label:'Total', value: tabSummary.total, color:'from-violet-100 to-purple-100' },
          { icon:'⏸️', label:'Not Started', value: tabSummary.not_started, color:'from-slate-100 to-gray-100' },
          { icon:'⚡', label:'In Progress', value: tabSummary.in_progress, color:'from-amber-100 to-orange-100' },
          { icon:'✅', label:'Completed', value: tabSummary.completed, color:'from-emerald-100 to-teal-100' },
          { icon:'⏳', label:'On Hold', value: tabSummary.on_hold, color:'from-fuchsia-100 to-purple-100' },
          { icon:'🔥', label:'Overdue', value: tabSummary.overdue, color:'from-rose-100 to-pink-100' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-3 text-center border border-white animate-fade-up`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
          {['all','Not Started','In Progress','Completed','On Hold'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filterStatus === s ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              {s === 'all' ? '📋 All' : s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
          {['all','Functional Consultant','Technical Team'].map(t => (
            <button key={t} onClick={() => setFilterTeam(t)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filterTeam === t ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              {t === 'all' ? '👥 All teams' : t === 'Functional Consultant' ? '🧩 FC' : '⚙️ Tech'}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} shown</span>
      </div>

      {/* Assignment cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 animate-fade-up">
          <div className="text-5xl mb-3 animate-float">📌</div>
          <h2 className="text-base font-bold text-gray-700 mb-1">No assignments yet</h2>
          <p className="text-xs text-gray-400 mb-4">Assign tasks to your team members to track progress</p>
          {canAssign && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary text-xs">
              ➕ Create first assignment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 stagger">
          {filtered.map(a => (
            <AssignmentCard
              key={a.id} a={a}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              isAdmin={canDelete}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📌</span>
                <h2 className="text-sm font-semibold text-gray-900">Assign new task</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  📝 Task title <span className="text-rose-500">*</span>
                </label>
                <input className="input text-sm" placeholder="e.g. Complete FRD document review"
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">🏷️ Category</label>
                  <button type="button" onClick={() => { setNewCatName(''); setShowCatModal(true) }}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors">
                    <span className="text-base leading-none">＋</span> Custom
                  </button>
                </div>
                <select className="select text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="">— No category —</option>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📄 Description</label>
                <textarea className="textarea text-sm" rows={2}
                  placeholder="Add task details, instructions or context..."
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    👤 Assign to <span className="text-rose-500">*</span>
                  </label>
                  <select className="select text-sm" value={form.assigned_to}
                    onChange={e => setForm({...form, assigned_to: e.target.value})}>
                    <option value="">— Select person —</option>
                    {team.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">🔴 Priority</label>
                  <select className="select text-sm" value={form.priority}
                    onChange={e => setForm({...form, priority: e.target.value})}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">🏁 Milestone</label>
                  <select className="select text-sm" value={form.milestone_num}
                    onChange={e => setForm({...form, milestone_num: e.target.value, custom_task_id: ''})}>
                    <option value="">⭐ General Task (not tied to a Milestone)</option>
                    {customMilestones.map((ms, i) => (
                      <option key={ms.num} value={ms.num}>
                        {MS_ICONS[i % MS_ICONS.length]} M{String(ms.num).padStart(2,'0')} — {ms.name}
                      </option>
                    ))}
                  </select>
                  {customMilestones.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No milestones configured for this project yet.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">🧩 Task</label>
                  <select className="select text-sm" value={form.custom_task_id}
                    disabled={!form.milestone_num}
                    onChange={e => setForm({...form, custom_task_id: e.target.value})}>
                    <option value="">⭐ General Task (whole milestone / standalone)</option>
                    {tasksForMs.map(t => (
                      <option key={t.id} value={t.id}>
                        Task {String(t.num).padStart(2,'0')} — {t.name}
                      </option>
                    ))}
                  </select>
                  {!form.milestone_num && (
                    <p className="text-xs text-gray-400 mt-1">Select a Milestone to pick a specific Task, or leave both as General Task.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📅 Due date</label>
                <input type="date" className="input text-sm" value={form.due_date}
                  onChange={e => setForm({...form, due_date: e.target.value})} />
              </div>

              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-2">
                <label className="block text-xs font-semibold text-violet-700">🗓️ Planned date &amp; time (optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start date</label>
                    <input type="date" className="input text-xs h-8" value={form.planned_start_date}
                      onChange={e => {
                        const v = e.target.value
                        const shouldClear = v && form.planned_end_date && v > form.planned_end_date
                        setForm({...form, planned_start_date: v, ...(shouldClear ? {planned_end_date:''} : {})})
                      }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start time</label>
                    <input type="time" className="input text-xs h-8" value={form.planned_start_time}
                      onChange={e => setForm({...form, planned_start_time: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End date</label>
                    <input type="date" className="input text-xs h-8" value={form.planned_end_date}
                      min={form.planned_start_date || undefined}
                      onChange={e => {
                        const v = e.target.value
                        if (form.planned_start_date && v && v < form.planned_start_date) return
                        setForm({...form, planned_end_date: v})
                      }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End time</label>
                    <input type="time" className="input text-xs h-8" value={form.planned_end_time}
                      onChange={e => setForm({...form, planned_end_time: e.target.value})} />
                  </div>
                </div>
                <p className="text-xs text-violet-500">The assignee logs actual time later from Working Hours — it'll show up here and count toward the Working Hours calculation.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📊 Status</label>
                <select className="select text-sm" value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}>
                  {['Not Started','In Progress','Completed','On Hold'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">💬 Remarks</label>
                <textarea className="textarea text-sm" rows={2}
                  placeholder="Any additional notes..."
                  value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button className="btn text-xs" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary text-xs"
                onClick={handleCreate}
                disabled={saving}>
                {saving ? <><span className="animate-spin">⟳</span> Assigning…</> : <>📌 Assign task</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">➕ Create Custom Category</h3>
              <button onClick={() => setShowCatModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <input
              className="input text-sm mb-4"
              placeholder="e.g. Product Development"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCatModal(false)} className="btn text-xs">Cancel</button>
              <button onClick={handleCreateCategory} disabled={!newCatName.trim() || savingCat}
                className="btn btn-primary text-xs">
                {savingCat ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel="Delete"
        danger={true}
        onConfirm={() => { confirmState?.onConfirm(); setConfirmState(null) }}
        onCancel={() => setConfirmState(null)}
      />
  )
}
