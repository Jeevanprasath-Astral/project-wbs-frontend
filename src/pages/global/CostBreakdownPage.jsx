import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import clsx from 'clsx'

const monthStart = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const today = () => new Date().toISOString().split('T')[0]

// Static fallbacks — shown when the DB hasn't stored any values yet
const PROJECT_STATUSES  = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Overdue']
const COST_CATEGORIES   = [
  'Travel', 'Accommodation', 'Software & Licensing', 'Hardware & Equipment',
  'Training', 'Consulting & Outsourcing', 'Communication',
  'Indirect / Overhead', 'Miscellaneous', 'Other',
]

const KPI_CARDS = [
  {
    icon: '🏗️',
    label: 'Budget (₹)',
    desc: 'The approved project budget set in Cost Management. Acts as the ceiling against which actual spend is compared.',
    color: 'bg-slate-50 border-slate-100',
  },
  {
    icon: '💸',
    label: 'Total Cost (₹)',
    desc: 'Sum of all cost entries for the project in the selected period across all categories — Travel, Software, Hardware, Overhead, etc.',
    color: 'bg-rose-50 border-rose-100',
  },
  {
    icon: '📊',
    label: 'Budget Used %',
    desc: 'Total Cost ÷ Budget × 100. A green row means under budget; red means at or over budget.',
    color: 'bg-amber-50 border-amber-100',
  },
  {
    icon: '💰',
    label: 'Remaining (₹)',
    desc: 'Budget minus Total Cost. Negative values indicate overspend. Only shown when a budget has been set.',
    color: 'bg-emerald-50 border-emerald-100',
  },
  {
    icon: '🗂️',
    label: 'Category',
    desc: 'Cost entries are grouped by category (Travel, Accommodation, Software & Licensing, Indirect / Overhead, etc.) on the detail sheet.',
    color: 'bg-blue-50 border-blue-100',
  },
  {
    icon: '📉',
    label: 'Share of Project %',
    desc: 'Each category\'s cost as a percentage of the project\'s total cost for the period. Shows where the spend is concentrated.',
    color: 'bg-violet-50 border-violet-100',
  },
]

export default function CostBreakdownPage() {
  const [options,   setOptions]   = useState({ projects: [], statuses: [], categories: [] })
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  const [filters, setFilters] = useState({
    project_id: '',
    status:     '',
    start_date: monthStart(),
    end_date:   today(),
    category:   '',
  })

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    try {
      const res = await api.get('/cost-breakdown-report/filter-options')
      setOptions(res.data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (filters.project_id) params.set('project_id', filters.project_id)
      if (filters.status)     params.set('status',     filters.status)
      if (filters.start_date) params.set('start_date', filters.start_date)
      if (filters.end_date)   params.set('end_date',   filters.end_date)
      if (filters.category)   params.set('category',   filters.category)

      const res = await api.get(`/cost-breakdown-report/export?${params}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'cost-breakdown-report.xlsx'
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
               style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>💰</div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Cost Category Breakdown Report</h1>
            <p className="text-xs text-gray-400">Budget vs actual spend per project, broken down by expense category</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5 space-y-5">

        {/* Info banner */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 text-xs text-emerald-800 leading-relaxed">
          <span className="font-semibold">What this report shows:</span>{' '}
          Project-level cost summary compared against budget, and a category-level breakdown showing where money is going.
          The Excel export has two sheets — <strong>Project Summary</strong> (budget vs total cost with colour coding) and{' '}
          <strong>Category Detail</strong> (cost per category with share %).{' '}
          <span className="inline-block px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-medium">Green = under budget</span>{' '}
          <span className="inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Red = over/at budget</span>.
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filters</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

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

            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select className="select text-xs h-8"
                value={filters.status}
                onChange={e => setF('status', e.target.value)}>
                <option value="">All Statuses</option>
                {(options.statuses.length ? options.statuses : PROJECT_STATUSES).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

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
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select className="select text-xs h-8"
                value={filters.category}
                onChange={e => setF('category', e.target.value)}>
                <option value="">All Categories</option>
                {(options.categories.length ? options.categories : COST_CATEGORIES).map(c => <option key={c}>{c}</option>)}
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
          Set each project's <strong>Budget</strong> in the Cost Management tab — otherwise the Budget column will show "—" and no green/red colour coding will apply.
          Cost entries are logged per project in <strong>Cost Management → Add Cost</strong>.
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
