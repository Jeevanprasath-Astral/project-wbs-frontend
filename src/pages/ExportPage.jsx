import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { MILESTONES } from '../utils/helpers'
import api from '../utils/api'
import clsx from 'clsx'

const MS_ICONS = ['🚀','🤝','🔍','📝','⚙️','🧪','📦','✅','🌟','🛡️']

export default function ExportPage() {
  const { id } = useParams()
  const [downloading, setDownloading] = useState(null)
  const [exportMode, setExportMode] = useState('all')   // 'all' | 'single'
  const [selectedMs, setSelectedMs] = useState(1)
  const [success, setSuccess] = useState(null)

  const download = async (type) => {
    const key = `${exportMode}-${type}`
    setDownloading(key)
    setSuccess(null)
    try {
      const url = exportMode === 'all'
        ? `/projects/${id}/export/${type}`
        : `/projects/${id}/export/${type}?milestone=${selectedMs}`
      const res = await api.get(url, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      const msLabel = exportMode === 'single' ? `-M${String(selectedMs).padStart(2,'0')}` : ''
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

      {/* Export mode selector */}
      <div className="card mb-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          📌 What do you want to export?
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setExportMode('all')}
            className={clsx('p-4 rounded-2xl border-2 text-left transition-all duration-200',
              exportMode === 'all'
                ? 'border-violet-400 bg-violet-50'
                : 'border-gray-100 bg-white hover:border-violet-200'
            )}>
            <div className="text-2xl mb-2">📦</div>
            <div className={clsx('text-sm font-semibold mb-1', exportMode === 'all' ? 'text-violet-700' : 'text-gray-800')}>
              All Milestones
            </div>
            <div className="text-xs text-gray-400">Export complete project — all 10 milestones</div>
            {exportMode === 'all' && (
              <div className="mt-2 text-xs text-violet-600 font-medium">✓ Selected</div>
            )}
          </button>

          <button
            onClick={() => setExportMode('single')}
            className={clsx('p-4 rounded-2xl border-2 text-left transition-all duration-200',
              exportMode === 'single'
                ? 'border-violet-400 bg-violet-50'
                : 'border-gray-100 bg-white hover:border-violet-200'
            )}>
            <div className="text-2xl mb-2">🎯</div>
            <div className={clsx('text-sm font-semibold mb-1', exportMode === 'single' ? 'text-violet-700' : 'text-gray-800')}>
              Selected Milestone
            </div>
            <div className="text-xs text-gray-400">Export one specific milestone only</div>
            {exportMode === 'single' && (
              <div className="mt-2 text-xs text-violet-600 font-medium">✓ Selected</div>
            )}
          </button>
        </div>

        {/* Milestone selector */}
        {exportMode === 'single' && (
          <div className="mt-4 animate-fade-up">
            <div className="text-xs font-medium text-gray-600 mb-2">Choose milestone to export:</div>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {MILESTONES.map((ms, i) => (
                <button
                  key={ms.num}
                  onClick={() => setSelectedMs(ms.num)}
                  className={clsx('flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-xs',
                    selectedMs === ms.num
                      ? 'border-violet-400 bg-violet-50 text-violet-700'
                      : 'border-gray-100 bg-white hover:border-violet-200 text-gray-600'
                  )}>
                  <span className="text-base">{MS_ICONS[i]}</span>
                  <span className="font-medium">{String(ms.num).padStart(2,'0')}</span>
                  <span className="truncate">{ms.name}</span>
                  {selectedMs === ms.num && <span className="ml-auto">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export summary */}
      <div className="mb-4 px-4 py-3 bg-violet-50 border border-violet-100 rounded-2xl text-xs text-violet-700">
        <span className="font-semibold">📋 Exporting: </span>
        {exportMode === 'all'
          ? 'All 10 milestones — complete project report'
          : `Milestone ${String(selectedMs).padStart(2,'0')} — ${MILESTONES.find(m => m.num === selectedMs)?.name}`
        }
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
              disabled={!!downloading}
              className={clsx(
                'w-full h-10 rounded-xl text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg',
                `bg-gradient-to-r ${color} ${shadow}`
              )}>
              {downloading === `${exportMode}-${type}`
                ? <><span className="animate-spin text-base">⟳</span> Downloading…</>
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
