import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmtDate } from '../../utils/helpers'
import api from '../../utils/api'
import { getProjectsList, getUsersList } from '../../utils/masterData'
import { useAppStore } from '../../store'
import { isElevated } from '../../utils/permissions'
import clsx from 'clsx'

const PRIORITY_CFG = {
  High:   { cls: 'bg-rose-50 text-rose-700 border-rose-100',     dot: 'bg-rose-500',   icon: '🔴' },
  Medium: { cls: 'bg-amber-50 text-amber-700 border-amber-100',  dot: 'bg-amber-400',  icon: '🟡' },
  Low:    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-400', icon: '🟢' },
}
const STATUS_CFG = {
  'Not Started': { cls: 'badge-todo', icon: '⏸️' },
  'In Progress': { cls: 'badge-prog', icon: '⚡' },
  'Completed':   { cls: 'badge-done', icon: '✅' },
  'On Hold':     { cls: 'badge-hold', icon: '⏳' },
}

// An assignment is a "General Task" when it isn't tied to any Milestone/Task
// — same rule used on the per-project Assignments page, so a task counts as
// the same kind everywhere in the app.
const isGeneralTask = (a) => !a.milestone_num && !a.custom_task_id

export default function GlobalAssignments() {
  const navigate = useNavigate()
  const user = useAppStore(s => s.user)
  // Backend only allows Admin/FC Lead/TC Lead/Functional Consultant to
  // create assignments — keep the "Assign task" entry point in sync so
  // ineligible roles don't fill out the whole form only to get a 403 toast.
  const canAssign = isElevated(user) || user?.role === 'Associate' || user?.role === 'Functional Consultant' || user?.role === 'Technical Team'
  const [assignments, setAssignments] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ project_id:'', team:'', assigned_to:'', status:'', priority:'' })
  // General Tasks / Milestone Tasks tabs — mirrors the per-project Assignments
  // page split, so the two categories never appear interleaved here either.
  const [activeTab, setActiveTab] = useState('general')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ project_id:'', title:'', description:'', assigned_to:'', milestone_num:'', custom_task_id:'', priority:'Medium', due_date:'', team:'', remarks:'', status:'Not Started', category:'' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [categories, setCategories] = useState([])
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  const DEFAULT_CATEGORIES = ['Business Development', 'Research & Development', 'Learning & Development']
  const [formMilestones, setFormMilestones] = useState([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 12

  const loadCategories = async () => {
    try {
      const r = await api.get('/global/assignment-categories')
      setCategories(r.data)
    } catch(e) { console.error(e) }
  }

  const allCategories = [...DEFAULT_CATEGORIES, ...categories.map(c => c.name).filter(n => !DEFAULT_CATEGORIES.includes(n))]

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k,v]) => v && params.append(k, v))
      const [aRes, projectsData, usersData] = await Promise.all([
        api.get(`/global/assignments?${params}`),
        getProjectsList(),
        getUsersList(),
      ])
      setAssignments(aRes.data)
      setProjects(projectsData)
      setUsers(usersData)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

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

  // Split by tab first — General Tasks vs Milestone Tasks never mix, so the
  // summary cards, table, and pagination below all operate on just the
  // active tab's slice of the (already filter-scoped) assignments.
  const generalCount   = useMemo(() => assignments.filter(isGeneralTask).length, [assignments])
  const milestoneCount = assignments.length - generalCount
  const tabAssignments = useMemo(
    () => assignments.filter(a => activeTab === 'general' ? isGeneralTask(a) : !isGeneralTask(a)),
    [assignments, activeTab]
  )

  // Summary cards are derived directly from the (already filtered) assignments
  // list — previously these called a separate, unfiltered /summary endpoint,
  // so the cards never reflected the active filters even though the table did.
  const summary = useMemo(() => ({
    total:       tabAssignments.length,
    not_started: tabAssignments.filter(a => a.status === 'Not Started').length,
    in_progress: tabAssignments.filter(a => a.status === 'In Progress').length,
    completed:   tabAssignments.filter(a => a.status === 'Completed').length,
    // "On Hold" is a real, selectable status but wasn't counted in any
    // bucket here — Total included it while every other card silently
    // excluded it, so the cards never summed to Total once a task was put
    // on hold.
    on_hold:     tabAssignments.filter(a => a.status === 'On Hold').length,
    overdue:     tabAssignments.filter(a => a.is_overdue).length,
    by_team: {
      'Functional Consultant': tabAssignments.filter(a => a.team === 'Functional Consultant').length,
      'Technical Team':        tabAssignments.filter(a => a.team === 'Technical Team').length,
    },
  }), [tabAssignments])

  const totalPages = Math.max(1, Math.ceil(tabAssignments.length / PAGE_SIZE))
  const pagedAssignments = tabAssignments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const _loadTimer = useRef(null)
  useEffect(() => {
    clearTimeout(_loadTimer.current)
    _loadTimer.current = setTimeout(load, 300)
    return () => clearTimeout(_loadTimer.current)
  }, [filters])
  useEffect(() => { setPage(1) }, [filters, activeTab])
  useEffect(() => { loadCategories() }, [])

  useEffect(() => {
    if (!form.project_id) { setFormMilestones([]); return }
    api.get(`/projects/${form.project_id}/custom-milestones`)
      .then(r => setFormMilestones(r.data))
      .catch(() => setFormMilestones([]))
  }, [form.project_id])

  // Task dropdown — mirrors the per-project Assign Task modal: the Task
  // options come from whichever Milestone is currently selected.
  const formTasks = useMemo(() => {
    const ms = formMilestones.find(m => String(m.num) === String(form.milestone_num))
    return ms?.tasks || []
  }, [formMilestones, form.milestone_num])

  // Errors stay up longer than success toasts — a failed "Assign task" needs
  // enough time to actually be read, or it looks like the click did nothing.
  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null), type==='error' ? 6000 : 3000) }

  const handleCreate = async () => {
    // Previously this silently `return`ed when title/assigned_to were
    // missing, AND the button was `disabled` for the same condition. A
    // disabled <button> never fires onClick at all, so clicking it produced
    // no visible reaction whatsoever. The button is no longer disabled for
    // this case (see below) — instead we show a real, visible error.
    if (!form.title) { showMsg('Please enter a task title.', 'error'); return }
    if (!form.assigned_to) { showMsg('Please select who to assign this task to.', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        assigned_to: parseInt(form.assigned_to),
        milestone_num: form.project_id && form.milestone_num ? parseInt(form.milestone_num) : null,
        custom_task_id: form.project_id && form.milestone_num && form.custom_task_id ? parseInt(form.custom_task_id) : null,
        due_date: form.due_date || null,
      }
      if (form.project_id) {
        await api.post(`/projects/${form.project_id}/assignments`, payload)
      } else {
        // General Task — assigned to a person without linking to a project
        await api.post('/global/assignments', { ...payload, project_id: null })
      }
      showMsg(form.project_id ? 'Task assigned successfully! 🎉' : 'General task assigned successfully! 🎉')
      setShowModal(false)
      setForm({ project_id:'', title:'', description:'', assigned_to:'', milestone_num:'', custom_task_id:'', priority:'Medium', due_date:'', team:'', remarks:'', status:'Not Started', category:'' })
      load()
    } catch(e) {
      const detail = e.response?.data?.detail
      const errMsg = Array.isArray(detail)
        ? detail.map(d => d.msg || d.message || JSON.stringify(d)).join('; ')
        : (typeof detail === 'string' ? detail : 'Assignment failed. Please try again.')
      showMsg(errMsg, 'error')
    }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (a, status) => {
    await api.patch(`/global/assignments/${a.id}`, { status })
    setAssignments(prev => prev.map(x => x.id === a.id ? {...x, status} : x))
  }

  const setFilter = (k, v) => setFilters(f => ({...f, [k]: v}))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/projects')} className="text-gray-400 hover:text-violet-600 text-sm transition-colors">← Projects</button>
            <span className="text-gray-200">/</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>📌</div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Global Task Assignments</h1>
                <p className="text-xs text-gray-400">{assignments.length} total · {generalCount} General · {milestoneCount} Milestone</p>
              </div>
            </div>
          </div>
          {canAssign && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary text-xs">➕ Assign task</button>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5">

        {/* General Tasks / Milestone Tasks tabs */}
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

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-7 gap-3 mb-5 stagger">
            {[
              {icon:'📊', label:'Total', value:summary.total, color:'from-violet-100 to-purple-100'},
              {icon:'⏸️', label:'Not Started', value:summary.not_started, color:'from-slate-100 to-gray-100'},
              {icon:'⚡', label:'In Progress', value:summary.in_progress, color:'from-amber-100 to-orange-100'},
              {icon:'✅', label:'Completed', value:summary.completed, color:'from-emerald-100 to-teal-100'},
              {icon:'⏳', label:'On Hold', value:summary.on_hold, color:'from-fuchsia-100 to-purple-100'},
              {icon:'🔥', label:'Overdue', value:summary.overdue, color:'from-rose-100 to-pink-100'},
              {icon:'👥', label:'FC / TT', value:`${summary.by_team['Functional Consultant']} / ${summary.by_team['Technical Team']}`, color:'from-blue-100 to-indigo-100'},
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
            <span className="text-xs font-semibold text-gray-700">Filters</span>
            {Object.values(filters).some(v=>v) && (
              <button onClick={() => setFilters({project_id:'',team:'',assigned_to:'',status:'',priority:''})}
                className="ml-auto text-xs text-violet-600 hover:underline">Clear all</button>
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
              <label className="block text-xs text-gray-500 mb-1">📊 Status</label>
              <select className="select text-xs h-8" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
                <option value="">All statuses</option>
                {['Not Started','In Progress','Completed','On Hold'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">🔴 Priority</label>
              <select className="select text-xs h-8" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
                <option value="">All priorities</option>
                {['High','Medium','Low'].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Message — fixed + z-[100] so it floats ABOVE the "Assign task" modal
            (z-50). Previously this rendered inline in the page body, so while
            the modal was open (exactly when create errors happen) the modal's
            backdrop hid it completely — a failed click looked like nothing
            happened at all. */}
        {msg && (
          <div className={clsx('fixed top-4 right-4 z-[100] shadow-lg px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 animate-fade-up max-w-sm',
            msg.type==='error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')}>
            {msg.type==='error'?'⚠️':'✅'} {msg.text}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-semibold text-white"
               style={{gridTemplateColumns:'1.8fr 1.3fr 1fr 1.2fr 1fr 1fr 1fr 1.2fr 1fr'}}>
            <div>Task</div><div>Project</div><div>Milestone</div><div>Assigned To</div>
            <div>Team</div><div>Priority</div><div>Due Date</div>
            <div>Status</div><div>Action</div>
          </div>

          {/* Scrollable row area — previously rows had no max-height/overflow
              wrapper and grid cells had no min-w-0/truncate, so a long
              title/description/name could push a row's columns wider than its
              fr-track, making adjacent rows look like they overlap. Pairing
              min-w-0+truncate on every cell with this fixed-height scroll
              container (plus pagination below) fixes both. */}
          <div className="max-h-[34rem] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-violet-400 animate-pulse">
              <div className="text-3xl mb-2">⚡</div>
              <div className="text-xs">Loading assignments...</div>
            </div>
          ) : tabAssignments.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3 animate-float">📌</div>
              <p className="text-sm font-medium text-gray-700 mb-1">No {activeTab === 'general' ? 'General' : 'Milestone'} Tasks found</p>
              <p className="text-xs text-gray-400 mb-4">Try changing the filters, switching tabs, or create a new assignment</p>
              {canAssign && (
                <button onClick={() => setShowModal(true)} className="btn btn-primary text-xs">➕ Assign task</button>
              )}
            </div>
          ) : pagedAssignments.map((a, i) => {
            const pc = PRIORITY_CFG[a.priority] || PRIORITY_CFG.Medium
            const sc = STATUS_CFG[a.status] || STATUS_CFG['Not Started']
            return (
              <div key={a.id}
                className={clsx('grid px-4 py-3 items-center border-b border-gray-50 last:border-0 hover:bg-violet-50/20 transition-colors text-xs',
                  i%2===0?'bg-white':'bg-slate-50/30',
                  a.is_overdue && 'border-l-2 border-rose-300')}
                style={{gridTemplateColumns:'1.8fr 1.3fr 1fr 1.2fr 1fr 1fr 1fr 1.2fr 1fr'}}>
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800 truncate" title={a.title}>{a.title}</div>
                  {a.description && <div className="text-gray-400 truncate mt-0.5" title={a.description}>{a.description}</div>}
                  {a.is_overdue && <span className="text-rose-500 font-medium">🔥 Overdue</span>}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-700 truncate" title={a.project_name}>{a.project_name}</div>
                  <div className="text-gray-400 truncate" title={a.project_client}>{a.project_client}</div>
                </div>
                <div className="font-medium text-violet-700 min-w-0 truncate">
                  {a.milestone_num ? `M${String(a.milestone_num).padStart(2,'0')}` : <span className="text-gray-300">—</span>}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-700 truncate" title={a.assigned_to_name}>{a.assigned_to_name}</div>
                  <div className="text-gray-400 truncate">{a.assigned_to_role}</div>
                </div>
                <div className="text-gray-500 min-w-0 truncate">{a.team === 'Functional Consultant' ? '🧩 FC' : a.team === 'Technical Team' ? '⚙️ TT' : a.team}</div>
                <div className="min-w-0">
                  <span className={clsx('px-2 py-0.5 rounded-full border font-medium whitespace-nowrap', pc.cls)}>
                    {pc.icon} {a.priority}
                  </span>
                </div>
                <div className="min-w-0">
                  {a.due_date ? (
                    <>
                      <div className={clsx('truncate', a.is_overdue ? 'text-rose-600 font-medium' : 'text-gray-700')}>{fmtDate(a.due_date)}</div>
                      {a.days_left !== null && <div className={a.is_overdue ? 'text-rose-400' : 'text-gray-400'}>{a.is_overdue ? `${Math.abs(a.days_left)}d late` : `${a.days_left}d left`}</div>}
                    </>
                  ) : <span className="text-gray-300">—</span>}
                </div>
                <div className="min-w-0">
                  <select className="select text-xs h-7 w-full" value={a.status}
                    onChange={e => handleStatusChange(a, e.target.value)}>
                    {['Not Started','In Progress','Completed','On Hold'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="min-w-0">
                  {a.project_id ? (
                    <button onClick={() => navigate(`/projects/${a.project_id}/assignments`)}
                      className="btn text-xs py-1 px-2 hover:text-violet-600 hover:border-violet-200 whitespace-nowrap">
                      View →
                    </button>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <span>{tabAssignments.length} assignment{tabAssignments.length===1?'':'s'} • page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button className="btn text-xs py-1 px-2" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>← Prev</button>
            <button className="btn text-xs py-1 px-2" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next →</button>
          </div>
        </div>
      </div>

      {/* Create Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-up p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">➕ Create Custom Category</h3>
              <button onClick={() => setShowCatModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <input
              className="input text-sm w-full mb-3"
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2"><span className="text-xl">📌</span><h2 className="text-sm font-semibold">Assign new task</h2></div>
              <button onClick={() => setShowModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">🏢 Project</label>
                <select className="select text-sm" value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}>
                  <option value="">📋 General Task — not linked to a project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {!form.project_id && (
                  <p className="text-xs text-gray-400 mt-1">This task will be assigned directly to the person, without belonging to any project.</p>
                )}
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
                <label className="block text-xs font-medium text-gray-600 mb-1">📝 Task title <span className="text-rose-500">*</span></label>
                <input className="input text-sm" placeholder="e.g. Complete FRD document review"
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📄 Description</label>
                <textarea className="textarea text-sm" rows={2} placeholder="Task details..."
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">👤 Assign to <span className="text-rose-500">*</span></label>
                  <select className="select text-sm" value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}>
                    <option value="">— Select person —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">👥 Team</label>
                  <select className="select text-sm" value={form.team} onChange={e => setForm({...form, team: e.target.value})}>
                    <option value="">— Select team —</option>
                    <option>Functional Consultant</option>
                    <option>Technical Team</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">🏁 Milestone</label>
                  <select className="select text-sm" value={form.milestone_num}
                    onChange={e => setForm({...form, milestone_num: e.target.value, custom_task_id: ''})}
                    disabled={!form.project_id}>
                    <option value="">— Not linked —</option>
                    {formMilestones.map(ms => (
                      <option key={ms.num} value={ms.num}>M{String(ms.num).padStart(2,'0')} — {ms.name}</option>
                    ))}
                  </select>
                  {form.project_id && formMilestones.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No milestones configured for this project yet.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">✅ Task</label>
                  <select className="select text-sm" value={form.custom_task_id}
                    onChange={e => setForm({...form, custom_task_id: e.target.value})}
                    disabled={!form.milestone_num}>
                    <option value="">— Not linked —</option>
                    {formTasks.map(t => (
                      <option key={t.id} value={t.id}>T{String(t.num).padStart(2,'0')} — {t.name}</option>
                    ))}
                  </select>
                  {form.milestone_num && formTasks.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No tasks configured for this milestone yet.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">📊 Status</label>
                  <select className="select text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    {['Not Started','In Progress','Completed','On Hold'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">🔴 Priority</label>
                  <select className="select text-sm" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">📅 Due date</label>
                  <input type="date" className="input text-sm" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">💬 Remarks</label>
                <textarea className="textarea text-sm" rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button className="btn text-xs" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary text-xs" onClick={handleCreate}
                disabled={saving}>
                {saving ? <><span className="animate-spin">⟳</span> Assigning…</> : <>📌 Assign task</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
