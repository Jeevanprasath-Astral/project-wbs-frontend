import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import api from '../utils/api'

const FIELDS = [
  [{ key:'name', label:'Project Name', icon:'📁', required:true },       { key:'client', label:'Client / Organisation', icon:'🏢', required:true }],
  [{ key:'business_unit', label:'Business Unit', icon:'🏗️' },            { key:'owner', label:'Project Owner', icon:'👤', required:true }],
  [{ key:'location', label:'Location', icon:'📍' },                       { key:'project_type', label:'Project Type', icon:'🔖', type:'select', options:['Implementation','Migration','Enhancement','Support','Custom Development'] }],
  [{ key:'start_date', label:'Start Date', icon:'📅', type:'date', required:true }, { key:'end_date', label:'Planned End Date', icon:'🏁', type:'date', required:true }],
  [{ key:'functional_consultant', label:'Functional Consultant', icon:'🧩' }, { key:'technical_lead', label:'Technical Lead', icon:'⚙️' }],
  [{ key:'description', label:'Project Description', icon:'📝', type:'textarea', span:2 }],
]

export default function ProjectSetup() {
  const navigate = useNavigate()
  const setActiveProject = useAppStore(s => s.setActiveProject)
  const [form, setForm] = useState({ project_type: 'Implementation' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await api.post('/projects', form)
      setActiveProject(res.data)
      navigate(`/projects/${res.data.id}/dashboard`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen p-6 flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f4ff 100%)' }}>
      <div className="w-full max-w-3xl animate-fade-up">

        <button onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 transition-colors mb-5">
          ← Back to projects
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
               style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>
            ✨
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create New Project</h1>
            <p className="text-xs text-gray-500">All 10 milestones will be set up automatically</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {FIELDS.map((row, ri) => (
              <div key={ri} className={`grid gap-4 ${row.length === 1 || row[0]?.span === 2 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {row.map(({ key, label, icon, type, options, required, span }) => (
                  <div key={key} className={span === 2 ? 'col-span-2' : ''}>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <span>{icon}</span> {label}
                      {required && <span className="text-rose-500">*</span>}
                    </label>
                    {type === 'select' ? (
                      <select className="select" value={form[key] || ''} onChange={e => set(key, e.target.value)}>
                        {options.map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : type === 'textarea' ? (
                      <textarea className="textarea" rows={3}
                        placeholder={`Describe the project...`}
                        value={form[key] || ''} onChange={e => set(key, e.target.value)} />
                    ) : (
                      <input className="input" type={type || 'text'}
                        placeholder={type === 'date' ? '' : `Enter ${label.toLowerCase()}`}
                        value={form[key] || ''} onChange={e => set(key, e.target.value)} required={required} />
                    )}
                  </div>
                ))}
              </div>
            ))}

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl">
                ⚠️ {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" className="btn" onClick={() => navigate('/projects')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="animate-spin">⟳</span> Creating…</> : <>✨ Create project</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
