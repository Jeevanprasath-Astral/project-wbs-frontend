import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmtDate } from '../../utils/helpers'
import api from '../../utils/api'
import { getProjectsList, getGlobalTeams, invalidateMasterData } from '../../utils/masterData'
import clsx from 'clsx'
import { useAppStore } from '../../store'
import { ALL_ROLES, isTeamManager } from '../../utils/permissions'

const ROLES = ALL_ROLES
const ROLE_CFG = {
  'Admin':                 { color:'from-violet-500 to-purple-600', badge:'bg-violet-50 text-violet-700 border-violet-100', icon:'👑' },
  'FC Lead':               { color:'from-indigo-500 to-blue-600',  badge:'bg-indigo-50 text-indigo-700 border-indigo-100', icon:'🧭' },
  'TC Lead':               { color:'from-teal-500 to-cyan-600',    badge:'bg-teal-50 text-teal-700 border-teal-100',     icon:'🛠️' },
  'Functional Consultant': { color:'from-blue-500 to-indigo-600',  badge:'bg-blue-50 text-blue-700 border-blue-100',   icon:'🧩' },
  'Technical Team':        { color:'from-emerald-500 to-teal-600', badge:'bg-emerald-50 text-emerald-700 border-emerald-100', icon:'⚙️' },
  'HR':                    { color:'from-pink-500 to-rose-600',    badge:'bg-pink-50 text-pink-700 border-pink-100',     icon:'🎓' },
  'Client':                { color:'from-amber-500 to-orange-600', badge:'bg-amber-50 text-amber-700 border-amber-100', icon:'🏢' },
}
const PERMISSIONS = {
  'Admin':                 ['All system access','User management','Project management','Task assignment','Milestone management','Reports & exports'],
  'FC Lead':                ['All-module access (like Admin)','Assign & delete tasks','Manage Cost Management','Set timelines','View reports'],
  'TC Lead':                ['All-module access (like Admin)','Assign & delete tasks','Manage Cost Management','Set timelines','View reports'],
  'Functional Consultant': ['Create requirements','Manage milestones','Assign tasks','Set timelines','View reports'],
  'Technical Team':        ['Manage dev tasks','Update task status','View reports'],
  'HR':                    ['Create/edit/remove teams & users','Manage holidays','Approve leave & permissions','View reports'],
  'Client':                ['View dashboard','View reports','Milestone sign-off'],
}

export default function GlobalTeam() {
  const navigate = useNavigate()
  const currentUser = useAppStore(s => s.user)
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [showPerms, setShowPerms] = useState(null)
  const [form, setForm] = useState({ name:'', email:'', role:'Functional Consultant', password:'wbs123', team_id:'' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [search, setSearch] = useState('')
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [teamForm, setTeamForm] = useState({ name:'', description:'' })
  const [savingTeam, setSavingTeam] = useState(false)
  const [customRoles, setCustomRoles] = useState([])
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  // Combined role list: built-in ALL_ROLES + any custom roles from DB
  const allRoles = [...ROLES, ...customRoles.map(r => r.name).filter(n => !ROLES.includes(n))]

  const loadCustomRoles = async () => {
    try {
      const r = await api.get('/global/custom-roles')
      setCustomRoles(r.data)
    } catch(e) { console.error(e) }
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterRole) params.append('role', filterRole)
      if (filterStatus === 'active') params.append('is_active', 'true')
      if (filterStatus === 'inactive') params.append('is_active', 'false')
      if (filterTeam) params.append('team_id', filterTeam)
      if (filterProject) params.append('project_id', filterProject)
      const [uRes, teamsData, projectsData] = await Promise.all([
        api.get(`/global/team?${params}`),
        getGlobalTeams(),
        getProjectsList(),
      ])
      setUsers(uRes.data)
      setTeams(teamsData)
      setProjects(projectsData)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleCreateRole = async () => {
    const name = newRoleName.trim()
    if (!name) return
    setSavingRole(true)
    try {
      await api.post('/global/custom-roles', { name })
      setNewRoleName('')
      setShowRoleModal(false)
      showMsg(`Role "${name}" created!`)
      await loadCustomRoles()
      setForm(f => ({...f, role: name}))
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to create role', 'error') }
    finally { setSavingRole(false) }
  }

  useEffect(() => { load() }, [filterRole, filterStatus, filterTeam, filterProject])
  useEffect(() => { loadCustomRoles() }, [])

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        team_id: form.team_id ? parseInt(form.team_id) : null,
      }
      if (editUser) {
        await api.patch(`/global/team/${editUser.id}`, payload)
        showMsg(`${form.name || editUser.name} updated successfully!`)
      } else {
        await api.post('/global/team', payload)
        showMsg(`${form.name} created and added!`)
      }
      setShowModal(false)
      setEditUser(null)
      setForm({ name:'', email:'', role:'Functional Consultant', password:'wbs123', team_id:'' })
      invalidateMasterData() // users-list cache is now stale
      load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  const handleSaveTeam = async () => {
    if (!teamForm.name) return
    setSavingTeam(true)
    try {
      await api.post('/global/team/teams', teamForm)
      showMsg(`Team "${teamForm.name}" created!`)
      setShowTeamModal(false)
      setTeamForm({ name:'', description:'' })
      invalidateMasterData() // team-teams cache is now stale
      load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to create team', 'error') }
    finally { setSavingTeam(false) }
  }

  const handleDeactivate = async (u) => {
    if (!window.confirm(`Deactivate ${u.name}? They will lose access to the system.`)) return
    try {
      await api.delete(`/global/team/${u.id}`)
      showMsg(`${u.name} deactivated`)
      invalidateMasterData() // users-list cache is now stale
      load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed', 'error') }
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, role: u.role, password: '', team_id: u.team_id ? String(u.team_id) : '' })
    setShowModal(true)
  }

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  // Stats cards are derived from `filtered` — i.e. exactly the set of members
  // shown in the grid below, including the search box on top of the
  // server-side role/status/team/project filters. Previously these came from
  // a separate, unfiltered /global/team/stats call, so the cards never
  // reflected the active filters even though the member grid did.
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
      {/* Header */}
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
              <button onClick={() => { setTeamForm({name:'',description:''}); setShowTeamModal(true) }}
                className="btn text-xs">
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

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-3 mb-5 stagger">
            {[
              {icon:'👥', label:'Total Members', value:stats.total, color:'from-violet-100 to-purple-100'},
              {icon:'✅', label:'Active', value:stats.active, color:'from-emerald-100 to-teal-100'},
              {icon:'⏸️', label:'Inactive', value:stats.inactive, color:'from-slate-100 to-gray-100'},
              {icon:'🧩', label:'Functional', value:stats.by_role['Functional Consultant'], color:'from-blue-100 to-indigo-100'},
              {icon:'⚙️', label:'Technical', value:stats.by_role['Technical Team'], color:'from-amber-100 to-orange-100'},
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-3 text-center border border-white shadow-sm animate-fade-up`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input className="input pl-8 text-xs h-8 w-full" placeholder="Search by name or email..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
              {['all',...ROLES].map(r => (
                <button key={r} onClick={() => setFilterRole(r === 'all' ? '' : r)}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    (r === 'all' ? !filterRole : filterRole === r) ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
                  {r === 'all' ? '👥 All' : ROLE_CFG[r]?.icon + ' ' + r.split(' ')[0]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
              {[{k:'',l:'All'},{k:'active',l:'✅ Active'},{k:'inactive',l:'⏸️ Inactive'}].map(s => (
                <button key={s.k} onClick={() => setFilterStatus(s.k)}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filterStatus === s.k ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
                  {s.l}
                </button>
              ))}
            </div>
            {teams.length > 0 && (
              <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 flex-wrap">
                <button onClick={() => setFilterTeam('')}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    !filterTeam ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
                  🧑‍🤝‍🧑 All teams
                </button>
                {teams.map(t => (
                  <button key={t.id} onClick={() => setFilterTeam(String(t.id))}
                    className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      filterTeam === String(t.id) ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
                    {t.name} ({t.member_count})
                  </button>
                ))}
              </div>
            )}
            <select className="select text-xs h-8 min-w-40" value={filterProject}
              onChange={e => setFilterProject(e.target.value)}>
              <option value="">🗂️ All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div className={clsx('mb-4 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 animate-fade-up',
            msg.type==='error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')}>
            {msg.type==='error'?'⚠️':'✅'} {msg.text}
          </div>
        )}

        {/* Team grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                  <div className="flex-1"><div className="h-4 w-32 bg-gray-200 rounded mb-1" /><div className="h-3 w-24 bg-gray-100 rounded" /></div>
                </div>
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
          <div className="grid grid-cols-3 gap-4 stagger">
            {filtered.map(u => {
              const rc = ROLE_CFG[u.role] || ROLE_CFG['Client']
              return (
                <div key={u.id} className={clsx('bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all duration-200 animate-fade-up',
                  u.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60')}>

                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${rc.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg`}>
                        {u.name?.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{u.name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                    {!u.is_active && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactive</span>}
                  </div>

                  {/* Role badge */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={clsx('text-xs px-2.5 py-1 rounded-full border font-medium', rc.badge)}>
                      {rc.icon} {u.role}
                    </span>
                    {u.team_name && (
                      <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-slate-50 text-slate-600 border-slate-200">
                        🧑‍🤝‍🧑 {u.team_name}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      {label:'Projects', value:u.project_count},
                      {label:'Tasks', value:u.task_count},
                      {label:'Done', value:`${u.completion_rate}%`},
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
                        <div className="text-sm font-bold text-gray-900">{s.value}</div>
                        <div className="text-xs text-gray-400">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Permissions preview */}
                  <button onClick={() => setShowPerms(showPerms === u.id ? null : u.id)}
                    className="w-full text-left text-xs text-violet-600 hover:text-violet-800 mb-2 font-medium">
                    {showPerms === u.id ? '▲ Hide' : '▼ View'} permissions ({PERMISSIONS[u.role]?.length || 0})
                  </button>
                  {showPerms === u.id && (
                    <div className="bg-violet-50 rounded-xl p-2.5 mb-3">
                      {PERMISSIONS[u.role]?.map(p => (
                        <div key={p} className="text-xs text-violet-700 flex items-center gap-1.5 mb-1">
                          <span className="text-violet-400">✓</span> {p}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(u)}
                        className="btn text-xs flex-1 hover:text-violet-600 hover:border-violet-200 py-1.5">
                        ✏️ Edit
                      </button>
                      {u.is_active && u.id !== currentUser?.id && (
                        <button onClick={() => handleDeactivate(u)}
                          className="btn text-xs hover:text-rose-600 hover:border-rose-200 py-1.5 px-2.5">
                          🚫
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">👥</span>
                <h2 className="text-sm font-semibold">{editUser ? 'Edit team member' : 'Add team member'}</h2>
              </div>
              <button onClick={() => { setShowModal(false); setEditUser(null) }} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
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
                {form.role && (
                  <div className="mt-2 bg-violet-50 rounded-xl p-2.5">
                    <div className="text-xs font-medium text-violet-700 mb-1">Permissions for {form.role}:</div>
                    {PERMISSIONS[form.role]?.map(p => (
                      <div key={p} className="text-xs text-violet-600 flex items-center gap-1">
                        <span>✓</span> {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{editUser ? 'New password (leave blank to keep)' : <>Password <span className="text-rose-500">*</span></>}</label>
                <input className="input text-sm" type="text" placeholder={editUser ? 'Leave blank to keep current' : 'Default: wbs123'} value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
                <select className="select text-sm" value={form.team_id} onChange={e => setForm({...form, team_id: e.target.value})}>
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {teams.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No teams yet — use "Manage teams" to create one.</p>
                )}
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

      {/* Create Custom Role modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-up p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">➕ Create Custom Role</h3>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <input
              className="input text-sm w-full mb-3"
              placeholder="Role name (e.g. Project Manager)"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateRole()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRoleModal(false)} className="btn text-xs">Cancel</button>
              <button onClick={handleCreateRole} disabled={!newRoleName.trim() || savingRole}
                className="btn btn-primary text-xs">
                {savingRole ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Teams modal */}
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
              <button className="btn btn-primary text-xs" onClick={handleSaveTeam}
                disabled={!teamForm.name || savingTeam}>
                {savingTeam ? 'Creating...' : '👥 Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
