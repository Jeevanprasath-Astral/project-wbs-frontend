import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import clsx from 'clsx'

const monthStart = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const today = () => new Date().toISOString().split('T')[0]

const BILLING_TYPES = [
  'Milestone Payment', 'New Requirements', 'Change Request',
  'Due Payment', 'Overtime Charges', 'Additional Scope', 'Miscellaneous',
]

const KPI_CARDS = [
  {
    icon: '📅',
    label: 'Date',
    desc: 'The date this billing entry was recorded — typically the date an invoice was raised or a payment milestone was reached.',
    color: 'bg-slate-50 border-slate-100',
  },
  {
    icon: '🏷️',
    label: 'Billing Type',
    desc: 'Category of the billing entry — Milestone Payment, Change Request, Additional Scope, Due Payment, Overtime Charges, etc.',
    color: 'bg-blue-50 border-blue-100',
  },
  {
    icon: '💰',
    label: 'Amount (₹)',
    desc: 'The billed amount for this specific entry. Highlighted green in the Excel export for quick scanning.',
    color: 'bg-emerald-50 border-emerald-100',
  },
  {
    icon: '📈',
    label: 'Running Total (₹)',
    desc: 'Cumulative billed amount per project up to and including this entry, sorted by date. Resets for each new project.',
    color: 'bg-violet-50 border-violet-100',
  },
  {
    icon: '🏁',
    label: 'Milestone',
    desc: 'The project milestone this billing entry is linked to (optional). Set when logging a billing entry in Financial Settings.',
    color: 'bg-amber-50 border-amber-100',
  },
  {
    icon: '📝',
    label: 'Remarks',
    desc: 'Any additional notes about this billing entry — payment terms, reference numbers, or client communication details.',
    color: 'bg-rose-50 border-rose-100',
  },
]

export default function BillingStatementPage() {
  const [options,   setOptions]   = useState({ projects: [], billing_types: [] })
  const [loading,   setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)

  const [filters, setFilters] = useState({
    project_id:   '',
    start_date:   monthStart(),
    end_date:     today(),
    billing_type: '',
  })

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    try {
      const res = await api.get('/billing-statement-report/filter-options')
      setOptions(res.data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (filters.project_id)   params.set('project_id',   filters.project_id)
      if (filters.start_date)   params.set('start_date',   filters.start_date)
      if (filters.end_date)     params.set('end_date',     filters.end_date)
      if (filters.billing_type) params.set('billing_type', filters.billing_type)

      const res = await api.get(`/billing-statement-report/export?${params}`, {
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'billing-statement-report.xlsx'
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
               style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>🧾</div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Billing Statement Report</h1>
            <p className="text-xs text-gray-400">Per-project billing history — all entries with running totals, grouped by project</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5 space-y-5">

        {/* Info banner */}
        <div className="bg-violet-50 border border-violet-100 rounded-2xl px-5 py-3 text-xs text-violet-800 leading-relaxed">
          <span className="font-semibold">What this report shows:</span>{' '}
          A complete billing history for each project — every billing entry with its date, type, amount, and a cumulative running total.
          The Excel export has two sheets — <strong>Summary</strong> (one row per project with totals and types used) and{' '}
          <strong>All Entries</strong> (every individual billing entry with a running total that resets per project).
          Billing entries are managed in <strong>Financial Settings → Project Billing History</strong>.
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filters</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

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
              <label className="block text-xs text-gray-500 mb-1">Billing Type</label>
              <select className="select text-xs h-8"
                value={filters.billing_type}
                onChange={e => setF('billing_type', e.target.value)}>
                <option value="">All Types</option>
                {BILLING_TYPES.map(t => <option key={t}>{t}</option>)}
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
          Billing entries must be added per project in <strong>Financial Settings → Project Billing History</strong> (Admin menu).
          Each entry captures the date, amount, billing type, and optional milestone link.
          If no billing entries exist yet, both sheets will be empty.
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
