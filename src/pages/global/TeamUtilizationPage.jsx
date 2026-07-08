import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import clsx from 'clsx'

const monthStart = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const today = () => new Date().toISOString().split('T')[0]

const KPI_CARDS = [
  {
    icon: '⏱️',
    label: 'Total Hours',
    desc: 'All hours logged by the team member across every project in the selected period, including non-billable time.',
    color: 'bg-blue-50 border-blue-100',
  },
  {
    icon: '💼',
    label: 'Billable Hours',
    desc: 'Hours marked as billable in the Timesheet Calendar or Work Hours page. These are the hours you can invoice the client for.',
    color: 'bg-emerald-50 border-emerald-100',
  },
  {
    icon: '📉',
    label: 'Non-Billable Hours',
    desc: 'Total Hours minus Billable Hours. Includes internal meetings, training, admin work, and hours explicitly marked non-billable.',
    color: 'bg-amber-50 border-amber-100',
  },
  {
    icon: '📊',
    label: 'Utilization %',
    desc: 'Billable Hours ÷ Total Hours × 100. Shows how much of logged time is revenue-generating. Green ≥ 80 %, Amber 50–79 %, Red < 50 %.',
    color: 'bg-violet-50 border-violet-100',
  },
  {
    icon: '💰',
    label: 'Manpower Cost (₹)',
    desc: 'Total Hours × the member\'s Cost Rate (set in Financial Settings). Represents the internal cost of employing this person on the project.',
    color: 'bg-rose-50 border-rose-100',
  },
  {
    icon: '🗂️',
    label: '# Projects',
    desc: 'Number of distinct projects this person logged hours against in the selected period.',
    color: 'bg-slate-50 border-slate-100',
  },
]

export default function TeamUtilizationPage() {
  const [options,  setOptions]  = useState({ users: [], roles: [], projects: [] })
  const [loading,  setLoading]  = useState(true)
  const [exporting, setExporting] = useState(false)

  const [filters, setFilters] = useState({
    start_date: monthStart(),
    end_date:   today(),
    role:       '',
    user_id:    '',
    project_id: '',
  })

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    try {
      const res = await api.get('/team-utilization-report/filter-options')
      setOptions(res.data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // When role changes, clear user selection (user might not match new role)
  const handleRoleChange = (v) => {
    setFilters(f => ({ ...f, role: v, user_id: '' }))
  }

  const filteredUsers = filters.role
    ? options.users.filter(u => u.role === filters.role)
    : options.users

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (filters.start_date) params.set('start_date', filters.start_date)
      if (filters.end_date)   params.set('end_date',   filters.end_date)
      if (filters.role)       params.set('role',       filters.role)
      if (filters.user_id)    params.set('user_id',    filters.user_id)
      if (filters.project_id) params.set('project_id', filters.project_id)

      const res = await api.get(`/team-utilization-report/export?${params}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'team-utilization-report.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
    finally { setExporting(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
               style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>⏰</div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Team Utilization Report</h1>
            <p className="text-xs text-gray-400">Per-person hours breakdown — billable vs non-billable, utilization rate, manpower cost</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5 space-y-5">

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-xs text-blue-800 leading-relaxed">
          <span className="font-semibold">What this report shows:</span>{' '}
          Hours logged by each team member across projects for the selected period, split into billable and non-billable time.
          The Excel export has two sheets — <strong>Summary</strong> (one row per person) and <strong>By Project</strong> (per person per project).
          Row colours indicate utilization: <span className="inline-block px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium">Green ≥ 80 %</span>{' '}
          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">Amber 50–79 %</span>{' '}
          <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Red &lt; 50 %</span>.
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filters</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input type="date" className="input text-xs h-8"
                value={filters.start_date}
                onChange={e => setF('start_date', e.target.value)} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input type="date" className="input text-xs h-8"
                value={filters.end_date}
                onChange={e => setF('end_date', e.target.value)} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Role / Team</label>
              <select className="select text-xs h-8"
                value={filters.role}
                onChange={e => handleRoleChange(e.target.value)}>
                <option value="">All Roles</option>
                {options.roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Team Member</label>
              <select className="select text-xs h-8"
                value={filters.user_id}
                onChange={e => setF('user_id', e.target.value)}>
                <option value="">All Members</option>
                {filteredUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Project</label>
              <select className="select text-xs h-8"
                value={filters.project_id}
                onChange={e => setF('project_id', e.target.value)}>
                <option value="">All Projects</option>
                {options.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* KPI explanation cards */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Report Columns Explained</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {KPI_CARDS.map(c => (
              <div key={c.label} className={clsx('rounded-2xl border px-4 py-3', c.color)}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-xs font-semibold text-gray-800">{c.label}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Setup reminder */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 text-xs text-amber-800">
          <span className="font-semibold">Before exporting:</span>{' '}
          Ensure <strong>Cost Rates</strong> are set for each team member in{' '}
          <strong>Financial Settings</strong> (Admin menu) — otherwise Manpower Cost will show as ₹0.
          Hours are sourced from the <strong>Timesheet Calendar</strong> and <strong>Work Hours</strong> pages.
        </div>

        {/* Export button */}
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            {exporting
              ? <><span className="animate-spin">⟳</span> Generating…</>
              : <>📥 Export to Excel</>}
          </button>
        </div>

      </div>
    </div>
  )
}
