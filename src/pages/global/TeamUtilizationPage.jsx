import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import clsx from 'clsx'

const monthStart = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const today = () => new Date().toISOString().split('T')[0]
const fmt = (v, dec = 1) => (v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }))
const fmtCost = v => (v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const pct = v => v == null ? '—' : `${v}%`

export default function TeamUtilizationPage() {
  const [options,   setOptions]   = useState({ users: [], roles: [], projects: [] })
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)
  const [rows,      setRows]      = useState([])
  const [loadingData, setLoadingData] = useState(false)

  const [filters, setFilters] = useState({
    start_date: monthStart(),
    end_date:   today(),
    role:       '',
    user_id:    '',
    project_id: '',
  })

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/team-utilization-report/filter-options')
      .then(r => setOptions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadData = useCallback(async (f) => {
    setLoadingData(true)
    try {
      const params = new URLSearchParams()
      if (f.start_date) params.set('start_date', f.start_date)
      if (f.end_date)   params.set('end_date',   f.end_date)
      if (f.role)       params.set('role',        f.role)
      if (f.user_id)    params.set('user_id',     f.user_id)
      if (f.project_id) params.set('project_id',  f.project_id)
      const r = await api.get(`/team-utilization-report/data?${params}`)
      setRows(r.data.rows || [])
    } catch { setRows([]) }
    finally { setLoadingData(false) }
  }, [])

  useEffect(() => { loadData(filters) }, [filters, loadData])

  const handleRoleChange = v => setFilters(f => ({ ...f, role: v, user_id: '' }))
  const filteredUsers = filters.role ? options.users.filter(u => u.role === filters.role) : options.users

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (filters.start_date) params.set('start_date', filters.start_date)
      if (filters.end_date)   params.set('end_date',   filters.end_date)
      if (filters.role)       params.set('role',       filters.role)
      if (filters.user_id)    params.set('user_id',    filters.user_id)
      if (filters.project_id) params.set('project_id', filters.project_id)
      const res = await api.get(`/team-utilization-report/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'team-utilization-report.xlsx'; a.click()
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

        {/* Filters + Export */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filters</div>
            <button onClick={handleExport} disabled={exporting || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              {exporting ? <><span className="animate-spin">⟳</span> Generating…</> : <>📥 Export to Excel</>}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input type="date" className="input text-xs h-8" value={filters.start_date}
                onChange={e => { const v = e.target.value; setF('start_date', v); if (v && filters.end_date && v > filters.end_date) setF('end_date', '') }} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input type="date" className="input text-xs h-8" value={filters.end_date} min={filters.start_date || undefined}
                onChange={e => { if (filters.start_date && e.target.value && e.target.value < filters.start_date) return; setF('end_date', e.target.value) }} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role / Team</label>
              <select className="select text-xs h-8" value={filters.role} onChange={e => handleRoleChange(e.target.value)}>
                <option value="">All Roles</option>
                {options.roles.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Team Member</label>
              <select className="select text-xs h-8" value={filters.user_id} onChange={e => setF('user_id', e.target.value)}>
                <option value="">All Members</option>
                {filteredUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Project</label>
              <select className="select text-xs h-8" value={filters.project_id} onChange={e => setF('project_id', e.target.value)}>
                <option value="">All Projects</option>
                {options.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-700">👥 Preview</div>
            <div className="text-xs text-gray-400">{loadingData ? 'Loading…' : `${rows.length} member${rows.length !== 1 ? 's' : ''}`}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-violet-50 text-violet-700">
                  {['Name','Role','Total Hrs','Billable Hrs','Non-Billable Hrs','Util %','Manpower Cost (₹)','# Projects'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 animate-pulse">Loading data…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 italic">No work hours found for the selected filters.</td></tr>
                ) : rows.map((r, i) => {
                  const utilColor = r.util_pct == null ? 'text-gray-400' :
                    r.util_pct >= 80 ? 'bg-green-100 text-green-700' :
                    r.util_pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  return (
                    <tr key={i} className={clsx('border-b border-gray-50 hover:bg-violet-50 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-slate-50')}>
                      <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
                      <td className="px-3 py-2 text-gray-500">{r.role}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{fmt(r.total_hours)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700 font-medium">{fmt(r.billable_hours)}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{fmt(r.non_billable)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={clsx('px-1.5 py-0.5 rounded font-medium', utilColor)}>{pct(r.util_pct)}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">{fmtCost(r.manpower_cost)}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{r.project_count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 px-5 py-2 text-xs text-gray-400 border-t border-gray-50">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-100 inline-block"></span>≥ 80 % utilized</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-100 inline-block"></span>50–79 %</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 inline-block"></span>&lt; 50 %</span>
          </div>
        </div>

        {/* Setup reminder */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 text-xs text-amber-800">
          <span className="font-semibold">Before exporting:</span>{' '}
          Ensure <strong>Cost Rates</strong> are set for each team member in Financial Settings — otherwise Manpower Cost will show as ₹0.
        </div>

      </div>
    </div>
  )
}
