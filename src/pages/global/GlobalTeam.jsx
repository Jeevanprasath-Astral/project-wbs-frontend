import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmtDate } from '../../utils/helpers'
import api from '../../utils/api'
import { getProjectsList, getGlobalTeams, invalidateMasterData } from '../../utils/masterData'
import clsx from 'clsx'
import { useAppStore } from '../../store'
import { ALL_ROLES, isTeamManager } from '../../utils/permissions'
import ConfirmModal from '../../components/common/ConfirmModal'

const ROLES = ALL_ROLES
const ROLE_CFG = {
  'Admin':                 { color:'from-violet-500 to-purple-600', badge:'bg-violet-50 text-violet-700 border-violet-100', icon:'👑' },
  'FC Lead':               { color:'from-indigo-500 to-blue-600',  badge:'bg-indigo-50 text-indigo-700 border-indigo-100', icon:'🧭' },
  'TC Lead':               { color:'from-teal-500 to-cyan-600',    badge:'bg-teal-50 text-teal-700 border-teal-100',       icon:'🛠️' },
  'Functional Consultant': { color:'from-blue-500 to-indigo-600',  badge:'bg-blue-50 text-blue-700 border-blue-100',       icon:'🧩' },
  'Technical Team':        { color:'from-emerald-500 to-teal-600', badge:'bg-emerald-50 text-emerald-700 border-emerald-100', icon:'⚙️' },
  'HR':                    { color:'from-pink-500 to-rose-600',    badge:'bg-pink-50 text-pink-700 border-pink-100',       icon:'🎓' },
  'Client':                { color:'from-amber-500 to-orange-600', badge:'bg-amber-50 text-amber-700 border-amber-100',    icon:'🏢' },
}
const PERMISSIONS = {
  'Admin':                 ['All system access','User management','Project management','Task assignment','Milestone management','Reports & exports'],
  'FC Lead':               ['All-module access (like Admin)','Assign & delete tasks','Manage Cost Management','Set timelines','View reports'],
  'TC Lead':               ['All-module access (like Admin)','Assign & delete tasks','Manage Cost Management','Set timelines','View reports'],
  'Functional Consultant': ['Create requirements','Manage milestones','Assign tasks','Set timelines','View reports'],
  'Technical Team':        ['Manage dev tasks','Update task status','View reports'],
  'HR':                    ['Create/edit/remove teams & users','Manage holidays','Approve leave & permissions','View reports'],
  'Client':                ['View dashboard','View reports','Milestone sign-off'],
}
const ACTION_LABELS = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete' }

function buildRolePerms(role, matrix, modules) {
  if (role === 'Admin') return ['Full system access — all modules, all actions']
  if (matrix && modules.length > 0) {
    if (Object.prototype.hasOwnProperty.call(matrix, role)) {
      const list = []
      for (const mod of modules) {
        const cell = matrix[role]?.[mod.key] || {}
        const actions = ['view','create','edit','delete'].filter(a => cell[a])
        if (actions.length) list.push(`${mod.label}: ${actions.map(a => ACTION_LABELS[a]).join(', ')}`)
      }
      return list
    }
  }
  return PERMISSIONS[role] || []
}

/* ── Role Access Panel ─────────────────────────────────────────────────────── */
const PERM_ACTIONS = [
  { key: 'view',   label: 'V', title: 'View',   color: 'text-blue-600'  },
  { key: 'create', label: 'C', title: 'Create', color: 'text-green-600' },
  { key: 'edit',   label: 'E', title: 'Edit',   color: 'text-amber-600' },
  { key: 'delete', label: 'D', title: 'Delete', color: 'text-rose-600'  },
]
const DISPLAY_ROLES = [
  'Project Manager','FC Lead','TC Lead','BD','HR',
  'Associate Data Analyst','Associate','Functional Consultant','Technical Team','Client',
]

// matrix and modules come from parent (loaded lazily once); setMatrix enables optimistic updates
function RoleAccessPanel({ currentUser, matrix, modules, setMatrix, onPermissionChange }) {
  const [saving, setSaving]         = useState({})
  const [msg, setMsg]               = useState(null)
  const [resetConfirm, setResetConfirm] = useState(null)   // { role } when open
  const canManage = ['Admin','Project Manager','HR'].includes(currentUser?.role)

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 2500) }

  const toggle = async (role, moduleKey, action) => {
    if (role === 'Admin') return
    const key = `${role}_${moduleKey}`
    const currentCell = matrix[role]?.[moduleKey] || { view: false, create: false, edit: false, delete: false }
    const newVal = !currentCell[action]

    // ── Dependency rules ──────────────────────────────────────────────────────
    // Enabling create/edit/delete → also force view ON
    // Disabling view → also force create/edit/delete OFF
    const updatedCell = { ...currentCell, [action]: newVal }
    if (newVal && action !== 'view') updatedCell.view = true
    if (!newVal && action === 'view') {
      updatedCell.create = false
      updatedCell.edit   = false
      updatedCell.delete = false
    }

    // Send only the fields that actually changed (may be >1 due to dependency)
    const payload = {}
    for (const a of ['view','create','edit','delete']) {
      if (updatedCell[a] !== currentCell[a]) payload[`can_${a}`] = updatedCell[a]
    }

    // Optimistic update
    setMatrix(m => ({ ...m, [role]: { ...m[role], [moduleKey]: updatedCell } }))
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await api.put(`/role-permissions/${encodeURIComponent(role)}/${moduleKey}`, payload)
      showMsg('✓ Saved')
    } catch {
      // Rollback to pre-toggle state
      setMatrix(m => ({ ...m, [role]: { ...m[role], [moduleKey]: currentCell } }))
      showMsg('Save failed', 'error')
    } finally {
      setSaving(s => { const n = { ...s }; delete n[key]; return n })
    }
  }

  const doReset = async (role) => {
    setResetConfirm(null)
    try {
      await api.post(`/role-permissions/reset/${encodeURIComponent(role)}`)
      onPermissionChange?.()   // reload full matrix from server
      showMsg(`"${role}" reset to defaults`)
    } catch { showMsg('Reset failed', 'error') }
  }

  if (!canManage) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <div className="text-5xl mb-3">🔒</div>
      <p className="text-sm text-gray-500">Role access settings are managed by Admin, Project Manager, or HR.</p>
    </div>
  )

  if (!matrix) return (
    <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
      <span className="animate-spin text-xl">⟳</span>
      <span className="text-sm">Loading permission matrix…</span>
    </div>
  )

  return (
    <>
    <div className="space-y-4">
      {msg && (
        <div className={`text-xs px-4 py-2 rounded-xl font-medium ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          {msg.text}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 flex items-center gap-6 flex-wrap">
        <span className="text-xs font-semibold text-gray-600">Action keys:</span>
        {PERM_ACTIONS.map(a => (
          <span key={a.key} className="flex items-center gap-1 text-xs">
            <span className={`font-bold ${a.color}`}>{a.label}</span>
            <span className="text-gray-400">= {a.title}</span>
          </span>
        ))}
        <span className="text-xs text-gray-400 ml-auto italic">Click any letter to toggle. Enabling C/E/D auto-enables V. Admin is locked.</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="text-xs border-collapse" style={{ minWidth: '900px', width: '100%' }}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50/60 w-44">Module</th>
              <th className="px-3 py-3 text-center border-l border-gray-100 w-16">
                <div className="font-semibold text-violet-700 text-xs">👑</div>
                <div className="text-xs text-violet-600 font-medium">Admin</div>
                <div className="text-gray-300 text-xs">locked</div>
              </th>
              {DISPLAY_ROLES.map(role => (
                <th key={role} className="px-1 py-3 text-center border-l border-gray-100 w-20">
                  <div className="text-xs font-semibold text-gray-700 truncate max-w-16 mx-auto" title={role}>
                    {role.length > 12 ? role.split(' ').map(w => w[0]).join('') : role.split(' ')[0]}
                  </div>
                  <div className="text-gray-400 text-xs truncate max-w-16 mx-auto font-normal" title={role}>
                    {role.length > 12 ? role.split(' ').slice(1).join(' ') || '' : role.split(' ').slice(1).join(' ')}
                  </div>
                  <button onClick={() => setResetConfirm({ role })} title={`Reset "${role}" to defaults`}
                    className="mt-1 text-gray-300 hover:text-violet-500 text-sm transition-colors" style={{ lineHeight: 1 }}>↺</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((mod, mi) => (
              <tr key={mod.key} className={`border-b border-gray-50 ${mi % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-4 py-2.5 font-medium text-gray-700 sticky left-0 bg-inherit">{mod.label}</td>
                <td className="px-1 py-2.5 border-l border-gray-100">
                  <div className="flex gap-0.5 justify-center">
                    {PERM_ACTIONS.map(a => (
                      <span key={a.key} className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${a.color}`} title={a.title}>{a.label}</span>
                    ))}
                  </div>
                </td>
                {DISPLAY_ROLES.map(role => {
                  const cell = matrix[role]?.[mod.key] || {}
                  const savKey = `${role}_${mod.key}`
                  return (
                    <td key={role} className="px-1 py-2.5 border-l border-gray-100">
                      <div className="flex gap-0.5 justify-center">
                        {PERM_ACTIONS.map(a => (
                          <button key={a.key}
                            onClick={() => toggle(role, mod.key, a.key)}
                            disabled={!!saving[savKey]}
                            title={`${role} → ${mod.label}: ${a.title} = ${cell[a.key] ? 'ON' : 'OFF'}`}
                            className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold transition-all border ${
                              cell[a.key] ? `${a.color} border-current` : 'text-gray-200 border-gray-200 hover:text-gray-400 hover:border-gray-300'
                            } ${saving[savKey] ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                          >{a.label}</button>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Reset confirmation modal */}
    <ConfirmModal
      open={!!resetConfirm}
      title={`Reset "${resetConfirm?.role}" permissions?`}
      message="All permission changes for this role will be reverted to factory defaults. This cannot be undone."
      confirmLabel="Reset to defaults"
      danger
      onConfirm={() => doReset(resetConfirm?.role)}
      onCancel={() => setResetConfirm(null)}
    />
    </>
  )
}

/* ── Member Drawer ─────────────────────────────────────────────────────────── */
function MemberDrawer({ user, isAdmin, currentUser, roleMatrix, roleModules, onClose, onEdit, onDeactivate, onReactivate, onRemove }) {
  if (!user) return null
  const rc = ROLE_CFG[user.role] || ROLE_CFG['Client']
  const perms = buildRolePerms(user.role, roleMatrix, roleModules)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">

        {/* Coloured header */}
        <div className={`bg-gradient-to-r ${rc.color} p-5 flex items-start justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {user.name?.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">{user.name}</div>
              <div className="text-white/75 text-xs mt-0.5">{user.email}</div>
              {!user.is_active && (
                <span className="mt-1.5 inline-block text-xs bg-black/20 text-white/90 px-2 py-0.5 rounded-full">Inactive</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl transition-colors leading-none mt-0.5">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Role & Team badges */}
          <div className="flex flex-wrap gap-2">
            <span className={clsx('text-xs px-3 py-1.5 rounded-full border font-medium', rc.badge)}>
              {rc.icon} {user.role}
            </span>
            {user.team_name && (
              <span className="text-xs px-3 py-1.5 rounded-full border font-medium bg-slate-50 text-slate-600 border-slate-200">
                🧑‍🤝‍🧑 {user.team_name}
              </span>
            )}
          </div>

          {/* Info rows */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Status</span>
              <span className={clsx('font-medium', user.is_active ? 'text-emerald-600' : 'text-gray-400')}>
                {user.is_active ? '● Active' : '● Inactive'}
              </span>
            </div>
            {user.team_name && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Team</span>
                <span className="font-medium text-gray-700">{user.team_name}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Member since</span>
              <span className="font-medium text-gray-700">{fmtDate(user.created_at)}</span>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Permissions ({perms.length})
            </div>
            <div className="bg-violet-50 rounded-2xl p-3.5 space-y-1.5">
              {perms.length === 0
                ? <div className="text-xs text-gray-400 italic">No permissions configured for this role.</div>
                : perms.map(p => (
                  <div key={p} className="text-xs text-violet-700 flex items-start gap-1.5">
                    <span className="text-violet-400 flex-shrink-0 mt-0.5">✓</span>
                    <span>{p}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {isAdmin && (
          <div className="border-t border-gray-100 p-4 space-y-2 flex-shrink-0">
            <button onClick={() => { onEdit(user); onClose() }}
              className="btn text-xs w-full hover:text-violet-600 hover:border-violet-200 py-2">
              ✏️ Edit member
            </button>
            {user.id !== currentUser?.id && (
              <div className="flex gap-2">
                <button
                  onClick={() => { user.is_active ? onDeactivate(user) : onReactivate(user); onClose() }}
                  className={`btn text-xs flex-1 py-2 ${user.is_active ? 'hover:text-rose-600 hover:border-rose-200' : 'hover:text-green-600 hover:border-green-200'}`}>
                  {user.is_active ? '🚫 Deactivate' : '✅ Re-activate'}
                </button>
                <button
                  onClick={() => { onRemove(user); onClose() }}
                  className="btn text-xs flex-1 py-2 hover:text-red-600 hover:border-red-200 hover:bg-red-50">
                  🗑️ Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function GlobalTeam() {
  const navigate = useNavigate()
  const currentUser = useAppStore(s => s.user)
  const [users, setUsers]             = useState([])
  const [teams, setTeams]             = useState([])
  const [projects, setProjects]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [filterRole, setFilterRole]   = useState('')
  const [filterTeam, setFilterTeam]   = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editUser, setEditUser]       = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)   // drawer target
  const [form, setForm]               = useState({ name:'', email:'', role:'Functional Consultant', password:'wbs123', team_id:'' })
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState(null)
  const [search, setSearch]           = useState('')
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [teamForm, setTeamForm]       = useState({ name:'', description:'' })
  const [savingTeam, setSavingTeam]   = useState(false)
  const [customRoles, setCustomRoles] = useState([])
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [savingRole, setSavingRole]   = useState(false)
  const [removeTarget, setRemoveTarget]     = useState(null)
  const [removeImpact, setRemoveImpact]     = useState(null)
  const [removeLoading, setRemoveLoading]   = useState(false)
  const [removeConfirming, setRemoveConfirming] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const [activeTab, setActiveTab]     = useState('team')
  const [roleMatrix, setRoleMatrix]   = useState(null)
  const [roleModules, setRoleModules] = useState([])

  const allRoles = [...ROLES, ...customRoles.map(r => r.name).filter(n => !ROLES.includes(n))]

  const loadRolePerms = async () => {
    try {
      const r = await api.get('/role-permissions')
      setRoleModules(r.data.modules)
      setRoleMatrix(r.data.matrix)
    } catch(e) { console.error('role-permissions fetch:', e) }
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterRole)    params.append('role',       filterRole)
      if (filterTeam)    params.append('team_id',    filterTeam)
      if (filterProject) params.append('project_id', filterProject)

      // Merged into one Promise.all — no separate useEffect calls for custom-roles
      const [uRes, teamsData, projectsData, crRes] = await Promise.all([
        api.get(`/global/team?${params}`),
        getGlobalTeams(),
        getProjectsList(),
        api.get('/global/custom-roles').catch(() => ({ data: [] })),
      ])
      setUsers(uRes.data)
      setTeams(teamsData)
      setProjects(projectsData)
      setCustomRoles(crRes.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const _loadTimer = useRef(null)
  useEffect(() => {
    clearTimeout(_loadTimer.current)
    _loadTimer.current = setTimeout(load, 300)
    return () => clearTimeout(_loadTimer.current)
  }, [filterRole, filterTeam, filterProject])

  // Role permissions loaded lazily — only when the Role Access tab is first opened
  useEffect(() => {
    if (activeTab === 'access' && !roleMatrix) loadRolePerms()
  }, [activeTab])

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, team_id: form.team_id ? parseInt(form.team_id) : null }
      if (editUser) {
        await api.patch(`/global/team/${editUser.id}`, payload)
        showMsg(`${form.name || editUser.name} updated successfully!`)
      } else {
        await api.post('/global/team', payload)
        showMsg(`${form.name} created and added!`)
      }
      setShowModal(false); setEditUser(null)
      setForm({ name:'', email:'', role:'Functional Consultant', password:'wbs123', team_id:'' })
      invalidateMasterData(); load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const handleSaveTeam = async () => {
    if (!teamForm.name) return
    setSavingTeam(true)
    try {
      await api.post('/global/team/teams', teamForm)
      showMsg(`Team "${teamForm.name}" created!`)
      setShowTeamModal(false); setTeamForm({ name:'', description:'' })
      invalidateMasterData(); load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to create team', 'error') }
    finally { setSavingTeam(false) }
  }

  const handleDeactivate = (u) => {
    setConfirmState({
      title: `Deactivate ${u.name}?`,
      message: 'They will lose access to the system. You can re-activate them later via Edit.',
      confirmLabel: 'Deactivate',
      onConfirm: async () => {
        try {
          await api.delete(`/global/team/${u.id}`)
          showMsg(`${u.name} deactivated`); invalidateMasterData(); load()
        } catch(e) { showMsg(e.response?.data?.detail || 'Failed to deactivate', 'error') }
      }
    })
  }

  const handleReactivate = (u) => {
    setConfirmState({
      title: `Re-activate ${u.name}?`,
      message: 'They will regain access to the system.',
      confirmLabel: 'Re-activate',
      danger: false,
      onConfirm: async () => {
        try {
          await api.patch(`/global/team/${u.id}`, { is_active: true })
          showMsg(`${u.name} re-activated`); invalidateMasterData(); load()
        } catch(e) { showMsg(e.response?.data?.detail || 'Failed to re-activate', 'error') }
      }
    })
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, role: u.role, password: '', team_id: u.team_id ? String(u.team_id) : '' })
    setShowModal(true)
  }

  const handleShowRemove = async (u) => {
    setRemoveTarget(u); setRemoveImpact(null)
    setRemoveLoading(true); setRemoveConfirming(true)
    try {
      const res = await api.get(`/global/team/${u.id}/impact`)
      setRemoveImpact(res.data)
    } catch(e) {
      showMsg(e.response?.data?.detail || 'Failed to load impact data', 'error')
      setRemoveConfirming(false)
    } finally { setRemoveLoading(false) }
  }

  const handleConfirmRemove = async () => {
    if (!removeTarget) return
    setRemoveLoading(true)
    try {
      await api.delete(`/global/team/${removeTarget.id}/remove`)
      showMsg(`${removeTarget.name} has been permanently removed.`)
      setRemoveConfirming(false); setRemoveTarget(null); setRemoveImpact(null)
      invalidateMasterData(); load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to remove member', 'error') }
    finally { setRemoveLoading(false) }
  }

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  const stats = useMemo(() => ({
    total:    filtered.length,
    active:   filtered.filter(u => u.is_active).length,
    inactive: filtered.filter(u => !u.is_active).length,
    by_role: {
      'Functional Consultant': filtered.filter(u => u.role === 'Functional Consultant').length,
      'Technical Team':        filtered.filter(u => u.role === 'Technical Team').length,
    },
  }), [filtered])

  const isAdmin = isTeamManager(currentUser)

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-violet-600 text-sm transition-colors">🏠 Home</button>
            <span className="text-gray-200">/</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>👥</div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Team Hub</h1>
                <p className="text-xs text-gray-400">Create teams, manage members, and assign them across projects</p>
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button onClick={() => { setTeamForm({name:'',description:''}); setShowTeamModal(true) }} className="btn text-xs">
                🏷️ Manage teams
              </button>
              <button onClick={() => { setEditUser(null); setForm({name:'',email:'',role:'Functional Consultant',password:'wbs123',team_id:''}); setShowModal(true) }}
                className="btn btn-primary text-xs">
                ➕ Add team member
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5">

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 bg-white border border-gray-100 shadow-sm rounded-2xl p-1 mb-5 w-fit">
          {[
            { key: 'team',   icon: '👥', label: 'Team Members' },
            { key: 'access', icon: '🔐', label: 'Role Access', managerOnly: true },
          ].filter(t => !t.managerOnly || isAdmin).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === t.key ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Role Access Panel — matrix loaded lazily by parent, passed as props ── */}
        {activeTab === 'access' && (
          <RoleAccessPanel
            currentUser={currentUser}
            matrix={roleMatrix}
            modules={roleModules}
            setMatrix={setRoleMatrix}
            onPermissionChange={loadRolePerms}
          />
        )}

        {activeTab !== 'access' && (<>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mb-5">
            {[
              { icon:'👥', label:'Total Members', value:stats.total,    color:'from-violet-100 to-purple-100' },
              { icon:'✅', label:'Active',         value:stats.active,   color:'from-emerald-100 to-teal-100' },
              { icon:'⏸️', label:'Inactive',       value:stats.inactive, color:'from-slate-100 to-gray-100'  },
              { icon:'🧩', label:'Functional',     value:stats.by_role['Functional Consultant'], color:'from-blue-100 to-indigo-100' },
              { icon:'⚙️', label:'Technical',      value:stats.by_role['Technical Team'],        color:'from-amber-100 to-orange-100' },
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-3 text-center border border-white shadow-sm`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Simplified Filters ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input className="input pl-8 text-xs h-8 w-full" placeholder="Search by name or email…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {/* Team dropdown */}
              <select className="select text-xs h-8 min-w-36" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
                <option value="">🧑‍🤝‍🧑 All Teams</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {/* Role dropdown */}
              <select className="select text-xs h-8 min-w-36" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="">👥 All Roles</option>
                {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {/* Project dropdown */}
              <select className="select text-xs h-8 min-w-44" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                <option value="">🗂️ All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Toast message */}
          {msg && (
            <div className={clsx('mb-4 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2',
              msg.type==='error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')}>
              {msg.type==='error' ? '⚠️' : '✅'} {msg.text}
            </div>
          )}

          {/* ── Members Table ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="flex items-center gap-4 animate-pulse px-2 py-1.5">
                    <div className="w-9 h-9 bg-gray-200 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-36 bg-gray-200 rounded" />
                      <div className="h-3 w-52 bg-gray-100 rounded" />
                    </div>
                    <div className="h-5 w-20 bg-gray-100 rounded-full" />
                    <div className="h-5 w-20 bg-gray-100 rounded-full" />
                    <div className="h-4 w-14 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-sm font-medium text-gray-700 mb-1">No team members found</p>
                <p className="text-xs text-gray-400">Try changing filters or add a new member</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 w-10">#</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Team</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((u, idx) => {
                    const rc = ROLE_CFG[u.role] || ROLE_CFG['Client']
                    return (
                      <tr key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className="hover:bg-violet-50/40 cursor-pointer transition-colors group">
                        <td className="px-5 py-3.5 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${rc.color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm`}>
                              {u.name?.slice(0,2).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 group-hover:text-violet-700 transition-colors">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span className={clsx('text-xs px-2.5 py-1 rounded-full border font-medium', rc.badge)}>
                            {rc.icon} {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {u.team_name
                            ? <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">{u.team_name}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={clsx('text-xs font-medium', u.is_active ? 'text-emerald-600' : 'text-gray-400')}>
                            ● {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Row count */}
          {!loading && filtered.length > 0 && (
            <div className="mt-3 text-xs text-gray-400 text-right">
              Showing {filtered.length} of {users.length} member{users.length !== 1 ? 's' : ''}
            </div>
          )}

        </>)}
      </div>

      {/* ── Member Drawer ── */}
      {selectedUser && (
        <MemberDrawer
          user={selectedUser}
          isAdmin={isAdmin}
          currentUser={currentUser}
          roleMatrix={roleMatrix}
          roleModules={roleModules}
          onClose={() => setSelectedUser(null)}
          onEdit={openEdit}
          onDeactivate={handleDeactivate}
          onReactivate={handleReactivate}
          onRemove={handleShowRemove}
        />
      )}

      {/* ── Add / Edit Member Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">👥</span>
                <h2 className="text-sm font-semibold">{editUser ? 'Edit team member' : 'Add team member'}</h2>
              </div>
              <button onClick={() => { setShowModal(false); setEditUser(null) }} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full name <span className="text-rose-500">*</span></label>
                <input className="input text-sm" placeholder="e.g. Priya Krishnan" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email address <span className="text-rose-500">*</span></label>
                <input className="input text-sm" type="email" placeholder="priya@company.com" value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})} disabled={!!editUser} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Role <span className="text-rose-500">*</span></label>
                  <button type="button" onClick={() => { setNewRoleName(''); setShowRoleModal(true) }}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors">
                    <span className="text-base leading-none">＋</span> Custom role
                  </button>
                </div>
                <select className="select text-sm" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  {allRoles.map(r => <option key={r}>{r}</option>)}
                </select>
                {form.role && PERMISSIONS[form.role] && (
                  <div className="mt-2 bg-violet-50 rounded-xl p-2.5">
                    <div className="text-xs font-medium text-violet-700 mb-1">Permissions for {form.role}:</div>
                    {PERMISSIONS[form.role].map(p => (
                      <div key={p} className="text-xs text-violet-600 flex items-center gap-1"><span>✓</span> {p}</div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {editUser ? 'New password (leave blank to keep)' : <>Password <span className="text-rose-500">*</span></>}
                </label>
                <input className="input text-sm" type="text"
                  placeholder={editUser ? 'Leave blank to keep current' : 'Default: wbs123'}
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
                <select className="select text-sm" value={form.team_id} onChange={e => setForm({...form, team_id: e.target.value})}>
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {teams.length === 0 && <p className="text-xs text-gray-400 mt-1">No teams yet — use "Manage teams" to create one.</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button className="btn text-xs" onClick={() => { setShowModal(false); setEditUser(null) }}>Cancel</button>
              <button className="btn btn-primary text-xs" onClick={handleSave}
                disabled={!form.name || (!editUser && !form.email) || saving}>
                {saving ? <><span className="animate-spin">⟳</span> Saving…</> : editUser ? '✏️ Update' : '➕ Add member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Custom Role Modal ── */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-up p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">➕ Create Custom Role</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <input className="input text-sm w-full mb-3" placeholder="Role name (e.g. Project Manager)"
              value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateRole()} autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRoleModal(false)} className="btn text-xs">Cancel</button>
              <button onClick={handleCreateRole} disabled={!newRoleName.trim() || savingRole} className="btn btn-primary text-xs">
                {savingRole ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Member Confirmation Modal ── */}
      {removeConfirming && removeTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between p-5 border-b border-red-100 bg-red-50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-xl">🗑️</div>
                <div>
                  <h2 className="text-sm font-bold text-red-800">Permanently Remove Member</h2>
                  <p className="text-xs text-red-500">This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => { setRemoveConfirming(false); setRemoveTarget(null); setRemoveImpact(null) }}
                className="text-red-300 hover:text-red-500 text-xl font-light">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ROLE_CFG[removeTarget.role]?.color || 'from-gray-400 to-gray-600'} flex items-center justify-center text-white font-bold text-sm shadow`}>
                  {removeTarget.name?.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{removeTarget.name}</div>
                  <div className="text-xs text-gray-400">{removeTarget.email}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{removeTarget.role}</div>
                </div>
              </div>
              {removeLoading ? (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <span className="animate-spin text-2xl mr-2">⟳</span>
                  <span className="text-sm">Checking dependencies…</span>
                </div>
              ) : removeImpact ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Impact Summary</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label:'Projects', value:removeImpact.project_count, warn:removeImpact.project_count > 0, color:'orange' },
                      { label:'Assignments', value:removeImpact.total_assignments, warn:removeImpact.total_assignments > 0, color:'rose' },
                      { label:'Work Hours', value:removeImpact.work_hours_entries, warn:removeImpact.work_hours_entries > 0, color:'amber' },
                    ].map(s => (
                      <div key={s.label} className={clsx('rounded-xl p-2.5 text-center', s.warn ? `bg-${s.color}-50 border border-${s.color}-100` : 'bg-gray-50')}>
                        <div className={clsx('text-lg font-bold', s.warn ? `text-${s.color}-600` : 'text-gray-400')}>{s.value}</div>
                        <div className="text-xs text-gray-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {removeImpact.project_names?.length > 0 && (
                    <div className="bg-orange-50 rounded-xl p-3">
                      <div className="text-xs font-medium text-orange-700 mb-1.5">Affected Projects:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {removeImpact.project_names.map(pn => (
                          <span key={pn} className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full">{pn}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {removeImpact.open_assignments > 0 && (
                    <div className="bg-rose-50 rounded-xl p-3 flex items-start gap-2">
                      <span className="text-rose-500 text-sm mt-0.5">⚠️</span>
                      <div className="text-xs text-rose-700">
                        <span className="font-medium">{removeImpact.open_assignments} open assignment{removeImpact.open_assignments !== 1 ? 's' : ''}</span> will be permanently deleted. Tasks will remain but become unassigned.
                      </div>
                    </div>
                  )}
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                    <span className="text-red-500 text-sm mt-0.5">🚨</span>
                    <div className="text-xs text-red-700">
                      <span className="font-bold">This is permanent.</span> All data will be <span className="font-medium">irreversibly deleted</span>. Audit history will be preserved but anonymized.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => { setRemoveConfirming(false); setRemoveTarget(null); setRemoveImpact(null) }} className="btn text-xs">Cancel</button>
              <button onClick={handleConfirmRemove} disabled={removeLoading || !removeImpact}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all">
                {removeLoading ? <><span className="animate-spin">⟳</span> Removing…</> : <>🗑️ Permanently Remove</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Teams Modal ── */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>👥</div>
                <h2 className="text-sm font-semibold text-gray-900">Create New Team</h2>
              </div>
              <button onClick={() => setShowTeamModal(false)} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team Name <span className="text-rose-500">*</span></label>
                <input className="input text-sm" placeholder="e.g. Backend Dev Team"
                  value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea className="textarea text-sm" rows={2} placeholder="What does this team work on?"
                  value={teamForm.description} onChange={e => setTeamForm({...teamForm, description: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button className="btn text-xs" onClick={() => setShowTeamModal(false)}>Cancel</button>
              <button className="btn btn-primary text-xs" onClick={handleSaveTeam} disabled={!teamForm.name || savingTeam}>
                {savingTeam ? 'Creating...' : '👥 Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shared Confirm Modal ── */}
      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        danger={confirmState?.danger !== false}
        onConfirm={() => { confirmState?.onConfirm(); setConfirmState(null) }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}
