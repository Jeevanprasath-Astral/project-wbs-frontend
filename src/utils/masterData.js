/**
 * Shared cached fetchers for "master data" — lists that rarely change within
 * a session (all projects, all active users) but were previously refetched
 * from scratch by 6+ different pages on every mount AND on every filter
 * change (since they lived inside each page's own Promise.all `load()`).
 *
 * Perf (req 4): route every page through the same cache.get/set-backed
 * fetcher so the network round trip only happens once per TTL window, no
 * matter how many pages/filter-changes touch it during that window.
 *
 * TTLs extended (perf fix C):
 *   • projects / users lists: 120 s  (up from 60 s) — global, rarely edited
 *   • project team:            60 s  (up from 15 s) — per-project
 *   • custom milestones:       45 s  (up from 15 s) — per-project
 *   • assignment categories:   120 s — global, almost never changes
 */
import api from './api'
import { cache } from './cache'

const TTL = 120       // seconds — global master data
const MID_TTL = 60   // seconds — project-scoped team
const SHORT_TTL = 45 // seconds — project-scoped milestones

export async function getProjectsList() {
  const key = 'master:projects-list'
  const cached = cache.get(key)
  if (cached) return cached
  const { data } = await api.get('/global/projects-list')
  cache.set(key, data, TTL)
  return data
}

export async function getUsersList() {
  const key = 'master:users-list'
  const cached = cache.get(key)
  if (cached) return cached
  const { data } = await api.get('/global/users-list')
  cache.set(key, data, TTL)
  return data
}

export async function getGlobalTeams() {
  const key = 'master:team-teams'
  const cached = cache.get(key)
  if (cached) return cached
  const { data } = await api.get('/global/team/teams')
  cache.set(key, data, TTL)
  return data
}

// Project-scoped lists (custom milestones, project team) — keyed per project
// id so switching between projects doesn't serve stale cross-project data.
export async function getProjectCustomMilestones(projectId) {
  const key = `master:custom-milestones:${projectId}`
  const cached = cache.get(key)
  if (cached) return cached
  const { data } = await api.get(`/projects/${projectId}/custom-milestones`)
  cache.set(key, data, SHORT_TTL)
  return data
}

export async function getProjectTeam(projectId) {
  const key = `master:project-team:${projectId}`
  const cached = cache.get(key)
  if (cached) return cached
  const { data } = await api.get(`/projects/${projectId}/team`)
  cache.set(key, data, MID_TTL)
  return data
}

// Fix G: assignment categories are global and almost never change —
// cache them for 120 s so AssignmentsPage doesn't fire a separate uncached
// request on every mount.
export async function getAssignmentCategories() {
  const key = 'master:assignment-categories'
  const cached = cache.get(key)
  if (cached) return cached
  const { data } = await api.get('/global/assignment-categories')
  cache.set(key, data, TTL)
  return data
}

// Invalidate everything (e.g. after creating/deleting a project, user, or
// team) so the next read picks up fresh data instead of a stale cache hit.
export function invalidateMasterData() {
  cache.invalidatePrefix('master:')
}
