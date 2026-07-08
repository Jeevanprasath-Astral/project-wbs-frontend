import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fmtDate } from '../../utils/helpers'
import api from '../../utils/api'
import clsx from 'clsx'

const MS_ICONS = ['🚀','🤝','🔍','📝','⚙️','🧪','📦','✅','🌟','🛡️']
const STATUS_CFG = {
  'Completed':   { cls: 'badge-done', icon: '✅' },
  'In Progress': { cls: 'badge-prog', icon: '⚡' },
  'Overdue':     { cls: 'badge-over', icon: '🔥' },
  'Not Started': { cls: 'badge-todo', icon: '⏸️' },
}

export default function TimelinePage() {
  const { id } = useParams()
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(null)
  // Req 3: no autosave — date edits are buffered locally per milestone and
  // only persisted when the user clicks that row's Save button.
  const [edits, setEdits] = useState({})
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    // Load only the custom/selected milestones for this project.
    // If none are selected/confirmed yet, show nothing — never fall back to the full standard list.
    setLoading(true)
    api.get(`/projects/${id}/custom-milestones`)
      .then(r => {
        const customNums = r.data.map(m => m.num)
        if (customNums.length === 0) {
          setMilestones([])
          return
        }
        return api.get(`/projects/${id}/milestones`).then(pmRes => {
          const filtered = pmRes.data.filter(pm => customNums.includes(pm.num))
          setMilestones(filtered)
        })
      })
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false))
  }, [id])

  const setField = (msId, field, value) => {
    setEdits(prev => ({ ...prev, [msId]: { ...prev[msId], [field]: value } }))
  }

  const isDirty = (ms) => {
    const e = edits[ms.id]
    if (!e) return false
    const curStart = ms.planned_start?.split('T')[0] || ''
    const curEnd = ms.planned_end?.split('T')[0] || ''
    return (e.planned_start !== undefined && e.planned_start !== curStart) ||
           (e.planned_end !== undefined && e.planned_end !== curEnd)
  }

  const save = async (ms) => {
    const e = edits[ms.id]
    if (!e) return
    setSaving(ms.id)
    try {
      await api.patch(`/projects/${id}/milestones/${ms.id}`, {
        planned_start: e.planned_start !== undefined ? e.planned_start : (ms.planned_start?.split('T')[0] || ''),
        planned_end: e.planned_end !== undefined ? e.planned_end : (ms.planned_end?.split('T')[0] || ''),
      })
      setMilestones(prev => prev.map(m => m.id === ms.id ? { ...m, ...e } : m))
      setEdits(prev => { const n = { ...prev }; delete n[ms.id]; return n })
      setSaved(ms.id)
      setTimeout(() => setSaved(null), 2000)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-violet-400">
      <div className="text-center animate-pulse">
        <div className="text-4xl mb-3 animate-float">📅</div>
        <div className="text-sm font-medium">Loading timeline...</div>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
             style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          📅
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Timeline Management</h1>
          <p className="text-xs text-gray-400">Set planned dates for each milestone — overdue detection is automatic</p>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
          <div className="text-6xl mb-4 animate-float">📅</div>
          <h2 className="text-base font-bold text-gray-700 mb-2">No milestones configured yet</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Go to <strong>Milestone Configuration</strong> and add/confirm milestones for this project — they'll appear here once selected.
          </p>
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid gap-0 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3"
             style={{ gridTemplateColumns: '40px 1fr 140px 140px 120px 120px 120px 90px' }}>
          {['#','Milestone','Assignee','Planned Start','Planned End','Actual Start','Status',''].map(h => (
            <div key={h} className="text-xs font-semibold text-white">{h}</div>
          ))}
        </div>
        {milestones.map((ms, i) => {
          const sc = STATUS_CFG[ms.status] || STATUS_CFG['Not Started']
          const e = edits[ms.id] || {}
          const startVal = e.planned_start !== undefined ? e.planned_start : (ms.planned_start?.split('T')[0] || '')
          const endVal = e.planned_end !== undefined ? e.planned_end : (ms.planned_end?.split('T')[0] || '')
          const dirty = isDirty(ms)
          return (
            <div key={ms.id}
              className={clsx('grid gap-0 px-4 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-violet-50/20 transition-colors',
                i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}
              style={{ gridTemplateColumns: '40px 1fr 140px 140px 120px 120px 120px 90px' }}>
              <div className="text-base">{MS_ICONS[i]}</div>
              <div>
                <div className="text-xs font-semibold text-gray-800">{String(ms.num).padStart(2,'0')} {ms.name}</div>
                {saved === ms.id && <div className="text-xs text-emerald-600 mt-0.5">✓ Saved!</div>}
              </div>
              <div className="text-xs text-gray-500 truncate pr-2">{ms.assignee || '—'}</div>
              <input type="date" className="input text-xs h-8 px-2"
                value={startVal}
                onChange={e => setField(ms.id, 'planned_start', e.target.value)} />
              <input type="date" className="input text-xs h-8 px-2"
                value={endVal}
                onChange={e => setField(ms.id, 'planned_end', e.target.value)} />
              <div className="text-xs text-gray-400">{fmtDate(ms.actual_start) || '—'}</div>
              <span className={sc.cls}>{sc.icon} {ms.status}</span>
              <button onClick={() => save(ms)} disabled={!dirty || saving === ms.id}
                className={clsx('btn text-xs py-1 px-2 justify-self-end', dirty && saving !== ms.id ? 'btn-primary' : 'opacity-40 cursor-not-allowed')}>
                {saving === ms.id ? '⟳' : '💾 Save'}
              </button>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
