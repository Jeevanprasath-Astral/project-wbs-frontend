import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../utils/api'
import clsx from 'clsx'

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  issue_name: '',
  issue_date: today(),
  description: '',
  responsible_person: '',
}

export default function IssuesPage() {
  const { id } = useParams()
  const [issues, setIssues]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editId, setEditId]       = useState(null)   // null = adding new
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)  // issue id to confirm delete

  const load = () => {
    setLoading(true)
    api.get(`/projects/${id}/issues`)
      .then(r => setIssues(r.data))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setError('')
    setShowForm(true)
  }

  const openEdit = (issue) => {
    setForm({
      issue_name:          issue.issue_name,
      issue_date:          issue.issue_date || today(),
      description:         issue.description || '',
      responsible_person:  issue.responsible_person || '',
    })
    setEditId(issue.id)
    setError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setError('')
  }

  const handleSave = async () => {
    if (!form.issue_name.trim()) { setError('Issue Name is required'); return }
    if (!form.issue_date)        { setError('Issue Date is required'); return }
    setSaving(true)
    setError('')
    try {
      if (editId) {
        await api.put(`/projects/${id}/issues/${editId}`, form)
      } else {
        await api.post(`/projects/${id}/issues`, form)
      }
      closeForm()
      load()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to save issue')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (issueId) => {
    try {
      await api.delete(`/projects/${id}/issues/${issueId}`)
      setDeleteConfirm(null)
      load()
    } catch {
      // silently handle
    }
  }

  const fmtDate = (d) => {
    if (!d) return '—'
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      })
    } catch { return d }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🚩 Project Issues
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Log and track project issues. These will appear in the Project Status Report email.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700
                     text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          + Add Issue
        </button>
      </div>

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {editId ? '✏️ Edit Issue' : '🚩 Add New Issue'}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Issue Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Issue Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.issue_name}
                  onChange={e => setForm(f => ({ ...f, issue_name: e.target.value }))}
                  placeholder="e.g. Data Migration Delay"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                />
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Issue Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.issue_date}
                  onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                />
              </div>

              {/* Responsible Person */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Person Responsible for Follow-up
                </label>
                <input
                  type="text"
                  value={form.responsible_person}
                  onChange={e => setForm(f => ({ ...f, responsible_person: e.target.value }))}
                  placeholder="e.g. Jeevan J"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description / Notes
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the issue and any relevant context..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none
                             focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-xl
                           border border-gray-200 hover:border-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-violet-600
                           hover:bg-violet-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete Issue?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:border-gray-300"
              >Cancel</button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl"
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Issues Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-16 text-center">
          <div className="text-4xl mb-3">🚩</div>
          <p className="text-gray-500 text-sm font-medium">No issues logged yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Click "Add Issue" to log the first issue for this project.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Issue Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Issue Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Follow-up By</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, idx) => (
                <tr
                  key={issue.id}
                  className={clsx(
                    'border-b border-gray-50 hover:bg-amber-50/40 transition-colors',
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                  )}
                >
                  <td className="px-4 py-3 text-xs text-amber-600 font-semibold">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-gray-800">{issue.issue_name}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {fmtDate(issue.issue_date)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                    <span className="line-clamp-2">{issue.description || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {issue.responsible_person || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(issue)}
                        className="px-2.5 py-1 text-xs font-medium text-violet-600 hover:text-violet-700
                                   hover:bg-violet-50 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(issue.id)}
                        className="px-2.5 py-1 text-xs font-medium text-red-500 hover:text-red-600
                                   hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">{issues.length} issue{issues.length !== 1 ? 's' : ''} total</p>
            <p className="text-xs text-gray-400">
              Issues appear in the Project Status Report email under "Issue Details"
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
