/**
 * In-memory rate limiter for API routes.
 *
 * Implements a sliding window counter per IP address.
 * For production multi-instance deployments, replace with
 * Redis-backed rate limiting (e.g., @upstash/ratelimit).
 *
 * Usage in any API route:
 *   const rateLimitResult = checkRateLimit(request);
 *   if (rateLimitResult) return rateLimitResult;
 *
 * @default 100 requests per 60 seconds per IP
 */

import { NextRequest, NextResponse } from "next/server";

/** Rate limit entry per IP: request count and window reset timestamp */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/** In-memory store — replaced by Redis in production */
const store = new Map<string, RateLimitEntry>();

/** Clean up expired entries every 5 minutes to prevent memory leak */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Check rate limit for an incoming request.
 *
 * @param request - The Next.js request object
 * @param limit - Maximum requests allowed in the window (default: 100)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns NextResponse with 429 status if rate limited, or null if allowed
 */
export function checkRateLimit(
  request: NextRequest,
  limit: number = 100,
  windowMs: number = 60_000
): NextResponse | null {
  cleanupExpiredEntries();

  // Extract client IP from headers (proxy-aware)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const entry = store.get(ip);

  // First request or window expired — reset counter
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }

  // Increment counter
  entry.count += 1;

  // Over limit — return 429
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}
