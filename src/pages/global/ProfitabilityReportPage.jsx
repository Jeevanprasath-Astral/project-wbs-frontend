import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import clsx from 'clsx'

const today      = () => new Date().toISOString().slice(0, 10)
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Overdue']

const fmt = (v, dec = 2) => (v == null ? '—' : Number(v).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }))
const pct = v => v == null ? '—' : `${v}%`

export default function ProfitabilityReportPage() {
  const navigate = useNavigate()

  const [options, setOptions]       = useState({ projects: [], statuses: [] })
  const [filter, setFilter]         = useState({ project_id: '', status: '', start_date: monthStart(), end_date: today() })
  const [rows, setRows]             = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [msg, setMsg]               = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.get('/profitability-report/filter-options').then(r => setOptions(r.data)).catch(() => {})
  }, [])

  const loadData = useCallback(async (f) => {
    setLoadingData(true)
    try {
      const params = new URLSearchParams()
      Object.entries(f).forEach(([k, v]) => { if (v) params.append(k, v) })
      const r = await api.get(`/profitability-report/data?${params}`)
      setRows(r.data.rows || [])
    } catch { setRows([]) }
    finally { setLoadingData(false) }
  }, [])

  useEffect(() => { loadData(filter) }, [filter, loadData])

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000) }

  const downloadReport = async () => {
    setDownloading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filter).forEach(([k, v]) => { if (v) params.append(k, v) })
      const res = await api.get(`/profitability-report/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'profitability-report.xlsx'
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      showMsg('Report downloaded ✅')
    } catch (e) {
      const errText = e.response?.data
        ? await new Response(e.response.data).text().then(t => { try { return JSON.parse(t).detail } catch { return t } }).catch(() => '')
        : ''
      showMsg(errText || 'Failed to generate report', 'error')
    } finally { setDownloading(false) }
  }

  const setF = (k, v) => setFilter(f => ({ ...f, [k]: v }))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-violet-600 text-sm transition-colors">🏠 Home</button>
          <span className="text-gray-200">/</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                 style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>💹</div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Profitability Report</h1>
              <p className="text-xs text-gray-400">Project-level revenue, cost, margin and utilization</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5 space-y-5">

        {msg && (
          <div className={clsx('px-4 py-2.5 rounded-xl text-sm',
            msg.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700')}>
            {msg.text}
          </div>
        )}

        {/* Filters + Export */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">🔎 Filters</div>
            <button onClick={downloadReport} disabled={downloading}
              className="btn btn-primary text-xs py-1.5 px-4">
              {downloading ? <span className="animate-spin inline-block">⟳</span> : '⬇️ Export Excel'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">🏢 Project</label>
              <select className="select text-xs h-8 w-full" value={filter.project_id} onChange={e => setF('project_id', e.target.value)}>
                <option value="">All projects</option>
                {options.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">📋 Status</label>
              <select className="select text-xs h-8 w-full" value={filter.status} onChange={e => setF('status', e.target.value)}>
                <option value="">All statuses</option>
                {(options.statuses.length ? options.statuses : PROJECT_STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">📅 From</label>
              <input type="date" className="input text-xs h-8" value={filter.start_date}
                onChange={e => { const v = e.target.value; setF('start_date', v); if (v && filter.end_date && v > filter.end_date) setF('end_date', '') }} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">📅 To</label>
              <input type="date" className="input text-xs h-8" value={filter.end_date} min={filter.start_date || undefined}
                onChange={e => { if (filter.start_date && e.target.value && e.target.value < filter.start_date) return; setF('end_date', e.target.value) }} />
            </div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-700">📊 Preview</div>
            <div className="text-xs text-gray-400">{loadingData ? 'Loading…' : `${rows.length} project${rows.length !== 1 ? 's' : ''}`}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-violet-50 text-violet-700">
                  {['Project','Status','Billing (₹)','Total Hrs','Billable Hrs','Util %','Manpower Cost (₹)','Direct Exp (₹)','Overhead (₹)','Total Cost (₹)','Net Profit (₹)','Margin %','Labor Yield %'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400 animate-pulse">Loading data…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400 italic">No projects match the selected filters.</td></tr>
                ) : rows.map((r, i) => {
                  const isProfit = r.net_profit != null && r.net_profit >= 0
                  const bg = r.net_profit != null ? (isProfit ? 'bg-emerald-50' : 'bg-rose-50') : (i % 2 === 0 ? 'bg-white' : 'bg-slate-50')
                  return (
                    <tr key={i} className={`${bg} border-b border-gray-50 hover:bg-violet-50 transition-colors`}>
                      <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px] truncate">{r.project}</td>
                      <td className="px-3 py-2 text-gray-500">{r.status}</td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-700">{fmt(r.billing)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmt(r.total_hours, 1)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmt(r.billable_hours, 1)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={clsx('px-1.5 py-0.5 rounded font-medium',
                          r.util_pct == null ? 'text-gray-400' :
                          r.util_pct >= 80 ? 'bg-green-100 text-green-700' :
                          r.util_pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                          {pct(r.util_pct)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmt(r.manpower_cost)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmt(r.direct_expenses)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{fmt(r.indirect_cost)}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">{fmt(r.total_cost)}</td>
                      <td className={clsx('px-3 py-2 text-right font-bold', isProfit ? 'text-emerald-700' : 'text-rose-600')}>{fmt(r.net_profit)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{pct(r.margin_pct)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{pct(r.recovery_pct)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Colour legend */}
          <div className="flex gap-4 px-5 py-2 text-xs text-gray-400 border-t border-gray-50">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-200"></span>Net profit</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-rose-50 border border-rose-200"></span>Net loss</span>
          </div>
        </div>

      </div>
    </div>
  )
}
