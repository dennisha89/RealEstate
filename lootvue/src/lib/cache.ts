/**
 * In-memory cache with TTL support and stale-while-revalidate.
 * Used server-side to avoid repeated API calls within the same time window.
 *
 * Features:
 * - TTL-based expiration
 * - Stale-while-revalidate: serves stale data while refreshing in background
 * - Key namespacing: `source:identifier` (e.g., `fred:MORTGAGE30US`)
 * - Cache statistics for monitoring
 *
 * In production, replace with Redis for multi-instance deployments.
 * For a single Next.js server, this is sufficient and zero-cost.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number; // When data becomes stale (triggers background refresh)
  source: string;
  fetchedAt: string;
}

const cache = new Map<string, CacheEntry<unknown>>();

// Track in-flight revalidations to prevent duplicate requests
const revalidating = new Set<string>();

/** Default TTLs by data type (in milliseconds) */
export const CACHE_TTL = {
  FRED: 24 * 60 * 60 * 1000,        // 1 day
  CENSUS: 30 * 24 * 60 * 60 * 1000, // 30 days
  BLS: 7 * 24 * 60 * 60 * 1000,     // 7 days
  REDFIN: 24 * 60 * 60 * 1000,      // 1 day
  WALKSCORE: 90 * 24 * 60 * 60 * 1000, // 90 days
  SCHOOLS: 90 * 24 * 60 * 60 * 1000,   // 90 days
  RENTCAST: 7 * 24 * 60 * 60 * 1000,   // 7 days
  ATTOM: 24 * 60 * 60 * 1000,          // 1 day
  DEFAULT: 60 * 60 * 1000,              // 1 hour
} as const;

/**
 * Get cached data if it exists and hasn't hard-expired.
 * Returns the entry even if stale (caller decides whether to revalidate).
 */
export function getCached<T>(key: string): (CacheEntry<T> & { isStale: boolean }) | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const now = Date.now();

  // Hard expired — remove and return null
  if (now > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return { ...entry, isStale: now > entry.staleAt };
}

/**
 * Store data in cache with a TTL.
 * Stale window defaults to 80% of TTL — data is served but triggers background refresh.
 */
export function setCache<T>(
  key: string,
  data: T,
  source: string,
  ttlMs: number,
  stalePct: number = 0.8
): void {
  const now = Date.now();
  cache.set(key, {
    data,
    expiresAt: now + ttlMs,
    staleAt: now + Math.round(ttlMs * stalePct),
    source,
    fetchedAt: new Date().toISOString(),
  });
}

/**
 * Fetch with cache — checks cache first, calls fetcher if miss.
 * Supports stale-while-revalidate: if data is stale but not expired,
 * returns the stale data immediately and refreshes in the background.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<{ data: T; source: string } | null>,
  ttlMs: number = CACHE_TTL.DEFAULT
): Promise<{ data: T; source: string; cached: boolean; stale: boolean } | null> {
  const cached = getCached<T>(key);

  if (cached) {
    // If stale, trigger background revalidation
    if (cached.isStale && !revalidating.has(key)) {
      revalidating.add(key);
      fetcher()
        .then((result) => {
          if (result) {
            setCache(key, result.data, result.source, ttlMs);
          }
        })
        .catch(() => {
          // Silently fail — stale data is still being served
        })
        .finally(() => {
          revalidating.delete(key);
        });
    }

    return {
      data: cached.data,
      source: `${cached.source} (cached${cached.isStale ? ", revalidating" : ""})`,
      cached: true,
      stale: cached.isStale,
    };
  }

  // Cache miss — fetch fresh
  const result = await fetcher();
  if (!result) return null;

  setCache(key, result.data, result.source, ttlMs);

  return { data: result.data, source: result.source, cached: false, stale: false };
}

/**
 * Invalidate a specific cache key or all keys matching a prefix.
 */
export function invalidateCache(keyOrPrefix: string): number {
  let count = 0;

  if (cache.has(keyOrPrefix)) {
    cache.delete(keyOrPrefix);
    return 1;
  }

  // Prefix match: "fred:" invalidates all FRED entries
  for (const key of cache.keys()) {
    if (key.startsWith(keyOrPrefix)) {
      cache.delete(key);
      count++;
    }
  }

  return count;
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats(): {
  entries: number;
  keys: string[];
  staleCount: number;
  revalidatingCount: number;
} {
  const now = Date.now();
  let staleCount = 0;

  // Clean hard-expired entries
  for (const [key, entry] of cache.entries()) {
    if (now > (entry as CacheEntry<unknown>).expiresAt) {
      cache.delete(key);
    } else if (now > (entry as CacheEntry<unknown>).staleAt) {
      staleCount++;
    }
  }

  return {
    entries: cache.size,
    keys: Array.from(cache.keys()),
    staleCount,
    revalidatingCount: revalidating.size,
  };
}
