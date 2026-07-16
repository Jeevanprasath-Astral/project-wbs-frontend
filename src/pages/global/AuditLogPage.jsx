import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../utils/api'
import clsx from 'clsx'

const today      = () => new Date().toISOString().slice(0, 10)
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

const ACTION_BADGE = {
  create:            'bg-emerald-100 text-emerald-700',
  update:            'bg-blue-100 text-blue-700',
  delete:            'bg-rose-100 text-rose-700',
  assign_task:       'bg-violet-100 text-violet-700',
  update_assignment: 'bg-indigo-100 text-indigo-700',
  delete_assignment: 'bg-rose-100 text-rose-700',
  add_member:        'bg-teal-100 text-teal-700',
  remove_member:     'bg-orange-100 text-orange-700',
  login:             'bg-slate-100 text-slate-600',
}

function ActionBadge({ action }) {
  const cls = ACTION_BADGE[action] || 'bg-slate-100 text-slate-600'
  return (
    <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium', cls)}>
      {action?.replace(/_/g, ' ') || '—'}
    </span>
  )
}

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value)
  const timer = useRef(null)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(timer.current)
  }, [value, delay])
  return dv
}

const PAGE_SIZE = 50

export default function AuditLogPage() {
  const [logs,    setLogs]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [actions, setActions] = useState([])
  const [projects, setProjects] = useState([])

  const [filters, setFilters] = useState({
    project_id:  '',
    action:      '',
    entity_type: '',
    date_from:   monthStart(),
    date_to:     today(),
    search:      '',
  })

  const setF = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }
  const dSearch = useDebounce(filters.search, 350)

  // Load project list for filter dropdown
  useEffect(() => {
    api.get('/global/projects').then(r => setProjects(r.data || [])).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE })
      if (filters.project_id)  params.set('project_id',  filters.project_id)
      if (filters.action)      params.set('action',      filters.action)
      if (filters.entity_type) params.set('entity_type', filters.entity_type)
      if (filters.date_from)   params.set('date_from',   filters.date_from)
      if (filters.date_to)     params.set('date_to',     filters.date_to)
      if (dSearch)             params.set('search',      dSearch)

      const res = await api.get(`/global/audit-log?${params}`)
      setLogs(res.data.logs || [])
      setTotal(res.data.total || 0)
      if (res.data.distinct_actions?.length) setActions(res.data.distinct_actions)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [page, filters.project_id, filters.action, filters.entity_type, filters.date_from, filters.date_to, dSearch])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (filters.project_id)  params.set('project_id',  filters.project_id)
      if (filters.action)      params.set('action',      filters.action)
      if (filters.entity_type) params.set('entity_type', filters.entity_type)
      if (filters.date_from)   params.set('date_from',   filters.date_from)
      if (filters.date_to)     params.set('date_to',     filters.date_to)
      if (dSearch)             params.set('search',      dSearch)

      const res = await api.get(`/global/audit-log/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'audit-log.xlsx'
      a.click(); URL.revokeObjectURL(url)
    } catch { /* silent */ }
    finally { setExporting(false) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fmtTs = (ts) => {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                 style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>🔍</div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Global Audit Log</h1>
              <p className="text-xs text-gray-400">All system actions — who did what, when, and on which project</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            {exporting ? <><span className="animate-spin">⟳</span> Exporting…</> : <>📥 Export Excel</>}
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5 space-y-4">

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filters</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

            <div>
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input
                type="text"
                className="input text-xs h-8"
                placeholder="Actor or description…"
                value={filters.search}
                onChange={e => setF('search', e.target.value)} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Project</label>
              <select className="select text-xs h-8" value={filters.project_id} onChange={e => setF('project_id', e.target.value)}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Action</label>
              <select className="select text-xs h-8" value={filters.action} onChange={e => setF('action', e.target.value)}>
                <option value="">All Actions</option>
                {actions.map(a => (
                  <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
              <select className="select text-xs h-8" value={filters.entity_type} onChange={e => setF('entity_type', e.target.value)}>
                <option value="">All Types</option>
                {['project','assignment','task','milestone','member','user'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">From Date</label>
              <input type="date" className="input text-xs h-8"
                value={filters.date_from}
                onChange={e => {
                  const v = e.target.value
                  setF('date_from', v)
                  if (v && filters.date_to && v > filters.date_to) setF('date_to', '')
                }} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">To Date</label>
              <input type="date" className="input text-xs h-8"
                value={filters.date_to}
                min={filters.date_from || undefined}
                onChange={e => {
                  if (filters.date_from && e.target.value && e.target.value < filters.date_from) return
                  setF('date_to', e.target.value)
                }} />
            </div>

          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{total.toLocaleString()} result{total !== 1 ? 's' : ''}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors">
                ← Prev
              </button>
              <span className="px-3">Page {page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors">
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-violet-400">
              <div className="text-center animate-pulse">
                <div className="text-4xl mb-2">⟳</div>
                <div className="text-xs">Loading…</div>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-sm font-medium">No audit log entries found</div>
              <div className="text-xs mt-1">Try adjusting the date range or filters</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">Timestamp</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">Actor</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">Action</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">Entity</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">Project</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((l, i) => (
                    <tr key={l.id} className={clsx('hover:bg-slate-50 transition-colors', i % 2 === 0 ? '' : 'bg-gray-50/40')}>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtTs(l.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{l.actor || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><ActionBadge action={l.action} /></td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {l.entity_type ? (
                          <span>
                            <span className="capitalize">{l.entity_type.replace(/_/g, ' ')}</span>
                            {l.entity_id ? <span className="text-gray-400 ml-1">#{l.entity_id}</span> : null}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {l.project_name !== '—' ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-violet-500">🏢</span>
                            {l.project_name}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-sm">
                        <span className="line-clamp-2">{l.description || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 text-xs">
            <button
              disabled={page === 1}
              onClick={() => { setPage(1); window.scrollTo(0, 0) }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">
              ⟪ First
            </button>
            <button
              disabled={page === 1}
              onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0) }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">
              ← Prev
            </button>
            <span className="px-4 py-1.5 text-gray-500">Page {page} of {totalPages} · {total.toLocaleString()} records</span>
            <button
              disabled={page >= totalPages}
              onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0) }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">
              Next →
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => { setPage(totalPages); window.scrollTo(0, 0) }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">
              Last ⟫
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
