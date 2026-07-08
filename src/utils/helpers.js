import { format, isPast, differenceInDays } from 'date-fns'

export const fmtDate = (d) => d ? format(new Date(d), 'dd MMM yyyy') : '—'
export const fmtDateTime = (d) => d ? format(new Date(d), 'dd MMM yyyy, hh:mm a') : '—'

// Decimal hours -> "H:MM" duration display (e.g. 1.83 -> "1:50", 0.5 -> "0:30").
// Every page in the app stores/computes hours as a decimal float, but showing
// that raw decimal (e.g. "1.83h") isn't a real clock duration -- this is the
// single shared formatter so Working Hours, Assignments, Global Hub, and the
// Dashboards all render the same value the same way.
export const fmtHours = (decimalHours) => {
  const n = Number(decimalHours)
  if (!isFinite(n) || n < 0) return '0:00'
  let h = Math.floor(n)
  let m = Math.round((n - h) * 60)
  if (m === 60) { m = 0; h += 1 }
  return `${h}:${String(m).padStart(2, '0')}`
}

export const isOverdue = (dueDate, status) => {
  if (!dueDate || status === 'Completed') return false
  return isPast(new Date(dueDate))
}

export const daysLeft = (dueDate) => {
  if (!dueDate) return null
  return differenceInDays(new Date(dueDate), new Date())
}

export const statusBadge = (status) => {
  const map = {
    'Completed':   'badge-done',
    'In Progress': 'badge-prog',
    'Overdue':     'badge-over',
    'Not Started': 'badge-todo',
    'On Hold':     'badge-hold',
  }
  return map[status] || 'badge-todo'
}

export const progressColor = (pct) => {
  if (pct === 100) return 'bg-success-400'
  if (pct >= 50)  return 'bg-warning-400'
  if (pct > 0)    return 'bg-primary-400'
  return 'bg-gray-200'
}

export const MILESTONES = [
  { num: 1,  name: 'Initiation & Requirement' },
  { num: 2,  name: 'Kick Off' },
  { num: 3,  name: 'Process Study' },
  { num: 4,  name: 'Requirement Specification' },
  { num: 5,  name: 'Development' },
  { num: 6,  name: 'Internal Testing' },
  { num: 7,  name: 'Deployment' },
  { num: 8,  name: 'UAT' },
  { num: 9,  name: 'Go Live' },
  { num: 10, name: 'Support' },
]

export const ROLES = ['Admin', 'FC Lead', 'TC Lead', 'Functional Consultant', 'Technical Team', 'HR', 'Client']
export const STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold']
export const INPUT_TYPES = ['text', 'long', 'yesno', 'date', 'number', 'dropdown_hml', 'dropdown_freq', 'dropdown_pf']

// Cost Management — fixed Category dropdown options. Keep in sync with
// COST_CATEGORIES in backend/app/api/routes/costs.py.
export const COST_CATEGORIES = [
  'Travel', 'Accommodation', 'Software & Licensing', 'Hardware & Equipment',
  'Training', 'Consulting & Outsourcing', 'Communication',
  'Indirect / Overhead',  // Profitability Report — overhead allocated to a project
  'Miscellaneous', 'Other',
]

// Plain number -> "₹1,23,456" style currency display (no decimals, since
// cost entries are whole-currency amounts in this app).
export const fmtCurrency = (n) => {
  const v = Number(n)
  if (!isFinite(v)) return '₹0'
  return '₹' + Math.round(v).toLocaleString('en-IN')
}
