/**
 * API Route Middleware
 *
 * Composable middleware for Next.js API routes:
 * - withValidation: Zod schema validation on request body/params
 * - withRateLimit: In-memory sliding window rate limiter
 * - withCache: Response caching with TTL
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApiContext {
  params?: Record<string, string>;
}

type RouteHandler = (
  req: NextRequest,
  ctx: ApiContext
) => Promise<NextResponse>;

// ─── Validation Middleware ───────────────────────────────────────────────────

/**
 * Validates request body or query params against a Zod schema.
 * Returns 400 with structured error on failure.
 */
export function withValidation<T>(
  schema: z.ZodType<T>,
  source: "body" | "query" = "body"
) {
  return (handler: (req: NextRequest, ctx: ApiContext & { validated: T }) => Promise<NextResponse>) => {
    return async (req: NextRequest, ctx: ApiContext): Promise<NextResponse> => {
      let raw: unknown;

      if (source === "body") {
        try {
          raw = await req.json();
        } catch {
          return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 }
          );
        }
      } else {
        const entries = Object.fromEntries(req.nextUrl.searchParams.entries());
        raw = entries;
      }

      const result = schema.safeParse(raw);
      if (!result.success) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: result.error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 }
        );
      }

      return handler(req, { ...ctx, validated: result.data });
    };
  };
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 120_000;
    for (const [key, entry] of rateLimitStore.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) rateLimitStore.delete(key);
    }
  }, 300_000);
}

/**
 * Sliding window rate limiter.
 * Identifies clients by IP (X-Forwarded-For) or falls back to a default key.
 */
export function withRateLimit(maxRequests: number = 100, windowMs: number = 60_000) {
  return (handler: RouteHandler): RouteHandler => {
    return async (req: NextRequest, ctx: ApiContext): Promise<NextResponse> => {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "anonymous";

      const key = `${ip}:${req.nextUrl.pathname}`;
      const now = Date.now();
      const entry = rateLimitStore.get(key) || { timestamps: [] };

      // Remove timestamps outside window
      entry.timestamps = entry.timestamps.filter((t) => t > now - windowMs);

      if (entry.timestamps.length >= maxRequests) {
        const retryAfter = Math.ceil(
          ((entry.timestamps[0] ?? now) + windowMs - now) / 1000
        );
        return NextResponse.json(
          { error: "Rate limit exceeded", retryAfterSeconds: retryAfter },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(maxRequests),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }

      entry.timestamps.push(now);
      rateLimitStore.set(key, entry);

      const response = await handler(req, ctx);
      response.headers.set("X-RateLimit-Limit", String(maxRequests));
      response.headers.set(
        "X-RateLimit-Remaining",
        String(maxRequests - entry.timestamps.length)
      );

      return response;
    };
  };
}

// ─── Response Caching ───────────────────────────────────────────────────────

interface CachedResponse {
  body: string;
  status: number;
  headers: Record<string, string>;
  expiresAt: number;
}

const responseCache = new Map<string, CachedResponse>();

/**
 * Caches successful (2xx) responses for the given TTL.
 * Cache key is based on the full URL including query params.
 */
export function withCache(ttlMs: number) {
  return (handler: RouteHandler): RouteHandler => {
    return async (req: NextRequest, ctx: ApiContext): Promise<NextResponse> => {
      // Only cache GET requests
      if (req.method !== "GET") {
        return handler(req, ctx);
      }

      const cacheKey = req.nextUrl.toString();
      const cached = responseCache.get(cacheKey);

      if (cached && Date.now() < cached.expiresAt) {
        const headers = new Headers(cached.headers);
        headers.set("X-Cache", "HIT");
        headers.set(
          "X-Cache-Expires",
          new Date(cached.expiresAt).toISOString()
        );
        return new NextResponse(cached.body, {
          status: cached.status,
          headers,
        });
      }

      const response = await handler(req, ctx);

      // Only cache successful responses
      if (response.status >= 200 && response.status < 300) {
        const body = await response.text();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        headers["content-type"] = "application/json";

        responseCache.set(cacheKey, {
          body,
          status: response.status,
          headers,
          expiresAt: Date.now() + ttlMs,
        });

        const responseHeaders = new Headers(headers);
        responseHeaders.set("X-Cache", "MISS");
        return new NextResponse(body, {
          status: response.status,
          headers: responseHeaders,
        });
      }

      return response;
    };
  };
}

// ─── Compose Middleware ─────────────────────────────────────────────────────

/**
 * Composes multiple middleware wrappers into a single handler.
 * Applied right-to-left (innermost first).
 *
 * Usage:
 *   compose(withRateLimit(100), withCache(60_000))(handler)
 */
export function compose(
  ...middlewares: ((handler: RouteHandler) => RouteHandler)[]
): (handler: RouteHandler) => RouteHandler {
  return (handler: RouteHandler) =>
    middlewares.reduceRight((h, mw) => mw(h), handler);
}

// ─── Error Response Helpers ─────────────────────────────────────────────────

export function jsonError(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, ...meta });
}
