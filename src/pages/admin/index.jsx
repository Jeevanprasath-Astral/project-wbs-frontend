import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fmtDateTime, fmtDate } from '../../utils/helpers'
import api from '../../utils/api'
import clsx from 'clsx'

const NOTIF_STYLE = {
  overdue:    { icon:'ti-alert-triangle', cls:'bg-danger-50 text-danger-600' },
  reminder:   { icon:'ti-clock',          cls:'bg-warning-50 text-warning-600' },
  completed:  { icon:'ti-circle-check',   cls:'bg-success-50 text-success-600' },
  assignment: { icon:'ti-user-check',     cls:'bg-primary-50 text-primary-800' },
  started:    { icon:'ti-player-play',    cls:'bg-primary-50 text-primary-800' },
}

export function NotificationsPage() {
  const { id } = useParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/projects/${id}/notifications`).then(r=>setItems(r.data)).finally(()=>setLoading(false))
  }, [id])

  const markRead = async (nid) => {
    await api.patch(`/notifications/${nid}/read`)
    setItems(items.map(n => n.id===nid ? {...n, read:true} : n))
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><i className="ti ti-loader animate-spin text-3xl" /></div>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-medium text-gray-900">Notifications</h1>
        <span className="text-xs text-gray-400">{items.filter(n=>!n.read).length} unread</span>
      </div>
      <div className="space-y-2">
        {items.length === 0
          ? <div className="card text-center py-10 text-gray-400"><i className="ti ti-bell-off text-3xl" /><p className="mt-2 text-sm">No notifications</p></div>
          : items.map(n => {
            const s = NOTIF_STYLE[n.type] || NOTIF_STYLE.assignment
            return (
              <div key={n.id} className={clsx('card flex items-start gap-3', !n.read && 'border-primary-100 bg-primary-50/30')}>
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', s.cls)}>
                  <i className={clsx('ti', s.icon, 'text-base')} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800">{n.message}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{fmtDateTime(n.created_at)}</div>
                  {n.email_sent && <div className="text-xs text-success-600 mt-0.5"><i className="ti ti-mail text-xs" aria-hidden="true" /> Email sent to {n.email_to}</div>}
                </div>
                {!n.read && (
                  <button onClick={() => markRead(n.id)} className="btn text-xs py-1 px-2 flex-shrink-0">Mark read</button>
                )}
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

export function AuditPage() {
  const { id } = useParams()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.get(`/projects/${id}/audit`).then(r=>setLogs(r.data)).finally(()=>setLoading(false))
  }, [id])

  const filtered = filter ? logs.filter(l => l.actor?.toLowerCase().includes(filter) || l.description?.toLowerCase().includes(filter)) : logs

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><i className="ti ti-loader animate-spin text-3xl" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-medium text-gray-900">Audit trail</h1>
        <input className="input w-52 text-xs" placeholder="Search by actor or action…" value={filter} onChange={e=>setFilter(e.target.value.toLowerCase())} />
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-xs" style={{tableLayout:'fixed'}}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Date & Time','Actor','Action / Description','Previous value','New value'].map(h=>(
                <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400">{fmtDateTime(l.created_at)}</td>
                <td className="px-3 py-2 font-medium text-gray-700">{l.actor}</td>
                <td className="px-3 py-2 text-gray-600">{l.description}</td>
                <td className="px-3 py-2 text-gray-400 truncate">{l.old_value || '—'}</td>
                <td className="px-3 py-2 text-gray-700 truncate">{l.new_value || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No audit entries found</div>}
      </div>
    </div>
  )
}

export function TeamPage() {
  const { id } = useParams()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/projects/${id}/team`).then(r=>setTeam(r.data)).finally(()=>setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><i className="ti ti-loader animate-spin text-3xl" /></div>

  return (
    <div>
      <h1 className="text-base font-medium text-gray-900 mb-4">Team management</h1>
      <div className="grid grid-cols-2 gap-3">
        {team.map(m => (
          <div key={m.id} className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-medium">
              {m.name?.slice(0,2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 text-sm">{m.name}</div>
              <div className="text-xs text-gray-400">{m.role} · {m.email}</div>
              <div className="text-xs text-gray-400 mt-0.5">{m.task_count || 0} tasks assigned</div>
            </div>
            <button className="btn text-xs"><i className="ti ti-edit text-sm" aria-hidden="true" /> Assign</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TimelinePage() {
  const { id } = useParams()
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/projects/${id}/milestones`).then(r=>setMilestones(r.data)).finally(()=>setLoading(false))
  }, [id])

  const update = async (msId, field, value) => {
    await api.patch(`/projects/${id}/milestones/${msId}`, { [field]: value })
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><i className="ti ti-loader animate-spin text-3xl" /></div>

  return (
    <div>
      <h1 className="text-base font-medium text-gray-900 mb-4">Timeline management</h1>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-xs" style={{tableLayout:'fixed'}}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['#','Milestone','Assignee','Planned start','Planned end','Actual start','Actual end','Status'].map(h=>(
                <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {milestones.map(ms => (
              <tr key={ms.id} className="border-b border-gray-50">
                <td className="px-3 py-2 text-gray-400 font-medium">{String(ms.num).padStart(2,'0')}</td>
                <td className="px-3 py-2 font-medium text-gray-700 truncate">{ms.name}</td>
                <td className="px-3 py-2 text-gray-500 truncate">{ms.assignee || '—'}</td>
                <td className="px-3 py-1.5"><input type="date" className="input text-xs h-7 px-2" defaultValue={ms.planned_start || ''} onBlur={e=>update(ms.id,'planned_start',e.target.value)} /></td>
                <td className="px-3 py-1.5"><input type="date" className="input text-xs h-7 px-2" defaultValue={ms.planned_end || ''} onBlur={e=>update(ms.id,'planned_end',e.target.value)} /></td>
                <td className="px-3 py-2 text-gray-400">{fmtDate(ms.actual_start) || '—'}</td>
                <td className="px-3 py-2 text-gray-400">{fmtDate(ms.actual_end) || '—'}</td>
                <td className="px-3 py-2"><span className={`badge-${ms.status==='Completed'?'done':ms.status==='In Progress'?'prog':ms.status==='Overdue'?'over':'todo'}`}>{ms.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
