import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import clsx from 'clsx'

const fmtCurrency = (v) =>
  v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'

const BILLING_TYPES = [
  'Milestone Payment', 'New Requirements', 'Change Request',
  'Due Payment', 'Overtime Charges', 'Additional Scope', 'Miscellaneous',
]

const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }
const today      = () => new Date().toISOString().slice(0, 10)

export default function MonthlyBillingTrackerPage() {
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)

  const [projects, setProjects]   = useState([])
  const [filter, setFilter]       = useState({
    project_id: '', billing_type: '', start_date: monthStart(), end_date: today(),
  })
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data)).catch(() => {})
  }, [])

  const fetchReport = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      Object.entries(filter).forEach(([k, v]) => { if (v) params.append(k, v) })
      const res = await api.get(`/billing-reports/monthly-tracker?${params}`)
      setData(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load report')
    } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { fetchReport() }, [fetchReport])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filter).forEach(([k, v]) => { if (v) params.append(k, v) })
      const res = await api.get(`/billing-reports/monthly-tracker/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = 'monthly_billing_tracker.xlsx'
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { /* silent */ } finally { setExporting(false) }
  }

  const varColor = (v) => v > 0 ? 'text-emerald-600' : v < 0 ? 'text-rose-600' : 'text-gray-500'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-violet-600 text-sm">🏠 Home</button>
          <span className="text-gray-200">/</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                 style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>📆</div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Monthly Billing Tracker</h1>
              <p className="text-xs text-gray-400">Plan vs actual billing amounts grouped by month and billing type</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5 space-y-5">

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Project</label>
              <select className="select text-xs h-8 w-52"
                value={filter.project_id}
                onChange={e => setFilter(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Billing Type</label>
              <select className="select text-xs h-8 w-44"
                value={filter.billing_type}
                onChange={e => setFilter(f => ({ ...f, billing_type: e.target.value }))}>
                <option value="">All Types</option>
                {BILLING_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Planned Date From</label>
              <input type="date" className="input text-xs h-8 w-36"
                value={filter.start_date}
                onChange={e => setFilter(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Planned Date To</label>
              <input type="date" className="input text-xs h-8 w-36"
                value={filter.end_date}
                onChange={e => setFilter(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div className="ml-auto">
              <label className="block text-xs text-gray-500 mb-1 opacity-0">Export</label>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors h-8"
              >
                {exporting ? '⏳ Exporting…' : '📥 Export Excel'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-2.5 rounded-xl text-sm text-rose-600 bg-rose-50 border border-rose-100">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-40 text-violet-400 text-sm animate-pulse">Loading report…</div>
        ) : data && (
          <>
            {/* Grand total summary cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Entries',    val: data.grand_total.entry_count,   color: 'text-gray-800', fmt: v => v },
                { label: 'Total Planned',    val: data.grand_total.planned_amount, color: 'text-blue-700', fmt: fmtCurrency },
                { label: 'Total Actual',     val: data.grand_total.actual_amount,  color: 'text-emerald-700', fmt: fmtCurrency },
                { label: 'Variance',         val: data.grand_total.variance,       color: varColor(data.grand_total.variance), fmt: fmtCurrency },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                  <div className="text-xs text-gray-400 mb-1">{c.label}</div>
                  <div className={clsx('text-xl font-bold', c.color)}>{c.fmt(c.val)}</div>
                </div>
              ))}
            </div>

            {/* Month-wise breakdown */}
            {data.month_totals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center text-gray-400 italic text-sm">
                No billing entries found for the selected filters.
              </div>
            ) : data.month_totals.map(mt => {
              const monthRows = data.rows.filter(r => r.month === mt.month)
              return (
                <div key={mt.month} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Month header */}
                  <div className="px-5 py-3 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-violet-800">
                        {mt.month === 'Unscheduled' ? '📭 Unscheduled' : `📅 ${mt.month}`}
                      </span>
                      <span className="text-xs text-violet-500">({mt.entry_count} {mt.entry_count === 1 ? 'entry' : 'entries'})</span>
                    </div>
                    <div className="flex items-center gap-5 text-xs">
                      <span className="text-blue-700">Planned: <strong>{fmtCurrency(mt.planned_amount)}</strong></span>
                      <span className="text-emerald-700">Actual: <strong>{fmtCurrency(mt.actual_amount)}</strong></span>
                      <span className={varColor(mt.variance)}>
                        Variance: <strong>{mt.variance >= 0 ? '+' : ''}{fmtCurrency(mt.variance)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Detail rows by billing type */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-100">
                        <th className="text-left px-5 py-2 font-medium text-gray-500">Billing Type</th>
                        <th className="text-right px-5 py-2 font-medium text-gray-500">Entries</th>
                        <th className="text-right px-5 py-2 font-medium text-gray-500">Planned (₹)</th>
                        <th className="text-right px-5 py-2 font-medium text-gray-500">Actual (₹)</th>
                        <th className="text-right px-5 py-2 font-medium text-gray-500">Variance (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((r, i) => (
                        <tr key={i} className={clsx(
                          'border-b border-gray-50',
                          i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        )}>
                          <td className="px-5 py-2">
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                              {r.billing_type}
                            </span>
                          </td>
                          <td className="px-5 py-2 text-right text-gray-500">{r.entry_count}</td>
                          <td className="px-5 py-2 text-right font-medium text-blue-700">{fmtCurrency(r.planned_amount)}</td>
                          <td className="px-5 py-2 text-right font-medium text-emerald-700">{fmtCurrency(r.actual_amount)}</td>
                          <td className={clsx('px-5 py-2 text-right font-medium', varColor(r.variance))}>
                            {r.variance >= 0 ? '+' : ''}{fmtCurrency(r.variance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
