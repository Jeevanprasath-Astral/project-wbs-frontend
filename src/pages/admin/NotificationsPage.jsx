import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fmtDateTime } from '../../utils/helpers'
import api from '../../utils/api'
import clsx from 'clsx'

const NOTIF_CONFIG = {
  overdue:    { icon: '🔥', bg: 'bg-rose-50 border-rose-100',     label: 'Overdue' },
  reminder:   { icon: '⏰', bg: 'bg-amber-50 border-amber-100',   label: 'Reminder' },
  completed:  { icon: '🎉', bg: 'bg-emerald-50 border-emerald-100', label: 'Completed' },
  assignment: { icon: '📌', bg: 'bg-blue-50 border-blue-100',     label: 'Assignment' },
  started:    { icon: '🚀', bg: 'bg-violet-50 border-violet-100', label: 'Started' },
}

export default function NotificationsPage() {
  const { id } = useParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/projects/${id}/notifications`).then(r => setItems(r.data)).finally(() => setLoading(false))
  }, [id])

  const markRead = async (nid) => {
    await api.patch(`/notifications/${nid}/read`)
    setItems(items.map(n => n.id === nid ? { ...n, read: true } : n))
  }

  const unread = items.filter(n => !n.read).length

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-violet-400">
      <div className="text-center animate-pulse">
        <div className="text-4xl mb-3 animate-float">🔔</div>
        <div className="text-sm font-medium">Loading notifications...</div>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
               style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            🔔
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
            <p className="text-xs text-gray-400">{items.length} total · {unread} unread</p>
          </div>
        </div>
        {unread > 0 && (
          <span className="text-xs bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-full font-medium">
            🔴 {unread} new
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 animate-fade-up">
          <div className="text-6xl mb-4 animate-float">🎉</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">All caught up!</h2>
          <p className="text-gray-500 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2 stagger">
          {items.map(n => {
            const cfg = NOTIF_CONFIG[n.type] || { icon: '📣', bg: 'bg-gray-50 border-gray-100', label: 'Info' }
            return (
              <div key={n.id}
                className={clsx('flex items-start gap-3 p-4 rounded-2xl border transition-all duration-200 animate-fade-up',
                  cfg.bg, !n.read && 'ring-2 ring-violet-100 shadow-sm')}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-white shadow-sm">
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />}
                  </div>
                  <div className="text-sm text-gray-800 leading-snug mb-1">{n.message}</div>
                  <div className="text-xs text-gray-400">{fmtDateTime(n.created_at)}</div>
                  {n.email_sent && (
                    <div className="text-xs text-emerald-600 mt-1">
                      ✉️ Email sent to {n.email_to}
                    </div>
                  )}
                </div>
                {!n.read && (
                  <button onClick={() => markRead(n.id)}
                    className="btn text-xs py-1 px-2.5 flex-shrink-0 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200">
                    ✓ Mark read
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
