import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import { getProjectsList, getUsersList, getProjectCustomMilestones } from '../../utils/masterData'
import { fmtHours } from '../../utils/helpers'
import clsx from 'clsx'
import { useAppStore } from '../../store'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  PieChart, Pie,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area,
  Treemap,
} from 'recharts'

const today = () => new Date().toISOString().split('T')[0]
const thisMonth = () => today().slice(0,7)

export default function TimesheetCalendarPage() {
  const navigate = useNavigate()
  const currentUser = useAppStore(s => s.user)
  const [month, setMonth] = useState(thisMonth())
  const [userId, setUserId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [sort, setSort] = useState('')
  const [calendar, setCalendar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])

  const [holidays, setHolidays] = useState([])
  const [leaves, setLeaves] = useState([])
  const [permissions, setPermissions] = useState([])
  const [tab, setTab] = useState('calendar') // calendar | holidays | leaves | permissions
  const [msg, setMsg] = useState(null)

  const [newHoliday, setNewHoliday] = useState({ date: today(), name: '' })
  const [newLeave, setNewLeave] = useState({ date_from: today(), date_to: today(), leave_type: 'Casual', reason: '' })
  const [newPermission, setNewPermission] = useState({ date: today(), hours: '', reason: '' })

  // Manual worked-hours entry for the Calendar tab — previously there was no
  // way to create/edit/update a timesheet entry from this page at all, since
  // "Worked" was purely a read-only rollup of WorkHours rows logged elsewhere.
  // This reuses the existing /work-hours endpoints rather than a new model.
  const [entryDay, setEntryDay] = useState(null)        // date string, or null when closed
  const [dayEntries, setDayEntries] = useState([])
  const [loadingDay, setLoadingDay] = useState(false)
  const [newEntry, setNewEntry] = useState({ project_id:'', task_name:'', hours_spent:'', buffer_hours:'', work_type:'Billable', notes:'',
    custom_milestone_id:'', custom_task_id:'', custom_subtask_id:'', activity_id:'' })
  const [savingEntry, setSavingEntry] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState(null)
  const [editHours, setEditHours] = useState('')
  const [editWorkType, setEditWorkType] = useState('Billable')
  // Cascading Milestone → Task → Subtask → Activity dropdowns inside the Log modal
  const [logMilestones, setLogMilestones] = useState([])
  const [logMilestonesLoading, setLogMilestonesLoading] = useState(false)
  const [logMilestonesError, setLogMilestonesError] = useState(false)
  const pickLogLevel = (k, v) => setNewEntry(f => {
    const n = {...f, [k]: v}
    if (k === 'custom_milestone_id') { n.custom_task_id=''; n.custom_subtask_id=''; n.activity_id='' }
    if (k === 'custom_task_id')      { n.custom_subtask_id=''; n.activity_id='' }
    if (k === 'custom_subtask_id')   { n.activity_id='' }
    return n
  })

  // Default the Employee filter to "myself" on first load so a normal
  // (non-Admin) user immediately sees and can manage their own timesheet,
  // without affecting an Admin/FC who deliberately picks a different
  // employee or clears it back to "All employees" afterwards.
  useEffect(() => {
    if (currentUser && !userId) setUserId(String(currentUser.id))
  }, [currentUser])

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000) }

  // Reload milestone tree whenever the project changes inside the Log modal.
  // Direct API call (not cached) so we always pick up freshly-added milestones.
  useEffect(() => {
    if (!newEntry.project_id) { setLogMilestones([]); setLogMilestonesError(false); return }
    setLogMilestonesLoading(true)
    setLogMilestonesError(false)
    api.get(`/projects/${newEntry.project_id}/custom-milestones`)
      .then(r => { setLogMilestones(Array.isArray(r.data) ? r.data : []); setLogMilestonesError(false) })
      .catch(err => { console.error('Milestone load failed:', err); setLogMilestones([]); setLogMilestonesError(true) })
      .finally(() => setLogMilestonesLoading(false))
  }, [newEntry.project_id])

  const openDayEntry = async (date) => {
    if (!userId) { showMsg('Select an employee first to add or edit timesheet entries.', 'error'); return }
    setEntryDay(date)
    setNewEntry({ project_id: projectId || '', task_name: '', hours_spent: '', buffer_hours: '', work_type: 'Billable', notes: '',
      custom_milestone_id:'', custom_task_id:'', custom_subtask_id:'', activity_id:'' })
    setEditingEntryId(null)
    setLoadingDay(true)
    try {
      const r = await api.get(`/work-hours?user_id=${userId}&date_from=${date}&date_to=${date}`)
      setDayEntries(r.data)
    } catch(e) { console.error(e) }
    finally { setLoadingDay(false) }
  }
  const closeDayEntry = () => { setEntryDay(null); setDayEntries([]); setEditingEntryId(null) }

  const refreshDayEntry = async () => {
    const r = await api.get(`/work-hours?user_id=${userId}&date_from=${entryDay}&date_to=${entryDay}`)
    setDayEntries(r.data)
    load() // also refresh the calendar summary/Worked column
  }

  const WORK_TYPES = ['Billable', 'Non-Billable', 'No Work', 'Training', 'R&D']
  const workTypeBadge = (wt) => {
    const map = {
      'Billable':     'bg-emerald-50 text-emerald-600',
      'Non-Billable': 'bg-gray-100 text-gray-500',
      'No Work':      'bg-slate-100 text-slate-500',
      'Training':     'bg-blue-50 text-blue-600',
      'R&D':          'bg-violet-50 text-violet-600',
    }
    return map[wt] || 'bg-gray-100 text-gray-500'
  }

  const addDayEntry = async () => {
    if (!newEntry.hours_spent) { showMsg('Enter hours worked.', 'error'); return }
    setSavingEntry(true)
    const level = newEntry.activity_id ? 'Activity'
                : newEntry.custom_subtask_id ? 'Subtask'
                : newEntry.custom_task_id ? 'Task'
                : newEntry.custom_milestone_id ? 'Milestone' : null
    try {
      await api.post('/work-hours', {
        date: entryDay,
        user_id: parseInt(userId),
        project_id: newEntry.project_id ? parseInt(newEntry.project_id) : null,
        task_name: newEntry.task_name || 'Manual entry',
        hours_spent: parseFloat(newEntry.hours_spent),
        buffer_hours: newEntry.buffer_hours ? parseFloat(newEntry.buffer_hours) : 0,
        work_type: newEntry.work_type,
        is_billable: newEntry.work_type === 'Billable',
        notes: newEntry.notes || null,
        level,
        custom_milestone_id: newEntry.custom_milestone_id ? parseInt(newEntry.custom_milestone_id) : null,
        custom_task_id:      newEntry.custom_task_id      ? parseInt(newEntry.custom_task_id)      : null,
        custom_subtask_id:   newEntry.custom_subtask_id   ? parseInt(newEntry.custom_subtask_id)   : null,
        activity_id:         newEntry.activity_id         ? parseInt(newEntry.activity_id)         : null,
      })
      setNewEntry({ project_id: projectId || '', task_name: '', hours_spent: '', buffer_hours: '', work_type: 'Billable', notes: '',
        custom_milestone_id:'', custom_task_id:'', custom_subtask_id:'', activity_id:'' })
      showMsg('Timesheet entry added ✅')
      refreshDayEntry()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to add entry', 'error') }
    finally { setSavingEntry(false) }
  }

  const saveEditHours = async (id) => {
    if (!editHours) return
    try {
      await api.patch(`/work-hours/${id}`, {
        hours_spent: parseFloat(editHours),
        work_type: editWorkType,
        is_billable: editWorkType === 'Billable',
      })
      setEditingEntryId(null)
      showMsg('Entry updated ✅')
      refreshDayEntry()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to update entry', 'error') }
  }

  const deleteDayEntry = async (id) => {
    try {
      await api.delete(`/work-hours/${id}`)
      showMsg('Entry deleted')
      refreshDayEntry()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed to delete entry', 'error') }
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month })
      if (userId) params.append('user_id', userId)
      if (projectId) params.append('project_id', projectId)
      if (sort) params.append('sort', sort)
      const [cRes, usersData, projectsData, hRes, lRes, prRes] = await Promise.all([
        api.get(`/timesheet/calendar?${params}`),
        getUsersList(),
        getProjectsList(),
        api.get(`/timesheet/holidays${projectId ? `?project_id=${projectId}` : ''}`),
        api.get(`/timesheet/leaves${userId ? `?user_id=${userId}` : ''}`),
        api.get(`/timesheet/permissions${userId ? `?user_id=${userId}` : ''}`),
      ])
      setCalendar(cRes.data)
      setUsers(usersData)
      setProjects(projectsData)
      setHolidays(hRes.data)
      setLeaves(lRes.data)
      setPermissions(prRes.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month, userId, projectId, sort])

  const addHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) return
    try {
      await api.post('/timesheet/holidays', { ...newHoliday, project_id: projectId ? parseInt(projectId) : null })
      setNewHoliday({ date: today(), name: '' })
      showMsg('Holiday added 🏖️')
      load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed', 'error') }
  }
  const deleteHoliday = async (id) => { await api.delete(`/timesheet/holidays/${id}`); load() }

  const addLeave = async () => {
    if (!newLeave.date_from || !newLeave.date_to) return
    try {
      await api.post('/timesheet/leaves', { ...newLeave, user_id: userId ? parseInt(userId) : null })
      setNewLeave({ date_from: today(), date_to: today(), leave_type: 'Casual', reason: '' })
      showMsg('Leave request submitted 📝')
      load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed', 'error') }
  }
  const updateLeaveStatus = async (id, status) => { await api.patch(`/timesheet/leaves/${id}`, { status }); load() }
  const deleteLeave = async (id) => { await api.delete(`/timesheet/leaves/${id}`); load() }

  const addPermission = async () => {
    if (!newPermission.date || !newPermission.hours) return
    try {
      await api.post('/timesheet/permissions', { ...newPermission, hours: parseFloat(newPermission.hours), user_id: userId ? parseInt(userId) : null })
      setNewPermission({ date: today(), hours: '', reason: '' })
      showMsg('Permission requested ✅')
      load()
    } catch(e) { showMsg(e.response?.data?.detail || 'Failed', 'error') }
  }
  const updatePermissionStatus = async (id, status) => { await api.patch(`/timesheet/permissions/${id}`, { status }); load() }
  const deletePermission = async (id) => { await api.delete(`/timesheet/permissions/${id}`); load() }

  // ── Report exports ──────────────────────────────────────────────────────
  // Scoped to this tab only (the Month filter above keeps driving the other
  // 4 tabs unchanged). Each report has its own fixed field set — every field
  // gets its own dropdown (its name, or "None" to drop it); fields never
  // swap into another field's slot. Each report also owns its own
  // Start Date / End Date range, independent of the other reports.
  const REPORTS = [
    { key: 'individual-time', fieldsKey: 'individual_time', icon: '🧾', name: 'Individual Time Report' },
    { key: 'leave', fieldsKey: 'leave', icon: '🌴', name: 'Leave Report (approved only)' },
    { key: 'overtime', fieldsKey: 'overtime', icon: '⏰', name: 'Overtime Report (>7h/day worked)' },
    { key: 'holiday', fieldsKey: 'holiday', icon: '🏖️', name: 'Holiday Report' },
    { key: 'permission', fieldsKey: 'permission', icon: '✅', name: 'Permission Report (approved only)' },
  ]
  const REPORT_FIELDS = {
    individual_time: [['start_date','Start Date'], ['end_date','End Date'], ['project','Project'], ['billable','Billable / Non-Billable'], ['hours','Number of Hours']],
    leave: [['employee','Employee Name'], ['leave_reason','Leave Reason'], ['start_date','Start Date'], ['end_date','End Date']],
    overtime: [['employee','Employee Name'], ['start_date','Start Date'], ['end_date','End Date'], ['hours_worked','Hours Worked'], ['overtime_hours','Overtime Hours']],
    holiday: [['start_date','Start Date'], ['end_date','End Date'], ['holiday_name','Holiday Name']],
    permission: [['employee','Employee Name'], ['start_date','Start Date'], ['end_date','End Date'], ['hours','Hours'], ['permission_reason','Permission Reason']],
  }
  // Each field owns one dropdown: value is either its own key (included) or
  // "none" (excluded). A field can never be reassigned to a different field.
  const [reportFieldsOn, setReportFieldsOn] = useState(() =>
    Object.fromEntries(Object.entries(REPORT_FIELDS).map(([k, fields]) => [k, Object.fromEntries(fields.map(([fk]) => [fk, true]))]))
  )
  const toggleReportField = (fieldsKey, fieldKey, value) => {
    setReportFieldsOn(prev => ({ ...prev, [fieldsKey]: { ...prev[fieldsKey], [fieldKey]: value !== 'none' } }))
  }

  const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }
  // Each report has its own independent Start Date / End Date range.
  const [reportRanges, setReportRanges] = useState(() =>
    Object.fromEntries(REPORTS.map(r => [r.key, { start: monthStart(), end: today() }]))
  )
  const setReportRange = (key, field, value) =>
    setReportRanges(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))

  // Per-report data filters — each report has its own independent filter values
  // (employee, project, holiday name). These are separate from the global
  // Employee/Project filters at the top of the page (which drive the Calendar tab).
  const [reportFilters, setReportFilters] = useState({
    'individual-time': { user_id: '', project_id: '', work_type: '' },
    'leave':           { user_id: '' },
    'overtime':        { user_id: '' },
    'holiday':         { holiday_name: '' },
    'permission':      { user_id: '' },
  })
  const setReportFilter = (reportKey, filterKey, value) =>
    setReportFilters(prev => ({ ...prev, [reportKey]: { ...prev[reportKey], [filterKey]: value } }))

  const [downloadingReport, setDownloadingReport] = useState(null)

  // ── Hours Tracker tab state ─────────────────────────────────────────────
  const [trackerFilters, setTrackerFilters] = useState({ user_id: '', project_id: '', start_date: monthStart(), end_date: today() })
  const [trackerData, setTrackerData] = useState(null)
  const [trackerLoading, setTrackerLoading] = useState(false)
  const [trackerView, setTrackerView] = useState('individual')
  const [trackerExporting, setTrackerExporting] = useState(false)
  const [trackerDailyData, setTrackerDailyData] = useState(null)
  const [trackerDailyLoading, setTrackerDailyLoading] = useState(false)
  const downloadReport = async (r) => {
    const cols = REPORT_FIELDS[r.fieldsKey].map(([fk]) => fk)
    const { start, end } = reportRanges[r.key]
    if (!start || !end) { showMsg('Pick a start and end date for this report.', 'error'); return }
    setDownloadingReport(r.key)
    try {
      const rf = reportFilters[r.key] || {}
      const params = new URLSearchParams({ start_date: start, end_date: end, columns: cols.join(',') })
      if (rf.user_id)       params.append('user_id',      rf.user_id)
      if (rf.project_id)    params.append('project_id',   rf.project_id)
      if (rf.holiday_name)  params.append('holiday_name', rf.holiday_name)
      if (rf.work_type)     params.append('work_type',    rf.work_type)
      const res = await api.get(`/timesheet/reports/${r.key}?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `${r.key}-report.xlsx`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      showMsg(`${r.name} downloaded ✅`)
    } catch(e) { showMsg(e.response?.data?.detail || `Failed to generate ${r.name}`, 'error') }
    finally { setDownloadingReport(null) }
  }

  const loadTracker = async () => {
    setTrackerLoading(true)
    try {
      const params = new URLSearchParams()
      if (trackerFilters.user_id)    params.append('user_id',    trackerFilters.user_id)
      if (trackerFilters.project_id) params.append('project_id', trackerFilters.project_id)
      if (trackerFilters.start_date) params.append('start_date', trackerFilters.start_date)
      if (trackerFilters.end_date)   params.append('end_date',   trackerFilters.end_date)
      const res = await api.get(`/hours-tracker/summary?${params}`)
      setTrackerData(res.data)
    } catch(e) { console.error(e) }
    finally { setTrackerLoading(false) }
  }

  const loadTrackerDaily = async () => {
    setTrackerDailyLoading(true)
    try {
      const params = new URLSearchParams()
      if (trackerFilters.user_id)    params.append('user_id',    trackerFilters.user_id)
      if (trackerFilters.project_id) params.append('project_id', trackerFilters.project_id)
      if (trackerFilters.start_date) params.append('start_date', trackerFilters.start_date)
      if (trackerFilters.end_date)   params.append('end_date',   trackerFilters.end_date)
      const res = await api.get(`/hours-tracker/daily?${params}`)
      setTrackerDailyData(res.data)
    } catch(e) { console.error(e) }
    finally { setTrackerDailyLoading(false) }
  }

  const exportTracker = async () => {
    setTrackerExporting(true)
    try {
      const params = new URLSearchParams()
      if (trackerFilters.user_id)    params.append('user_id',    trackerFilters.user_id)
      if (trackerFilters.project_id) params.append('project_id', trackerFilters.project_id)
      if (trackerFilters.start_date) params.append('start_date', trackerFilters.start_date)
      if (trackerFilters.end_date)   params.append('end_date',   trackerFilters.end_date)
      const res = await api.get(`/hours-tracker/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'hours-tracker.xlsx'
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      showMsg('Hours Tracker exported ✅')
    } catch(e) { showMsg(e.response?.data?.detail || 'Export failed', 'error') }
    finally { setTrackerExporting(false) }
  }

  // Auto-reload tracker when tab becomes active or filters change
  useEffect(() => {
    if (tab === 'tracker') { loadTracker(); loadTrackerDaily() }
  }, [tab, trackerFilters.user_id, trackerFilters.project_id, trackerFilters.start_date, trackerFilters.end_date])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-violet-600 text-sm transition-colors">🏠 Home</button>
            <span className="text-gray-200">/</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>🗓️</div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Timesheet Calendar</h1>
                <p className="text-xs text-gray-400">Holidays, leave, permissions & the 7h/day minimum — hours logged anywhere auto-populate here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-5">

        {msg && (
          <div className={clsx('mb-4 px-4 py-2.5 rounded-xl text-sm animate-fade-up',
            msg.type==='error'?'bg-rose-50 text-rose-600':'bg-emerald-50 text-emerald-700')}>
            {msg.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">📅 Month</label>
              <input type="month" className="input text-xs h-8" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">👤 Employee</label>
              <select className="select text-xs h-8" value={userId} onChange={e => setUserId(e.target.value)}>
                <option value="">All employees</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">🏢 Project</label>
              <select className="select text-xs h-8" value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">↕️ Sort by hours</label>
              <select className="select text-xs h-8" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="">Calendar order</option>
                <option value="asc">Lowest → Highest</option>
                <option value="desc">Highest → Lowest</option>
              </select>
            </div>
            <div className="flex items-end">
              <span className="text-xs text-gray-400">Minimum required: <strong className="text-gray-600">{fmtHours(calendar?.min_daily_hours ?? 7)}/day</strong> (incl. permissions &amp; breaks)</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {calendar && (
          <div className="grid grid-cols-4 gap-3 mb-5 stagger">
            {[
              {icon:'⏱️', label:'Total hours this month', value:`${fmtHours(calendar.summary.total_hours)}h`, color:'from-violet-100 to-purple-100'},
              {icon:'🏖️', label:'Holidays', value:calendar.summary.holidays, color:'from-blue-100 to-indigo-100'},
              {icon:'🌴', label:'Leave days', value:calendar.summary.leave_days, color:'from-emerald-100 to-teal-100'},
              {icon:'⚠️', label:'Days under 7h minimum', value:calendar.summary.shortfall_days, color:'from-rose-100 to-pink-100'},
            ].map(s => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 border border-white shadow-sm animate-fade-up`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm mb-4 w-fit">
          {[{k:'calendar',l:'🗓️ Calendar',},{k:'holidays',l:'🏖️ Holidays'},{k:'leaves',l:'🌴 Leave'},{k:'permissions',l:'✅ Permissions'},{k:'reports',l:'📥 Reports'},{k:'tracker',l:'📊 Hours Tracker'}].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                tab === t.k ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Calendar tab */}
        {tab === 'calendar' && (
          <>
          {!userId && (
            <div className="mb-3 px-4 py-2.5 rounded-xl text-xs bg-amber-50 text-amber-700 border border-amber-100">
              ℹ️ Select an employee above to add or edit timesheet entries for a specific day.
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-xs font-semibold text-white"
                 style={{gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 1.2fr 0.7fr'}}>
              <div>Date</div><div>Worked</div><div>Permission</div><div>Total</div><div>Status</div><div>Notes</div><div>Action</div>
            </div>
            {loading ? (
              <div className="text-center py-12 text-violet-400 animate-pulse">
                <div className="text-3xl mb-2">🗓️</div>
                <div className="text-xs">Loading calendar...</div>
              </div>
            ) : calendar?.days.map((d, i) => (
              <div key={d.date}
                className={clsx('grid px-4 py-2.5 items-center border-b border-gray-50 last:border-0 text-xs',
                  d.is_holiday ? 'bg-blue-50/40' : d.is_leave ? 'bg-emerald-50/40' : i%2===0 ? 'bg-white' : 'bg-slate-50/30')}
                style={{gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 1.2fr 0.7fr'}}>
                <div className="font-medium text-gray-700">{d.date} <span className="text-gray-400">· {d.weekday.slice(0,3)}</span></div>
                <div className="text-gray-600">{fmtHours(d.worked_hours)}h</div>
                <div className="text-gray-500">{fmtHours(d.permission_hours)}h</div>
                <div className="font-semibold text-gray-800">{fmtHours(d.total_hours)}h</div>
                <div>
                  {d.is_holiday ? <span className="text-xs px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700">🏖️ {d.holiday_name}</span>
                    : d.is_leave ? <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">🌴 {d.leave_type}</span>
                    : d.meets_minimum ? <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600">✅ Met</span>
                    : <span className="text-xs px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600">⚠️ −{fmtHours(d.shortfall)}h</span>}
                </div>
                <div className="text-gray-400 truncate">{d.is_holiday ? 'Holiday' : d.is_leave ? 'On leave' : ''}</div>
                <div>
                  <button onClick={() => openDayEntry(d.date)} disabled={!userId}
                    className="btn text-xs py-0.5 px-2 hover:text-violet-600 hover:border-violet-200 disabled:opacity-40">
                    ✏️ Log
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        {/* Holidays tab */}
        {tab === 'holidays' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-end gap-2 mb-4 p-3 bg-violet-50 rounded-xl border border-violet-100">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input type="date" className="input text-xs h-8" value={newHoliday.date} onChange={e=>setNewHoliday({...newHoliday,date:e.target.value})} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Holiday name</label>
                <input className="input text-xs h-8 w-full" placeholder="e.g. Diwali" value={newHoliday.name} onChange={e=>setNewHoliday({...newHoliday,name:e.target.value})} />
              </div>
              <button onClick={addHoliday} className="btn btn-primary text-xs h-8">➕ Add</button>
            </div>
            <div className="space-y-1.5">
              {holidays.map(h => (
                <div key={h.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl text-xs">
                  <span className="text-gray-700 font-medium">{h.date}</span>
                  <span className="text-gray-600 flex-1 ml-3">{h.name}</span>
                  <button onClick={()=>deleteHoliday(h.id)} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">🗑️</button>
                </div>
              ))}
              {holidays.length === 0 && <div className="text-center py-8 text-gray-400 text-xs">No holidays configured</div>}
            </div>
          </div>
        )}

        {/* Leave tab */}
        {tab === 'leaves' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-end gap-2 mb-4 p-3 bg-violet-50 rounded-xl border border-violet-100 flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" className="input text-xs h-8" value={newLeave.date_from} onChange={e=>setNewLeave({...newLeave,date_from:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" className="input text-xs h-8" value={newLeave.date_to} min={newLeave.date_from || undefined} onChange={e=>{if(newLeave.date_from&&e.target.value<newLeave.date_from)return;setNewLeave({...newLeave,date_to:e.target.value})}} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select className="select text-xs h-8" value={newLeave.leave_type} onChange={e=>setNewLeave({...newLeave,leave_type:e.target.value})}>
                  <option>Casual</option><option>Sick</option><option>Earned</option><option>Unpaid</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Reason</label>
                <input className="input text-xs h-8 w-full" placeholder="optional" value={newLeave.reason} onChange={e=>setNewLeave({...newLeave,reason:e.target.value})} />
              </div>
              <button onClick={addLeave} className="btn btn-primary text-xs h-8">➕ Request</button>
            </div>
            <div className="space-y-1.5">
              {leaves.map(l => (
                <div key={l.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl text-xs">
                  <span className="text-gray-700 font-medium w-28">{l.user_name}</span>
                  <span className="text-gray-600 w-40">{l.date_from} → {l.date_to}</span>
                  <span className="text-gray-500 w-20">{l.leave_type}</span>
                  <span className={clsx('px-1.5 py-0.5 rounded-md',
                    l.status==='Approved'?'bg-emerald-50 text-emerald-600':l.status==='Rejected'?'bg-rose-50 text-rose-600':'bg-amber-50 text-amber-600')}>{l.status}</span>
                  <div className="flex gap-1">
                    {l.status==='Pending' && <>
                      <button onClick={()=>updateLeaveStatus(l.id,'Approved')} className="btn text-xs py-0.5 px-1.5 hover:text-emerald-600">✓</button>
                      <button onClick={()=>updateLeaveStatus(l.id,'Rejected')} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">✕</button>
                    </>}
                    <button onClick={()=>deleteLeave(l.id)} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">🗑️</button>
                  </div>
                </div>
              ))}
              {leaves.length === 0 && <div className="text-center py-8 text-gray-400 text-xs">No leave requests</div>}
            </div>
          </div>
        )}

        {/* Permissions tab */}
        {tab === 'permissions' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-end gap-2 mb-4 p-3 bg-violet-50 rounded-xl border border-violet-100">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input type="date" className="input text-xs h-8" value={newPermission.date} onChange={e=>setNewPermission({...newPermission,date:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hours</label>
                <input type="number" step="0.5" className="input text-xs h-8 w-20" placeholder="e.g. 1" value={newPermission.hours} onChange={e=>setNewPermission({...newPermission,hours:e.target.value})} />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Reason</label>
                <input className="input text-xs h-8 w-full" placeholder="optional" value={newPermission.reason} onChange={e=>setNewPermission({...newPermission,reason:e.target.value})} />
              </div>
              <button onClick={addPermission} className="btn btn-primary text-xs h-8">➕ Request</button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Permission hours count toward the 7h/day minimum, alongside worked hours.</p>
            <div className="space-y-1.5">
              {permissions.map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl text-xs">
                  <span className="text-gray-700 font-medium w-28">{p.user_name}</span>
                  <span className="text-gray-600 w-24">{p.date}</span>
                  <span className="text-gray-600 w-16">{fmtHours(p.hours)}h</span>
                  <span className="text-gray-400 flex-1 truncate">{p.reason}</span>
                  <span className={clsx('px-1.5 py-0.5 rounded-md',
                    p.status==='Approved'?'bg-emerald-50 text-emerald-600':p.status==='Rejected'?'bg-rose-50 text-rose-600':'bg-amber-50 text-amber-600')}>{p.status}</span>
                  <div className="flex gap-1">
                    {p.status==='Pending' && <>
                      <button onClick={()=>updatePermissionStatus(p.id,'Approved')} className="btn text-xs py-0.5 px-1.5 hover:text-emerald-600">✓</button>
                      <button onClick={()=>updatePermissionStatus(p.id,'Rejected')} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">✕</button>
                    </>}
                    <button onClick={()=>deletePermission(p.id)} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">🗑️</button>
                  </div>
                </div>
              ))}
              {permissions.length === 0 && <div className="text-center py-8 text-gray-400 text-xs">No permission requests</div>}
            </div>
          </div>
        )}

        {/* Reports tab — unified home for all 5 report exports. Each report
            owns its own Start Date / End Date range and its own field
            checklist; Employee/Project filters above still apply to all. */}
        {tab === 'reports' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="space-y-3">
              {REPORTS.map(r => {
                const fields = REPORT_FIELDS[r.fieldsKey]
                const enabled = reportFieldsOn[r.fieldsKey]
                const range = reportRanges[r.key]
                const rf = reportFilters[r.key] || {}
                // Unique holiday names from loaded holidays list (deduped for Holiday Report filter)
                const uniqueHolidayNames = [...new Set(holidays.map(h => h.name))].sort()
                return (
                  <div key={r.key} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{r.icon}</span>
                        <span className="text-xs font-semibold text-gray-800">{r.name}</span>
                      </div>
                      <button onClick={() => downloadReport(r)} disabled={downloadingReport === r.key}
                        className="btn btn-primary text-xs py-1.5 px-3">
                        {downloadingReport === r.key ? <span className="animate-spin">⟳</span> : '⬇️ Export'}
                      </button>
                    </div>

                    {/* This report's own timeline filter */}
                    <div className="flex items-end gap-2 flex-wrap mb-3 p-2.5 bg-violet-50 rounded-lg border border-violet-100">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                        <input type="date" className="input text-xs h-8" value={range.start}
                          onChange={e => setReportRange(r.key, 'start', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">End Date</label>
                        <input type="date" className="input text-xs h-8" value={range.end}
                          onChange={e => setReportRange(r.key, 'end', e.target.value)} />
                      </div>

                      {/* Per-report data filters — Employee, Project, or Holiday Name */}
                      {(r.key === 'individual-time' || r.key === 'leave' || r.key === 'overtime' || r.key === 'permission') && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">👤 Employee Name</label>
                          <select className="select text-xs h-8" value={rf.user_id || ''}
                            onChange={e => setReportFilter(r.key, 'user_id', e.target.value)}>
                            <option value="">All Employees</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        </div>
                      )}
                      {r.key === 'individual-time' && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">🏢 Project</label>
                          <select className="select text-xs h-8" value={rf.project_id || ''}
                            onChange={e => setReportFilter(r.key, 'project_id', e.target.value)}>
                            <option value="">All Projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}
                      {r.key === 'individual-time' && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">🏷️ Work Type</label>
                          <select className="select text-xs h-8" value={rf.work_type || ''}
                            onChange={e => setReportFilter(r.key, 'work_type', e.target.value)}>
                            <option value="">All Types</option>
                            <option value="Billable">💰 Billable</option>
                            <option value="Non-Billable">🚫 Non-Billable</option>
                            <option value="No Work">🚷 No Work</option>
                            <option value="Training">📚 Training</option>
                            <option value="R&D">🔬 R&D</option>
                          </select>
                        </div>
                      )}
                      {r.key === 'holiday' && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">🏖️ Holiday Name</label>
                          <select className="select text-xs h-8" value={rf.holiday_name || ''}
                            onChange={e => setReportFilter(r.key, 'holiday_name', e.target.value)}>
                            <option value="">All Holidays</option>
                            {uniqueHolidayNames.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Report columns — read-only labels showing what will be exported */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-xs text-gray-400 font-medium mr-1">Columns:</span>
                      {fields.map(([key, label]) => (
                        <span key={key} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Hours Tracker tab */}
        {tab === 'tracker' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filters</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">👤 Employee</label>
                  <select className="select text-xs h-8" value={trackerFilters.user_id}
                    onChange={e => setTrackerFilters(f => ({...f, user_id: e.target.value}))}>
                    <option value="">All Employees</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">🏢 Project</label>
                  <select className="select text-xs h-8" value={trackerFilters.project_id}
                    onChange={e => setTrackerFilters(f => ({...f, project_id: e.target.value}))}>
                    <option value="">All Projects</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">📅 Start Date</label>
                  <input type="date" className="input text-xs h-8" value={trackerFilters.start_date}
                    onChange={e => {
                      const v = e.target.value
                      setTrackerFilters(f => ({...f, start_date: v, ...(v && f.end_date && v > f.end_date ? {end_date: v} : {})}))
                    }} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">📅 End Date</label>
                  <input type="date" className="input text-xs h-8" value={trackerFilters.end_date}
                    min={trackerFilters.start_date || undefined}
                    onChange={e => setTrackerFilters(f => ({...f, end_date: e.target.value}))} />
                </div>
              </div>
            </div>

            {trackerLoading ? (
              <div className="text-center py-12 text-violet-400 animate-pulse text-xs">⏳ Loading tracker data…</div>
            ) : trackerData ? (<>

              {/* 8 metric summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon:'🌴', label:'Leave Hours',        value: trackerData.totals.leave,        color:'from-emerald-100 to-teal-100' },
                  { icon:'🏖️', label:'Holiday Hours',      value: trackerData.totals.holiday,      color:'from-blue-100 to-indigo-100' },
                  { icon:'✅', label:'Permission Hours',   value: trackerData.totals.permission,   color:'from-sky-100 to-blue-100' },
                  { icon:'💰', label:'Billable Hours',     value: trackerData.totals.billable,     color:'from-green-100 to-emerald-100' },
                  { icon:'🚫', label:'Non-Billable Hours', value: trackerData.totals.non_billable, color:'from-gray-100 to-slate-100' },
                  { icon:'🚷', label:'No Work Hours',      value: trackerData.totals.no_work,      color:'from-rose-100 to-pink-100' },
                  { icon:'📚', label:'Training Hours',     value: trackerData.totals.training,     color:'from-amber-100 to-yellow-100' },
                  { icon:'🔬', label:'R&D Hours',          value: trackerData.totals.rnd,          color:'from-violet-100 to-purple-100' },
                ].map(card => (
                  <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 border border-white shadow-sm`}>
                    <div className="text-xl mb-1">{card.icon}</div>
                    <div className="text-lg font-bold text-gray-900">{fmtHours(card.value)}h</div>
                    <div className="text-xs text-gray-500">{card.label}</div>
                  </div>
                ))}
              </div>

              {/* View toggle + export */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm w-fit">
                  {[{k:'individual',l:'👤 Individual-wise'},{k:'project',l:'🏢 Project-wise'},{k:'dashboard',l:'📊 Dashboard'}].map(v => (
                    <button key={v.k} onClick={() => setTrackerView(v.k)}
                      className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        trackerView === v.k ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700')}>
                      {v.l}
                    </button>
                  ))}
                </div>
                <button onClick={exportTracker} disabled={trackerExporting}
                  className="btn btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5">
                  {trackerExporting ? <><span className="animate-spin">⟳</span> Exporting…</> : '📥 Export Excel'}
                </button>
              </div>

              {/* Individual-wise table */}
              {trackerView === 'individual' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                          {['Employee','Role','Billable','Non-Billable','No Work','Training','R&D','Leave','Holiday','Permission','Total Work'].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trackerData.individual.length === 0 ? (
                          <tr><td colSpan={11} className="text-center py-8 text-gray-400">No data for the selected filters</td></tr>
                        ) : trackerData.individual.map((row, i) => (
                          <tr key={row.user_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                            <td className="px-3 py-2 font-medium text-gray-800">{row.user_name}</td>
                            <td className="px-3 py-2 text-gray-500">{row.role}</td>
                            <td className="px-3 py-2 text-emerald-700 font-medium">{fmtHours(row.billable)}h</td>
                            <td className="px-3 py-2 text-gray-600">{fmtHours(row.non_billable)}h</td>
                            <td className="px-3 py-2 text-gray-500">{fmtHours(row.no_work)}h</td>
                            <td className="px-3 py-2 text-amber-700">{fmtHours(row.training)}h</td>
                            <td className="px-3 py-2 text-violet-700">{fmtHours(row.rnd)}h</td>
                            <td className="px-3 py-2 text-teal-700">{fmtHours(row.leave)}h</td>
                            <td className="px-3 py-2 text-blue-700">{fmtHours(row.holiday)}h</td>
                            <td className="px-3 py-2 text-sky-700">{fmtHours(row.permission)}h</td>
                            <td className="px-3 py-2 font-bold text-gray-900">{fmtHours(row.total_work)}h</td>
                          </tr>
                        ))}
                      </tbody>
                      {trackerData.individual.length > 0 && (
                        <tfoot>
                          <tr className="bg-indigo-50 border-t border-indigo-100 font-semibold text-gray-700">
                            <td className="px-3 py-2" colSpan={2}>Total</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.billable)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.non_billable)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.no_work)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.training)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.rnd)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.leave)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.holiday)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.permission)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.individual.reduce((s,r)=>s+r.total_work,0))}h</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {/* Project-wise table */}
              {trackerView === 'project' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                          {['Project','Client','Billable','Non-Billable','No Work','Training','R&D','Total Work'].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trackerData.project.length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-8 text-gray-400">No project-level data for the selected filters</td></tr>
                        ) : trackerData.project.map((row, i) => (
                          <tr key={row.project_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                            <td className="px-3 py-2 font-medium text-gray-800">{row.project_name}</td>
                            <td className="px-3 py-2 text-gray-500">{row.client}</td>
                            <td className="px-3 py-2 text-emerald-700 font-medium">{fmtHours(row.billable)}h</td>
                            <td className="px-3 py-2 text-gray-600">{fmtHours(row.non_billable)}h</td>
                            <td className="px-3 py-2 text-gray-500">{fmtHours(row.no_work)}h</td>
                            <td className="px-3 py-2 text-amber-700">{fmtHours(row.training)}h</td>
                            <td className="px-3 py-2 text-violet-700">{fmtHours(row.rnd)}h</td>
                            <td className="px-3 py-2 font-bold text-gray-900">{fmtHours(row.total_work)}h</td>
                          </tr>
                        ))}
                      </tbody>
                      {trackerData.project.length > 0 && (
                        <tfoot>
                          <tr className="bg-indigo-50 border-t border-indigo-100 font-semibold text-gray-700">
                            <td className="px-3 py-2" colSpan={2}>Total</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.billable)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.non_billable)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.no_work)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.training)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.totals.rnd)}h</td>
                            <td className="px-3 py-2">{fmtHours(trackerData.project.reduce((s,r)=>s+r.total_work,0))}h</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {/* ── Dashboard view ── */}
              {trackerView === 'dashboard' && (() => {
                const t = trackerData.totals

                // Donut
                const DONUT_COLORS = ['#10b981','#6b7280','#f43f5e','#3b82f6','#7c3aed','#14b8a6','#60a5fa','#f59e0b']
                const donutData = [
                  { name:'Billable',     value: t.billable },
                  { name:'Non-Billable', value: t.non_billable },
                  { name:'No Work',      value: t.no_work },
                  { name:'Training',     value: t.training },
                  { name:'R&D',          value: t.rnd },
                  { name:'Leave',        value: t.leave },
                  { name:'Holiday',      value: t.holiday },
                  { name:'Permission',   value: t.permission },
                ].filter(d => d.value > 0)

                // Employee stacked bar (top 8)
                const empData = [...trackerData.individual]
                  .sort((a,b) => b.total_work - a.total_work)
                  .slice(0,8)
                  .map(r => ({
                    name: r.user_name.split(' ')[0],
                    Billable: r.billable,
                    'Non-Bill': r.non_billable,
                    'No Work':  r.no_work,
                    Training:   r.training,
                    'R&D':      r.rnd,
                    Leave:      r.leave,
                    Holiday:    r.holiday,
                  }))

                // Radar
                const RADAR_COLORS = ['#10b981','#3b82f6','#f59e0b','#f43f5e','#7c3aed']
                const radarEmps = trackerData.individual.slice(0,5)
                const radarData = [
                  { subject:'Billable',    ...Object.fromEntries(radarEmps.map(e=>[e.user_name.split(' ')[0],e.billable])) },
                  { subject:'Non-Bill',    ...Object.fromEntries(radarEmps.map(e=>[e.user_name.split(' ')[0],e.non_billable])) },
                  { subject:'Training',    ...Object.fromEntries(radarEmps.map(e=>[e.user_name.split(' ')[0],e.training])) },
                  { subject:'R&D',         ...Object.fromEntries(radarEmps.map(e=>[e.user_name.split(' ')[0],e.rnd])) },
                  { subject:'No Work',     ...Object.fromEntries(radarEmps.map(e=>[e.user_name.split(' ')[0],e.no_work])) },
                ]

                // Treemap
                const TM_PALETTE = ['#7c3aed','#6d28d9','#5b21b6','#4c1d95','#818cf8','#6366f1','#4f46e5','#4338ca','#a78bfa','#8b5cf6','#c4b5fd','#ddd6fe']
                const tmData = [...trackerData.project]
                  .filter(p => p.total_work > 0)
                  .sort((a,b) => b.total_work - a.total_work)
                  .slice(0,12)
                  .map(p => ({ name: p.project_name.length > 14 ? p.project_name.slice(0,12)+'…' : p.project_name, size: p.total_work }))

                // Project H-bar (top 8)
                const projData = [...trackerData.project]
                  .sort((a,b) => b.total_work - a.total_work)
                  .slice(0,8)
                  .map(p => ({ name: p.project_name.length > 22 ? p.project_name.slice(0,20)+'…' : p.project_name, value: p.total_work }))

                // Waterfall (budget vs actuals)
                const workDays = trackerDailyData?.dates?.filter(d => !d.is_weekend && !d.is_holiday).length || 0
                const availH   = workDays * 8
                const netAvail = Math.max(0, availH - t.leave - t.holiday - t.permission)
                const wfData   = [
                  { name:'Available', base:0,                                           abs:availH,       fill:'#c7d2fe' },
                  { name:'-Leave',    base:Math.max(0, availH - t.leave),               abs:t.leave,      fill:'#14b8a6' },
                  { name:'-Holiday',  base:Math.max(0, availH - t.leave - t.holiday),   abs:t.holiday,    fill:'#60a5fa' },
                  { name:'-Perm',     base:netAvail,                                    abs:t.permission, fill:'#f59e0b' },
                  { name:'Billable',  base:0,                                           abs:t.billable,   fill:'#10b981' },
                  { name:'Non-Bill',  base:t.billable,                                  abs:t.non_billable,fill:'#6b7280'},
                  { name:'Training',  base:t.billable+t.non_billable,                   abs:t.training,   fill:'#3b82f6' },
                  { name:'R&D',       base:t.billable+t.non_billable+t.training,        abs:t.rnd,        fill:'#7c3aed' },
                  { name:'No Work',   base:t.billable+t.non_billable+t.training+t.rnd,  abs:t.no_work,    fill:'#f43f5e' },
                ].filter(d => d.abs > 0)

                // Area chart (daily trend)
                const dailyDates = trackerDailyData?.dates || []
                const areaData = dailyDates.map(d => ({
                  date: d.date.slice(5), // MM-DD
                  hours: d.hours,
                  max: 8,
                }))

                // GitHub calendar heatmap
                const heatWeeks = (() => {
                  if (!dailyDates.length) return []
                  const weeks = []; let week = []
                  const firstDow = new Date(dailyDates[0].date + 'T00:00:00').getDay()
                  for (let i = 0; i < firstDow; i++) week.push(null)
                  dailyDates.forEach(d => {
                    week.push(d)
                    if (week.length === 7) { weeks.push(week); week = [] }
                  })
                  if (week.length) weeks.push(week)
                  return weeks
                })()
                const heatColor = (h, isHol, isWknd) => {
                  if (isHol)  return '#dbeafe'
                  if (isWknd) return '#f8fafc'
                  if (h === 0) return '#f1f5f9'
                  const p = h / 8
                  if (p >= 1)    return '#059669'
                  if (p >= 0.75) return '#10b981'
                  if (p >= 0.5)  return '#6ee7b7'
                  if (p >= 0.25) return '#a7f3d0'
                  return '#d1fae5'
                }

                const utilEmps = trackerData.individual.filter(r => r.total_work > 0).slice(0,6)
                const RING_COLORS = ['#7c3aed','#10b981','#3b82f6','#f59e0b','#f43f5e','#14b8a6']

                return (
                  <div className="space-y-4">

                    {/* Row 1: Employee Stacked H-Bar + Donut */}
                    <div className="grid grid-cols-5 gap-4">
                      <div className="col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5"><span>👥</span> Hours by Employee</div>
                        {empData.length === 0
                          ? <div className="flex items-center justify-center h-40 text-gray-400 text-xs">No employee data</div>
                          : <ResponsiveContainer width="100%" height={Math.max(180, empData.length * 38)}>
                              <BarChart data={empData} layout="vertical" barSize={14} margin={{top:0,right:8,bottom:0,left:64}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" tick={{fontSize:9,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}h`} />
                                <YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#374151'}} axisLine={false} tickLine={false} width={60} />
                                <Tooltip formatter={(v,n)=>[`${fmtHours(v)}h`,n]} contentStyle={{fontSize:11,borderRadius:8}} />
                                <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:9}} />
                                <Bar dataKey="Billable"  stackId="a" fill="#10b981" />
                                <Bar dataKey="Non-Bill"  stackId="a" fill="#6b7280" />
                                <Bar dataKey="No Work"   stackId="a" fill="#f43f5e" />
                                <Bar dataKey="Training"  stackId="a" fill="#3b82f6" />
                                <Bar dataKey="R&D"       stackId="a" fill="#7c3aed" />
                                <Bar dataKey="Leave"     stackId="a" fill="#14b8a6" />
                                <Bar dataKey="Holiday"   stackId="a" fill="#60a5fa" radius={[0,3,3,0]} />
                              </BarChart>
                            </ResponsiveContainer>
                        }
                      </div>
                      <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5"><span>🍩</span> Overall Distribution</div>
                        {donutData.length === 0
                          ? <div className="flex items-center justify-center h-40 text-gray-400 text-xs">No data</div>
                          : <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie data={donutData} cx="50%" cy="42%" innerRadius={52} outerRadius={80} paddingAngle={2} dataKey="value">
                                  {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v,n)=>[`${fmtHours(v)}h`,n]} contentStyle={{fontSize:11,borderRadius:8}} />
                                <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:9}} />
                              </PieChart>
                            </ResponsiveContainer>
                        }
                      </div>
                    </div>

                    {/* Row 2: Radar + Treemap + Utilization Rings */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5"><span>🕸️</span> Employee Comparison</div>
                        {radarEmps.length === 0
                          ? <div className="flex items-center justify-center h-44 text-gray-400 text-xs">No data</div>
                          : <ResponsiveContainer width="100%" height={220}>
                              <RadarChart data={radarData} margin={{top:8,right:20,bottom:8,left:20}}>
                                <PolarGrid stroke="#f1f5f9" />
                                <PolarAngleAxis dataKey="subject" tick={{fontSize:9,fill:'#6b7280'}} />
                                <PolarRadiusAxis tick={false} axisLine={false} />
                                {radarEmps.map((e, i) => (
                                  <Radar key={i} name={e.user_name.split(' ')[0]} dataKey={e.user_name.split(' ')[0]}
                                    stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                                    fill={RADAR_COLORS[i % RADAR_COLORS.length]} fillOpacity={0.12} />
                                ))}
                                <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:9}} />
                                <Tooltip formatter={(v,n)=>[`${fmtHours(v)}h`,n]} contentStyle={{fontSize:11,borderRadius:8}} />
                              </RadarChart>
                            </ResponsiveContainer>
                        }
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5"><span>🗺️</span> Project Hours Map</div>
                        {tmData.length === 0
                          ? <div className="flex items-center justify-center h-44 text-gray-400 text-xs">No project data</div>
                          : <ResponsiveContainer width="100%" height={220}>
                              <Treemap data={tmData} dataKey="size" stroke="#fff" strokeWidth={2}
                                content={(props) => {
                                  const { x, y, width, height, name, value, index } = props
                                  if (!width || !height || width < 2 || height < 2) return null
                                  return (
                                    <g>
                                      <rect x={x} y={y} width={width} height={height}
                                        fill={TM_PALETTE[(index ?? 0) % TM_PALETTE.length]} rx={2} />
                                      {width > 38 && height > 22 && (
                                        <>
                                          <text x={x+width/2} y={y+height/2-4} textAnchor="middle"
                                            fill="#fff" style={{fontSize:8,fontWeight:'bold'}}>
                                            {name}
                                          </text>
                                          <text x={x+width/2} y={y+height/2+7} textAnchor="middle"
                                            fill="rgba(255,255,255,0.8)" style={{fontSize:7}}>
                                            {fmtHours(value || 0)}h
                                          </text>
                                        </>
                                      )}
                                    </g>
                                  )
                                }}
                              >
                                <Tooltip formatter={v=>[`${fmtHours(v)}h`,'Hours']} contentStyle={{fontSize:11,borderRadius:8}} />
                              </Treemap>
                            </ResponsiveContainer>
                        }
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5"><span>⭕</span> Billable Utilization</div>
                        {utilEmps.length === 0
                          ? <div className="flex items-center justify-center h-44 text-gray-400 text-xs">No data</div>
                          : <div className="flex flex-wrap gap-3 justify-center pt-1">
                              {utilEmps.map((e, i) => {
                                const pct = e.total_work > 0 ? e.billable / e.total_work : 0
                                const r = 30, circ = 2 * Math.PI * r
                                const color = RING_COLORS[i % RING_COLORS.length]
                                return (
                                  <div key={e.user_id} className="flex flex-col items-center gap-1">
                                    <svg width="72" height="72" viewBox="0 0 72 72">
                                      <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
                                      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7"
                                        strokeDasharray={`${circ * pct} ${circ}`}
                                        strokeLinecap="round" transform="rotate(-90 36 36)" />
                                      <text x="36" y="40" textAnchor="middle"
                                        style={{fontSize:10,fontWeight:'bold',fill:'#374151'}}>
                                        {Math.round(pct * 100)}%
                                      </text>
                                    </svg>
                                    <span className="text-[10px] text-gray-500 text-center max-w-[72px] truncate">
                                      {e.user_name.split(' ')[0]}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                        }
                      </div>
                    </div>

                    {/* Row 3: Waterfall + Project H-Bar */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                          <span>📊</span> Hours Budget Breakdown
                          {workDays > 0 && <span className="text-gray-400 font-normal ml-1">({workDays} working days × 8h)</span>}
                        </div>
                        {wfData.length === 0
                          ? <div className="flex items-center justify-center h-44 text-gray-400 text-xs">No data</div>
                          : <ResponsiveContainer width="100%" height={220}>
                              <BarChart data={wfData} barSize={26} margin={{top:4,right:4,bottom:20,left:4}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{fontSize:8,fill:'#9ca3af'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize:9,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}h`} width={30} />
                                <Tooltip content={({active,payload}) => {
                                  if (!active || !payload?.length) return null
                                  const d = payload[0]?.payload
                                  return d ? (
                                    <div className="bg-white border border-gray-100 rounded-xl p-2 shadow-lg text-xs">
                                      <div className="font-semibold text-gray-700">{d.name}</div>
                                      <div style={{color:d.fill}}>{fmtHours(d.abs)}h</div>
                                    </div>
                                  ) : null
                                }} />
                                <Bar dataKey="base" stackId="a" fill="transparent" legendType="none" />
                                <Bar dataKey="abs"  stackId="a" radius={[3,3,0,0]}>
                                  {wfData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                        }
                      </div>

                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5"><span>🏢</span> Top Projects by Hours</div>
                        {projData.length === 0
                          ? <div className="flex items-center justify-center h-44 text-gray-400 text-xs">No project data</div>
                          : <ResponsiveContainer width="100%" height={220}>
                              <BarChart data={projData} layout="vertical" barSize={14} margin={{top:0,right:8,bottom:0,left:8}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" tick={{fontSize:9,fill:'#9ca3af'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}h`} />
                                <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:'#374151'}} axisLine={false} tickLine={false} width={110} />
                                <Tooltip formatter={v=>[`${fmtHours(v)}h`,'Total Hours']} contentStyle={{fontSize:11,borderRadius:8}} />
                                <Bar dataKey="value" radius={[0,4,4,0]}>
                                  {projData.map((_, i) => (
                                    <Cell key={i} fill={`hsl(${258 - i*14},${Math.max(40,70-i*4)}%,${Math.min(75,55+i*3)}%)`} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                        }
                      </div>
                    </div>

                    {/* Row 4: Daily Trend */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                        <span>📈</span> Daily Hours Trend
                        {trackerDailyLoading && <span className="text-violet-400 animate-pulse ml-1">Loading…</span>}
                      </div>
                      {areaData.length === 0
                        ? <div className="text-center py-8 text-gray-400 text-xs">No daily data for this period</div>
                        : <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={areaData} margin={{top:4,right:8,bottom:0,left:4}}>
                              <defs>
                                <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="date" tick={{fontSize:8,fill:'#9ca3af'}} axisLine={false} tickLine={false}
                                interval={Math.floor(areaData.length / 8)} />
                              <YAxis tick={{fontSize:9,fill:'#9ca3af'}} axisLine={false} tickLine={false}
                                tickFormatter={v=>`${v}h`} width={28} />
                              <Tooltip formatter={v=>[`${fmtHours(v)}h`,'Hours']}
                                contentStyle={{fontSize:11,borderRadius:8}}
                                labelFormatter={l=>`Date: ${l}`} />
                              <Area type="monotone" dataKey="hours" stroke="#7c3aed" strokeWidth={2}
                                fill="url(#hoursGrad)" dot={false} activeDot={{r:3,fill:'#7c3aed'}} />
                            </AreaChart>
                          </ResponsiveContainer>
                      }
                    </div>

                    {/* Row 5: GitHub-style Calendar Heatmap */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                        <span>🗓️</span> Daily Activity Heatmap
                      </div>
                      {heatWeeks.length === 0
                        ? <div className="text-center py-8 text-gray-400 text-xs">No daily data</div>
                        : <div className="overflow-x-auto">
                            <div className="flex gap-0.5" style={{minWidth:'max-content'}}>
                              <div className="flex flex-col gap-0.5 mr-1 mt-6">
                                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                                  <div key={d} className="h-3 text-[8px] text-gray-400 leading-3 pr-1">{d}</div>
                                ))}
                              </div>
                              {heatWeeks.map((week, wi) => {
                                const firstReal = week.find(d => d !== null)
                                const isFirstMonth = firstReal && (wi === 0 || new Date(firstReal.date + 'T00:00:00').getDate() <= 7)
                                const monthLabel = firstReal && isFirstMonth
                                  ? new Date(firstReal.date + 'T00:00:00').toLocaleString('default',{month:'short'}) : ''
                                return (
                                  <div key={wi} className="flex flex-col gap-0.5">
                                    <div className="h-5 text-[8px] text-gray-400 leading-5 whitespace-nowrap">{monthLabel}</div>
                                    {week.map((d, di) =>
                                      d === null
                                        ? <div key={di} className="w-3 h-3" />
                                        : <div key={di}
                                            className="w-3 h-3 rounded-sm cursor-default transition-transform hover:scale-110"
                                            style={{backgroundColor: heatColor(d.hours, d.is_holiday, d.is_weekend)}}
                                            title={`${d.date}: ${fmtHours(d.hours)}h${d.is_holiday?' Holiday':''}${d.is_weekend?' (weekend)':''}`}
                                          />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 text-[9px] text-gray-400">
                              <span>Less</span>
                              {['#f1f5f9','#d1fae5','#a7f3d0','#6ee7b7','#10b981','#059669'].map(c => (
                                <div key={c} className="w-3 h-3 rounded-sm" style={{backgroundColor:c}} />
                              ))}
                              <span>More (8h+)</span>
                              <span className="ml-3">Holiday</span>
                              <div className="w-3 h-3 rounded-sm" style={{backgroundColor:'#dbeafe'}} />
                            </div>
                          </div>
                      }
                    </div>
                  </div>
                )
              })()}

            </>) : null}
          </div>
        )}
      </div>

      {/* Manual timesheet entry modal */}
      {entryDay && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-up max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗓️</span>
                <h2 className="text-sm font-semibold">
                  Timesheet — {entryDay} ({users.find(u => String(u.id) === String(userId))?.name || 'Employee'})
                </h2>
              </div>
              <button onClick={closeDayEntry} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1.5">
                {loadingDay ? (
                  <div className="text-center py-6 text-gray-400 text-xs">Loading entries…</div>
                ) : dayEntries.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs">No entries logged for this day yet.</div>
                ) : dayEntries.map(w => (
                  <div key={w.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 text-xs gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-700 truncate">{w.task_name}</div>
                      <div className="text-gray-400 truncate">{w.project_name}{w.notes ? ` · ${w.notes}` : ''}</div>
                    </div>
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 whitespace-nowrap', workTypeBadge(w.work_type))}>
                      {w.work_type || 'Billable'}
                    </span>
                    {editingEntryId === w.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" step="0.5" className="input text-xs h-7 w-16" value={editHours}
                          onChange={e => setEditHours(e.target.value)} />
                        <select className="select text-xs h-7" value={editWorkType}
                          onChange={e => setEditWorkType(e.target.value)}>
                          {WORK_TYPES.map(wt => <option key={wt} value={wt}>{wt}</option>)}
                        </select>
                        <button onClick={() => saveEditHours(w.id)} className="btn text-xs py-0.5 px-1.5 hover:text-emerald-600">✓</button>
                        <button onClick={() => setEditingEntryId(null)} className="btn text-xs py-0.5 px-1.5">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="font-semibold text-gray-800">{fmtHours(w.hours_spent)}h</span>
                        <button onClick={() => { setEditingEntryId(w.id); setEditHours(String(w.hours_spent)); setEditWorkType(w.work_type || 'Billable') }}
                          className="btn text-xs py-0.5 px-1.5 hover:text-violet-600">✏️</button>
                        <button onClick={() => deleteDayEntry(w.id)} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="text-xs font-medium text-gray-600">➕ Add new entry</div>

                {/* Project */}
                <select className="select text-xs h-8 w-full" value={newEntry.project_id}
                  onChange={e => setNewEntry(f => ({...f,
                    project_id: e.target.value,
                    custom_milestone_id: '', custom_task_id: '',
                    custom_subtask_id: '', activity_id: ''
                  }))}>
                  <option value="">📋 General (no project)</option>
                  {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>

                {/* Cascading Milestone → Task → Subtask — always visible */}
                {(() => {
                  const selMs  = logMilestones.find(m => String(m.id) === String(newEntry.custom_milestone_id))
                  const selTsk = selMs?.tasks?.find(t => String(t.id) === String(newEntry.custom_task_id))
                  const selSub = selTsk?.subtasks?.find(s => String(s.id) === String(newEntry.custom_subtask_id))
                  const msDisabled  = !newEntry.project_id || logMilestonesLoading || logMilestones.length === 0
                  const tskDisabled = !newEntry.custom_milestone_id || !selMs?.tasks?.length
                  const subDisabled = !newEntry.custom_task_id || !selTsk?.subtasks?.length
                  const msLabel  = !newEntry.project_id ? '🏁 Select a project first'
                                 : logMilestonesLoading ? '⏳ Loading milestones…'
                                 : logMilestonesError ? '⚠️ Could not load milestones'
                                 : logMilestones.length === 0 ? '🏁 No milestones configured in project'
                                 : '🏁 Milestone (optional)'
                  const tskLabel = !newEntry.custom_milestone_id ? '📋 Select a milestone first'
                                 : !selMs?.tasks?.length ? '📋 No tasks in milestone'
                                 : '📋 Task (optional)'
                  const subLabel = !newEntry.custom_task_id ? '🔹 Select a task first'
                                 : !selTsk?.subtasks?.length ? '🔹 No subtasks in task'
                                 : '🔹 Subtask (optional)'
                  return (
                    <>
                      {/* Milestone */}
                      <select className="select text-xs h-8 w-full" value={newEntry.custom_milestone_id}
                        disabled={msDisabled}
                        onChange={e => setNewEntry(f => ({...f,
                          custom_milestone_id: e.target.value,
                          custom_task_id: '', custom_subtask_id: '', activity_id: ''
                        }))}>
                        <option value="">{msLabel}</option>
                        {logMilestones.map(m => (
                          <option key={m.id} value={String(m.id)}>
                            M{String(m.num).padStart(2,'0')} — {m.name}
                          </option>
                        ))}
                      </select>

                      {/* Task */}
                      <select className="select text-xs h-8 w-full" value={newEntry.custom_task_id}
                        disabled={tskDisabled}
                        onChange={e => {
                          const taskId = e.target.value
                          const task   = selMs?.tasks?.find(t => String(t.id) === taskId)
                          setNewEntry(f => ({...f,
                            custom_task_id: taskId,
                            custom_subtask_id: '', activity_id: '',
                            task_name: task ? task.name : f.task_name
                          }))
                        }}>
                        <option value="">{tskLabel}</option>
                        {selMs?.tasks?.map(t => (
                          <option key={t.id} value={String(t.id)}>Task {t.num} — {t.name}</option>
                        ))}
                      </select>

                      {/* Subtask */}
                      <select className="select text-xs h-8 w-full" value={newEntry.custom_subtask_id}
                        disabled={subDisabled}
                        onChange={e => {
                          const subId = e.target.value
                          const sub   = selTsk?.subtasks?.find(s => String(s.id) === subId)
                          setNewEntry(f => ({...f,
                            custom_subtask_id: subId, activity_id: '',
                            task_name: sub ? sub.name : f.task_name
                          }))
                        }}>
                        <option value="">{subLabel}</option>
                        {selTsk?.subtasks?.map(s => (
                          <option key={s.id} value={String(s.id)}>{s.name}</option>
                        ))}
                      </select>
                    </>
                  )
                })()}

                {/* Description — auto-filled when a task or subtask is picked */}
                <input className="input text-xs h-8 w-full" placeholder="Description *"
                  value={newEntry.task_name}
                  onChange={e => setNewEntry(f => ({...f, task_name: e.target.value}))} />

                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.5" min="0.5" className="input text-xs h-8" placeholder="Hours *"
                    value={newEntry.hours_spent}
                    onChange={e => setNewEntry(f => ({...f, hours_spent: e.target.value}))} />
                  <select className="select text-xs h-8" value={newEntry.work_type}
                    onChange={e => setNewEntry(f => ({...f, work_type: e.target.value}))}>
                    {WORK_TYPES.map(wt => <option key={wt} value={wt}>{wt}</option>)}
                  </select>
                </div>
                <input className="input text-xs h-8 w-full" placeholder="Notes (optional)"
                  value={newEntry.notes}
                  onChange={e => setNewEntry(f => ({...f, notes: e.target.value}))} />
                <button onClick={addDayEntry}
                  disabled={!newEntry.task_name || !newEntry.hours_spent || savingEntry}
                  className="btn btn-primary text-xs w-full disabled:opacity-50">
                  {savingEntry ? '⟳ Logging…' : '✓ Log Hours'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
