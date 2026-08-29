import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import clsx from 'clsx'
import { useAppStore } from '../../store'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from 'recharts'

const CAN_EDIT_ROLES    = new Set(['Admin', 'Project Manager', 'FC Lead', 'TC Lead', 'BD'])
const CAN_APPROVE_ROLES = new Set(['Admin', 'Project Manager'])

const CATEGORIES = ['ERP', 'Analytics', 'Automation', 'Application', 'Custom Project']

const BD_STAGES = [
  'Lead Qualification', 'Warming Up', 'Exploring', 'Showcased', 'Proposal',
  'Negotiating - Won', 'Negotiating - Lost', 'Future Follow-up',
]

const STATUS_COLORS = {
  Draft:     '#94a3b8',
  Submitted: '#f59e0b',
  Approved:  '#10b981',
  Rejected:  '#f43f5e',
  Archived:  '#9ca3af',
}

const BD_COLORS = [
  '#6366f1','#3b82f6','#06b6d4','#10b981','#f59e0b',
  '#ef4444','#8b5cf6','#ec4899',
]

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtINR(n) {
  if (n == null) return '—'
  return `₹${Number(n).toLocaleString('en-IN')}`
}

// ─── Dashboard component ────────────────────────────────────────────────────
function ProposalDashboard({ proposals }) {
  const total     = proposals.length
  const approved  = proposals.filter(p => p.status === 'Approved').length
  const rejected  = proposals.filter(p => p.status === 'Rejected').length
  const pending   = proposals.filter(p => ['Draft','Submitted'].includes(p.status)).length
  const archived  = proposals.filter(p => p.status === 'Archived').length

  const totalProposalValue = proposals.reduce((s, p) => s + (p.proposal_value || 0), 0)
  const totalCostValue     = proposals.reduce((s, p) => s + (p.estimation_total_cost || 0), 0)

  // By status
  const byStatus = Object.entries(
    proposals.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || '#6366f1' }))

  // By BD Stage
  const byBdStage = Object.entries(
    proposals.reduce((acc, p) => {
      const key = p.bd_status || 'No Stage'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))

  // By category
  const byCategory = Object.entries(
    proposals.reduce((acc, p) => {
      const key = p.project_category || 'Uncategorized'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))

  // Monthly trend (by created_at)
  const byMonth = Object.entries(
    proposals.reduce((acc, p) => {
      if (!p.created_at) return acc
      const key = new Date(p.created_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  ).slice(-8).map(([name, value]) => ({ name, value }))

  const CARD_CLASSES = 'rounded-2xl p-5 flex flex-col gap-1 shadow-sm'

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Proposals',  value: total,    color: 'from-indigo-500 to-violet-500',   icon: '📋' },
          { label: 'Approved',         value: approved, color: 'from-emerald-500 to-teal-500',    icon: '✅' },
          { label: 'Rejected',         value: rejected, color: 'from-rose-500 to-pink-500',       icon: '❌' },
          { label: 'Pending / Draft',  value: pending,  color: 'from-amber-500 to-orange-500',   icon: '⏳' },
        ].map(c => (
          <div key={c.label} className={clsx(CARD_CLASSES, 'bg-gradient-to-br text-white', c.color)}>
            <span className="text-2xl">{c.icon}</span>
            <span className="text-3xl font-bold">{c.value}</span>
            <span className="text-sm text-white/80">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Value cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Proposal Value (Manual)',      value: fmtINR(totalProposalValue || null), icon: '💰', color: 'border-indigo-200 bg-indigo-50' },
          { label: 'Total Cost Value (Estimated)', value: fmtINR(totalCostValue || null),     icon: '🧮', color: 'border-emerald-200 bg-emerald-50' },
          { label: 'Archived Proposals',           value: archived,                           icon: '🗂️', color: 'border-gray-200 bg-gray-50' },
        ].map(c => (
          <div key={c.label} className={clsx('rounded-2xl border p-5 shadow-sm', c.color)}>
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-2xl font-bold text-gray-800">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status pie */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 Proposals by Status</h3>
          {total === 0 ? <p className="text-sm text-gray-400 text-center py-8">No data yet</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {byStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Count']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* BD Stage bar */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">🎯 Proposals by BD Stage</h3>
          {byBdStage.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No data yet</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byBdStage} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={110} />
                <Tooltip formatter={(v) => [v, 'Proposals']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {byBdStage.map((_, i) => <Cell key={i} fill={BD_COLORS[i % BD_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 Monthly Proposal Trend</h3>
          {byMonth.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No data yet</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'Proposals']} />
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Category */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">🏷️ Proposals by Category</h3>
          {byCategory.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No data yet</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'Proposals']} />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent proposals table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">🕐 Recent Proposals</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              {['Proposal No.','Client','Category','BD Stage','Status','Proposal Value','Cost Value','Created'].map(h => (
                <th key={h} className="text-left pb-2 pr-3 text-gray-400 font-semibold uppercase tracking-wide text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {proposals.slice(0, 10).map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                <td className="py-2 pr-3 font-mono text-indigo-700 font-semibold">{p.proposal_number || '—'}</td>
                <td className="py-2 pr-3 font-medium text-gray-800 max-w-[120px] truncate">{p.client_name}</td>
                <td className="py-2 pr-3 text-gray-500">{p.project_category || '—'}</td>
                <td className="py-2 pr-3 text-gray-600">{p.bd_status || '—'}</td>
                <td className="py-2 pr-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: STATUS_COLORS[p.status] + '22', color: STATUS_COLORS[p.status] }}>
                    {p.status}
                  </span>
                </td>
                <td className="py-2 pr-3 text-emerald-700 font-medium">{fmtINR(p.proposal_value)}</td>
                <td className="py-2 pr-3 text-blue-700">{fmtINR(p.estimation_total_cost)}</td>
                <td className="py-2 text-gray-400">{fmtDate(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function ProposalEstimatesPage() {
  const navigate = useNavigate()
  const { user }  = useAppStore()

  const [view,     setView]     = useState('list')   // 'list' | 'dashboard'
  const [proposals, setProposals] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [catFilter,    setCatFilter]    = useState('')
  const [bdFilter,     setBdFilter]     = useState('')

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
      if (catFilter) params.category  = catFilter
      if (bdFilter)  params.bd_status = bdFilter
      const { data } = await api.get('/proposal-estimates', { params })
      setProposals(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [catFilter, bdFilter])

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
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
            {[
              { key: 'list',      icon: '☰', label: 'List' },
              { key: 'dashboard', icon: '📊', label: 'Dashboard' },
            ].map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={clsx(
                  'px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors',
                  view === v.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <span>{v.icon}</span>{v.label}
              </button>
            ))}
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
      </div>

      {/* Dashboard view */}
      {view === 'dashboard' && (
        loading
          ? <div className="py-16 text-center text-gray-400">Loading analytics…</div>
          : <ProposalDashboard proposals={proposals} />
      )}

      {/* List view */}
      {view === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            {/* Category select */}
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* BD Status select */}
            <select
              value={bdFilter}
              onChange={e => setBdFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">🎯 All BD Stages</option>
              <option value="Lead Qualification">Lead Qualification</option>
              <option value="Warming Up">Warming Up</option>
              <option value="Exploring">Exploring</option>
              <option value="Showcased">Showcased</option>
              <option value="Proposal">Proposal</option>
              <optgroup label="Negotiating">
                <option value="Negotiating - Won">Won</option>
                <option value="Negotiating - Lost">Lost</option>
              </optgroup>
              <option value="Future Follow-up">Future Follow-up</option>
            </select>

            {(catFilter || bdFilter) && (
              <button
                onClick={() => { setCatFilter(''); setBdFilter('') }}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 border border-gray-200 rounded-lg px-2.5 py-1 bg-white"
              >
                ✕ Clear filters
              </button>
            )}

            <span className="ml-auto text-xs text-gray-400 self-center">
              {proposals.length} proposal{proposals.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Table header */}
            <div
              className="grid text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 px-4 py-3 border-b border-gray-200"
              style={{ gridTemplateColumns: '1fr 2fr 1.4fr 1.1fr 0.9fr 1fr 1fr 0.9fr' }}
            >
              <div>Proposal No.</div>
              <div>Client</div>
              <div>Project</div>
              <div>Category</div>
              <div>BD Stage</div>
              <div>Created By</div>
              <div>Created Date</div>
              <div>Total Cost Value</div>
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
                  style={{ gridTemplateColumns: '1fr 2fr 1.4fr 1.1fr 0.9fr 1fr 1fr 0.9fr' }}
                >
                  <div className="text-xs font-mono text-indigo-700 font-semibold truncate">
                    {p.proposal_number || '—'}
                  </div>
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
                  <div>
                    {p.bd_status ? (
                      <span className="text-xs text-gray-700 font-medium truncate">{p.bd_status}</span>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </div>
                  <div className="text-sm text-gray-600 truncate">{p.creator_name || '—'}</div>
                  <div className="text-sm text-gray-500">{fmtDate(p.created_at)}</div>
                  <div className="text-sm text-emerald-700 font-semibold">
                    {p.estimation_total_cost != null
                      ? `₹${p.estimation_total_cost.toLocaleString('en-IN')}`
                      : '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

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
