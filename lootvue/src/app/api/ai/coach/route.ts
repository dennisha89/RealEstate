/**
 * POST /api/ai/coach
 *
 * Streaming AI investment coach endpoint powered by Claude.
 *
 * Request body:
 * {
 *   prompt: string (required) — the user's question or request
 *   context?: string — grounding data from engines (property metrics, market data, etc.)
 * }
 *
 * Response: Server-Sent Events stream
 *   data: {"text": "..."}
 *   ...
 *   data: [DONE]
 *
 * The coach never fabricates financial data — it only references data
 * provided in the context. All outputs are labeled as AI-generated.
 */

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

// ─── Input Validation ────────────────────────────────────────────────────────

const CoachRequestSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(4000, "Prompt must be under 4,000 characters"),
  context: z
    .string()
    .max(50000, "Context must be under 50,000 characters")
    .optional(),
});

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(context?: string): string {
  const base = `You are LootVue's AI Investment Coach — a sharp, data-driven real estate analyst who speaks plain English and ties everything back to money impact.

RULES:
- NEVER fabricate financial data, property values, cap rates, rents, or market statistics. You only reference data explicitly provided in the context below.
- If the user asks about data you do not have, say so clearly: "I don't have that data point — here's what I can tell you from what's available."
- Every claim must cite the specific metric or data source from the provided context.
- Use specific numbers — "$48,000/yr cash flow" not "good cash flow."
- Negative values in parentheses: ($2,500) not -$2,500.
- Format percentages to one decimal: 6.5% not ~7%.
- When recommending BUY, HOLD, or PASS, always state the confidence level and the top 3 reasons driving the recommendation.
- Keep responses concise and actionable. Investors want answers, not essays.
- You are informational only — never present advice as a guarantee or substitute for professional financial counsel.
- When data is insufficient for a strong opinion, say "DIG DEEPER" and specify exactly what additional data would change the analysis.`;

  if (context) {
    return `${base}

VERIFIED DATA (reference this, do not invent beyond it):
${context}`;
  }

  return `${base}

No property or market data was provided. You may answer general real estate investment questions, but clearly state when you are speaking from general knowledge rather than specific data.`;
}

// ─── Rate Limiting (in-memory, per-IP) ───────────────────────────────────────

interface RateBucket {
  timestamps: number[];
}

const rateLimits = new Map<string, RateBucket>();
const RATE_LIMIT_MAX = 20; // Stricter than REST routes — each call costs API credits
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const bucket = rateLimits.get(ip) ?? { timestamps: [] };

  // Evict timestamps outside the window
  bucket.timestamps = bucket.timestamps.filter((t) => t > now - RATE_LIMIT_WINDOW_MS);

  if (bucket.timestamps.length >= RATE_LIMIT_MAX) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  bucket.timestamps.push(now);
  rateLimits.set(ip, bucket);

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - bucket.timestamps.length,
    retryAfterSec: 0,
  };
}

// Periodic cleanup to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS * 2;
    for (const [key, bucket] of rateLimits.entries()) {
      bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
      if (bucket.timestamps.length === 0) rateLimits.delete(key);
    }
  }, 300_000);
}

// ─── SSE Helpers ─────────────────────────────────────────────────────────────

function sseHeaders(rateLimitRemaining: number): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Content-Type-Options": "nosniff",
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
    "X-RateLimit-Remaining": String(rateLimitRemaining),
  };
}

function encodeSSE(data: string): Uint8Array {
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Check API key availability
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "AI coach unavailable — ANTHROPIC_API_KEY not configured",
        code: "AI_NOT_CONFIGURED",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Rate limit check
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        code: "RATE_LIMITED",
        retryAfterSeconds: rateCheck.retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateCheck.retryAfterSec),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body", code: "INVALID_JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const validation = CoachRequestSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: validation.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { prompt, context } = validation.data;

  // 4. Stream response via SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic({ apiKey });

        const messageStream = client.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          temperature: 0.2,
          system: buildSystemPrompt(context),
          messages: [{ role: "user", content: prompt }],
        });

        messageStream.on("text", (text) => {
          try {
            controller.enqueue(encodeSSE(JSON.stringify({ text })));
          } catch {
            // Controller may be closed if client disconnected
          }
        });

        // Wait for stream to complete
        await messageStream.finalMessage();

        // Signal completion
        controller.enqueue(encodeSSE("[DONE]"));
        controller.close();
      } catch (err: unknown) {
        // Determine error type for appropriate response
        const errorMessage =
          err instanceof Anthropic.APIError
            ? `Claude API error: ${err.message}`
            : err instanceof Anthropic.APIConnectionError
              ? "Unable to reach Claude API — check network connectivity"
              : err instanceof Anthropic.RateLimitError
                ? "Claude API rate limit exceeded — try again in a moment"
                : err instanceof Anthropic.AuthenticationError
                  ? "Claude API authentication failed — check API key"
                  : "AI analysis encountered an unexpected error";

        // Log server-side for debugging (no PII)
        console.error("[/api/ai/coach] Stream error:", {
          type: err instanceof Error ? err.constructor.name : "Unknown",
          message: err instanceof Error ? err.message : String(err),
        });

        try {
          controller.enqueue(
            encodeSSE(JSON.stringify({ error: errorMessage }))
          );
          controller.enqueue(encodeSSE("[DONE]"));
          controller.close();
        } catch {
          // Controller already closed — client disconnected
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: sseHeaders(rateCheck.remaining),
  });
}
