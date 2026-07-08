import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import clsx from 'clsx'

const today      = () => new Date().toISOString().slice(0, 10)
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Overdue']

export default function ProfitabilityReportPage() {
  const navigate = useNavigate()

  const [options, setOptions] = useState({ projects: [], statuses: [] })
  useEffect(() => {
    api.get('/profitability-report/filter-options').then(r => setOptions(r.data)).catch(() => {})
  }, [])

  const [filter, setFilter] = useState({
    project_id: '', status: '',
    start_date: monthStart(), end_date: today(),
  })

  const [msg, setMsg]               = useState(null)
  const [downloading, setDownloading] = useState(false)

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

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
        ? await new Response(e.response.data).text()
            .then(t => { try { return JSON.parse(t).detail } catch { return t } })
            .catch(() => '')
        : ''
      showMsg(errText || 'Failed to generate report', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const FilterSelect = ({ label, value, onChange, children }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select className="select text-xs h-8 w-full" value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  )

  const FilterDate = ({ label, value, onChange }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="date" className="input text-xs h-8" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )

  // KPI cards (informational — values computed on export from backend)
  const KPI_CARDS = [
    { icon: '💰', label: 'Billing (Revenue)', desc: 'Contract value billed to client' },
    { icon: '👷', label: 'Manpower Cost', desc: 'Hours worked × hourly cost rate per member' },
    { icon: '📦', label: 'Direct Expenses', desc: 'Travel, software, training and other project costs' },
    { icon: '🏢', label: 'Indirect / Overhead', desc: 'Overhead allocated to this project' },
    { icon: '📊', label: 'Net Profit / Loss', desc: 'Billing − Total Cost (green = profit, red = loss)' },
    { icon: '📈', label: 'Net Margin %', desc: 'Profit ÷ Billing × 100' },
    { icon: '🔄', label: 'Billing Recovery %', desc: 'Billing ÷ Total Cost × 100 (>100% = profitable)' },
    { icon: '⏱️', label: 'Utilization %', desc: 'Billable Hours ÷ Total Hours × 100' },
  ]

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
              <p className="text-xs text-gray-400">Project-level revenue, cost, margin and utilization — exported as Excel</p>
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

        {/* Setup reminders */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="text-xs font-semibold text-amber-700 mb-2">⚠️ Before exporting — make sure these are set up</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-800">
            <div className="flex items-start gap-1.5">
              <span>💰</span>
              <span><strong>Billing Amount</strong> — set on each project in Project Setup (contract value billed to client)</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span>👤</span>
              <span><strong>Cost Rate (₹/hr)</strong> — set per team member in Team Hub → Edit member</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span>📦</span>
              <span><strong>Project Costs</strong> — log direct costs in the project's Cost Management tab</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span>🏢</span>
              <span><strong>Indirect / Overhead</strong> — log overhead under the new "Indirect / Overhead" cost category</span>
            </div>
          </div>
        </div>

        {/* Report card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💹</span>
              <div>
                <div className="text-sm font-semibold text-gray-900">Profitability Report</div>
                <div className="text-xs text-gray-400">One row per project — all KPIs in a single Excel sheet</div>
              </div>
            </div>
            <button
              onClick={downloadReport}
              disabled={downloading}
              className="btn btn-primary text-xs py-1.5 px-4">
              {downloading
                ? <span className="animate-spin inline-block">⟳</span>
                : '⬇️ Export Excel'}
            </button>
          </div>

          {/* Filters */}
          <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 mb-4">
            <div className="text-xs font-medium text-violet-700 mb-3">🔎 Filters</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

              <FilterSelect label="🏢 Project"
                value={filter.project_id}
                onChange={v => setFilter(f => ({ ...f, project_id: v }))}>
                <option value="">All projects</option>
                {options.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </FilterSelect>

              <FilterSelect label="📋 Status"
                value={filter.status}
                onChange={v => setFilter(f => ({ ...f, status: v }))}>
                <option value="">All statuses</option>
                {(options.statuses.length ? options.statuses : PROJECT_STATUSES).map(s =>
                  <option key={s} value={s}>{s}</option>)}
              </FilterSelect>

              <FilterDate label="📅 Period — From"
                value={filter.start_date}
                onChange={v => setFilter(f => ({ ...f, start_date: v }))} />

              <FilterDate label="📅 Period — To"
                value={filter.end_date}
                onChange={v => setFilter(f => ({ ...f, end_date: v }))} />

            </div>
          </div>

          {/* KPI legend */}
          <div className="text-xs font-medium text-gray-500 mb-2">📋 Report columns</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {KPI_CARDS.map(k => (
              <div key={k.label} className="bg-slate-50 border border-gray-100 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base">{k.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{k.label}</span>
                </div>
                <p className="text-xs text-gray-400 leading-snug">{k.desc}</p>
              </div>
            ))}
          </div>

          {/* Profit colour legend */}
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#E2EFDA' }}></span>
              Green row = net profit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#FCE4D6' }}></span>
              Red row = net loss
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
