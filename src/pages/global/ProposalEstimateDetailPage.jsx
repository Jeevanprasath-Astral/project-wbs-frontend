import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import clsx from 'clsx'
import { useAppStore } from '../../store'

const CAN_EDIT_ROLES    = new Set(['Admin', 'Project Manager', 'FC Lead', 'TC Lead'])
const CAN_APPROVE_ROLES = new Set(['Admin', 'Project Manager'])
const CATEGORIES        = ['ERP', 'Analytics', 'Automation', 'Application', 'Custom Project']
const FREQUENCIES       = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Ad-hoc', 'On-demand']
const OUTPUT_METHODS    = ['Email', 'WhatsApp', 'Folder', 'Portal']
const INPUT_FORMS       = ['Excel', 'PDF', 'API', 'Manual Entry']

// Phase 2+3: status actions use v2 endpoints that write audit logs + version increment
const STATUS_FLOW = {
  Draft:     { next: 'Submit',  action: 'submit-v2',  label: 'Submit for Approval', btnClass: 'bg-amber-500 hover:bg-amber-600' },
  Submitted: { next: 'Approve', action: 'approve-v2', label: 'Approve',             btnClass: 'bg-emerald-600 hover:bg-emerald-700' },
  Approved:  { next: null },
  Rejected:  { next: 'Submit',  action: 'submit-v2',  label: 'Resubmit',            btnClass: 'bg-amber-500 hover:bg-amber-600' },
  Archived:  { next: null },
}

const STATUS_STYLE = {
  Draft:     'bg-slate-100 text-slate-600',
  Submitted: 'bg-amber-100 text-amber-700',
  Approved:  'bg-emerald-100 text-emerald-700',
  Rejected:  'bg-rose-100 text-rose-700',
  Archived:  'bg-gray-100 text-gray-500',
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Multi-select chip group ───────────────────────────────────────────────────
function ChipGroup({ options, value = [], onChange, disabled }) {
  const toggle = (opt) => {
    if (disabled) return
    onChange(value.includes(opt) ? value.filter(x => x !== opt) : [...value, opt])
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          disabled={disabled}
          className={clsx(
            'px-2.5 py-1 text-xs rounded-full border transition-colors',
            value.includes(opt)
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400',
            disabled && 'opacity-60 cursor-default'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Feature toggle row ────────────────────────────────────────────────────────
function FeatRow({ label, enabled, onToggle, detail, onDetail, placeholder, disabled }) {
  return (
    <div className={clsx('border border-gray-200 rounded-lg p-4 transition-colors', enabled ? 'bg-indigo-50/60' : 'bg-white')}>
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={() => !disabled && onToggle(!enabled)}
          className={clsx(
            'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
            enabled ? 'bg-indigo-600' : 'bg-gray-200',
            disabled && 'opacity-60 cursor-default'
          )}
        >
          <span className={clsx(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200',
            enabled ? 'translate-x-4' : 'translate-x-0'
          )} />
        </button>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      {enabled && (
        <textarea
          value={detail || ''}
          onChange={e => !disabled && onDetail(e.target.value)}
          placeholder={placeholder}
          rows={2}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
        />
      )}
    </div>
  )
}

// ─── Section text area ─────────────────────────────────────────────────────────
function SectionBox({ title, value, onChange, disabled }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        rows={6}
        placeholder={disabled ? '' : `Describe ${title.toLowerCase()}…`}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-600"
      />
    </div>
  )
}

// ─── Report table row ──────────────────────────────────────────────────────────
function ReportRow({ row, onUpdate, onDelete, disabled }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...row })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await onUpdate(row.id, form)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/40 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Sl. No.</label>
            <input type="number" value={form.sl_no} onChange={e => setForm(f => ({ ...f, sl_no: +e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Frequency</label>
            <select value={form.frequency || ''} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Select…</option>
              {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Report Name <span className="text-rose-500">*</span></label>
          <input value={form.report_name} onChange={e => setForm(f => ({ ...f, report_name: e.target.value }))}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Output Method</label>
          <ChipGroup options={OUTPUT_METHODS} value={form.output_methods || []}
            onChange={v => setForm(f => ({ ...f, output_methods: v }))} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id={`oa-${row.id}`} checked={form.output_automated}
            onChange={e => setForm(f => ({ ...f, output_automated: e.target.checked }))} />
          <label htmlFor={`oa-${row.id}`} className="text-xs text-gray-600">Output is automated</label>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600">Rough Input Description</label>
          <textarea value={form.rough_input || ''} onChange={e => setForm(f => ({ ...f, rough_input: e.target.value }))}
            rows={2} className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Input Format</label>
          <ChipGroup options={INPUT_FORMS} value={form.input_form || []}
            onChange={v => setForm(f => ({ ...f, input_form: v }))} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id={`iga-${row.id}`} checked={form.input_gen_automated}
            onChange={e => setForm(f => ({ ...f, input_gen_automated: e.target.checked }))} />
          <label htmlFor={`iga-${row.id}`} className="text-xs text-gray-600">Input generation is automated</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id={`dv-${row.id}`} checked={form.data_validated}
            onChange={e => setForm(f => ({ ...f, data_validated: e.target.checked }))} />
          <label htmlFor={`dv-${row.id}`} className="text-xs text-gray-600">Data validation required</label>
        </div>
        {form.data_validated && (
          <div>
            <label className="text-xs font-semibold text-gray-600">Validation Complexity</label>
            <input value={form.validation_complexity || ''} onChange={e => setForm(f => ({ ...f, validation_complexity: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
          <button onClick={save} disabled={saving} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid items-center px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 group"
      style={{ gridTemplateColumns: '0.5fr 2.5fr 1fr 1.2fr 1fr 0.8fr 0.8fr' }}>
      <div className="text-sm text-gray-500 font-medium">{row.sl_no}</div>
      <div className="text-sm text-gray-800 font-medium truncate pr-2">{row.report_name}</div>
      <div className="text-xs text-gray-500">{row.frequency || '—'}</div>
      <div className="flex flex-wrap gap-1">
        {(row.output_methods || []).map(m => (
          <span key={m} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{m}</span>
        ))}
        {(!row.output_methods || row.output_methods.length === 0) && <span className="text-gray-300 text-xs">—</span>}
      </div>
      <div className="flex flex-wrap gap-1">
        {(row.input_form || []).map(m => (
          <span key={m} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">{m}</span>
        ))}
        {(!row.input_form || row.input_form.length === 0) && <span className="text-gray-300 text-xs">—</span>}
      </div>
      <div className="flex gap-2 text-xs">
        {row.output_automated && <span className="text-indigo-600 font-medium">Auto-out</span>}
        {row.data_validated   && <span className="text-amber-600 font-medium">Validated</span>}
      </div>
      {!disabled && (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)}
            className="p-1 text-gray-400 hover:text-indigo-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(row.id)}
            className="p-1 text-gray-400 hover:text-rose-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}


// ─── Estimation row component (Phase 2) ───────────────────────────────────────
function EstimationRowComp({ row, mode, onUpdate, onDelete, disabled }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...row })
  const [saving, setSaving] = useState(false)

  const preview = mode === 'days'
    ? (form.quantity * 7 * form.cost_rate).toFixed(0)
    : (form.quantity * form.cost_rate).toFixed(0)

  const save = async () => {
    setSaving(true)
    try {
      await onUpdate(row.id, form)
      setEditing(false)
    } catch (e) {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/40 space-y-3 m-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Description <span className="text-rose-500">*</span></label>
            <input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Role / Team</label>
            <input value={form.role_description || ''} onChange={e => setForm(f => ({ ...f, role_description: e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">{mode === 'days' ? 'Man-Days' : 'Hours'}</label>
            <input type="number" min="0" step="0.5" value={form.quantity || 0}
              onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Rate (₹/hr)</label>
            <input type="number" min="0" value={form.cost_rate || 0}
              onChange={e => setForm(f => ({ ...f, cost_rate: +e.target.value }))}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">Preview Total</label>
            <div className="mt-1 px-2 py-1 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded border border-indigo-200">
              ₹{Number(preview).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
          <button onClick={save} disabled={saving} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid items-center px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 group"
      style={{ gridTemplateColumns: '0.5fr 2.5fr 1.5fr 1fr 1fr 1.2fr 0.7fr' }}>
      <div className="text-sm text-gray-500 font-medium">{row.sl_no}</div>
      <div className="text-sm text-gray-800 font-medium truncate pr-2">{row.description}</div>
      <div className="text-xs text-gray-500 truncate">{row.role_description || '—'}</div>
      <div className="text-sm text-gray-700">{row.quantity} <span className="text-xs text-gray-400">{row.unit}</span></div>
      <div className="text-sm text-gray-700">₹{(row.cost_rate || 0).toLocaleString('en-IN')}</div>
      <div className="text-sm font-semibold text-indigo-700">₹{(row.total_cost || 0).toLocaleString('en-IN')}</div>
      {!disabled && (
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setForm({ ...row }); setEditing(true) }} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(row.id)} className="p-1 text-gray-400 hover:text-rose-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ProposalEstimateDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAppStore()

  const [tab,      setTab]      = useState('overview')
  const [proposal, setProposal] = useState(null)
  const [sections, setSections] = useState({})
  const [reports,  setReports]  = useState([])
  const [features, setFeatures] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // overview edit state
  const [editHeader, setEditHeader] = useState(false)
  const [hForm, setHForm]           = useState({})
  const [hSaving, setHSaving]       = useState(false)

  // scope save state
  const [scopeDraft, setScopeDraft] = useState({})
  const [scopeSaving, setScopeSaving] = useState(false)

  // features save state
  const [featDraft, setFeatDraft]   = useState(null)
  const [featSaving, setFeatSaving] = useState(false)

  // add report row
  const [addReportForm, setAddReportForm] = useState(null)
  const [addReportSaving, setAddReportSaving] = useState(false)

  // Phase 2: estimation
  const [estimation,    setEstimation]    = useState({ mode: 'hours', rows: [], total_qty: 0, total_hours: 0, total_cost: 0 })
  const [addEstRow,     setAddEstRow]     = useState(null)
  const [addEstSaving,  setAddEstSaving]  = useState(false)

  // Phase 3: audit log + export
  const [auditLog,      setAuditLog]      = useState([])
  const [auditLoaded,   setAuditLoaded]   = useState(false)
  const [exporting,     setExporting]     = useState(false)

  const canEdit    = user && CAN_EDIT_ROLES.has(user.role)
  const canApprove = user && CAN_APPROVE_ROLES.has(user.role)
  const isLocked   = proposal?.status === 'Approved' || proposal?.status === 'Archived'
  const editable   = canEdit && !isLocked

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, sRes, rRes, fRes, eRes] = await Promise.all([
        api.get(`/proposal-estimates/${id}`),
        api.get(`/proposal-estimates/${id}/sections`),
        api.get(`/proposal-estimates/${id}/reports`),
        api.get(`/proposal-estimates/${id}/features`),
        api.get(`/proposal-estimates/${id}/estimation`),
      ])
      const p = pRes.data
      setProposal(p)
      setHForm({ client_name: p.client_name, project_name: p.project_name || '', project_category: p.project_category || '' })
      // sections -> map by section_type
      const sMap = {}
      for (const s of sRes.data) sMap[s.section_type] = s.content || ''
      setSections(sMap)
      setScopeDraft({ ...sMap })
      setReports(rRes.data)
      const fData = fRes.data || {}
      setFeatures(fData)
      setFeatDraft({ ...fData })
      setEstimation(eRes.data || { mode: 'hours', rows: [], total_qty: 0, total_hours: 0, total_cost: 0 })
      setAuditLoaded(false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Header edit ──────────────────────────────────────────────────────────────
  const saveHeader = async () => {
    setHSaving(true)
    try {
      const { data } = await api.patch(`/proposal-estimates/${id}`, hForm)
      setProposal(data)
      setEditHeader(false)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to save')
    } finally {
      setHSaving(false)
    }
  }

  // ── Scope save ───────────────────────────────────────────────────────────────
  const saveScope = async () => {
    setScopeSaving(true)
    try {
      for (const [stype, content] of Object.entries(scopeDraft)) {
        await api.put(`/proposal-estimates/${id}/sections/${stype}`, { content })
      }
      setSections({ ...scopeDraft })
    } catch (e) {
      alert('Failed to save scope')
    } finally {
      setScopeSaving(false)
    }
  }

  // ── Status actions ───────────────────────────────────────────────────────────
  const doAction = async (action) => {
    setActionLoading(true)
    try {
      const { data } = await api.post(`/proposal-estimates/${id}/${action}`)
      setProposal(data)
    } catch (e) {
      alert(e?.response?.data?.detail || `Failed to ${action}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!window.confirm('Reject this proposal?')) return
    await doAction('reject-v2')
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this proposal permanently?')) return
    try {
      await api.delete(`/proposal-estimates/${id}`)
      navigate('/global/proposal-estimates')
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to delete')
    }
  }

  // ── Reports ──────────────────────────────────────────────────────────────────
  const handleReportUpdate = async (rid, form) => {
    const { data } = await api.patch(`/proposal-estimates/${id}/reports/${rid}`, form)
    setReports(prev => prev.map(r => r.id === rid ? data : r))
  }

  const handleReportDelete = async (rid) => {
    if (!window.confirm('Delete this report row?')) return
    await api.delete(`/proposal-estimates/${id}/reports/${rid}`)
    setReports(prev => prev.filter(r => r.id !== rid))
  }

  const handleAddReport = async () => {
    if (!addReportForm?.report_name?.trim()) return
    setAddReportSaving(true)
    try {
      const { data } = await api.post(`/proposal-estimates/${id}/reports`, addReportForm)
      setReports(prev => [...prev, data])
      setAddReportForm(null)
    } catch (e) {
      alert('Failed to add report row')
    } finally {
      setAddReportSaving(false)
    }
  }

  // ── Features ─────────────────────────────────────────────────────────────────
  const saveFeatures = async () => {
    setFeatSaving(true)
    try {
      const { data } = await api.put(`/proposal-estimates/${id}/features`, featDraft)
      setFeatures(data)
      setFeatDraft({ ...data })
    } catch (e) {
      alert('Failed to save features')
    } finally {
      setFeatSaving(false)
    }
  }

  // ── Estimation (Phase 2) ─────────────────────────────────────────────────────
  const reloadEstimation = async () => {
    const { data } = await api.get(`/proposal-estimates/${id}/estimation`)
    setEstimation(data)
  }

  const setMode = async (mode) => {
    try {
      await api.patch(`/proposal-estimates/${id}/estimation-mode`, { mode })
      await reloadEstimation()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to change mode')
    }
  }

  const handleAddEstRow = async () => {
    if (!addEstRow?.description?.trim()) return
    setAddEstSaving(true)
    try {
      await api.post(`/proposal-estimates/${id}/estimation`, addEstRow)
      setAddEstRow(null)
      await reloadEstimation()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to add row')
    } finally {
      setAddEstSaving(false)
    }
  }

  const handleUpdateEstRow = async (rowId, patch) => {
    try {
      await api.patch(`/proposal-estimates/${id}/estimation/${rowId}`, patch)
      await reloadEstimation()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to update row')
      throw e  // re-throw so EstimationRowComp.save() catches it and keeps edit open
    }
  }

  const handleDeleteEstRow = async (rowId) => {
    if (!window.confirm('Delete this estimation row?')) return
    try {
      await api.delete(`/proposal-estimates/${id}/estimation/${rowId}`)
      await reloadEstimation()
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to delete row')
    }
  }

  // ── Audit log (Phase 3) ───────────────────────────────────────────────────────
  const loadAudit = async () => {
    const { data } = await api.get(`/proposal-estimates/${id}/audit`)
    setAuditLog(data)
    setAuditLoaded(true)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.get(`/proposal-estimates/${id}/export/excel`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a')
      a.href = url
      a.download = `Proposal_${proposal.client_name}_v${proposal.version}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!proposal) {
    return <div className="p-8 text-center text-gray-500">Proposal not found.</div>
  }

  const flow = STATUS_FLOW[proposal.status] || {}

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Back link */}
      <button onClick={() => navigate('/global/proposal-estimates')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-5 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Proposals
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {editHeader ? (
              <div className="space-y-2">
                <input value={hForm.client_name} onChange={e => setHForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="Client Name *"
                  className="w-full bg-white/10 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40" />
                <input value={hForm.project_name} onChange={e => setHForm(f => ({ ...f, project_name: e.target.value }))}
                  placeholder="Project Name (optional)"
                  className="w-full bg-white/10 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40" />
                <select value={hForm.project_category} onChange={e => setHForm(f => ({ ...f, project_category: e.target.value }))}
                  className="bg-white/10 text-white border border-white/30 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40">
                  <option value="">Category (optional)</option>
                  {CATEGORIES.map(c => <option key={c} value={c} className="text-gray-800">{c}</option>)}
                </select>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-white truncate">{proposal.client_name}</h1>
                {proposal.project_name && <p className="text-slate-300 text-sm mt-0.5">{proposal.project_name}</p>}
                {proposal.project_category && (
                  <span className="inline-block mt-2 px-2.5 py-0.5 bg-white/15 text-white/80 rounded-full text-xs">
                    {proposal.project_category}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold', STATUS_STYLE[proposal.status])}>
              {proposal.status}
            </span>
            <span className="text-white/60 text-xs">v{proposal.version}</span>
            {editable && !editHeader && (
              <button onClick={() => setEditHeader(true)}
                className="p-1.5 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {editHeader && (
              <div className="flex gap-2">
                <button onClick={() => setEditHeader(false)}
                  className="px-3 py-1 text-xs text-white/70 border border-white/30 rounded-lg hover:bg-white/10">
                  Cancel
                </button>
                <button onClick={saveHeader} disabled={hSaving}
                  className="px-3 py-1 text-xs font-semibold text-slate-800 bg-white rounded-lg hover:bg-white/90 disabled:opacity-60">
                  {hSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-500 flex-wrap">
          <span>Created by <strong className="text-gray-700">{proposal.creator_name || '—'}</strong></span>
          <span>on {fmtDate(proposal.created_at)}</span>
          {proposal.submitted_at && <span>Submitted {fmtDate(proposal.submitted_at)}</span>}
          {proposal.approved_at  && <span>Approved {fmtDate(proposal.approved_at)} by <strong className="text-gray-700">{proposal.approver_name}</strong></span>}

          {/* Status action buttons */}
          <div className="ml-auto flex items-center gap-2">
            {/* Export to Excel */}
            <button onClick={handleExport} disabled={exporting}
              className="px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exporting ? 'Exporting…' : 'Excel'}
            </button>
            {/* Delete */}
            {canEdit && (
              <button onClick={handleDelete}
                className="px-3 py-1.5 text-xs text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors">
                Delete
              </button>
            )}
            {/* Reject (Submitted → Rejected, approvers only) */}
            {proposal.status === 'Submitted' && canApprove && (
              <button onClick={handleReject} disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-300 rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-colors">
                Reject
              </button>
            )}
            {/* Archive (Approved, approvers only) */}
            {proposal.status === 'Approved' && canApprove && (
              <button onClick={() => doAction('archive-v2')} disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
                Archive
              </button>
            )}
            {/* Primary action */}
            {flow.action && (
              (flow.action === 'approve' ? canApprove : canEdit) && (
                <button
                  onClick={() => doAction(flow.action)}
                  disabled={actionLoading}
                  className={clsx(
                    'px-4 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-colors',
                    flow.btnClass
                  )}
                >
                  {actionLoading ? 'Processing…' : flow.label}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
        {[
          { key: 'overview',   label: 'Overview' },
          { key: 'scope',      label: 'Scope' },
          { key: 'reports',    label: `Reports (${reports.length})` },
          { key: 'features',   label: 'Features' },
          { key: 'estimation', label: `Estimation (${estimation.rows?.length || 0})` },
          { key: 'audit',      label: 'Audit History' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key)
              if (t.key === 'audit' && !auditLoaded) loadAudit()
            }}
            className={clsx(
              'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Client Name',      value: proposal.client_name },
            { label: 'Project Name',     value: proposal.project_name || '—' },
            { label: 'Project Category', value: proposal.project_category || '—' },
            { label: 'Status',           value: proposal.status },
            { label: 'Version',          value: `v${proposal.version}` },
            { label: 'Created By',       value: proposal.creator_name || '—' },
            { label: 'Created Date',     value: fmtDate(proposal.created_at) },
            { label: 'Submitted Date',   value: fmtDate(proposal.submitted_at) },
            { label: 'Approved By',      value: proposal.approver_name || '—' },
            { label: 'Approved Date',    value: fmtDate(proposal.approved_at) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm font-medium text-gray-800">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Scope ────────────────────────────────────────────────────────── */}
      {tab === 'scope' && (
        <div className="space-y-4">
          <SectionBox title="Companies / Clients Overview"
            value={scopeDraft.companies}
            onChange={v => setScopeDraft(d => ({ ...d, companies: v }))}
            disabled={!editable} />
          <SectionBox title="Business Units / Departments"
            value={scopeDraft.units}
            onChange={v => setScopeDraft(d => ({ ...d, units: v }))}
            disabled={!editable} />
          <SectionBox title="Business Workflow Description"
            value={scopeDraft.workflow}
            onChange={v => setScopeDraft(d => ({ ...d, workflow: v }))}
            disabled={!editable} />
          {editable && (
            <div className="flex justify-end">
              <button onClick={saveScope} disabled={scopeSaving}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {scopeSaving ? 'Saving…' : 'Save Scope'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Reports ──────────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            style={{ gridTemplateColumns: '0.5fr 2.5fr 1fr 1.2fr 1fr 0.8fr 0.8fr' }}>
            <div>Sl.</div>
            <div>Report Name</div>
            <div>Frequency</div>
            <div>Output Method</div>
            <div>Input Format</div>
            <div>Flags</div>
            <div></div>
          </div>

          {reports.length === 0 && !addReportForm && (
            <div className="py-12 text-center text-gray-400 text-sm">No report rows yet</div>
          )}

          {reports.map(r => (
            <ReportRow key={r.id} row={r}
              onUpdate={handleReportUpdate}
              onDelete={handleReportDelete}
              disabled={!editable} />
          ))}

          {/* Add row inline form */}
          {addReportForm && (
            <div className="p-4 border-t border-gray-100 bg-indigo-50/40 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Sl. No.</label>
                  <input type="number" value={addReportForm.sl_no || ''}
                    onChange={e => setAddReportForm(f => ({ ...f, sl_no: +e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Frequency</label>
                  <select value={addReportForm.frequency || ''}
                    onChange={e => setAddReportForm(f => ({ ...f, frequency: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Select…</option>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Report Name <span className="text-rose-500">*</span></label>
                <input value={addReportForm.report_name || ''}
                  onChange={e => setAddReportForm(f => ({ ...f, report_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Output Method</label>
                <ChipGroup options={OUTPUT_METHODS} value={addReportForm.output_methods || []}
                  onChange={v => setAddReportForm(f => ({ ...f, output_methods: v }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Input Format</label>
                <ChipGroup options={INPUT_FORMS} value={addReportForm.input_form || []}
                  onChange={v => setAddReportForm(f => ({ ...f, input_form: v }))} />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={addReportForm.output_automated || false}
                    onChange={e => setAddReportForm(f => ({ ...f, output_automated: e.target.checked }))} />
                  Output automated
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={addReportForm.input_gen_automated || false}
                    onChange={e => setAddReportForm(f => ({ ...f, input_gen_automated: e.target.checked }))} />
                  Input generation automated
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={addReportForm.data_validated || false}
                    onChange={e => setAddReportForm(f => ({ ...f, data_validated: e.target.checked }))} />
                  Data validation required
                </label>
              </div>
              {addReportForm.data_validated && (
                <div>
                  <label className="text-xs font-semibold text-gray-600">Validation Complexity</label>
                  <input value={addReportForm.validation_complexity || ''}
                    onChange={e => setAddReportForm(f => ({ ...f, validation_complexity: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => setAddReportForm(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
                <button onClick={handleAddReport} disabled={addReportSaving}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {addReportSaving ? 'Adding…' : 'Add Row'}
                </button>
              </div>
            </div>
          )}

          {editable && !addReportForm && (
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => setAddReportForm({
                  report_name: '', frequency: '', output_automated: false,
                  output_methods: [], rough_input: '', input_form: [],
                  input_gen_automated: false, data_validated: false, validation_complexity: ''
                })}
                className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Report Row
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Estimation ───────────────────────────────────────────────────── */}
      {tab === 'estimation' && (
        <div className="space-y-5">
          {/* Mode toggle */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">Estimation Mode:</span>
            {['hours', 'days'].map(m => (
              <button
                key={m}
                disabled={!editable}
                onClick={() => editable && setMode(m)}
                className={clsx(
                  'px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  estimation.mode === m
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400',
                  !editable && 'opacity-60 cursor-default'
                )}
              >
                {m === 'hours' ? 'Hours' : 'Man-Days'}
              </button>
            ))}
            {estimation.mode === 'days' && (
              <span className="text-xs text-gray-400 ml-2">1 day = 7 hours</span>
            )}
          </div>

          {/* Estimation table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="grid px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide"
              style={{ gridTemplateColumns: '0.5fr 2.5fr 1.5fr 1fr 1fr 1.2fr 0.7fr' }}>
              <div>Sl.</div>
              <div>Description / Work Item</div>
              <div>Role / Team</div>
              <div>{estimation.mode === 'days' ? 'Man-Days' : 'Hours'}</div>
              <div>Rate (₹/hr)</div>
              <div>Total Cost (₹)</div>
              <div></div>
            </div>

            {(estimation.rows || []).length === 0 && !addEstRow && (
              <div className="py-12 text-center text-gray-400 text-sm">No estimation rows yet</div>
            )}

            {(estimation.rows || []).map(row => (
              <EstimationRowComp key={row.id} row={row} mode={estimation.mode}
                onUpdate={handleUpdateEstRow} onDelete={handleDeleteEstRow}
                disabled={!editable} />
            ))}

            {/* Add row inline form */}
            {addEstRow && (
              <div className="p-4 border-t border-gray-100 bg-indigo-50/40 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Description <span className="text-rose-500">*</span></label>
                    <input value={addEstRow.description || ''} onChange={e => setAddEstRow(f => ({ ...f, description: e.target.value }))}
                      placeholder="e.g. Backend development — Auth module"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Role / Team</label>
                    <input value={addEstRow.role_description || ''} onChange={e => setAddEstRow(f => ({ ...f, role_description: e.target.value }))}
                      placeholder="e.g. Senior Developer"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">{estimation.mode === 'days' ? 'Man-Days' : 'Hours'}</label>
                    <input type="number" min="0" step="0.5" value={addEstRow.quantity || 0}
                      onChange={e => setAddEstRow(f => ({ ...f, quantity: +e.target.value }))}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Rate (₹/hr)</label>
                    <input type="number" min="0" value={addEstRow.cost_rate || 0}
                      onChange={e => setAddEstRow(f => ({ ...f, cost_rate: +e.target.value }))}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setAddEstRow(null)}
                    className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
                  <button onClick={handleAddEstRow} disabled={addEstSaving}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {addEstSaving ? 'Adding…' : 'Add Row'}
                  </button>
                </div>
              </div>
            )}

            {editable && !addEstRow && (
              <div className="px-4 py-3 border-t border-gray-100">
                <button onClick={() => setAddEstRow({ description: '', role_description: '', quantity: 0, cost_rate: 0 })}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Estimation Row
                </button>
              </div>
            )}
          </div>

          {/* Summary card */}
          {(estimation.rows || []).length > 0 && (
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Estimation Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-bold">{estimation.total_qty?.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-300 mt-0.5">{estimation.mode === 'days' ? 'Total Man-Days' : 'Total Hours'}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{estimation.total_hours?.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-300 mt-0.5">Effective Hours</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{(estimation.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
                  <p className="text-xs text-slate-300 mt-0.5">Total Cost</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Features ─────────────────────────────────────────────────────── */}
      {tab === 'features' && featDraft && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 mb-4">
            Enable the features required for this project. All fields are optional.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <FeatRow label="Data Visualization"
              enabled={featDraft.feat_viz || false}
              onToggle={v => setFeatDraft(f => ({ ...f, feat_viz: v }))}
              detail={featDraft.feat_viz_types?.join(', ') || ''}
              onDetail={v => setFeatDraft(f => ({ ...f, feat_viz_types: v.split(',').map(x => x.trim()).filter(Boolean) }))}
              placeholder="e.g. Bar chart, Pie chart, KPI cards, Line chart…"
              disabled={!editable} />
            <FeatRow label="Alerts & Notifications"
              enabled={featDraft.feat_alerts || false}
              onToggle={v => setFeatDraft(f => ({ ...f, feat_alerts: v }))}
              detail={featDraft.feat_alerts_detail || ''}
              onDetail={v => setFeatDraft(f => ({ ...f, feat_alerts_detail: v }))}
              placeholder="Describe alert conditions and recipients…"
              disabled={!editable} />
            <FeatRow label="Role-Based Access Control"
              enabled={featDraft.feat_access || false}
              onToggle={v => setFeatDraft(f => ({ ...f, feat_access: v }))}
              detail={featDraft.feat_access_detail || ''}
              onDetail={v => setFeatDraft(f => ({ ...f, feat_access_detail: v }))}
              placeholder="Describe user roles and their access levels…"
              disabled={!editable} />
            <FeatRow label="Business Rules / Conditional Logic"
              enabled={featDraft.feat_rules || false}
              onToggle={v => setFeatDraft(f => ({ ...f, feat_rules: v }))}
              detail={featDraft.feat_rules_detail || ''}
              onDetail={v => setFeatDraft(f => ({ ...f, feat_rules_detail: v }))}
              placeholder="Describe the business rules or conditional flows…"
              disabled={!editable} />
            <FeatRow label="Mobile Access"
              enabled={featDraft.feat_mobile || false}
              onToggle={v => setFeatDraft(f => ({ ...f, feat_mobile: v }))}
              detail={featDraft.feat_mobile_detail || ''}
              onDetail={v => setFeatDraft(f => ({ ...f, feat_mobile_detail: v }))}
              placeholder="Describe mobile access requirements…"
              disabled={!editable} />
            <FeatRow label="Master Data Management"
              enabled={featDraft.feat_master || false}
              onToggle={v => setFeatDraft(f => ({ ...f, feat_master: v }))}
              detail={featDraft.feat_master_detail || ''}
              onDetail={v => setFeatDraft(f => ({ ...f, feat_master_detail: v }))}
              placeholder="Describe master data entities and management approach…"
              disabled={!editable} />
            <FeatRow label="Audit Trail / History Log"
              enabled={featDraft.feat_audit || false}
              onToggle={v => setFeatDraft(f => ({ ...f, feat_audit: v }))}
              detail={featDraft.feat_audit_detail || ''}
              onDetail={v => setFeatDraft(f => ({ ...f, feat_audit_detail: v }))}
              placeholder="Describe what needs to be tracked in the audit log…"
              disabled={!editable} />
          </div>
          {editable && (
            <div className="flex justify-end pt-2">
              <button onClick={saveFeatures} disabled={featSaving}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {featSaving ? 'Saving…' : 'Save Features'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Audit History ────────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div className="space-y-3">
          {!auditLoaded ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading audit log…</div>
          ) : auditLog.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No audit entries yet</div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {auditLog.map(log => {
                  const ACTION_STYLE = {
                    submitted: { dot: 'bg-amber-400', label: 'Submitted' },
                    approved:  { dot: 'bg-emerald-500', label: 'Approved' },
                    rejected:  { dot: 'bg-rose-500', label: 'Rejected' },
                    archived:  { dot: 'bg-gray-400', label: 'Archived' },
                    created:   { dot: 'bg-indigo-400', label: 'Created' },
                    edited:    { dot: 'bg-blue-400', label: 'Edited' },
                  }
                  const style = ACTION_STYLE[log.action] || { dot: 'bg-gray-300', label: log.action }
                  return (
                    <div key={log.id} className="relative flex items-start gap-4 pl-12">
                      <div className={clsx('absolute left-4 w-3 h-3 rounded-full border-2 border-white shadow', style.dot)} />
                      <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800">{style.label}</span>
                          <span className="text-xs text-gray-400">
                            {log.changed_at ? new Date(log.changed_at).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : '—'}
                          </span>
                        </div>
                        {(log.from_status || log.to_status) && (
                          <p className="text-xs text-gray-500 mb-1">
                            {log.from_status && <span className="text-gray-400">{log.from_status}</span>}
                            {log.from_status && log.to_status && <span className="mx-1.5 text-gray-300">→</span>}
                            {log.to_status && <span className="font-medium text-gray-700">{log.to_status}</span>}
                          </p>
                        )}
                        {log.note && <p className="text-xs text-gray-500 italic">{log.note}</p>}
                        <p className="text-xs text-gray-400 mt-1">by <strong className="text-gray-600">{log.actor_name || '—'}</strong></p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
