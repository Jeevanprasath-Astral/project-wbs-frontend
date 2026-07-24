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

const STATUSES = ['Upcoming', 'Overdue', 'Before Schedule', 'On Time', 'Delayed']

const STATUS_STYLES = {
  'Upcoming':        'bg-blue-50 text-blue-700',
  'Overdue':         'bg-rose-50 text-rose-600 font-semibold',
  'Before Schedule': 'bg-emerald-50 text-emerald-700',
  'On Time':         'bg-teal-50 text-teal-700',
  'Delayed':         'bg-amber-50 text-amber-700',
}

const STATUS_ICONS = {
  'Upcoming':        '🕐',
  'Overdue':         '🚨',
  'Before Schedule': '⚡',
  'On Time':         '✅',
  'Delayed':         '⏰',
}

export default function BillingStatusReportPage() {
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)

  const [projects, setProjects]   = useState([])
  const [filter, setFilter]       = useState({ project_id: '', status_filter: '', billing_type: '' })
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
      const res = await api.get(`/billing-reports/billing-status?${params}`)
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
      const res = await api.get(`/billing-reports/billing-status/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = 'billing_status_report.xlsx'
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { /* silent */ } finally { setExporting(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-violet-600 text-sm">🏠 Home</button>
          <span className="text-gray-200">/</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                 style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>📊</div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Billing Status Report</h1>
              <p className="text-xs text-gray-400">Per-entry billing status: Overdue · Upcoming · On Time · Delayed · Before Schedule</p>
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
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select className="select text-xs h-8 w-44"
                value={filter.status_filter}
                onChange={e => setFilter(f => ({ ...f, status_filter: e.target.value }))}>
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
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
            {/* Status summary chips */}
            {data.total_entries > 0 && (
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => data.summary[s] ? (
                  <button
                    key={s}
                    onClick={() => setFilter(f => ({ ...f, status_filter: filter.status_filter === s ? '' : s }))}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      filter.status_filter === s ? 'ring-2 ring-violet-400 ring-offset-1' : '',
                      STATUS_STYLES[s],
                      'border-current/20 cursor-pointer hover:opacity-80'
                    )}>
                    {STATUS_ICONS[s]} {s}: <span className="font-bold">{data.summary[s]}</span>
                  </button>
                ) : null)}
                <div className="ml-auto text-xs text-gray-400 self-center">
                  {data.total_entries} total entries
                </div>
              </div>
            )}

            {/* Entries table */}
            {data.rows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-10 text-center text-gray-400 italic text-sm">
                No billing entries found for the selected filters.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-xs" style={{minWidth:'900px'}}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Project</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Milestone</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Billing Type</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Planned Date</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500">Planned Amt (₹)</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Actual Date</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500">Actual Amt (₹)</th>
                      <th className="text-center px-4 py-2.5 font-medium text-gray-500">Days Δ</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r, i) => (
                      <tr key={r.id} className={clsx(
                        'border-b border-gray-50 hover:bg-violet-50/20 transition-colors',
                        i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      )}>
                        <td className="px-4 py-2.5">
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[r.status])}>
                            {STATUS_ICONS[r.status]} {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[140px] truncate">{r.project}</td>
                        <td className="px-4 py-2.5 text-gray-600">{r.milestone || '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                            {r.billing_type || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{r.planned_billing_date || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-blue-700">
                          {fmtCurrency(r.planned_billing_amount)}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{r.actual_billing_date || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-emerald-700">
                          {r.actual_billing_amount != null ? fmtCurrency(r.actual_billing_amount) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {r.days_variance != null ? (
                            <span className={clsx(
                              'text-xs font-semibold px-1.5 py-0.5 rounded',
                              r.status === 'Overdue' || r.status === 'Delayed' ? 'text-rose-600' :
                              r.status === 'Before Schedule' ? 'text-emerald-600' : 'text-gray-400'
                            )}>
                              {r.status === 'Before Schedule' ? `-${r.days_variance}d` :
                               r.status === 'Overdue' || r.status === 'Delayed' ? `+${r.days_variance}d` :
                               r.days_variance === 0 ? '0d' : `${r.days_variance}d`}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 max-w-[160px] truncate">{r.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
