/**
 * pageDataStore — stale-while-revalidate cache for page-level data.
 *
 * Problem: React Router unmounts pages on tab switch, so every tab visit
 * fired a full fresh fetch. With a Render backend (~100-200ms per request)
 * and 3-5 parallel calls per page, first paint was 300-800ms every time.
 *
 * Solution: store the last result in memory. On the *next* visit return the
 * stale data immediately (sub-millisecond) while silently re-fetching in the
 * background. The page renders with the old data at once, then updates when
 * the fresh data arrives — so the user sees content in ~0ms instead of ~500ms.
 *
 * TTL: entries older than TTL are "stale" but still served immediately; a
 * background refresh starts in parallel. After 2×TTL the entry is dropped
 * and the next visit blocks on a fresh fetch (first-visit behaviour).
 */

const PAGE_TTL = 60_000       // 60 s — serve stale data up to this age
const PAGE_MAX_AGE = 120_000  // 120 s — hard evict after this

const store = new Map() // key → { data, ts, fetching }

/**
 * withPageCache(key, fetchFn, setters)
 *
 * @param {string}   key      — unique cache key for this page+project combo
 * @param {Function} fetchFn  — async () => data — the actual API call(s)
 * @param {Function} apply    — (data) => void — set React state from data
 * @param {Function} setLoading — (bool) => void — controls first-load spinner
 *
 * Behaviour:
 *   • Cache MISS (first visit or evicted): blocks, shows spinner, sets data.
 *   • Cache HIT fresh (<TTL): returns immediately, no spinner, no refetch.
 *   • Cache HIT stale (TTL < age < MAX_AGE): returns immediately (no
 *     spinner), starts background refresh; apply() called again when done.
 *   • Cache EXPIRED (>MAX_AGE): treated as miss.
 */
export async function withPageCache(key, fetchFn, apply, setLoading) {
  const now = Date.now()
  const entry = store.get(key)

  if (entry && now - entry.ts < PAGE_MAX_AGE) {
    // Serve stale data immediately — user sees content at once
    apply(entry.data)
    setLoading(false)

    if (now - entry.ts > PAGE_TTL && !entry.fetching) {
      // Stale — kick off background refresh without blocking render
      entry.fetching = true
      fetchFn()
        .then(data => {
          store.set(key, { data, ts: Date.now(), fetching: false })
          apply(data)
        })
        .catch(() => { if (store.has(key)) store.get(key).fetching = false })
    }
    return
  }

  // Cache miss — need to block for first load
  setLoading(true)
  try {
    const data = await fetchFn()
    store.set(key, { data, ts: Date.now(), fetching: false })
    apply(data)
  } finally {
    setLoading(false)
  }
}

/**
 * invalidatePage(key) — drop one entry so the next visit gets fresh data.
 * Call after mutations (add/edit/delete) that would change the page's data.
 */
export function invalidatePage(key) {
  store.delete(key)
}

/**
 * invalidatePagePrefix(prefix) — drop all entries whose key starts with prefix.
 * Useful when switching projects: invalidatePagePrefix(`page:${oldId}:`)
 */
export function invalidatePagePrefix(prefix) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k)
  }
}

/**
 * preloadPage(key, fetchFn) — fire-and-forget warm-up on nav item hover.
 * If the entry is already fresh, does nothing. If missing or stale, starts
 * a background fetch so the data is ready by the time the user clicks.
 */
export function preloadPage(key, fetchFn) {
  const now = Date.now()
  const entry = store.get(key)
  if (entry && now - entry.ts < PAGE_TTL) return // already fresh
  if (entry?.fetching) return // already in flight
  if (entry) entry.fetching = true
  fetchFn()
    .then(data => store.set(key, { data, ts: Date.now(), fetching: false }))
    .catch(() => { if (store.has(key)) store.get(key).fetching = false })
}
