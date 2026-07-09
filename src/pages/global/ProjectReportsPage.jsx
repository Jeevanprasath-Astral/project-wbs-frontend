import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import clsx from 'clsx'

const today      = () => new Date().toISOString().slice(0, 10)
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

// Standard milestone statuses — used as fallback when the DB returns no distinct values yet
const MILESTONE_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Overdue']

export default function ProjectReportsPage() {
  const navigate = useNavigate()

  // ── Dropdown options loaded once ─────────────────────────────────────────
  const [options, setOptions] = useState({ projects: [], assignees: [], statuses: [] })
  // assigneeTeamMap: { "John Doe": "Functional Consultant", ... }
  const [assigneeTeamMap, setAssigneeTeamMap] = useState({})
  useEffect(() => {
    api.get('/project-reports/filter-options').then(r => {
      setOptions(r.data)
      const map = {}
      ;(r.data.assignees || []).forEach(a => { if (a.name) map[a.name] = a.team || '' })
      setAssigneeTeamMap(map)
    }).catch(() => {})
  }, [])

  // ── Per-report filter state ──────────────────────────────────────────────
  // Report 1: Budgeted vs Actual Hours
  // Columns: Individual Name, Project, Team, Start Date, End Date, Budgeted Hours, Actual Hours, Status
  const [bFilter, setBFilter] = useState({
    assignee: '', project_id: '', team: '', status: '',
    start_date: monthStart(), end_date: today(),
  })

  // Report 2: Timeline Report
  // Columns: Milestone, Project, Planned End Date, Actual End Date, Schedule Variance Reason, Status
  const [tFilter, setTFilter] = useState({
    project_id: '', status: '',
    start_date: monthStart(), end_date: today(),
  })

  // ── Toast ────────────────────────────────────────────────────────────────
  const [msg, setMsg] = useState(null)
  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  // ── Download helper ──────────────────────────────────────────────────────
  const [downloading, setDownloading] = useState(null)

  const downloadReport = async (reportKey, filename, filters) => {
    setDownloading(reportKey)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v) })
      const res = await api.get(`/project-reports/${reportKey}?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = filename
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
      setDownloading(null)
    }
  }

  // ── Reusable filter field components ────────────────────────────────────
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-violet-600 text-sm transition-colors">🏠 Home</button>
          <span className="text-gray-200">/</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                 style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>📊</div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Project Reports</h1>
              <p className="text-xs text-gray-400">Milestone-level reports — each with its own filters and Excel export</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5">

        {msg && (
          <div className={clsx('mb-4 px-4 py-2.5 rounded-xl text-sm',
            msg.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700')}>
            {msg.text}
          </div>
        )}

        <div className="space-y-5">

          {/* ── Report 1: Budgeted vs Actual Hours ──────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

            {/* Report header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏱️</span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Budgeted vs Actual Hours Report</div>
                  <div className="text-xs text-gray-400">One row per milestone — estimated hours vs hours actually worked, per assignee</div>
                </div>
              </div>
              <button
                onClick={() => downloadReport('budgeted-vs-actual', 'budgeted-vs-actual-report.xlsx', bFilter)}
                disabled={downloading === 'budgeted-vs-actual'}
                className="btn btn-primary text-xs py-1.5 px-4">
                {downloading === 'budgeted-vs-actual'
                  ? <span className="animate-spin inline-block">⟳</span>
                  : '⬇️ Export Excel'}
              </button>
            </div>

            {/* Report 1 filters — one per column */}
            <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
              <div className="text-xs font-medium text-violet-700 mb-3">🔎 Filters</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

                <FilterSelect label="👤 Individual Name"
                  value={bFilter.assignee}
                  onChange={v => setBFilter(f => ({
                    ...f,
                    assignee: v,
                    // Auto-populate team from the member's assigned role
                    team: v ? (assigneeTeamMap[v] || f.team) : '',
                  }))}>
                  <option value="">All individuals</option>
                  {options.assignees.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                </FilterSelect>

                <FilterSelect label="🏢 Project"
                  value={bFilter.project_id}
                  onChange={v => setBFilter(f => ({ ...f, project_id: v }))}>
                  <option value="">All projects</option>
                  {options.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </FilterSelect>

                {/* Team — auto-filled from individual's role; still editable for standalone team filter */}
                <FilterSelect label="🧑‍🤝‍🧑 Team"
                  value={bFilter.team}
                  onChange={v => setBFilter(f => ({ ...f, team: v }))}>
                  <option value="">All teams</option>
                  <option value="Functional Consultant">Functional Consultant</option>
                  <option value="Technical Team">Technical Team</option>
                </FilterSelect>

                <FilterSelect label="📋 Status"
                  value={bFilter.status}
                  onChange={v => setBFilter(f => ({ ...f, status: v }))}>
                  <option value="">All statuses</option>
                  {(options.statuses.length ? options.statuses : MILESTONE_STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
                </FilterSelect>

                <FilterDate label="📅 Start Date (actual start)"
                  value={bFilter.start_date}
                  onChange={v => setBFilter(f => ({
                    ...f, start_date: v,
                    ...(v && f.end_date && v > f.end_date ? {end_date:''} : {}),
                  }))} />

                <FilterDate label="📅 End Date (actual end)"
                  value={bFilter.end_date}
                  min={bFilter.start_date || undefined}
                  onChange={v => {
                    if (bFilter.start_date && v && v < bFilter.start_date) return
                    setBFilter(f => ({ ...f, end_date: v }))
                  }} />

              </div>
            </div>

            {/* Column preview chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {['Individual Name','Project','Team','Start Date','End Date','Budgeted Hours','Actual Hours','Status'].map(col => (
                <span key={col} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{col}</span>
              ))}
            </div>
          </div>

          {/* ── Report 2: Timeline Report ────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

            {/* Report header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Timeline Report</div>
                  <div className="text-xs text-gray-400">Planned vs Actual end date per milestone, with Schedule Variance Reason</div>
                </div>
              </div>
              <button
                onClick={() => downloadReport('timeline', 'timeline-report.xlsx', tFilter)}
                disabled={downloading === 'timeline'}
                className="btn btn-primary text-xs py-1.5 px-4">
                {downloading === 'timeline'
                  ? <span className="animate-spin inline-block">⟳</span>
                  : '⬇️ Export Excel'}
              </button>
            </div>

            {/* Report 2 filters — only Project, Status, date range (no Individual, no Team) */}
            <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
              <div className="text-xs font-medium text-violet-700 mb-3">🔎 Filters</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

                <FilterSelect label="🏢 Project"
                  value={tFilter.project_id}
                  onChange={v => setTFilter(f => ({ ...f, project_id: v }))}>
                  <option value="">All projects</option>
                  {options.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </FilterSelect>

                <FilterSelect label="📋 Status"
                  value={tFilter.status}
                  onChange={v => setTFilter(f => ({ ...f, status: v }))}>
                  <option value="">All statuses</option>
                  {(options.statuses.length ? options.statuses : MILESTONE_STATUSES).map(s => <option key={s} value={s}>{s}</option>)}
                </FilterSelect>

                <FilterDate label="📅 Planned End — From"
                  value={tFilter.start_date}
                  onChange={v => setTFilter(f => ({
                    ...f, start_date: v,
                    ...(v && f.end_date && v > f.end_date ? {end_date:''} : {}),
                  }))} />

                <FilterDate label="📅 Planned End — To"
                  value={tFilter.end_date}
                  min={tFilter.start_date || undefined}
                  onChange={v => {
                    if (tFilter.start_date && v && v < tFilter.start_date) return
                    setTFilter(f => ({ ...f, end_date: v }))
                  }} />

              </div>
            </div>

            {/* Column preview chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {['Milestone','Project','Planned End Date','Actual End Date','Schedule Variance Reason','Status'].map(col => (
                <span key={col} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{col}</span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
