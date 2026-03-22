/**
 * useAiInsight — Streams AI-generated insights from /api/ai/coach
 *
 * Connects AiInsightStrip components to the Claude-powered coaching endpoint.
 * Uses fetch + ReadableStream (not EventSource) because the endpoint is POST.
 *
 * Features:
 *   - SSE stream parsing (data: {"text":"..."} format)
 *   - Module-level cache keyed by prompt hash (avoids redundant API calls)
 *   - Debounce: skips re-fetch if prompt hasn't changed
 *   - Graceful error handling — returns error string, never crashes
 *   - `refresh()` to manually re-trigger
 *   - `enabled` flag to skip API call entirely (e.g., no data yet)
 *
 * Data flow:
 *   [Page] -> useAiInsight({ prompt, context }) -> POST /api/ai/coach -> SSE stream -> accumulated text
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseAiInsightOptions {
  /** The question or instruction sent to Claude */
  prompt: string;
  /** Grounding data (engine outputs, metrics, etc.) — injected as system context */
  context?: string;
  /** Set false to skip the API call (e.g., when data isn't loaded yet). Default: true */
  enabled?: boolean;
}

export interface UseAiInsightResult {
  /** Accumulated AI response text */
  text: string;
  /** True while the SSE stream is active */
  isStreaming: boolean;
  /** Error message if the request failed, null otherwise */
  error: string | null;
  /** Re-trigger the AI fetch (bypasses cache) */
  refresh: () => void;
}

// ─── Module-level cache ──────────────────────────────────────────────────────

interface CacheEntry {
  text: string;
  fetchedAt: number;
}

const insightCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Simple hash for cache key — djb2 variant.
 * Not cryptographic; just needs to be fast and low-collision for short strings.
 */
function hashPrompt(prompt: string, context?: string): string {
  const input = `${prompt}::${context ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return String(hash >>> 0);
}

// ─── SSE Line Parser ─────────────────────────────────────────────────────────

/**
 * Parse a single SSE `data:` line from the /api/ai/coach stream.
 *
 * Expected formats:
 *   data: {"text":"..."}     -> returns { text: "..." }
 *   data: {"error":"..."}    -> returns { error: "..." }
 *   data: [DONE]             -> returns { done: true }
 */
function parseSSELine(line: string): { text?: string; error?: string; done?: boolean } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data: ") && !trimmed.startsWith("data:")) return null;

  const payload = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed.slice(5);

  if (payload === "[DONE]") return { done: true };

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (typeof parsed.text === "string") return { text: parsed.text };
    if (typeof parsed.error === "string") return { error: parsed.error };
    return null;
  } catch {
    // Malformed JSON — skip this line
    return null;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAiInsight({
  prompt,
  context,
  enabled = true,
}: UseAiInsightOptions): UseAiInsightResult {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the last prompt we fetched to avoid re-fetching the same prompt
  const lastPromptHashRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Counter to force re-fetch on refresh()
  const refreshCountRef = useRef(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchInsight = useCallback(
    async (forceRefresh: boolean) => {
      if (!enabled || !prompt) {
        setText("");
        setIsStreaming(false);
        setError(null);
        return;
      }

      const key = hashPrompt(prompt, context);

      // Debounce: skip if same prompt and not a forced refresh
      if (!forceRefresh && key === lastPromptHashRef.current) {
        return;
      }

      // Check cache (unless forced refresh)
      if (!forceRefresh) {
        const cached = insightCache.get(key);
        if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          setText(cached.text);
          setIsStreaming(false);
          setError(null);
          lastPromptHashRef.current = key;
          return;
        }
      }

      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      lastPromptHashRef.current = key;
      setText("");
      setIsStreaming(true);
      setError(null);

      try {
        const response = await fetch("/api/ai/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, context }),
          signal: controller.signal,
        });

        // Handle non-streaming error responses
        if (!response.ok) {
          let errorMsg = "AI analysis unavailable";
          try {
            const errBody = (await response.json()) as Record<string, unknown>;
            if (typeof errBody.error === "string") errorMsg = errBody.error;
          } catch {
            errorMsg = `AI coach returned HTTP ${response.status}`;
          }
          setError(errorMsg);
          setIsStreaming(false);
          return;
        }

        // Stream the SSE response
        const reader = response.body?.getReader();
        if (!reader) {
          setError("AI analysis unavailable — no response stream");
          setIsStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE uses double newline as message separator
          const messages = buffer.split("\n");
          // Keep the last incomplete chunk in the buffer
          buffer = messages.pop() ?? "";

          for (const line of messages) {
            const parsed = parseSSELine(line);
            if (!parsed) continue;

            if (parsed.done) {
              // Stream complete
              break;
            }

            if (parsed.error) {
              setError(parsed.error);
              setIsStreaming(false);
              reader.cancel();
              return;
            }

            if (parsed.text) {
              accumulated += parsed.text;
              setText(accumulated);
            }
          }
        }

        // Cache the final result
        if (accumulated.length > 0) {
          insightCache.set(key, {
            text: accumulated,
            fetchedAt: Date.now(),
          });
        }

        setIsStreaming(false);
      } catch (err: unknown) {
        // AbortError is expected when we cancel in-flight requests
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }

        const msg =
          err instanceof Error ? err.message : "AI analysis unavailable";
        setError(msg);
        setIsStreaming(false);
      }
    },
    [prompt, context, enabled]
  );

  // Run on mount and when prompt/context/enabled changes
  useEffect(() => {
    fetchInsight(false);

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInsight]);

  // Handle refresh trigger
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchInsight(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const refresh = useCallback(() => {
    // Invalidate cache for this prompt
    const key = hashPrompt(prompt, context);
    insightCache.delete(key);
    lastPromptHashRef.current = null;
    refreshCountRef.current += 1;
    setRefreshTrigger(refreshCountRef.current);
  }, [prompt, context]);

  return { text, isStreaming, error, refresh };
}
