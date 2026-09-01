import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import clsx from 'clsx'

const monthStart = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const today = () => new Date().toISOString().split('T')[0]
const fmt = v => (v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

const BILLING_TYPES = [
  'Milestone Payment', 'New Requirements', 'Change Request',
  'Due Payment', 'Overtime Charges', 'Additional Scope', 'Miscellaneous',
]

export default function BillingStatementPage() {
  const [options,     setOptions]     = useState({ projects: [], billing_types: [] })
  const [loading,     setLoading]     = useState(true)
  const [exporting,   setExporting]   = useState(false)
  const [rows,        setRows]        = useState([])
  const [loadingData, setLoadingData] = useState(false)

  const [filters, setFilters] = useState({
    project_id:   '',
    start_date:   monthStart(),
    end_date:     today(),
    billing_type: '',
  })

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/billing-statement-report/filter-options')
      .then(r => setOptions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadData = useCallback(async (f) => {
    setLoadingData(true)
    try {
      const params = new URLSearchParams()
      if (f.project_id)   params.set('project_id',   f.project_id)
      if (f.start_date)   params.set('start_date',   f.start_date)
      if (f.end_date)     params.set('end_date',     f.end_date)
      if (f.billing_type) params.set('billing_type', f.billing_type)
      const r = await api.get(`/billing-statement-report/data?${params}`)
      setRows(r.data.rows || [])
    } catch { setRows([]) }
    finally { setLoadingData(false) }
  }, [])

  useEffect(() => { loadData(filters) }, [filters, loadData])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (filters.project_id)   params.set('project_id',   filters.project_id)
      if (filters.start_date)   params.set('start_date',   filters.start_date)
      if (filters.end_date)     params.set('end_date',     filters.end_date)
      if (filters.billing_type) params.set('billing_type', filters.billing_type)
      const res = await api.get(`/billing-statement-report/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'billing-statement-report.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
    finally { setExporting(false) }
  }

  // Group rows by project for display
  const grouped = rows.reduce((acc, r) => {
    if (!acc[r.project]) acc[r.project] = []
    acc[r.project].push(r)
    return acc
  }, {})

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Project</label>
              <select className="select text-xs h-8" value={filters.project_id} onChange={e => setF('project_id', e.target.value)}>
                <option value="">All Projects</option>
                {options.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Billing Type</label>
              <select className="select text-xs h-8" value={filters.billing_type} onChange={e => setF('billing_type', e.target.value)}>
                <option value="">All Types</option>
                {BILLING_TYPES.map(t => <option key={t}>{t}</option>)}
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
          </div>
        </div>

        {/* Preview Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-700">🧾 Preview</div>
            <div className="text-xs text-gray-400">{loadingData ? 'Loading…' : `${rows.length} entr${rows.length !== 1 ? 'ies' : 'y'} across ${Object.keys(grouped).length} project${Object.keys(grouped).length !== 1 ? 's' : ''}`}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-violet-50 text-violet-700">
                  {['Project','Date','Billing Type','Amount (₹)','Running Total (₹)','Milestone','Remarks'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 animate-pulse">Loading data…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">No billing entries found for the selected filters.</td></tr>
                ) : Object.entries(grouped).map(([proj, entries]) => (
                  <>
                    {/* Project header row */}
                    <tr key={`hdr_${proj}`} className="bg-blue-50 border-b border-blue-100">
                      <td colSpan={7} className="px-3 py-1.5 font-semibold text-blue-800 text-xs">
                        🏢 {proj}
                        <span className="ml-3 font-normal text-blue-500">
                          Total: ₹{fmt(entries.reduce((s, e) => s + (e.amount || 0), 0))} • {entries.length} entries
                        </span>
                      </td>
                    </tr>
                    {entries.map((r, i) => (
                      <tr key={`${proj}_${i}`} className={clsx('border-b border-gray-50 hover:bg-violet-50 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-slate-50')}>
                        <td className="px-3 py-2 text-gray-400 pl-6">{/* indented, project shown in header */}</td>
                        <td className="px-3 py-2 text-gray-600">{r.date}</td>
                        <td className="px-3 py-2">
                          <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded text-xs">{r.billing_type}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">₹{fmt(r.amount)}</td>
                        <td className="px-3 py-2 text-right font-medium text-blue-700">₹{fmt(r.running_total)}</td>
                        <td className="px-3 py-2 text-gray-500">{r.milestone === '—' ? '' : r.milestone}</td>
                        <td className="px-3 py-2 text-gray-400 max-w-[160px] truncate">{r.remarks === '—' ? '' : r.remarks}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Setup reminder */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 text-xs text-amber-800">
          <span className="font-semibold">Before exporting:</span>{' '}
          Billing entries must be added per project in <strong>Financial Settings → Project Billing History</strong>.
          If no entries exist, the preview and export will be empty.
        </div>

      </div>
    </div>
  )
}
