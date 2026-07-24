import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import api from '../utils/api'
import { getUsersList, invalidateMasterData } from '../utils/masterData'
import clsx from 'clsx'
import { handleStartDate, handleEndDate, dateRangeError } from '../utils/dateRange'

const PROJECT_TYPES = [
  'Data Analytics',
  'Application Development',
  'Support',
  'Implementation',
  'Business Development',
]
const PROJECT_CATEGORIES = ['Billable', 'Non-Billable', 'R&D']

const ROLE_COLORS = {
  'Functional Consultant': 'bg-blue-50 text-blue-700 border-blue-100',
  'Technical Team': 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

function MultiPersonSelect({ label, icon, roleFilter, allUsers, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const filtered = allUsers.filter(u => u.role === roleFilter)

  const toggle = (u) => {
    const exists = selected.find(s => s.id === u.id)
    if (exists) {
      onChange(selected.filter(s => s.id !== u.id))
    } else {
      onChange([...selected, u])
    }
  }

  return (
    <div className="relative">
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
        <span>{icon}</span> {label}
      </label>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(u => (
            <div key={u.id}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
                ROLE_COLORS[roleFilter] || 'bg-gray-50 text-gray-600 border-gray-200')}>
              <div className="w-4 h-4 rounded-full bg-violet-400 flex items-center justify-center text-white text-xs flex-shrink-0" style={{fontSize:'8px'}}>
                {u.name?.slice(0,1).toUpperCase()}
              </div>
              {u.name}
              <button onClick={() => toggle(u)} className="text-gray-400 hover:text-rose-500 ml-0.5">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={clsx('w-full h-10 px-3.5 rounded-xl border text-sm text-left flex items-center justify-between transition-all',
          open ? 'border-violet-400 ring-2 ring-violet-100' : 'border-gray-200 hover:border-violet-300')}
      >
        <span className={selected.length ? 'text-gray-700' : 'text-gray-400'}>
          {selected.length ? `${selected.length} selected` : `Select ${label}...`}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">
              No {label} found. Add team members first.
            </div>
          ) : (
            filtered.map(u => {
              const isSelected = selected.find(s => s.id === u.id)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u)}
                  className={clsx('w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-violet-50 transition-colors border-b border-gray-50 last:border-0',
                    isSelected && 'bg-violet-50')}
                >
                  <div className={clsx('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300')}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                       style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
                    {u.name?.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{u.name}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </div>
                  {isSelected && <span className="text-violet-500 text-xs flex-shrink-0">✓ Selected</span>}
                </button>
              )
            })
          )}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-violet-600 font-medium">
              Done selecting →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectSetup() {
  const navigate = useNavigate()
  const setActiveProject = useAppStore(s => s.setActiveProject)
  const [allUsers, setAllUsers] = useState([])
  const [form, setForm] = useState({
    name: '',
    client: '',
    business_unit: '',
    owner: '',
    location: '',
    project_type: 'Implementation',
    project_category: 'Billable',
    start_date: '',
    end_date: '',
    description: '',
  })
  const [fcSelected, setFcSelected] = useState([])
  const [ttSelected, setTtSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getUsersList().then(setAllUsers).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const drErr = dateRangeError(form.start_date, form.end_date)
    if (drErr) { setError(drErr); return }
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        functional_consultant: fcSelected.map(u => u.name).join(', '),
        technical_lead: ttSelected.map(u => u.name).join(', '),
      }
      const res = await api.post('/projects', payload)
      invalidateMasterData() // a new project exists — projects-list cache is now stale
      setActiveProject(res.data)
      navigate(`/projects/${res.data.id}/dashboard`)
    } catch(err) {
      setError(err.response?.data?.detail || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6 flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 100%)' }}>
      <div className="w-full max-w-3xl animate-fade-up">

        <button onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 transition-colors mb-5">
          ← Back to home
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
               style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
            ✨
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create New Project</h1>
            <p className="text-xs text-gray-500">Configure milestones after creation in the Milestone Config tab</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Row 1: Name + Client */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  📁 Project Name <span className="text-rose-500">*</span>
                </label>
                <input className="input text-sm" placeholder="Enter project name"
                  value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  🏢 Client / Organisation <span className="text-rose-500">*</span>
                </label>
                <input className="input text-sm" placeholder="Enter client / organisation"
                  value={form.client} onChange={e => set('client', e.target.value)} required />
              </div>
            </div>

            {/* Row 2: Business Unit + Owner */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  🏗️ Business Unit
                </label>
                <input className="input text-sm" placeholder="Enter business unit"
                  value={form.business_unit} onChange={e => set('business_unit', e.target.value)} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  👤 Project Owner <span className="text-rose-500">*</span>
                </label>
                <select className="input text-sm" value={form.owner} onChange={e => set('owner', e.target.value)} required>
                  <option value="">Select project owner...</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Location + Project Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  📍 Location
                </label>
                <input className="input text-sm" placeholder="Enter location"
                  value={form.location} onChange={e => set('location', e.target.value)} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  🔖 Project Type
                </label>
                <select className="select text-sm" value={form.project_type} onChange={e => set('project_type', e.target.value)}>
                  {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3b: Project Category (Billing Classification) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  💰 Project Category
                  <span className="text-gray-400 font-normal">(billing classification)</span>
                </label>
                <select className="select text-sm" value={form.project_category} onChange={e => set('project_category', e.target.value)}>
                  {PROJECT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Row 4: Start + End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  📅 Start Date <span className="text-rose-500">*</span>
                </label>
                <input type="date" className="input text-sm"
                  value={form.start_date}
                  onChange={e => handleStartDate('start_date', 'end_date', e.target.value, form, setForm)}
                  required />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  🏁 Planned End Date <span className="text-rose-500">*</span>
                </label>
                <input type="date" className="input text-sm"
                  value={form.end_date}
                  min={form.start_date || undefined}
                  onChange={e => handleEndDate('start_date', 'end_date', e.target.value, form, setForm)}
                  required />
              </div>
            </div>

            {/* Row 5: FC multi-select */}
            <MultiPersonSelect
              label="Functional Consultants"
              icon="🧩"
              roleFilter="Functional Consultant"
              allUsers={allUsers}
              selected={fcSelected}
              onChange={setFcSelected}
            />

            {/* Row 6: TT multi-select */}
            <MultiPersonSelect
              label="Technical Leads"
              icon="⚙️"
              roleFilter="Technical Team"
              allUsers={allUsers}
              selected={ttSelected}
              onChange={setTtSelected}
            />

            {/* Description */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                📝 Project Description
              </label>
              <textarea className="textarea text-sm" rows={3}
                placeholder="Describe the project..."
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl">
                ⚠️ {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn" onClick={() => navigate('/')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading
                  ? <><span className="animate-spin">⟳</span> Creating…</>
                  : <>✨ Create project</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
