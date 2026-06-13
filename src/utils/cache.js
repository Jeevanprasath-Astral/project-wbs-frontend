/**
 * Simple in-memory cache for API responses.
 * Reduces repeat API calls when switching between milestones.
 */
const store = new Map()

export const cache = {
  get(key) {
    const item = store.get(key)
    if (!item) return null
    if (Date.now() > item.expiry) { store.delete(key); return null }
    return item.data
  },
  set(key, data, ttlSeconds = 30) {
    store.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 })
  },
  invalidate(key) {
    store.delete(key)
  },
  invalidatePrefix(prefix) {
    for (const k of store.keys()) {
      if (k.startsWith(prefix)) store.delete(k)
    }
  }
}
