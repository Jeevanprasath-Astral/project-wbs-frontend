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

  useEffect(() => {
    api.get(`/projects/${id}/milestones`).then(r => setMilestones(r.data)).finally(() => setLoading(false))
  }, [id])

  const update = async (msId, field, value) => {
    await api.patch(`/projects/${id}/milestones/${msId}`, { [field]: value })
    setSaved(msId)
    setTimeout(() => setSaved(null), 2000)
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid gap-0 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3"
             style={{ gridTemplateColumns: '40px 1fr 140px 140px 120px 120px 120px' }}>
          {['#','Milestone','Assignee','Planned Start','Planned End','Actual Start','Status'].map(h => (
            <div key={h} className="text-xs font-semibold text-white">{h}</div>
          ))}
        </div>
        {milestones.map((ms, i) => {
          const sc = STATUS_CFG[ms.status] || STATUS_CFG['Not Started']
          return (
            <div key={ms.id}
              className={clsx('grid gap-0 px-4 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-violet-50/20 transition-colors',
                i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}
              style={{ gridTemplateColumns: '40px 1fr 140px 140px 120px 120px 120px' }}>
              <div className="text-base">{MS_ICONS[i]}</div>
              <div>
                <div className="text-xs font-semibold text-gray-800">{String(ms.num).padStart(2,'0')} {ms.name}</div>
                {saved === ms.id && <div className="text-xs text-emerald-600 mt-0.5">✓ Saved!</div>}
              </div>
              <div className="text-xs text-gray-500 truncate pr-2">{ms.assignee || '—'}</div>
              <input type="date" className="input text-xs h-8 px-2"
                defaultValue={ms.planned_start?.split('T')[0] || ''}
                onBlur={e => update(ms.id, 'planned_start', e.target.value)} />
              <input type="date" className="input text-xs h-8 px-2"
                defaultValue={ms.planned_end?.split('T')[0] || ''}
                onBlur={e => update(ms.id, 'planned_end', e.target.value)} />
              <div className="text-xs text-gray-400">{fmtDate(ms.actual_start) || '—'}</div>
              <span className={sc.cls}>{sc.icon} {ms.status}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
