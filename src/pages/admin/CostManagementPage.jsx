import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fmtDate, fmtCurrency, COST_CATEGORIES } from '../../utils/helpers'
import api from '../../utils/api'
import { useAppStore } from '../../store'
import { isElevated } from '../../utils/permissions'
import clsx from 'clsx'

const emptyForm = { date: new Date().toISOString().slice(0,10), particulars: '', category: COST_CATEGORIES[0], cost: '', attachment: null, remove_attachment: false }

export default function CostManagementPage() {
  const { id } = useParams()
  const { user } = useAppStore()
  const isAdmin = isElevated(user)

  const [costs, setCosts] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [budgetEditing, setBudgetEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null), type==='error' ? 6000 : 3000) }

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, sRes] = await Promise.all([
        api.get(`/projects/${id}/costs`),
        api.get(`/projects/${id}/costs/summary`),
      ])
      setCosts(cRes.data)
      setSummary(sRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const filtered = costs.filter(c => filterCategory === 'all' || c.category === filterCategory)

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({ date: c.date, particulars: c.particulars, category: c.category, cost: String(c.cost), attachment: null, remove_attachment: false })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.particulars) { showMsg('Please enter Particulars.', 'error'); return }
    if (!form.cost || isNaN(Number(form.cost))) { showMsg('Please enter a valid Cost amount.', 'error'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('date', form.date)
      fd.append('particulars', form.particulars)
      fd.append('category', form.category)
      fd.append('cost', form.cost)
      if (form.attachment) fd.append('attachment', form.attachment)
      if (editingId && form.remove_attachment) fd.append('remove_attachment', 'true')

      // Override the axios instance's default 'application/json' Content-Type
      // so the browser sets multipart/form-data with the correct boundary —
      // setting multipart/form-data manually here would omit the boundary
      // and the backend would fail to parse the form.
      const cfg = { headers: { 'Content-Type': undefined } }
      if (editingId) {
        await api.patch(`/projects/${id}/costs/${editingId}`, fd, cfg)
      } else {
        await api.post(`/projects/${id}/costs`, fd, cfg)
      }
      showMsg(editingId ? 'Cost entry updated! 🎉' : 'Cost entry added! 🎉')
      setShowModal(false)
      load()
    } catch (e) { showMsg(e.response?.data?.detail || 'Failed to save cost entry', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete cost entry "${c.particulars}"?`)) return
    try {
      await api.delete(`/projects/${id}/costs/${c.id}`)
      showMsg('Cost entry deleted')
      load()
    } catch (e) { showMsg(e.response?.data?.detail || 'Failed to delete', 'error') }
  }

  const openBudgetEdit = () => {
    setBudgetInput(String(summary?.budget || ''))
    setBudgetEditing(true)
  }

  const saveBudget = async () => {
    try {
      await api.patch(`/projects/${id}/costs/budget`, { budget: Number(budgetInput) || 0 })
      setBudgetEditing(false)
      load()
    } catch (e) { showMsg(e.response?.data?.detail || 'Failed to update budget', 'error') }
  }

  const apiOrigin = (api.defaults.baseURL || '').replace(/\/api\/?$/, '')
  const attachmentHref = (c) => c.attachment_url ? `${apiOrigin}${c.attachment_url}` : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">💰 Cost Management</h1>
          <p className="text-xs text-gray-400">{costs.length} cost entr{costs.length===1?'y':'ies'} logged for this project</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn btn-primary text-xs">➕ Add cost entry</button>
        )}
      </div>

      {/* Message toast */}
      {msg && (
        <div className={clsx('fixed top-4 right-4 z-[100] shadow-lg px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 animate-fade-up max-w-sm',
          msg.type==='error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')}>
          {msg.type==='error'?'⚠️':'✅'} {msg.text}
        </div>
      )}

      {/* Budget vs Actual Cost summary */}
      {summary && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span className="text-sm font-semibold text-gray-800">Budget vs Actual Cost</span>
            </div>
            {isAdmin && !budgetEditing && (
              <button onClick={openBudgetEdit} className="text-xs text-violet-600 hover:underline">✏️ {summary.budget ? 'Edit budget' : 'Set budget'}</button>
            )}
          </div>

          {budgetEditing ? (
            <div className="flex items-center gap-2 mb-4">
              <input type="number" min="0" className="input text-sm w-48" placeholder="Enter budget amount"
                value={budgetInput} onChange={e => setBudgetInput(e.target.value)} autoFocus />
              <button onClick={saveBudget} className="btn btn-primary text-xs">Save</button>
              <button onClick={() => setBudgetEditing(false)} className="btn text-xs">Cancel</button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl p-3 text-center border border-white">
                <div className="text-lg font-bold text-gray-900">{fmtCurrency(summary.budget)}</div>
                <div className="text-xs text-gray-500">📋 Budget</div>
              </div>
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-3 text-center border border-white">
                <div className="text-lg font-bold text-gray-900">{fmtCurrency(summary.total_actual_cost)}</div>
                <div className="text-xs text-gray-500">💸 Actual Cost</div>
              </div>
              <div className={clsx('rounded-xl p-3 text-center border border-white bg-gradient-to-br',
                summary.is_over_budget ? 'from-rose-100 to-pink-100' : 'from-emerald-100 to-teal-100')}>
                <div className={clsx('text-lg font-bold', summary.is_over_budget ? 'text-rose-700' : 'text-gray-900')}>{fmtCurrency(summary.remaining)}</div>
                <div className="text-xs text-gray-500">{summary.is_over_budget ? '🔥 Over Budget' : '✅ Remaining'}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-3 text-center border border-white">
                <div className="text-lg font-bold text-gray-900">{summary.utilization_pct !== null ? `${summary.utilization_pct}%` : '—'}</div>
                <div className="text-xs text-gray-500">🎯 Utilization</div>
              </div>
            </div>
          )}

          {!budgetEditing && summary.budget > 0 && (
            <div className="mb-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, summary.utilization_pct || 0)}%`,
                    background: summary.is_over_budget ? '#ef4444' : (summary.utilization_pct || 0) >= 80 ? '#f59e0b' : '#10b981' }} />
              </div>
            </div>
          )}

          {summary.by_category.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-600 mb-2">🏷️ By Category</div>
              <div className="flex flex-wrap gap-2">
                {summary.by_category.map(b => (
                  <span key={b.category} className="text-xs bg-slate-50 border border-gray-100 rounded-lg px-3 py-1.5">
                    <span className="font-medium text-gray-700">{b.category}</span>{' '}
                    <span className="text-violet-600 font-semibold">{fmtCurrency(b.total)}</span>
                  </span>
                ))}
              </div>
              {summary.by_category.some(b => b.category === 'Indirect / Overhead') && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  💹 <strong>Indirect / Overhead</strong> entries are tracked separately in the <strong>Profitability Report</strong> — they appear as overhead cost, distinct from direct project expenses.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterCategory('all')}
          className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
            filterCategory === 'all' ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-violet-300')}>
          All ({costs.length})
        </button>
        {COST_CATEGORIES.filter(cat => costs.some(c => c.category === cat)).map(cat => (
          <button key={cat} onClick={() => setFilterCategory(cat)}
            className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              filterCategory === cat ? 'bg-violet-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-violet-300')}>
            {cat} ({costs.filter(c => c.category === cat).length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-semibold text-white"
          style={{ gridTemplateColumns: '1fr 2.2fr 1.2fr 1fr 1fr 1.2fr' }}>
          <div>Date</div><div>Particulars</div><div>Category</div>
          <div className="text-right">Cost</div><div className="text-center">Attachment</div><div>Action</div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-violet-400 animate-pulse">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-xs">Loading cost entries...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 animate-float">💰</div>
            <p className="text-sm font-medium text-gray-700 mb-1">No cost entries found</p>
            <p className="text-xs text-gray-400 mb-4">Try changing the category filter, or add a new cost entry</p>
            {isAdmin && <button onClick={openCreate} className="btn btn-primary text-xs">➕ Add cost entry</button>}
          </div>
        ) : filtered.map((c, i) => (
          <div key={c.id}
            className={clsx('grid px-4 py-3 items-center border-b border-gray-50 last:border-0 hover:bg-violet-50/20 transition-colors text-xs',
              i%2===0?'bg-white':'bg-slate-50/30')}
            style={{ gridTemplateColumns: '1fr 2.2fr 1.2fr 1fr 1fr 1.2fr' }}>
            <div className="text-gray-700">{fmtDate(c.date)}</div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-800 truncate" title={c.particulars}>{c.particulars}</div>
              {c.created_by_name && <div className="text-gray-400">by {c.created_by_name}</div>}
            </div>
            <div className="min-w-0">
              <span className="px-2 py-0.5 rounded-full border border-gray-100 bg-slate-50 text-gray-600 font-medium whitespace-nowrap">{c.category}</span>
            </div>
            <div className="text-right font-semibold text-gray-900">{fmtCurrency(c.cost)}</div>
            <div className="text-center">
              {attachmentHref(c) ? (
                <a href={attachmentHref(c)} target="_blank" rel="noopener noreferrer"
                  className="text-violet-600 hover:underline" title={c.attachment_original_filename}>📎 View</a>
              ) : <span className="text-gray-300">—</span>}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-violet-600" title="Edit">✏️</button>
                  <button onClick={() => handleDelete(c)} className="text-gray-400 hover:text-rose-600" title="Delete">🗑️</button>
                </>
              ) : <span className="text-gray-300">—</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2"><span className="text-xl">💰</span><h2 className="text-sm font-semibold">{editingId ? 'Edit cost entry' : 'Add cost entry'}</h2></div>
              <button onClick={() => setShowModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📅 Date <span className="text-rose-500">*</span></label>
                <input type="date" className="input text-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📝 Particulars <span className="text-rose-500">*</span></label>
                <input className="input text-sm" placeholder="e.g. Flight tickets for kickoff visit"
                  value={form.particulars} onChange={e => setForm({...form, particulars: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">🏷️ Category <span className="text-rose-500">*</span></label>
                  <select className="select text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {COST_CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">💵 Cost (₹) <span className="text-rose-500">*</span></label>
                  <input type="number" min="0" step="0.01" className="input text-sm" placeholder="0.00"
                    value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">📎 Attachment</label>
                <input type="file" className="input text-sm" onChange={e => setForm({...form, attachment: e.target.files?.[0] || null})} />
                {editingId && form.attachment === null && (
                  <label className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                    <input type="checkbox" checked={form.remove_attachment} onChange={e => setForm({...form, remove_attachment: e.target.checked})} />
                    Remove existing attachment
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button className="btn text-xs" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary text-xs" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="animate-spin">⟳</span> Saving…</> : <>💾 Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
