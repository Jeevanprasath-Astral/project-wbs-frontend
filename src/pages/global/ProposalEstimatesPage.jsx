import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import clsx from 'clsx'
import { useAppStore } from '../../store'

const CAN_EDIT_ROLES    = new Set(['Admin', 'Project Manager', 'FC Lead', 'TC Lead'])
const CAN_APPROVE_ROLES = new Set(['Admin', 'Project Manager'])

const CATEGORIES = ['ERP', 'Analytics', 'Automation', 'Application', 'Custom Project']
const STATUSES   = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Archived']

const STATUS_STYLE = {
  Draft:     'bg-slate-100 text-slate-600',
  Submitted: 'bg-amber-100 text-amber-700',
  Approved:  'bg-emerald-100 text-emerald-700',
  Rejected:  'bg-rose-100 text-rose-700',
  Archived:  'bg-gray-100 text-gray-500',
}

function StatusBadge({ status }) {
  return (
    <span className={clsx(
      'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
      STATUS_STYLE[status] || 'bg-slate-100 text-slate-600'
    )}>
      {status}
    </span>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProposalEstimatesPage() {
  const navigate = useNavigate()
  const { user }  = useAppStore()

  const [proposals, setProposals] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [catFilter,    setCatFilter]    = useState('')

  // create modal
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ client_name: '', project_name: '', project_category: '' })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  const canEdit = user && CAN_EDIT_ROLES.has(user.role)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (statusFilter) params.status   = statusFilter
      if (catFilter)    params.category = catFilter
      const { data } = await api.get('/proposal-estimates', { params })
      setProposals(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, catFilter])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.client_name.trim()) { setErr('Client name is required'); return }
    setSaving(true); setErr('')
    try {
      const { data } = await api.post('/proposal-estimates', form)
      navigate(`/global/proposal-estimates/${data.id}`)
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to create proposal')
    } finally {
      setSaving(false)
    }
  }

  const openCreate = () => {
    setForm({ client_name: '', project_name: '', project_category: '' })
    setErr('')
    setShowCreate(true)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposal Estimates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage client proposal documents and estimations</p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Proposal
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Status filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              !statusFilter
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
            )}
          >
            All
          </button>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                statusFilter === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Category select */}
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-2.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Table header */}
        <div
          className="grid text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 px-4 py-3 border-b border-gray-200"
          style={{ gridTemplateColumns: '2fr 1.4fr 1.1fr 0.9fr 1fr 1fr 0.7fr' }}
        >
          <div>Client</div>
          <div>Project</div>
          <div>Category</div>
          <div>Status</div>
          <div>Created By</div>
          <div>Created Date</div>
          <div>Version</div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : proposals.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-sm">No proposals found</p>
            {canEdit && (
              <button onClick={openCreate}
                className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
                Create your first proposal
              </button>
            )}
          </div>
        ) : (
          proposals.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => navigate(`/global/proposal-estimates/${p.id}`)}
              className={clsx(
                'grid items-center px-4 py-3 cursor-pointer hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0',
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              )}
              style={{ gridTemplateColumns: '2fr 1.4fr 1.1fr 0.9fr 1fr 1fr 0.7fr' }}
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{p.client_name}</p>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-600 truncate">{p.project_name || '—'}</p>
              </div>
              <div>
                {p.project_category ? (
                  <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-xs font-medium">
                    {p.project_category}
                  </span>
                ) : <span className="text-gray-300 text-sm">—</span>}
              </div>
              <div><StatusBadge status={p.status} /></div>
              <div className="text-sm text-gray-600 truncate">{p.creator_name || '—'}</div>
              <div className="text-sm text-gray-500">{fmtDate(p.created_at)}</div>
              <div className="text-sm text-gray-500 font-medium">v{p.version}</div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
              <h2 className="text-lg font-bold text-white">New Proposal Estimate</h2>
              <p className="text-indigo-200 text-xs mt-0.5">Fill in the basic details to create a new proposal</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Client Name <span className="text-rose-500">*</span>
                </label>
                <input
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="e.g. Acme Corporation"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Project Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={form.project_name}
                  onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))}
                  placeholder="e.g. ERP Implementation Phase 2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Project Category <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={form.project_category}
                  onChange={e => setForm(f => ({ ...f, project_category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {err && <p className="text-rose-600 text-xs">{err}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating…' : 'Create Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
