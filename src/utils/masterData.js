/**
 * Shared cached fetchers for "master data" — lists that rarely change within
 * a session (all projects, all active users) but were previously refetched
 * from scratch by 6+ different pages on every mount AND on every filter
 * change (since they lived inside each page's own Promise.all `load()`).
 *
 * Perf (req 4): route every page through the same cache.get/set-backed
 * fetcher so the network round trip only happens once per TTL window, no
 * matter how many pages/filter-changes touch it during that window.
 */
import api from './api'
import { cache } from './cache'

const TTL = 60 // seconds — master data, safe to hold a little longer than the 30s default

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
// Shorter TTL than the global lists above: these are actively edited from
// the Milestone Configuration / Team pages, so we only want to dedupe rapid
// repeat fetches (filter changes, route bounces) without risking a stale
// view for long after a real edit happens elsewhere.
const SHORT_TTL = 15

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
  cache.set(key, data, SHORT_TTL)
  return data
}

// Invalidate everything (e.g. after creating/deleting a project, user, or
// team) so the next read picks up fresh data instead of a stale cache hit.
export function invalidateMasterData() {
  cache.invalidatePrefix('master:')
}
