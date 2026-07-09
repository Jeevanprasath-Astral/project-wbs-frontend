// Centralized role permission matrix for the frontend — mirrors
// backend/app/core/permissions.py. Keep both in sync.
//
// Role hierarchy (highest to lowest):
//  Admin           — full access to everything, including Financial Settings
//  Project Manager — elevated access; can create projects; NO Financial Settings
//  FC Lead         — elevated access; CANNOT create projects; NO Financial Settings
//  TC Lead         — elevated access; CANNOT create projects; NO Financial Settings
//  Associate       — standard access (replaces Functional Consultant / Technical Team)
//  HR              — team + timesheet management only; no elevated module access
//  Client          — read-only access
//
// Legacy roles kept for backwards compatibility:
//  Functional Consultant, Technical Team — treated same as Associate

export const ALL_ROLES = [
  'Admin', 'Project Manager', 'FC Lead', 'TC Lead',
  'Associate', 'HR', 'Client',
]

// Keep legacy roles in a separate export for pages that may still reference them
export const LEGACY_ROLES = ['Functional Consultant', 'Technical Team']

// All roles that can be assigned in the Team Hub role dropdown
export const ALL_ASSIGNABLE_ROLES = [...ALL_ROLES, ...LEGACY_ROLES]

const ELEVATED_ROLES        = new Set(['Admin', 'Project Manager', 'FC Lead', 'TC Lead'])
const PROJECT_CREATOR_ROLES = new Set(['Admin', 'Project Manager'])
const TEAM_MANAGER_ROLES    = new Set(['Admin', 'HR', 'Project Manager'])
const TIMESHEET_MANAGER_ROLES = new Set(['Admin', 'HR'])
const FINANCIAL_SETTINGS_ROLES = new Set(['Admin', 'HR'])
// Standard users — can view/work on assigned items but not manage structure
const STANDARD_ROLES = new Set(['Associate', 'Functional Consultant', 'Technical Team', 'Client'])

export const isElevated        = (user) => ELEVATED_ROLES.has(user?.role)
export const canCreateProject  = (user) => PROJECT_CREATOR_ROLES.has(user?.role)
export const isTeamManager     = (user) => TEAM_MANAGER_ROLES.has(user?.role)
export const isTimesheetManager = (user) => TIMESHEET_MANAGER_ROLES.has(user?.role)
export const isAdmin = (user) => user?.role === 'Admin'
// Financial Settings — Admin and HR
export const canAccessFinancialSettings = (user) => FINANCIAL_SETTINGS_ROLES.has(user?.role)
// Standard (non-elevated) user — used for canAssign / canComment type checks
export const isStandard = (user) => STANDARD_ROLES.has(user?.role)
