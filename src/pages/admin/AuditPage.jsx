import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fmtDateTime } from '../../utils/helpers'
import api from '../../utils/api'

export default function AuditPage() {
  const { id } = useParams()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.get(`/projects/${id}/audit`).then(r => setLogs(r.data)).finally(() => setLoading(false))
  }, [id])

  const filtered = filter
    ? logs.filter(l => l.actor?.toLowerCase().includes(filter) || l.description?.toLowerCase().includes(filter))
    : logs

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-violet-400">
      <div className="text-center animate-pulse">
        <div className="text-4xl mb-3">📋</div>
        <div className="text-sm font-medium">Loading audit trail...</div>
      </div>
    </div>
  )

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
               style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            📋
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Audit Trail</h1>
            <p className="text-xs text-gray-400">{logs.length} records</p>
          </div>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input className="input pl-8 w-52 text-xs" placeholder="Search actor or action…"
            value={filter} onChange={e => setFilter(e.target.value.toLowerCase())} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-5 gap-0 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3">
          {['🕐 Date & Time', '👤 Actor', '📝 Action', '⬅️ Previous', '➡️ New Value'].map(h => (
            <div key={h} className="text-xs font-semibold text-white">{h}</div>
          ))}
        </div>
        <div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm">No records found</p>
            </div>
          ) : filtered.map((a, i) => (
            <div key={a.id}
              className={`grid grid-cols-5 gap-0 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-violet-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <div className="text-xs text-gray-400">{fmtDateTime(a.created_at)}</div>
              <div className="text-xs font-semibold text-gray-700">
                {a.actor === 'System' ? '🤖' : '👤'} {a.actor}
              </div>
              <div className="text-xs text-gray-600 pr-2">{a.description}</div>
              <div className="text-xs text-gray-400 truncate pr-2">{a.old_value || '—'}</div>
              <div className="text-xs text-gray-700 font-medium truncate">{a.new_value || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
