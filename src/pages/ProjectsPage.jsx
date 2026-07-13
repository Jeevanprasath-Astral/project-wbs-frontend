import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { fmtDate } from '../utils/helpers'
import { canCreateProject } from '../utils/permissions'
import api from '../utils/api'
import clsx from 'clsx'
import { handleStartDate, handleEndDate, dateRangeError } from '../utils/dateRange'

const STATUS_CONFIG = {
  'Completed':   { cls: 'badge-done', icon: '✅' },
  'In Progress': { cls: 'badge-prog', icon: '⚡' },
  'Not Started': { cls: 'badge-todo', icon: '⏸️' },
  'On Hold':     { cls: 'badge-hold', icon: '⏳' },
}

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed']

const PROJ_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
]

// Project category sections — order + display config
const CATEGORY_SECTIONS = [
  { key: 'Billable',     label: 'Billable Projects',     icon: '💰', banner: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
  { key: 'Non-Billable', label: 'Non-Billable Projects', icon: '🚫', banner: 'bg-gray-50 border-gray-200 text-gray-600' },
  { key: 'R&D',          label: 'R&D Projects',          icon: '🔬', banner: 'bg-violet-50 border-violet-100 text-violet-700' },
]

export default function ProjectsPage() {
  const navigate = useNavigate()
  const setActiveProject = useAppStore(s => s.setActiveProject)
  const user = useAppStore(s => s.user)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [msg, setMsg] = useState(null)

  // Edit modal state
  const [editProject, setEditProject] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // project to confirm

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500) }

  const load = (isRetry = false) => {
    if (!isRetry) setLoading(true)
    return api.get('/projects')
      .then(r => { setProjects(r.data); setError(false); return true })
      .catch(() => { setError(true); return false })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // Right after a backend restart (e.g. uvicorn --reload), requests can hit
    // the server mid-restart and fail with ECONNREFUSED for 20-30s while the
    // app boots (DB connection, scheduler, etc.).
    let cancelled = false
    const delays = [1500, 2000, 3000, 4000, 5000, 5000, 5000, 5000, 5000, 5000]
    const attempt = async (i) => {
      const ok = await load(i > 0)
      if (cancelled || ok) return
      if (i < delays.length) setTimeout(() => attempt(i + 1), delays[i])
    }
    attempt(0)
    return () => { cancelled = true }
  }, [])

  const open = (p) => {
    setActiveProject(p)
    navigate(`/projects/${p.id}/dashboard`)
  }

  const openEdit = (e, p) => {
    e.stopPropagation()
    setEditProject(p)
    setEditForm({
      name: p.name || '',
      client: p.client || '',
      owner: p.owner || '',
      business_unit: p.business_unit || '',
      location: p.location || '',
      description: p.description || '',
      status: p.status || 'Not Started',
      project_category: p.project_category || 'Billable',
      start_date: p.start_date ? p.start_date.split('T')[0] : '',
      end_date: p.end_date ? p.end_date.split('T')[0] : '',
    })
  }

  const handleEditSave = async () => {
    const drErr = dateRangeError(editForm.start_date, editForm.end_date)
    if (drErr) { showMsg(drErr, 'error'); return }
    setSavingEdit(true)
    try {
      const res = await api.patch(`/projects/${editProject.id}`, editForm)
      setProjects(prev => prev.map(p => p.id === editProject.id ? { ...p, ...res.data } : p))
      setEditProject(null)
      showMsg('Project updated!')
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to update', 'error') }
    finally { setSavingEdit(false) }
  }

  const handleStatusChange = async (e, p, newStatus) => {
    e.stopPropagation()
    try {
      await api.patch(`/projects/${p.id}`, { status: newStatus })
      setProjects(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus } : x))
    } catch(e) { showMsg('Failed to update status', 'error') }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeletingId(confirmDelete.id)
    try {
      await api.delete(`/projects/${confirmDelete.id}`)
      setProjects(prev => prev.filter(p => p.id !== confirmDelete.id))
      showMsg(`"${confirmDelete.name}" deleted`)
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to delete', 'error') }
    finally { setDeletingId(null); setConfirmDelete(null) }
  }

  const isAdmin = user?.role === 'Admin'
  const userCanCreateProject = canCreateProject(user)

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 100%)' }}
    >
      <div className="max-w-5xl mx-auto">

        {/* Toast */}
        {msg && (
          <div className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-up',
            msg.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          )}>
            {msg.text}
          </div>
        )}

        <div className="flex items-center justify-between mb-8 animate-fade-up">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  boxShadow: '0 8px 24px rgba(124,58,237,0.3)'
                }}
              >
                📋
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                My Projects{' '}
                <span className="text-gray-400 text-lg font-normal">
                  ({projects.length})
                </span>
              </h1>
            </div>
            <p className="text-sm text-gray-500 ml-13">
              Welcome back,{' '}
              <span className="font-medium text-violet-600">{user?.name}</span> 👋
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn text-xs hover:border-violet-200 hover:text-violet-600"
              onClick={() => navigate('/global/dashboard')}
            >
              🌐 Global Hub
            </button>
            {userCanCreateProject && (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/projects/new')}
              >
                ✨ New project
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                  <div className="flex-1">
                    <div className="h-4 w-48 bg-gray-200 rounded-xl mb-2" />
                    <div className="h-3 w-32 bg-gray-100 rounded-xl" />
                  </div>
                  <div className="w-24 h-2 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 animate-fade-up">
            <div className="text-7xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Couldn't load projects</h2>
            <p className="text-gray-500 text-sm mb-6">
              The server didn't respond — it may still be starting up.
            </p>
            <button className="btn btn-primary" onClick={() => load()}>
              🔄 Retry
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 animate-fade-up">
            <div className="text-7xl mb-4 animate-float">🚀</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No projects yet</h2>
            <p className="text-gray-500 text-sm mb-6">
              Create your first project to get started
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/projects/new')}
            >
              ✨ Create first project
            </button>
          </div>
        ) : (() => {
          // Group projects by category (default to 'Billable' if unset)
          const grouped = {}
          projects.forEach((p, i) => {
            const cat = p.project_category || 'Billable'
            if (!grouped[cat]) grouped[cat] = []
            grouped[cat].push({ ...p, _idx: i })
          })
          const activeSections = CATEGORY_SECTIONS.filter(s => grouped[s.key]?.length > 0)
          return (
            <div className="space-y-6">
              {activeSections.map(section => (
                <div key={section.key}>
                  {/* Section header */}
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border mb-3 ${section.banner}`}>
                    <span className="text-base">{section.icon}</span>
                    <span className="text-sm font-semibold">{section.label}</span>
                    <span className="ml-auto text-xs font-normal opacity-60">{grouped[section.key].length} project{grouped[section.key].length !== 1 ? 's' : ''}</span>
                  </div>
                  {/* Project cards */}
                  <div className="grid grid-cols-1 gap-3 stagger">
                    {grouped[section.key].map(p => {
                      const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG['Not Started']
                      const color = PROJ_COLORS[p._idx % PROJ_COLORS.length]
                      return (
                        <div
                          key={p.id}
                          onClick={() => open(p)}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all duration-200 overflow-hidden animate-fade-up group"
                        >
                          <div className="flex items-center gap-4 p-4">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg`}>
                              {p.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">{p.name}</span>
                                <span className={sc.cls}>{sc.icon} {p.status}</span>
                              </div>
                              <div className="text-xs text-gray-400">
                                🏢 {p.client} &nbsp;·&nbsp; 👤 {p.owner}
                                {p.start_date && <> &nbsp;·&nbsp; 📅 {fmtDate(p.start_date)} → {fmtDate(p.end_date)}</>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                              {/* Status dropdown */}
                              <select
                                value={p.status || 'Not Started'}
                                onChange={e => handleStatusChange(e, p, e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer"
                              >
                                {PROJECT_STATUSES.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              {/* Progress */}
                              <div className="text-right">
                                <div className="text-base font-bold text-gray-900">{p.progress || 0}%</div>
                                <div className="text-xs text-gray-400">complete</div>
                              </div>
                              <div className="w-16">
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-2 rounded-full bg-gradient-to-r ${color} transition-all`}
                                    style={{ width: `${p.progress || 0}%` }} />
                                </div>
                              </div>
                              {/* Edit button */}
                              <button
                                onClick={e => openEdit(e, p)}
                                className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center text-sm transition-colors"
                                title="Edit project"
                              >
                                ✏️
                              </button>
                              {/* Delete button — Admin only */}
                              {isAdmin && (
                                <button
                                  onClick={e => { e.stopPropagation(); setConfirmDelete(p) }}
                                  className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center text-sm transition-colors"
                                  title="Delete project"
                                >
                                  🗑️
                                </button>
                              )}
                              <span className="text-gray-300 group-hover:text-violet-400 transition-colors text-lg">→</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Edit Project Modal */}
      {editProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                     style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)'}}>\u270f\ufe0f</div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Edit Project</h2>
                  <p className="text-xs text-gray-400">{editProject.name}</p>
                </div>
              </div>
              <button onClick={() => setEditProject(null)} className="text-gray-400 hover:text-gray-600 text-lg">\u2715</button>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Project Name</label>
                  <input className="input text-sm" value={editForm.name}
                    onChange={e => setEditForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Client</label>
                  <input className="input text-sm" value={editForm.client}
                    onChange={e => setEditForm(f => ({...f, client: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Owner</label>
                  <input className="input text-sm" value={editForm.owner}
                    onChange={e => setEditForm(f => ({...f, owner: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Business Unit</label>
                  <input className="input text-sm" value={editForm.business_unit}
                    onChange={e => setEditForm(f => ({...f, business_unit: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
                  <select className="select text-sm" value={editForm.status}
                    onChange={e => setEditForm(f => ({...f, status: e.target.value}))}>
                    {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                  <select className="select text-sm" value={editForm.project_category}
                    onChange={e => setEditForm(f => ({...f, project_category: e.target.value}))}>
                    {['Billable', 'Non-Billable', 'R&D'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Start Date</label>
                  <input type="date" className="input text-sm" value={editForm.start_date}
                    onChange={e => handleStartDate('start_date', 'end_date', e.target.value, editForm, setEditForm)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">End Date</label>
                  <input type="date" className="input text-sm" value={editForm.end_date}
                    min={editForm.start_date || undefined}
                    onChange={e => handleEndDate('start_date', 'end_date', e.target.value, editForm, setEditForm)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Location</label>
                <input className="input text-sm" value={editForm.location}
                  onChange={e => setEditForm(f => ({...f, location: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                <textarea className="input text-sm h-20 resize-none" value={editForm.description}
                  onChange={e => setEditForm(f => ({...f, description: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end p-5 border-t border-gray-100">
              <button onClick={() => setEditProject(null)} className="btn text-sm">Cancel</button>
              <button onClick={handleEditSave} disabled={savingEdit} className="btn btn-primary text-sm">
                {savingEdit ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-up p-6 text-center">
            <div className="text-5xl mb-3">🗑️</div>
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete Project?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-semibold text-gray-800">"{confirmDelete.name}"</span> and all its
              data (milestones, tasks, assignments) will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="btn text-sm px-6">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deletingId === confirmDelete.id}
                className="btn text-sm px-6 bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
              >
                {deletingId === confirmDelete.id ? 'Deleting…' : '🗑️ Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
