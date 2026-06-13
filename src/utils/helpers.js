import { format, isPast, differenceInDays } from 'date-fns'

export const fmtDate = (d) => d ? format(new Date(d), 'dd MMM yyyy') : '—'
export const fmtDateTime = (d) => d ? format(new Date(d), 'dd MMM yyyy, hh:mm a') : '—'

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

export const ROLES = ['Admin', 'Functional Consultant', 'Technical Team', 'Client']
export const STATUSES = ['Not Started', 'In Progress', 'Completed', 'On Hold']
export const INPUT_TYPES = ['text', 'long', 'yesno', 'date', 'number', 'dropdown_hml', 'dropdown_freq', 'dropdown_pf']
