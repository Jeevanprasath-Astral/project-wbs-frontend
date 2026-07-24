import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../utils/api'
import clsx from 'clsx'
import { useAppStore } from '../../store'
import { ALL_ROLES, isTeamManager } from '../../utils/permissions'
import ConfirmModal from '../../components/common/ConfirmModal'

const ROLES = ALL_ROLES

const ROLE_COLORS = {
  'Admin':                 'bg-primary-50 text-primary-800',
  'FC Lead':               'bg-indigo-50 text-indigo-700',
  'TC Lead':               'bg-teal-50 text-teal-700',
  'Functional Consultant': 'bg-purple-50 text-purple-700',
  'Technical Team':        'bg-success-50 text-success-600',
  'HR':                    'bg-pink-50 text-pink-700',
  'Client':                'bg-warning-50 text-warning-600',
}

function Avatar({ name, size = 'md' }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const colors = ['bg-primary-100 text-primary-800', 'bg-purple-100 text-purple-700',
                  'bg-success-50 text-success-600', 'bg-warning-50 text-warning-600']
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0]
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={clsx('rounded-full flex items-center justify-center font-medium flex-shrink-0', sz, color)}>
      {initials}
    </div>
  )
}

export default function TeamPage() {
  const { id } = useParams()
  const currentUser = useAppStore(s => s.user)
  const canManage = isTeamManager(currentUser)
  const [team, setTeam] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addMode, setAddMode] = useState('existing') // 'existing' | 'new'
  const [form, setForm] = useState({ name:'', email:'', role:'Functional Consultant', password:'wbs123' })
  const [selectedUserId, setSelectedUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [confirmState, setConfirmState] = useState(null)

  const load = async () => {
    try {
      const [teamRes, usersRes] = await Promise.all([
        api.get(`/projects/${id}/team`),
        api.get(`/projects/${id}/all-users`),
      ])
      setTeam(teamRes.data)
      setAllUsers(usersRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleAddExisting = async () => {
    if (!selectedUserId) return
    setSaving(true)
    try {
      const res = await api.post(`/projects/${id}/team/add-existing`, { user_id: parseInt(selectedUserId) })
      showMsg(res.data.message)
      setShowAddModal(false)
      setSelectedUserId('')
      load()
    } catch (e) {
      showMsg(e.response?.data?.detail || 'Failed to add member', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddNew = async () => {
    if (!form.name || !form.email) return
    setSaving(true)
    try {
      const res = await api.post(`/projects/${id}/team/add-new`, form)
      showMsg(res.data.message)
      setShowAddModal(false)
      setForm({ name:'', email:'', role:'Functional Consultant', password:'wbs123' })
      load()
    } catch (e) {
      showMsg(e.response?.data?.detail || 'Failed to create member', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = (memberId, name) => {
    setConfirmState({
      title: `Remove ${name}?`,
      message: 'They will be removed from this project. Their account and other project memberships are not affected.',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await api.delete(`/projects/${id}/team/${memberId}`)
          showMsg(`${name} removed from project`)
          load()
        } catch (e) {
          showMsg(e.response?.data?.detail || 'Failed to remove member', 'error')
        }
      }
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <i className="ti ti-loader animate-spin text-3xl" />
    </div>
  )

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-medium text-gray-900">Team management</h1>
          <p className="text-xs text-gray-400 mt-0.5">{team.length} member{team.length !== 1 ? 's' : ''} in this project</p>
        </div>
        {canManage && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary text-xs">
            <i className="ti ti-user-plus text-sm" /> Add member
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={clsx('mb-4 px-4 py-2.5 rounded-lg text-sm', message.type === 'error'
          ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600')}>
          <i className={clsx('ti mr-1.5', message.type === 'error' ? 'ti-alert-circle' : 'ti-circle-check')} />
          {message.text}
        </div>
      )}

      {/* Team list */}
      <div className="space-y-2">
        {team.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <i className="ti ti-users text-4xl" />
            <p className="mt-2 text-sm">No team members yet</p>
            {canManage && (
              <button onClick={() => setShowAddModal(true)} className="btn btn-primary mt-3 text-xs">
                <i className="ti ti-user-plus text-sm" /> Add first member
              </button>
            )}
          </div>
        ) : (
          team.map((m) => (
            <div key={m.member_id} className="card flex items-center gap-3 py-3">
              <Avatar name={m.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 text-sm">{m.name}</span>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[m.role] || 'bg-gray-100 text-gray-500')}>
                    {m.role}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{m.email}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400">{m.task_count} tasks</span>
                {canManage && (
                  <button
                    onClick={() => handleRemove(m.member_id, m.name)}
                    className="btn text-xs text-danger-600 border-danger-200 hover:bg-danger-50 py-1 px-2"
                    title="Remove from project"
                  >
                    <i className="ti ti-user-minus text-sm" /> Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-900">Add team member</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setAddMode('existing')}
                className={clsx('flex-1 py-2.5 text-xs font-medium transition-colors',
                  addMode === 'existing' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600')}
              >
                <i className="ti ti-users mr-1" /> Add existing user
              </button>
              <button
                onClick={() => setAddMode('new')}
                className={clsx('flex-1 py-2.5 text-xs font-medium transition-colors',
                  addMode === 'new' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600')}
              >
                <i className="ti ti-user-plus mr-1" /> Create new user
              </button>
            </div>

            <div className="p-4 space-y-3">
              {addMode === 'existing' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Select user</label>
                    {allUsers.length === 0 ? (
                      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-3 text-center">
                        All existing users are already in this project.<br/>
                        Use "Create new user" tab to add someone new.
                      </div>
                    ) : (
                      <select className="select text-sm" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                        <option value="">— Select a user —</option>
                        {allUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role}) — {u.email}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button className="btn text-xs" onClick={() => setShowAddModal(false)}>Cancel</button>
                    <button
                      className="btn btn-primary text-xs"
                      onClick={handleAddExisting}
                      disabled={!selectedUserId || saving || allUsers.length === 0}
                    >
                      {saving ? <><i className="ti ti-loader animate-spin" /> Adding…</> : 'Add to project'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Full name <span className="text-danger-500">*</span></label>
                    <input className="input text-sm" placeholder="e.g. Priya Krishnan" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email address <span className="text-danger-500">*</span></label>
                    <input className="input text-sm" type="email" placeholder="e.g. priya@company.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                    <select className="select text-sm" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                    <input className="input text-sm" type="text" placeholder="Default: wbs123" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    <p className="text-xs text-gray-400 mt-1">User can change this after first login</p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button className="btn text-xs" onClick={() => setShowAddModal(false)}>Cancel</button>
                    <button
                      className="btn btn-primary text-xs"
                      onClick={handleAddNew}
                      disabled={!form.name || !form.email || saving}
                    >
                      {saving ? <><i className="ti ti-loader animate-spin" /> Creating…</> : <><i className="ti ti-user-plus text-sm" /> Create & add</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        danger={true}
        onConfirm={() => { confirmState?.onConfirm(); setConfirmState(null) }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}
