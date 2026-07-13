/**
 * AttachmentPanel — reusable upload/download/delete panel
 * Props:
 *   entityType  : "milestone" | "task" | "subtask" | "activity" | "report"
 *   entityId    : number
 *   readOnly    : bool (optional, hides upload/delete)
 */
import { useEffect, useRef, useState } from 'react'
import api from '../utils/api'

const EXT_ICON = ext => {
  const e = (ext || '').toLowerCase().replace('.', '')
  if (['pdf'].includes(e))                          return '📄'
  if (['xls','xlsx'].includes(e))                   return '📊'
  if (['doc','docx'].includes(e))                   return '📝'
  if (['png','jpg','jpeg','gif','svg','webp'].includes(e)) return '🖼️'
  if (['zip','rar','7z','tar','gz'].includes(e))    return '🗜️'
  return '📎'
}

const fmtSize = bytes => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}

export default function AttachmentPanel({ entityType, entityId, readOnly = false }) {
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading]         = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [error, setError]             = useState('')
  const [expanded, setExpanded]       = useState(false)
  const fileRef = useRef()

  const load = async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const res = await api.get('/attachments', { params: { entity_type: entityType, entity_id: entityId } })
      setAttachments(res.data)
    } catch { setAttachments([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (expanded) load() }, [expanded, entityId])

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    const form = new FormData()
    form.append('entity_type', entityType)
    form.append('entity_id', String(entityId))
    form.append('file', file)
    try {
      await api.post('/attachments/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      await load()
    } catch (ex) { setError(ex.response?.data?.detail || 'Upload failed') }
    finally { setUploading(false); fileRef.current.value = '' }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this attachment?')) return
    try {
      await api.delete(`/attachments/${id}`)
      setAttachments(a => a.filter(x => x.id !== id))
    } catch { setError('Delete failed') }
  }

  // URL comes directly from Cloudinary (returned by the backend)
  const downloadUrl = (a) => a.url || '#'

  const count = attachments.length

  return (
    <div className="mt-2">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(s => !s)}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-700 font-medium transition-colors"
      >
        <span>📎</span>
        <span>Attachments</span>
        {count > 0 && !expanded && (
          <span className="bg-gray-100 text-gray-600 text-[10px] rounded-md px-1.5 py-0.5">{count}</span>
        )}
        <span className="text-gray-300">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-1.5 p-2 bg-gray-50 rounded-xl border border-gray-100">
          {loading && <p className="text-[11px] text-gray-400">Loading…</p>}

          {!loading && attachments.length === 0 && (
            <p className="text-[11px] text-gray-400">No attachments yet.</p>
          )}

          {attachments.map(a => {
            const ext = a.original_filename.slice(a.original_filename.lastIndexOf('.'))
            return (
              <div key={a.id} className="flex items-center gap-2 py-1 border-b border-gray-100 last:border-0">
                <span className="text-base leading-none">{EXT_ICON(ext)}</span>
                <a
                  href={downloadUrl(a)}
                  target="_blank"
                  rel="noreferrer"
                  download={a.original_filename}
                  className="text-[11px] text-violet-700 hover:underline flex-1 truncate"
                  title={a.original_filename}
                >{a.original_filename}</a>
                <span className="text-[10px] text-gray-400 shrink-0">{fmtSize(a.file_size)}</span>
                {!readOnly && (
                  <button
                    onClick={() => remove(a.id)}
                    className="text-rose-400 hover:text-rose-600 text-[10px] shrink-0 ml-1"
                    title="Delete"
                  >✕</button>
                )}
              </div>
            )
          })}

          {!readOnly && (
            <div className="mt-1.5">
              <input type="file" ref={fileRef} className="hidden" onChange={upload} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !entityId}
                className="text-[11px] text-violet-600 hover:text-violet-800 font-medium disabled:opacity-50"
              >{uploading ? 'Uploading…' : '⬆ Upload file'}</button>
              {error && <p className="text-[11px] text-rose-600 mt-0.5">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
