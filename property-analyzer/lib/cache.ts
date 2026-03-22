/**
 * In-memory cache with TTL support.
 * Used server-side to avoid repeated API calls within the same time window.
 *
 * In production, replace with Redis for multi-instance deployments.
 * For a single Next.js server, this is sufficient and zero-cost.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  source: string;
  fetchedAt: string;
}

const cache = new Map<string, CacheEntry<unknown>>();

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
 * Get cached data if it exists and hasn't expired.
 */
export function getCached<T>(key: string): CacheEntry<T> | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry;
}

/**
 * Store data in cache with a TTL.
 */
export function setCache<T>(key: string, data: T, source: string, ttlMs: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    source,
    fetchedAt: new Date().toISOString(),
  });
}

/**
 * Fetch with cache — checks cache first, calls fetcher if miss.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<{ data: T; source: string } | null>,
  ttlMs: number = CACHE_TTL.DEFAULT
): Promise<{ data: T; source: string; cached: boolean } | null> {
  // Check cache
  const cached = getCached<T>(key);
  if (cached) {
    return { data: cached.data, source: `${cached.source} (cached)`, cached: true };
  }

  // Fetch fresh
  const result = await fetcher();
  if (!result) return null;

  // Store in cache
  setCache(key, result.data, result.source, ttlMs);

  return { data: result.data, source: result.source, cached: false };
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats(): {
  entries: number;
  keys: string[];
} {
  // Clean expired entries first
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > (entry as CacheEntry<unknown>).expiresAt) {
      cache.delete(key);
    }
  }

  return {
    entries: cache.size,
    keys: Array.from(cache.keys()),
  };
}
