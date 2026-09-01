import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import clsx from 'clsx'

const monthStart = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const today = () => new Date().toISOString().split('T')[0]
const fmt = v => (v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const pct = v => v == null ? '—' : `${v}%`

const PROJECT_STATUSES  = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Overdue']
const COST_CATEGORIES   = [
  'Travel', 'Accommodation', 'Software & Licensing', 'Hardware & Equipment',
  'Training', 'Consulting & Outsourcing', 'Communication',
  'Indirect / Overhead', 'Miscellaneous', 'Other',
]

export default function CostBreakdownPage() {
  const [options,     setOptions]     = useState({ projects: [], statuses: [], categories: [] })
  const [loading,     setLoading]     = useState(true)
  const [exporting,   setExporting]   = useState(false)
  const [rows,        setRows]        = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [expanded,    setExpanded]    = useState({})   // pid → bool to show category breakdown

  const [filters, setFilters] = useState({
    project_id: '',
    status:     '',
    start_date: monthStart(),
    end_date:   today(),
    category:   '',
  })

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/cost-breakdown-report/filter-options')
      .then(r => setOptions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadData = useCallback(async (f) => {
    setLoadingData(true)
    try {
      const params = new URLSearchParams()
      if (f.project_id) params.set('project_id', f.project_id)
      if (f.status)     params.set('status',     f.status)
      if (f.start_date) params.set('start_date', f.start_date)
      if (f.end_date)   params.set('end_date',   f.end_date)
      if (f.category)   params.set('category',   f.category)
      const r = await api.get(`/cost-breakdown-report/data?${params}`)
      setRows(r.data.rows || [])
    } catch { setRows([]) }
    finally { setLoadingData(false) }
  }, [])

  useEffect(() => { loadData(filters) }, [filters, loadData])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (filters.project_id) params.set('project_id', filters.project_id)
      if (filters.status)     params.set('status',     filters.status)
      if (filters.start_date) params.set('start_date', filters.start_date)
      if (filters.end_date)   params.set('end_date',   filters.end_date)
      if (filters.category)   params.set('category',   filters.category)
      const res = await api.get(`/cost-breakdown-report/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'cost-breakdown-report.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
    finally { setExporting(false) }
  }

  const toggleExpand = key => setExpanded(e => ({ ...e, [key]: !e[key] }))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
               style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>💰</div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Cost Category Breakdown Report</h1>
            <p className="text-xs text-gray-400">Budget vs actual spend per project, broken down by expense category</p>
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
              <label className="block text-xs text-gray-500 mb-1">Project</label>
              <select className="select text-xs h-8" value={filters.project_id} onChange={e => setF('project_id', e.target.value)}>
                <option value="">All Projects</option>
                {options.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select className="select text-xs h-8" value={filters.status} onChange={e => setF('status', e.target.value)}>
                <option value="">All Statuses</option>
                {(options.statuses.length ? options.statuses : PROJECT_STATUSES).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
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
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select className="select text-xs h-8" value={filters.category} onChange={e => setF('category', e.target.value)}>
                <option value="">All Categories</option>
                {(options.categories.length ? options.categories : COST_CATEGORIES).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-700">📊 Preview — click a row to see category breakdown</div>
            <div className="text-xs text-gray-400">{loadingData ? 'Loading…' : `${rows.length} project${rows.length !== 1 ? 's' : ''}`}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-violet-50 text-violet-700">
                  {['Project','Status','Budget (₹)','Total Cost (₹)','Budget Used %','Remaining (₹)','Categories'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 animate-pulse">Loading data…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">No projects match the selected filters.</td></tr>
                ) : rows.map((r, i) => {
                  const overBudget = r.budget != null && r.total_cost >= r.budget
                  const noBudget   = r.budget == null
                  const rowBg = noBudget ? 'bg-gray-50' : overBudget ? 'bg-rose-50' : 'bg-emerald-50'
                  const key = r.project + i
                  const isOpen = expanded[key]
                  return (
                    <>
                      <tr key={key}
                        className={`${rowBg} border-b border-gray-100 cursor-pointer hover:brightness-95 transition-all`}
                        onClick={() => toggleExpand(key)}>
                        <td className="px-3 py-2 font-medium text-gray-800 max-w-[200px]">
                          <span className="mr-1 text-gray-400">{isOpen ? '▼' : '▶'}</span>
                          {r.project}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{r.status}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{r.budget != null ? fmt(r.budget) : '—'}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt(r.total_cost)}</td>
                        <td className="px-3 py-2 text-right">
                          {r.used_pct != null ? (
                            <span className={clsx('px-1.5 py-0.5 rounded font-medium',
                              overBudget ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                              {pct(r.used_pct)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className={clsx('px-3 py-2 text-right font-medium', overBudget ? 'text-rose-600' : 'text-emerald-700')}>
                          {r.remaining != null ? fmt(r.remaining) : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-400">{r.categories?.length || 0} categories</td>
                      </tr>
                      {isOpen && r.categories?.map((c, ci) => (
                        <tr key={key + '_cat_' + ci} className="bg-violet-50 border-b border-violet-100">
                          <td className="px-3 py-1.5 pl-8 text-violet-600 italic">{c.category}</td>
                          <td colSpan={2}></td>
                          <td className="px-3 py-1.5 text-right text-violet-700 font-medium">{fmt(c.cost)}</td>
                          <td className="px-3 py-1.5 text-right text-violet-500">{pct(c.share_pct)}</td>
                          <td colSpan={2}></td>
                        </tr>
                      ))}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 px-5 py-2 text-xs text-gray-400 border-t border-gray-50">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-200 inline-block"></span>Under budget</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-50 border border-rose-200 inline-block"></span>Over / at budget</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block"></span>No budget set</span>
          </div>
        </div>

        {/* Setup reminder */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 text-xs text-amber-800">
          <span className="font-semibold">Before exporting:</span>{' '}
          Set each project's <strong>Budget</strong> in Cost Management — otherwise Budget column shows "—" with no colour coding.
        </div>

      </div>
    </div>
  )
}
