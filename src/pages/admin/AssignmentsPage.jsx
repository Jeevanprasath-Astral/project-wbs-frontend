import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fmtDate, MILESTONES } from '../../utils/helpers'
import api from '../../utils/api'
import clsx from 'clsx'

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

function AssignmentCard({ a, onStatusChange, onDelete, isAdmin }) {
  const pc = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG['Medium']
  const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG['Not Started']
  const isOverdue = a.due_date && new Date(a.due_date) < new Date() && a.status !== 'Completed'

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
        {a.milestone_num && (
          <div className="text-xs">
            <span className="text-gray-400">🏁 Milestone</span>
            <div className="font-medium text-gray-700">
              {MS_ICONS[a.milestone_num - 1]} M{String(a.milestone_num).padStart(2,'0')}
            </div>
          </div>
        )}
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
  const [assignments, setAssignments] = useState([])
  const [team, setTeam] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTeam, setFilterTeam] = useState('all')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', assigned_to: '',
    milestone_num: '', priority: 'Medium', due_date: '', remarks: ''
  })

  const load = async () => {
    try {
      const [aRes, tRes, sRes] = await Promise.all([
        api.get(`/projects/${id}/assignments`),
        api.get(`/projects/${id}/team`),
        api.get(`/projects/${id}/assignments/summary`),
      ])
      setAssignments(aRes.data)
      setTeam(tRes.data)
      setSummary(sRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleCreate = async () => {
    if (!form.title || !form.assigned_to) return
    setSaving(true)
    try {
      await api.post(`/projects/${id}/assignments`, {
        ...form,
        assigned_to: parseInt(form.assigned_to),
        milestone_num: form.milestone_num ? parseInt(form.milestone_num) : null,
        due_date: form.due_date || null,
      })
      showMsg('Task assigned successfully! 🎉')
      setShowModal(false)
      setForm({ title:'', description:'', assigned_to:'', milestone_num:'', priority:'Medium', due_date:'', remarks:'' })
      load()
    } catch (e) {
      showMsg(e.response?.data?.detail || 'Failed to assign task', 'error')
    } finally { setSaving(false) }
  }

  const handleStatusChange = async (aid, status) => {
    try {
      await api.patch(`/projects/${id}/assignments/${aid}`, { status })
      setAssignments(prev => prev.map(a => a.id === aid ? { ...a, status } : a))
      if (status === 'Completed') showMsg('Task marked as completed! ✅')
    } catch (e) { showMsg('Failed to update status', 'error') }
  }

  const handleDelete = async (aid) => {
    if (!window.confirm('Delete this assignment?')) return
    try {
      await api.delete(`/projects/${id}/assignments/${aid}`)
      setAssignments(prev => prev.filter(a => a.id !== aid))
      showMsg('Assignment deleted')
      load()
    } catch (e) { showMsg('Failed to delete', 'error') }
  }

  const filtered = assignments.filter(a => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    const matchTeam   = filterTeam === 'all'   || a.team === filterTeam
    return matchStatus && matchTeam
  })

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
            <p className="text-xs text-gray-400">{assignments.length} total assignments</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary text-xs">
          ➕ Assign task
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={clsx('mb-4 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 animate-fade-up',
          message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-3 mb-5 stagger">
          {[
            { icon:'📊', label:'Total', value: summary.total, color:'from-violet-100 to-purple-100' },
            { icon:'⏸️', label:'Not Started', value: summary.not_started, color:'from-slate-100 to-gray-100' },
            { icon:'⚡', label:'In Progress', value: summary.in_progress, color:'from-amber-100 to-orange-100' },
            { icon:'✅', label:'Completed', value: summary.completed, color:'from-emerald-100 to-teal-100' },
            { icon:'🔥', label:'Overdue', value: summary.overdue, color:'from-rose-100 to-pink-100' },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-3 text-center border border-white animate-fade-up`}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
          {['all','Not Started','In Progress','Completed'].map(s => (
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
          <button onClick={() => setShowModal(true)} className="btn btn-primary text-xs">
            ➕ Create first assignment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 stagger">
          {filtered.map(a => (
            <AssignmentCard
              key={a.id} a={a}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              isAdmin={true}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📌</span>
                <h2 className="text-sm font-semibold text-gray-900">Assign new task</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  📝 Task title <span className="text-rose-500">*</span>
                </label>
                <input className="input text-sm" placeholder="e.g. Complete FRD document review"
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">🏁 Milestone (optional)</label>
                  <select className="select text-sm" value={form.milestone_num}
                    onChange={e => setForm({...form, milestone_num: e.target.value})}>
                    <option value="">— Not linked —</option>
                    {MILESTONES.map((ms, i) => (
                      <option key={ms.num} value={ms.num}>
                        {MS_ICONS[i]} M{String(ms.num).padStart(2,'0')} — {ms.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">📅 Due date</label>
                  <input type="date" className="input text-sm" value={form.due_date}
                    onChange={e => setForm({...form, due_date: e.target.value})} />
                </div>
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
                disabled={!form.title || !form.assigned_to || saving}>
                {saving ? <><span className="animate-spin">⟳</span> Assigning…</> : <>📌 Assign task</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
