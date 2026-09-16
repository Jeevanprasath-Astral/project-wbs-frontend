import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { MILESTONES } from '../utils/helpers'
import api from '../utils/api'
import clsx from 'clsx'

const MS_ICONS = ['🚀','🤝','🔍','📝','⚙️','🧪','📦','✅','🌟','🛡️']

export default function ExportPage() {
  const { id } = useParams()
  const [downloading, setDownloading] = useState(null)
  const [success, setSuccess]         = useState(null)

  // Active milestones fetched from API so we only show what's configured for this project
  const [activeMilestones, setActiveMilestones] = useState([])
  const [loadingMs, setLoadingMs]               = useState(true)

  // Multi-select: set of selected milestone nums
  const [selected, setSelected] = useState(new Set())

  // Fetch active milestones on mount
  // milestone-progress returns { project_pct, milestones: [{num, status, pct}] }
  // We enrich each entry with the name from the MILESTONES constant
  useEffect(() => {
    api.get(`/projects/${id}/milestone-progress`)
      .then(r => {
        const list = r.data?.milestones || []
        const sorted = [...list]
          .sort((a, b) => a.num - b.num)
          .map(m => ({
            ...m,
            name: MILESTONES.find(c => c.num === m.num)?.name || `Milestone ${m.num}`,
          }))
        setActiveMilestones(sorted)
        setSelected(new Set(sorted.map(m => m.num)))
      })
      .catch(() => setActiveMilestones([]))
      .finally(() => setLoadingMs(false))
  }, [id])

  const total    = activeMilestones.length
  const allSel   = selected.size === total && total > 0
  const noneSel  = selected.size === 0

  const toggleAll = () => {
    if (allSel) setSelected(new Set())
    else        setSelected(new Set(activeMilestones.map(m => m.num)))
  }

  const toggleMs = (num) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else               next.add(num)
      return next
    })
  }

  const download = async (type) => {
    if (noneSel) return
    const key = `dl-${type}`
    setDownloading(key)
    setSuccess(null)
    try {
      // If all milestones selected, omit param so backend exports everything
      const selNums = [...selected].sort((a,b) => a - b)
      const msParam = selected.size === total
        ? ''
        : `?milestones=${selNums.join(',')}`
      const url = `/projects/${id}/export/${type}${msParam}`
      const res = await api.get(url, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      const msLabel = selected.size === total ? '' : `-M${selNums.map(n => String(n).padStart(2,'0')).join('-')}`
      a.href = blobUrl
      a.download = `project-wbs${msLabel}.${type}`
      a.click()
      URL.revokeObjectURL(blobUrl)
      setSuccess(`${type.toUpperCase()} downloaded successfully!`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setDownloading(null)
    }
  }

  // Summary label for the export
  const summaryLabel = (() => {
    if (noneSel) return '⚠️ No milestones selected'
    if (selected.size === total) return `All ${total} milestones — complete project report`
    const names = activeMilestones
      .filter(m => selected.has(m.num))
      .map(m => `M${String(m.num).padStart(2,'0')} ${m.name}`)
    return names.join(', ')
  })()

  return (
    <div className="max-w-2xl animate-fade-up">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
             style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          ⬇️
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Export Report</h1>
          <p className="text-xs text-gray-400">Download project data in your preferred format</p>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm text-emerald-700 animate-fade-up">
          🎉 {success}
        </div>
      )}

      {/* Milestone multi-select panel */}
      <div className="card mb-4">
        {/* Panel header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            📌 Select Milestones to Export
          </div>
          <div className="flex items-center gap-2">
            {/* Count chip */}
            <span className={clsx(
              'px-2 py-0.5 rounded-full text-xs font-semibold',
              noneSel
                ? 'bg-red-100 text-red-600'
                : selected.size === total
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-amber-100 text-amber-700'
            )}>
              {selected.size} of {total} selected
            </span>
            {/* Select All / Deselect All */}
            {!loadingMs && total > 0 && (
              <button
                onClick={toggleAll}
                className="text-xs text-violet-600 hover:text-violet-800 font-medium underline underline-offset-2 transition-colors">
                {allSel ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>
        </div>

        {/* Milestone grid */}
        {loadingMs ? (
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No active milestones configured for this project.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {activeMilestones.map((ms, i) => {
              const isSel = selected.has(ms.num)
              return (
                <button
                  key={ms.num}
                  onClick={() => toggleMs(ms.num)}
                  className={clsx(
                    'flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-xs',
                    isSel
                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                      : 'border-gray-100 bg-white hover:border-violet-200 text-gray-600'
                  )}>
                  {/* Checkbox indicator */}
                  <span className={clsx(
                    'w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all',
                    isSel
                      ? 'bg-violet-500 border-violet-500 text-white'
                      : 'border-gray-300 bg-white'
                  )}>
                    {isSel && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>}
                  </span>
                  <span className="text-base">{MS_ICONS[i % MS_ICONS.length]}</span>
                  <span className="font-semibold">{String(ms.num).padStart(2,'0')}</span>
                  <span className="truncate">{ms.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Export summary */}
      <div className={clsx(
        'mb-4 px-4 py-3 border rounded-2xl text-xs',
        noneSel
          ? 'bg-red-50 border-red-100 text-red-600'
          : 'bg-violet-50 border-violet-100 text-violet-700'
      )}>
        <span className="font-semibold">📋 Exporting: </span>
        {summaryLabel}
      </div>

      {/* Download buttons */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { type:'xlsx', icon:'📊', label:'Excel Report', desc:'Spreadsheet with all responses, status & sign-offs', color:'from-emerald-500 to-teal-600', shadow:'shadow-emerald-200' },
          { type:'pdf',  icon:'📄', label:'PDF Report',   desc:'Formatted document — ideal for sharing with clients', color:'from-rose-500 to-pink-600', shadow:'shadow-rose-200' },
        ].map(({ type, icon, label, desc, color, shadow }) => (
          <div key={type} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center hover:shadow-lg transition-all duration-200">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg ${shadow}`}>
              {icon}
            </div>
            <div className="font-semibold text-gray-800 text-sm mb-1">{label}</div>
            <div className="text-xs text-gray-400 mb-4 leading-relaxed">{desc}</div>
            <button
              onClick={() => download(type)}
              disabled={!!downloading || noneSel || loadingMs}
              className={clsx(
                'w-full h-10 rounded-xl text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg',
                `bg-gradient-to-r ${color} ${shadow}`
              )}>
              {downloading === `dl-${type}`
                ? <><span className="animate-spin text-base">⟳</span> Downloading…</>
                : noneSel
                  ? '⚠️ Select milestones'
                  : <><span>⬇️</span> Download .{type}</>}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <div className="flex items-start gap-2">
          <span className="text-lg">💡</span>
          <div className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Tip:</span> Use <strong>Excel</strong> for internal team review and analysis.
            Use <strong>PDF</strong> for client presentations, sign-off submissions, and formal documentation.
            Unfilled fields are highlighted in yellow so reviewers can spot gaps easily.
          </div>
        </div>
      </div>
    </div>
  )
}
