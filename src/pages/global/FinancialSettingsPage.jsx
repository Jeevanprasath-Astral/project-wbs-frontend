import { useState, useEffect, useCallback } from 'react'
import ConfirmModal from '../../components/common/ConfirmModal'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { useAppStore } from '../../store'
import { canAccessFinancialSettings } from '../../utils/permissions'
import clsx from 'clsx'

const BILLING_TYPES = [
  'Milestone Payment', 'New Requirements', 'Change Request',
  'Due Payment', 'Overtime Charges', 'Additional Scope', 'Miscellaneous',
]

const fmtCurrency = (v) =>
  v != null && v !== '' && !isNaN(Number(v))
    ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : '—'

const STATUS_COLORS = {
  'Not Started': 'bg-gray-100 text-gray-600',
  'In Progress':  'bg-blue-50 text-blue-700',
  'Completed':    'bg-emerald-50 text-emerald-700',
  'On Hold':      'bg-amber-50 text-amber-700',
  'Overdue':      'bg-rose-50 text-rose-700',
}

const ROLE_ICONS = {
  'Admin': '👑', 'FC Lead': '🧭', 'TC Lead': '🛠️',
  'Functional Consultant': '🧑‍💼', 'Technical Team': '💻', 'HR': '🧑‍🤝‍🧑',
}

const EMPTY_ADD_FORM = {
  planned_billing_amount: '',
  actual_billing_date:    '',
  actual_billing_amount:  '',
  billing_type:           'Milestone Payment',
  description:            '',
  milestone_id:           '',
  remarks:                '',
  _planned_date_display:  '',   // UI only — derived from milestone.planned_end
}

const AUDIT_ACTION_COLORS = {
  Created: 'bg-emerald-50 text-emerald-700',
  Updated: 'bg-amber-50 text-amber-700',
  Deleted: 'bg-rose-50 text-rose-600',
}

export default function FinancialSettingsPage() {
  const navigate = useNavigate()
  const { user } = useAppStore()

  useEffect(() => {
    if (!canAccessFinancialSettings(user)) navigate('/', { replace: true })
  }, [user, navigate])

  // ── Core data ────────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState([])
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, mRes] = await Promise.all([
        api.get('/projects'),
        api.get('/global/team'),
      ])
      setProjects(pRes.data)
      setMembers(mRes.data.filter(m => m.is_active))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const showToast = (text, type = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Project search ───────────────────────────────────────────────────────────
  const [projectSearch, setProjectSearch] = useState('')
  const [memberSearch,  setMemberSearch]  = useState('')

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()))
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.role?.toLowerCase().includes(memberSearch.toLowerCase()))

  // ── Billing history state ─────────────────────────────────────────────────────
  const [expanded,       setExpanded]       = useState(new Set())   // Set<project_id>
  const [billings,       setBillings]       = useState({})          // { pid: [entries] }
  const [projMilestones, setProjMilestones] = useState({})          // { pid: [{id,name,num,planned_end}] }
  const [loadingBilling, setLoadingBilling] = useState({})          // { pid: bool }
  const [activeTab,      setActiveTab]      = useState({})          // { pid: 'entries'|'audit' }
  const [auditLogs,      setAuditLogs]      = useState({})          // { pid: [log entries] }
  const [loadingAudit,   setLoadingAudit]   = useState({})          // { pid: bool }

  // Add form
  const [addingFor, setAddingFor] = useState(null)
  const [addForm,   setAddForm]   = useState(EMPTY_ADD_FORM)
  const [addSaving, setAddSaving] = useState(false)

  // Edit entry
  const [editEntry,  setEditEntry]  = useState(null)
  const [editSaving, setEditSaving] = useState(false)

  // Derive per-project billing total (actual if available, else planned)
  const getBillingTotal = (pid) =>
    (billings[pid] || []).reduce((s, e) =>
      s + (e.actual_billing_amount != null ? e.actual_billing_amount : (e.planned_billing_amount || 0)), 0)

  // Helper: get planned_end from milestone list for a given milestone_id
  const getPlannedDateForMilestone = (pid, msId) => {
    if (!msId) return ''
    const ms = (projMilestones[pid] || []).find(m => String(m.id) === String(msId))
    return ms?.planned_end || ''
  }

  const toggleProject = async (pid) => {
    if (expanded.has(pid)) {
      setExpanded(prev => { const s = new Set(prev); s.delete(pid); return s })
      if (addingFor === pid) setAddingFor(null)
      if (editEntry?.project_id === pid) setEditEntry(null)
      return
    }
    setExpanded(prev => new Set([...prev, pid]))
    setActiveTab(prev => ({ ...prev, [pid]: prev[pid] || 'entries' }))
    if (!billings[pid]) {
      setLoadingBilling(prev => ({ ...prev, [pid]: true }))
      try {
        const [bRes, mRes] = await Promise.all([
          api.get(`/project-billings/${pid}`),
          api.get(`/project-billings/${pid}/milestones`),
        ])
        setBillings(prev => ({ ...prev, [pid]: bRes.data }))
        setProjMilestones(prev => ({ ...prev, [pid]: mRes.data }))
      } catch { /* silent */ }
      finally { setLoadingBilling(prev => ({ ...prev, [pid]: false })) }
    }
  }

  const switchTab = async (pid, tab) => {
    setActiveTab(prev => ({ ...prev, [pid]: tab }))
    if (tab === 'audit' && !auditLogs[pid]) {
      setLoadingAudit(prev => ({ ...prev, [pid]: true }))
      try {
        const res = await api.get(`/project-billings/${pid}/audit-log`)
        setAuditLogs(prev => ({ ...prev, [pid]: res.data }))
      } catch { setAuditLogs(prev => ({ ...prev, [pid]: [] })) }
      finally { setLoadingAudit(prev => ({ ...prev, [pid]: false })) }
    }
  }

  // ── Add form helpers ──────────────────────────────────────────────────────────
  const startAddForm = (pid) => {
    setEditEntry(null)
    setAddingFor(pid)
    setAddForm({ ...EMPTY_ADD_FORM })
  }

  const cancelAddForm = () => setAddingFor(null)

  const submitAddForm = async (pid) => {
    const amt = parseFloat(addForm.planned_billing_amount)
    if (isNaN(amt) || amt < 0) { showToast('Enter a valid planned amount ≥ 0', 'error'); return }
    setAddSaving(true)
    try {
      const res = await api.post(`/project-billings/${pid}`, {
        planned_billing_amount: amt,
        actual_billing_date:    addForm.actual_billing_date    || null,
        actual_billing_amount:  addForm.actual_billing_amount !== '' ? parseFloat(addForm.actual_billing_amount) : null,
        billing_type:           addForm.billing_type           || null,
        description:            addForm.description            || null,
        milestone_id:           addForm.milestone_id ? parseInt(addForm.milestone_id) : null,
        remarks:                addForm.remarks                || null,
      })
      setBillings(prev => ({ ...prev, [pid]: [res.data, ...(prev[pid] || [])] }))
      // Invalidate audit log so it reloads next time
      setAuditLogs(prev => { const n = { ...prev }; delete n[pid]; return n })
      setAddingFor(null)
      showToast('Billing entry added')
    } catch (e) {
      showToast(e.response?.data?.detail || 'Save failed', 'error')
    } finally { setAddSaving(false) }
  }

  // ── Edit entry helpers ────────────────────────────────────────────────────────
  const startEditEntry = (entry, pid) => {
    setAddingFor(null)
    setEditEntry({ ...entry, project_id: pid })
  }

  const cancelEditEntry = () => setEditEntry(null)

  const submitEditEntry = async () => {
    if (!editEntry) return
    const amt = parseFloat(editEntry.planned_billing_amount)
    if (isNaN(amt) || amt < 0) { showToast('Enter a valid planned amount ≥ 0', 'error'); return }
    setEditSaving(true)
    try {
      const res = await api.patch(`/project-billings/entry/${editEntry.id}`, {
        planned_billing_amount: amt,
        actual_billing_date:    editEntry.actual_billing_date    || null,
        actual_billing_amount:  editEntry.actual_billing_amount !== '' && editEntry.actual_billing_amount != null
                                  ? parseFloat(editEntry.actual_billing_amount) : null,
        billing_type:           editEntry.billing_type           || null,
        description:            editEntry.description            || null,
        milestone_id:           editEntry.milestone_id ? parseInt(editEntry.milestone_id) : null,
        remarks:                editEntry.remarks                || null,
      })
      const pid = editEntry.project_id
      setBillings(prev => ({
        ...prev,
        [pid]: prev[pid].map(e => e.id === editEntry.id ? res.data : e),
      }))
      // Invalidate audit log
      setAuditLogs(prev => { const n = { ...prev }; delete n[pid]; return n })
      setEditEntry(null)
      showToast('Billing entry updated')
    } catch (e) {
      showToast(e.response?.data?.detail || 'Update failed', 'error')
    } finally { setEditSaving(false) }
  }

  const deleteEntry = (entryId, pid) => {
    setConfirmState({
      title: 'Delete billing entry?',
      message: 'This cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/project-billings/entry/${entryId}`)
          setBillings(prev => ({ ...prev, [pid]: prev[pid].filter(e => e.id !== entryId) }))
          setAuditLogs(prev => { const n = { ...prev }; delete n[pid]; return n })
          showToast('Entry deleted')
        } catch (e) {
          showToast(e.response?.data?.detail || 'Delete failed', 'error')
        }
      }
    })
  }

  // ── Cost rate inline edit ─────────────────────────────────────────────────────
  const [rateEditing, setRateEditing] = useState(null)
  const [rateSaving,  setRateSaving]  = useState(false)

  const startRateEdit = (m) =>
    setRateEditing({ id: m.id, value: m.cost_rate == null ? '' : String(m.cost_rate) })
  const cancelRateEdit = () => setRateEditing(null)
  const saveRateEdit = async () => {
    if (!rateEditing) return
    const val = parseFloat(rateEditing.value)
    if (isNaN(val) || val < 0) { showToast('Enter a valid non-negative number', 'error'); return }
    setRateSaving(true)
    try {
      await api.patch(`/global/team/${rateEditing.id}`, { cost_rate: val })
      setMembers(prev => prev.map(m => m.id === rateEditing.id ? { ...m, cost_rate: val } : m))
      setRateEditing(null)
      showToast('Cost rate updated')
    } catch (e) {
      showToast(e.response?.data?.detail || 'Save failed', 'error')
    } finally { setRateSaving(false) }
  }

  if (!canAccessFinancialSettings(user)) return null

  const tdInput = 'input text-xs h-7 py-0 px-1.5 min-w-0'
  const NCOLS = 9

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-violet-600 text-sm transition-colors">🏠 Home</button>
          <span className="text-gray-200">/</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                 style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>⚙️</div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Financial Settings</h1>
              <p className="text-xs text-gray-400">Admin & HR — manage project billing history and team member cost rates</p>
            </div>
          </div>
          <span className="ml-auto text-xs bg-violet-50 border border-violet-100 text-violet-600 font-medium px-2 py-0.5 rounded-full">🔒 Admin & HR</span>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5 space-y-6">

        {toast && (
          <div className={clsx('px-4 py-2.5 rounded-xl text-sm font-medium',
            toast.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')}>
            {toast.text}
          </div>
        )}

        {/* How-to banner */}
        <div className="bg-violet-50 border border-violet-100 rounded-2xl px-5 py-3 text-xs text-violet-800 leading-relaxed">
          <span className="font-semibold">How to use:</span>{' '}
          Click <strong>▶ on a project row</strong> to expand. Select a <strong>Milestone</strong> to auto-populate the Planned Billing Date.
          Enter Planned Amount upfront and fill Actual Date + Actual Amount once billing is completed.
          Switch to the <strong>Audit Log</strong> tab to see every change made.
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40 text-violet-400 text-sm animate-pulse">Loading…</div>
        ) : (
          <>
            {/* ── Section 1: Project Billing History ───────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Project Billing History</div>
                    <div className="text-xs text-gray-400">Plan vs actual — Planned Date auto-fills from selected milestone</div>
                  </div>
                </div>
                <input
                  type="text" placeholder="Search projects…"
                  className="input text-xs h-8 w-52"
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100">
                      <th className="w-8 px-3 py-2.5"></th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Project</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Client</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-500">Total Billed (₹)</th>
                      <th className="text-center px-4 py-2.5 font-medium text-gray-500">Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-400 italic">No projects found</td></tr>
                    )}
                    {filteredProjects.map((p, i) => {
                      const isExp     = expanded.has(p.id)
                      const entries   = billings[p.id] || []
                      const total     = getBillingTotal(p.id)
                      const isLoading = loadingBilling[p.id]
                      const tab       = activeTab[p.id] || 'entries'

                      return [
                        /* Project summary row */
                        <tr
                          key={`p-${p.id}`}
                          onClick={() => toggleProject(p.id)}
                          className={clsx(
                            'border-b border-gray-50 cursor-pointer select-none transition-colors',
                            isExp ? 'bg-violet-50/60' : (i % 2 === 0 ? 'bg-white hover:bg-violet-50/30' : 'bg-slate-50/40 hover:bg-violet-50/30')
                          )}
                        >
                          <td className="px-3 py-2.5 text-center text-gray-400">
                            <span className={clsx('inline-block transition-transform duration-200', isExp && 'rotate-90')}>▶</span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{p.name}</td>
                          <td className="px-4 py-2.5 text-gray-500">{p.client || '—'}</td>
                          <td className="px-4 py-2.5">
                            <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600')}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                            {isExp && billings[p.id] ? fmtCurrency(total) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-400">
                            {isExp && billings[p.id] ? entries.length : '—'}
                          </td>
                        </tr>,

                        /* Expanded detail */
                        isExp && (
                          <tr key={`exp-${p.id}`}>
                            <td colSpan={6} className="p-0 bg-violet-50/30 border-b border-violet-100">
                              <div className="px-6 py-4">
                                {isLoading ? (
                                  <div className="text-xs text-violet-400 animate-pulse py-4 text-center">Loading billing entries…</div>
                                ) : (
                                  <>
                                    {/* Tab bar */}
                                    <div className="flex items-center gap-1 mb-3">
                                      {['entries', 'audit'].map(t => (
                                        <button
                                          key={t}
                                          onClick={() => switchTab(p.id, t)}
                                          className={clsx(
                                            'text-xs px-3 py-1 rounded-lg font-medium transition-colors',
                                            tab === t
                                              ? 'bg-violet-600 text-white'
                                              : 'bg-white text-gray-500 border border-gray-200 hover:bg-violet-50'
                                          )}>
                                          {t === 'entries' ? '📋 Billing Entries' : '📜 Audit Log'}
                                        </button>
                                      ))}
                                    </div>

                                    {/* ── ENTRIES TAB ─────────────────────────── */}
                                    {tab === 'entries' && (
                                      <>
                                        <div className="rounded-xl border border-violet-100 overflow-hidden bg-white overflow-x-auto">
                                          <table className="w-full text-xs" style={{minWidth:'900px'}}>
                                            <thead>
                                              <tr className="bg-violet-50 border-b border-violet-100">
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Milestone</th>
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Planned Date</th>
                                                <th className="text-right px-3 py-2 font-medium text-violet-700">Planned Amt (₹)</th>
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Actual Date</th>
                                                <th className="text-right px-3 py-2 font-medium text-violet-700">Actual Amt (₹)</th>
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Billing Type</th>
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Description</th>
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Remarks</th>
                                                <th className="px-3 py-2 w-16"></th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {entries.length === 0 && addingFor !== p.id && (
                                                <tr>
                                                  <td colSpan={NCOLS} className="text-center py-5 text-gray-400 italic">
                                                    No billing entries yet — click <strong>+ Add Entry</strong> below
                                                  </td>
                                                </tr>
                                              )}

                                              {entries.map((entry, ei) => {
                                                const isEditing     = editEntry?.id === entry.id
                                                const milestoneOpts = projMilestones[p.id] || []

                                                if (isEditing) {
                                                  // Derive planned_date for the currently selected milestone
                                                  const editPbd = getPlannedDateForMilestone(p.id, editEntry.milestone_id)
                                                    || editEntry.planned_billing_date || '—'
                                                  return (
                                                    <tr key={entry.id} className="bg-amber-50 border-b border-amber-100">
                                                      {/* Milestone */}
                                                      <td className="px-2 py-1.5">
                                                        <select
                                                          className={clsx(tdInput, 'select')} style={{width:'130px'}}
                                                          value={editEntry.milestone_id || ''}
                                                          onChange={e => setEditEntry(v => ({ ...v, milestone_id: e.target.value }))}>
                                                          <option value="">None</option>
                                                          {milestoneOpts.map(m => (
                                                            <option key={m.id} value={m.id}>M{m.num}: {m.name}</option>
                                                          ))}
                                                        </select>
                                                      </td>
                                                      {/* Planned Date — read-only, derived */}
                                                      <td className="px-2 py-1.5">
                                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md whitespace-nowrap">
                                                          {editPbd}
                                                        </span>
                                                      </td>
                                                      {/* Planned Amount */}
                                                      <td className="px-2 py-1.5">
                                                        <input type="number" min="0" step="0.01"
                                                          className={tdInput} style={{width:'90px'}}
                                                          value={editEntry.planned_billing_amount ?? ''}
                                                          onChange={e => setEditEntry(v => ({ ...v, planned_billing_amount: e.target.value }))} />
                                                      </td>
                                                      {/* Actual Date */}
                                                      <td className="px-2 py-1.5">
                                                        <input type="date"
                                                          className={tdInput} style={{width:'115px'}}
                                                          value={editEntry.actual_billing_date || ''}
                                                          onChange={e => setEditEntry(v => ({ ...v, actual_billing_date: e.target.value }))} />
                                                      </td>
                                                      {/* Actual Amount */}
                                                      <td className="px-2 py-1.5">
                                                        <input type="number" min="0" step="0.01"
                                                          className={tdInput} style={{width:'90px'}}
                                                          value={editEntry.actual_billing_amount ?? ''}
                                                          placeholder="—"
                                                          onChange={e => setEditEntry(v => ({ ...v, actual_billing_amount: e.target.value }))} />
                                                      </td>
                                                      {/* Billing Type */}
                                                      <td className="px-2 py-1.5">
                                                        <select className={clsx(tdInput, 'select')} style={{width:'130px'}}
                                                          value={editEntry.billing_type || ''}
                                                          onChange={e => setEditEntry(v => ({ ...v, billing_type: e.target.value }))}>
                                                          {BILLING_TYPES.map(t => <option key={t}>{t}</option>)}
                                                        </select>
                                                      </td>
                                                      {/* Description */}
                                                      <td className="px-2 py-1.5">
                                                        <input type="text"
                                                          className={tdInput} style={{width:'140px'}}
                                                          value={editEntry.description || ''}
                                                          placeholder="Description"
                                                          onChange={e => setEditEntry(v => ({ ...v, description: e.target.value }))} />
                                                      </td>
                                                      {/* Remarks */}
                                                      <td className="px-2 py-1.5">
                                                        <input type="text"
                                                          className={tdInput} style={{width:'120px'}}
                                                          value={editEntry.remarks || ''}
                                                          placeholder="Remarks"
                                                          onChange={e => setEditEntry(v => ({ ...v, remarks: e.target.value }))}
                                                          onKeyDown={e => { if (e.key === 'Enter') submitEditEntry(); if (e.key === 'Escape') cancelEditEntry() }} />
                                                      </td>
                                                      {/* Actions */}
                                                      <td className="px-2 py-1.5">
                                                        <div className="flex items-center gap-1">
                                                          <button onClick={submitEditEntry} disabled={editSaving}
                                                            className="text-xs px-2 py-0.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                                                            {editSaving ? '…' : '✓'}
                                                          </button>
                                                          <button onClick={cancelEditEntry}
                                                            className="text-xs px-1.5 py-0.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  )
                                                }

                                                return (
                                                  <tr key={entry.id} className={clsx(
                                                    'border-b border-gray-50 hover:bg-violet-50/20 transition-colors',
                                                    ei % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                                                  )}>
                                                    <td className="px-3 py-2 text-gray-700 font-medium">{entry.milestone_name || '—'}</td>
                                                    <td className="px-3 py-2 text-gray-500">{entry.planned_billing_date || '—'}</td>
                                                    <td className="px-3 py-2 text-right font-semibold text-blue-700">
                                                      {fmtCurrency(entry.planned_billing_amount)}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-500">{entry.actual_billing_date || '—'}</td>
                                                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                                                      {entry.actual_billing_amount != null ? fmtCurrency(entry.actual_billing_amount) : '—'}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-xs">
                                                        {entry.billing_type || '—'}
                                                      </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{entry.description || '—'}</td>
                                                    <td className="px-3 py-2 text-gray-400 italic">{entry.remarks || '—'}</td>
                                                    <td className="px-3 py-2">
                                                      <div className="flex items-center gap-1.5">
                                                        <button onClick={() => startEditEntry(entry, p.id)}
                                                          className="text-violet-400 hover:text-violet-600 transition-colors" title="Edit">✏️</button>
                                                        <button onClick={() => deleteEntry(entry.id, p.id)}
                                                          className="text-rose-300 hover:text-rose-500 transition-colors" title="Delete">🗑️</button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                )
                                              })}

                                              {/* Add entry form row */}
                                              {addingFor === p.id && (() => {
                                                const milestoneOpts = projMilestones[p.id] || []
                                                const addPbd = getPlannedDateForMilestone(p.id, addForm.milestone_id)
                                                return (
                                                  <tr className="bg-emerald-50 border-b border-emerald-100">
                                                    {/* Milestone */}
                                                    <td className="px-2 py-1.5">
                                                      <select
                                                        className={clsx(tdInput, 'select')} style={{width:'130px'}}
                                                        value={addForm.milestone_id}
                                                        onChange={e => setAddForm(f => ({ ...f, milestone_id: e.target.value }))}>
                                                        <option value="">None</option>
                                                        {milestoneOpts.map(m => (
                                                          <option key={m.id} value={m.id}>M{m.num}: {m.name}</option>
                                                        ))}
                                                      </select>
                                                    </td>
                                                    {/* Planned Date — auto-derived, read-only */}
                                                    <td className="px-2 py-1.5">
                                                      <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-md whitespace-nowrap">
                                                        {addPbd || 'Select milestone'}
                                                      </span>
                                                    </td>
                                                    {/* Planned Amount */}
                                                    <td className="px-2 py-1.5">
                                                      <input type="number" min="0" step="0.01"
                                                        className={tdInput} style={{width:'90px'}}
                                                        value={addForm.planned_billing_amount} placeholder="0.00"
                                                        onChange={e => setAddForm(f => ({ ...f, planned_billing_amount: e.target.value }))} />
                                                    </td>
                                                    {/* Actual Date */}
                                                    <td className="px-2 py-1.5">
                                                      <input type="date"
                                                        className={tdInput} style={{width:'115px'}}
                                                        value={addForm.actual_billing_date}
                                                        onChange={e => setAddForm(f => ({ ...f, actual_billing_date: e.target.value }))} />
                                                    </td>
                                                    {/* Actual Amount */}
                                                    <td className="px-2 py-1.5">
                                                      <input type="number" min="0" step="0.01"
                                                        className={tdInput} style={{width:'90px'}}
                                                        value={addForm.actual_billing_amount} placeholder="—"
                                                        onChange={e => setAddForm(f => ({ ...f, actual_billing_amount: e.target.value }))} />
                                                    </td>
                                                    {/* Billing Type */}
                                                    <td className="px-2 py-1.5">
                                                      <select className={clsx(tdInput, 'select')} style={{width:'130px'}}
                                                        value={addForm.billing_type}
                                                        onChange={e => setAddForm(f => ({ ...f, billing_type: e.target.value }))}>
                                                        {BILLING_TYPES.map(t => <option key={t}>{t}</option>)}
                                                      </select>
                                                    </td>
                                                    {/* Description */}
                                                    <td className="px-2 py-1.5">
                                                      <input type="text"
                                                        className={tdInput} style={{width:'140px'}}
                                                        value={addForm.description} placeholder="Description"
                                                        onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
                                                    </td>
                                                    {/* Remarks */}
                                                    <td className="px-2 py-1.5">
                                                      <input type="text"
                                                        className={tdInput} style={{width:'120px'}}
                                                        value={addForm.remarks} placeholder="Remarks"
                                                        onChange={e => setAddForm(f => ({ ...f, remarks: e.target.value }))}
                                                        onKeyDown={e => { if (e.key === 'Enter') submitAddForm(p.id); if (e.key === 'Escape') cancelAddForm() }} />
                                                    </td>
                                                    {/* Actions */}
                                                    <td className="px-2 py-1.5">
                                                      <div className="flex items-center gap-1">
                                                        <button onClick={() => submitAddForm(p.id)} disabled={addSaving}
                                                          className="text-xs px-2 py-0.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                                                          {addSaving ? '…' : '+ Add'}
                                                        </button>
                                                        <button onClick={cancelAddForm}
                                                          className="text-xs px-1.5 py-0.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                )
                                              })()}
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* Footer: add + total */}
                                        <div className="mt-2.5 flex items-center justify-between">
                                          <button
                                            onClick={() => startAddForm(p.id)}
                                            disabled={addingFor === p.id}
                                            className="text-xs flex items-center gap-1 text-violet-600 hover:text-violet-800 font-medium disabled:opacity-40 transition-colors">
                                            <span className="text-base leading-none">+</span> Add Entry
                                          </button>
                                          {entries.length > 0 && (
                                            <div className="text-xs text-gray-500 flex items-center gap-3">
                                              <span>
                                                Planned:{' '}
                                                <span className="font-bold text-blue-700">
                                                  {fmtCurrency(entries.reduce((s, e) => s + (e.planned_billing_amount || 0), 0))}
                                                </span>
                                              </span>
                                              <span>
                                                Actual:{' '}
                                                <span className="font-bold text-emerald-700">
                                                  {fmtCurrency(entries.reduce((s, e) => s + (e.actual_billing_amount || 0), 0))}
                                                </span>
                                              </span>
                                              <span className="text-gray-400">
                                                ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    )}

                                    {/* ── AUDIT LOG TAB ───────────────────────── */}
                                    {tab === 'audit' && (
                                      loadingAudit[p.id] ? (
                                        <div className="text-xs text-violet-400 animate-pulse py-4 text-center">Loading audit log…</div>
                                      ) : (
                                        <div className="rounded-xl border border-violet-100 overflow-hidden bg-white overflow-x-auto">
                                          <table className="w-full text-xs" style={{minWidth:'700px'}}>
                                            <thead>
                                              <tr className="bg-violet-50 border-b border-violet-100">
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Action</th>
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Changed By</th>
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Changed At</th>
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Milestone</th>
                                                <th className="text-right px-3 py-2 font-medium text-violet-700">Planned Amt</th>
                                                <th className="text-right px-3 py-2 font-medium text-violet-700">Actual Amt</th>
                                                <th className="text-left px-3 py-2 font-medium text-violet-700">Billing Type</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {(auditLogs[p.id] || []).length === 0 ? (
                                                <tr>
                                                  <td colSpan={7} className="text-center py-5 text-gray-400 italic">No audit entries yet</td>
                                                </tr>
                                              ) : (auditLogs[p.id] || []).map((log, li) => (
                                                <tr key={log.id} className={clsx(
                                                  'border-b border-gray-50',
                                                  li % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                                                )}>
                                                  <td className="px-3 py-2">
                                                    <span className={clsx('px-1.5 py-0.5 rounded-md text-xs font-semibold',
                                                      AUDIT_ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600')}>
                                                      {log.action}
                                                    </span>
                                                  </td>
                                                  <td className="px-3 py-2 text-gray-700">{log.changed_by}</td>
                                                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                                    {log.changed_at ? log.changed_at.replace('T', ' ').slice(0, 19) : '—'}
                                                  </td>
                                                  <td className="px-3 py-2 text-gray-600">{log.snapshot?.milestone_name || '—'}</td>
                                                  <td className="px-3 py-2 text-right text-blue-700 font-medium">
                                                    {fmtCurrency(log.snapshot?.planned_billing_amount)}
                                                  </td>
                                                  <td className="px-3 py-2 text-right text-emerald-700 font-medium">
                                                    {log.snapshot?.actual_billing_amount != null
                                                      ? fmtCurrency(log.snapshot.actual_billing_amount) : '—'}
                                                  </td>
                                                  <td className="px-3 py-2 text-gray-500">{log.snapshot?.billing_type || '—'}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ),
                      ]
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-2.5 border-t border-gray-50 text-xs text-gray-400">
                {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                {projectSearch && ` matching "${projectSearch}"`}
              </div>
            </div>

            {/* ── Section 2: Team Member Cost Rates ────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👷</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Team Member Cost Rates</div>
                    <div className="text-xs text-gray-400">Hourly cost rate per person — Manpower Cost = Hours worked × this rate</div>
                  </div>
                </div>
                <input
                  type="text" placeholder="Search by name or role…"
                  className="input text-xs h-8 w-52"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100">
                      <th className="text-left px-5 py-2.5 font-medium text-gray-500">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Role</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500">Team</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 min-w-[200px]">Cost Rate (₹ / hr)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-gray-400 italic">No members found</td></tr>
                    )}
                    {filteredMembers.map((m, i) => (
                      <tr key={m.id} className={clsx('border-b border-gray-50 hover:bg-violet-50/30 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
                        <td className="px-5 py-2.5 font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                 style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                              {m.name?.slice(0, 1).toUpperCase()}
                            </div>
                            {m.name}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{ROLE_ICONS[m.role] || '👤'} {m.role}</td>
                        <td className="px-4 py-2.5 text-gray-500">{m.team_name || '—'}</td>
                        <td className="px-4 py-2.5">
                          {rateEditing?.id === m.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 text-xs">₹</span>
                              <input
                                autoFocus type="number" min="0" step="0.01"
                                className="input text-xs h-7 w-28 py-0"
                                value={rateEditing.value}
                                onChange={e => setRateEditing(prev => ({ ...prev, value: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') saveRateEdit(); if (e.key === 'Escape') cancelRateEdit() }}
                              />
                              <button onClick={saveRateEdit} disabled={rateSaving}
                                className="text-xs px-2 py-0.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                                {rateSaving ? '…' : '✓'}
                              </button>
                              <button onClick={cancelRateEdit}
                                className="text-xs px-1.5 py-0.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startRateEdit(m)}
                              className="group flex items-center gap-1 text-xs text-left rounded-lg px-2 py-1 hover:bg-violet-50 transition-colors">
                              <span className={clsx(m.cost_rate ? 'text-gray-800 font-medium' : 'text-gray-400 italic')}>
                                {m.cost_rate ? fmtCurrency(m.cost_rate) : 'Click to set'}
                              </span>
                              <span className="opacity-0 group-hover:opacity-100 text-violet-400 text-xs transition-opacity">✏️</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-5 py-2.5 border-t border-gray-50 text-xs text-gray-400">
                {filteredMembers.length} active member{filteredMembers.length !== 1 ? 's' : ''}
                {memberSearch && ` matching "${memberSearch}"`}
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel="Delete"
        danger={true}
        onConfirm={() => { confirmState?.onConfirm(); setConfirmState(null) }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}
