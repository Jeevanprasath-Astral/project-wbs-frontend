import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import clsx from 'clsx'

const today      = () => new Date().toISOString().slice(0, 10)
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

const MILESTONE_STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Overdue']

const STATUS_STYLE = {
  'Completed':   'bg-emerald-100 text-emerald-700',
  'In Progress': 'bg-amber-100   text-amber-700',
  'Overdue':     'bg-rose-100    text-rose-700',
  'Not Started': 'bg-gray-100    text-gray-500',
  'On Hold':     'bg-blue-100    text-blue-600',
}

// ── Reusable preview table with pagination ────────────────────────────────────
function PreviewTable({ columns, rows, loading }) {
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Reset to page 1 whenever rows or pageSize changes
  useEffect(() => { setPage(1) }, [rows, pageSize])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
        <span className="animate-spin text-lg">⟳</span> Loading data…
      </div>
    )
  }
  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-sm gap-1">
        <span className="text-2xl">📭</span>
        No records match the selected filters
      </div>
    )
  }

  const totalRows  = rows.length
  const totalPages = Math.ceil(totalRows / pageSize)
  const startIdx   = (page - 1) * pageSize          // 0-based
  const endIdx     = Math.min(startIdx + pageSize, totalRows)
  const pageRows   = rows.slice(startIdx, endIdx)

  return (
    <div className="space-y-3">
      {/* Pagination controls — top */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-gray-500">
          Showing <span className="font-semibold text-gray-700">{startIdx + 1}–{endIdx}</span> of{' '}
          <span className="font-semibold text-gray-700">{totalRows}</span> rows
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            className="select text-xs h-7 w-20">
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={clsx('text-xs px-2.5 py-1 rounded-lg border transition-colors',
              page === 1
                ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                : 'border-violet-200 text-violet-600 hover:bg-violet-50')}>
            ← Prev
          </button>
          <span className="text-xs text-gray-500 min-w-[60px] text-center">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={clsx('text-xs px-2.5 py-1 rounded-lg border transition-colors',
              page === totalPages
                ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                : 'border-violet-200 text-violet-600 hover:bg-violet-50')}>
            Next →
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-100">
              <th className="px-3 py-2 text-left font-semibold text-gray-500 w-10">#</th>
              {columns.map(c => (
                <th key={c.key} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={startIdx + i}
                className={clsx('border-b border-gray-50 hover:bg-violet-50/30 transition-colors',
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}>
                {/* Global row number (not page-local) */}
                <td className="px-3 py-2 text-gray-300 font-mono text-right">{startIdx + i + 1}</td>
                {columns.map(c => {
                  const val = row[c.key]
                  if (c.key === 'status') {
                    return (
                      <td key={c.key} className="px-3 py-2">
                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium',
                          STATUS_STYLE[val] || 'bg-gray-100 text-gray-500')}>
                          {val || '—'}
                        </span>
                      </td>
                    )
                  }
                  if (c.key === 'budgeted_hours' || c.key === 'actual_hours') {
                    const over = c.key === 'actual_hours' && row.budgeted_hours > 0 && val > row.budgeted_hours
                    return (
                      <td key={c.key} className={clsx('px-3 py-2 font-mono text-right',
                        over ? 'text-rose-600 font-semibold' : 'text-gray-700')}>
                        {val ?? '—'}
                        {over && <span className="ml-1 text-rose-400" title="Exceeds budget">⚠</span>}
                      </td>
                    )
                  }
                  if (c.key === 'schedule_variance_reason') {
                    return (
                      <td key={c.key} className="px-3 py-2 text-gray-500 max-w-xs truncate" title={val || ''}>
                        {val || <span className="text-gray-300 italic">—</span>}
                      </td>
                    )
                  }
                  return (
                    <td key={c.key} className="px-3 py-2 text-gray-700">
                      {val || <span className="text-gray-300">—</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls — bottom (only shown when > 1 page) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className={clsx('text-xs px-2 py-1 rounded-lg border transition-colors',
              page === 1 ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
            «
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={clsx('text-xs px-2.5 py-1 rounded-lg border transition-colors',
              page === 1 ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                        : 'border-violet-200 text-violet-600 hover:bg-violet-50')}>
            ← Prev
          </button>
          <span className="text-xs text-gray-500 min-w-[70px] text-center">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={clsx('text-xs px-2.5 py-1 rounded-lg border transition-colors',
              page === totalPages ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                                  : 'border-violet-200 text-violet-600 hover:bg-violet-50')}>
            Next →
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className={clsx('text-xs px-2 py-1 rounded-lg border transition-colors',
              page === totalPages ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                                  : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
            »
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectReportsPage() {
  const navigate = useNavigate()

  // ── Dropdown options ──────────────────────────────────────────────────────
  const [options, setOptions] = useState({ projects: [], assignees: [], statuses: [] })
  const [assigneeTeamMap, setAssigneeTeamMap] = useState({})
  useEffect(() => {
    api.get('/project-reports/filter-options').then(r => {
      setOptions(r.data)
      const map = {}
      ;(r.data.assignees || []).forEach(a => { if (a.name) map[a.name] = a.team || '' })
      setAssigneeTeamMap(map)
    }).catch(() => {})
  }, [])

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [msg, setMsg] = useState(null)
  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  // ── Download helper ───────────────────────────────────────────────────────
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

  // ── Report 1: Budgeted vs Actual Hours ────────────────────────────────────
  const [bFilter, setBFilter] = useState({
    assignee: '', project_id: '', team: '', status: '',
    start_date: monthStart(), end_date: today(),
  })
  const [bRows, setBRows]       = useState([])
  const [bLoading, setBLoading] = useState(false)
  const bTimer = useRef(null)

  useEffect(() => {
    clearTimeout(bTimer.current)
    bTimer.current = setTimeout(async () => {
      setBLoading(true)
      try {
        const params = new URLSearchParams()
        Object.entries(bFilter).forEach(([k, v]) => { if (v) params.append(k, v) })
        const res = await api.get(`/project-reports/budgeted-vs-actual/data?${params}`)
        setBRows(res.data)
      } catch { setBRows([]) }
      finally { setBLoading(false) }
    }, 400)
    return () => clearTimeout(bTimer.current)
  }, [bFilter])

  const B_COLS = [
    { key: 'individual_name', label: 'Individual Name' },
    { key: 'project',         label: 'Project' },
    { key: 'team',            label: 'Team' },
    { key: 'start_date',      label: 'Start Date' },
    { key: 'end_date',        label: 'End Date' },
    { key: 'budgeted_hours',  label: 'Budgeted Hrs' },
    { key: 'actual_hours',    label: 'Actual Hrs' },
    { key: 'status',          label: 'Status' },
  ]

  // ── Report 2: Timeline ────────────────────────────────────────────────────
  const [tFilter, setTFilter] = useState({
    project_id: '', status: '',
    start_date: monthStart(), end_date: today(),
  })
  const [tRows, setTRows]       = useState([])
  const [tLoading, setTLoading] = useState(false)
  const tTimer = useRef(null)

  useEffect(() => {
    clearTimeout(tTimer.current)
    tTimer.current = setTimeout(async () => {
      setTLoading(true)
      try {
        const params = new URLSearchParams()
        Object.entries(tFilter).forEach(([k, v]) => { if (v) params.append(k, v) })
        const res = await api.get(`/project-reports/timeline/data?${params}`)
        setTRows(res.data)
      } catch { setTRows([]) }
      finally { setTLoading(false) }
    }, 400)
    return () => clearTimeout(tTimer.current)
  }, [tFilter])

  const T_COLS = [
    { key: 'milestone',                label: 'Milestone' },
    { key: 'project',                  label: 'Project' },
    { key: 'planned_end_date',         label: 'Planned End' },
    { key: 'actual_end_date',          label: 'Actual End' },
    { key: 'schedule_variance_reason', label: 'Variance Reason' },
    { key: 'status',                   label: 'Status' },
  ]

  // ── Shared filter field components ────────────────────────────────────────
  const FilterSelect = ({ label, value, onChange, children }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select className="select text-xs h-8 w-full" value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  )
  const FilterDate = ({ label, value, onChange, min }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="date" className="input text-xs h-8" value={value} min={min}
        onChange={e => onChange(e.target.value)} />
    </div>
  )

  // ── Row count badge ───────────────────────────────────────────────────────
  const RowBadge = ({ count, loading }) => (
    <span className={clsx('text-xs px-2.5 py-0.5 rounded-full font-medium',
      loading ? 'bg-gray-100 text-gray-400' : 'bg-violet-100 text-violet-700')}>
      {loading ? '…' : `${count} row${count !== 1 ? 's' : ''}`}
    </span>
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
              <p className="text-xs text-gray-400">Apply filters to preview data below — then export to Excel</p>
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

        <div className="space-y-6">

          {/* ── Report 1: Budgeted vs Actual Hours ──────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

            {/* Report header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏱️</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Budgeted vs Actual Hours Report</span>
                    <RowBadge count={bRows.length} loading={bLoading} />
                  </div>
                  <div className="text-xs text-gray-400">One row per milestone — estimated hours vs hours actually worked</div>
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

            {/* Filters */}
            <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 mb-4">
              <div className="text-xs font-medium text-violet-700 mb-3">🔎 Filters — data updates automatically</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

                <FilterSelect label="👤 Individual Name"
                  value={bFilter.assignee}
                  onChange={v => setBFilter(f => ({
                    ...f, assignee: v,
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
                  {(options.statuses.length ? options.statuses : MILESTONE_STATUSES).map(s =>
                    <option key={s} value={s}>{s}</option>)}
                </FilterSelect>

                <FilterDate label="📅 Start Date (actual start)"
                  value={bFilter.start_date}
                  onChange={v => setBFilter(f => ({
                    ...f, start_date: v,
                    ...(v && f.end_date && v > f.end_date ? { end_date: '' } : {}),
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

            {/* Preview table */}
            <PreviewTable columns={B_COLS} rows={bRows} loading={bLoading} />

          </div>

          {/* ── Report 2: Timeline ───────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

            {/* Report header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Timeline Report</span>
                    <RowBadge count={tRows.length} loading={tLoading} />
                  </div>
                  <div className="text-xs text-gray-400">Planned vs Actual end date per milestone, with variance reason</div>
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

            {/* Filters */}
            <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 mb-4">
              <div className="text-xs font-medium text-violet-700 mb-3">🔎 Filters — data updates automatically</div>
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
                  {(options.statuses.length ? options.statuses : MILESTONE_STATUSES).map(s =>
                    <option key={s} value={s}>{s}</option>)}
                </FilterSelect>

                <FilterDate label="📅 Planned End — From"
                  value={tFilter.start_date}
                  onChange={v => setTFilter(f => ({
                    ...f, start_date: v,
                    ...(v && f.end_date && v > f.end_date ? { end_date: '' } : {}),
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

            {/* Preview table */}
            <PreviewTable columns={T_COLS} rows={tRows} loading={tLoading} />

          </div>

        </div>
      </div>
    </div>
  )
}
