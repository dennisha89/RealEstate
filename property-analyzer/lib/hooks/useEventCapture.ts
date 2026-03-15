"use client";

import { useCallback, useRef, useEffect } from "react";

/**
 * CROWDSENSE Event Capture Hook
 *
 * Captures anonymous user behavior events, batches them in memory,
 * and flushes to /api/events/ingest every 30 seconds, on page unload,
 * or when the batch reaches 20 events.
 *
 * No PII is collected. Session identity uses a random UUID stored in
 * sessionStorage so it resets when the tab closes.
 */

const FLUSH_INTERVAL_MS = 30_000;
const MAX_BATCH_SIZE = 20;
const INGEST_ENDPOINT = "/api/events/ingest";

/** All recognised event names in the CROWDSENSE system. */
export type CrowdsenseEvent =
  | "market.viewed"
  | "market.watched"
  | "market.unwatched"
  | "property.analyzed"
  | "property.compared"
  | "property.saved"
  | "confluence.ran"
  | "alert.created"
  | "scenario.slider_moved"
  | "workflow.step_completed"
  | "rate.checked"
  | "session.page_viewed";

export interface CapturedEvent {
  event: CrowdsenseEvent;
  timestamp: string;
  sessionId: string;
  properties?: Record<string, string | number | boolean>;
}

/**
 * Returns (or creates) an anonymous session ID.
 * Stored in sessionStorage so it lives only as long as the browser tab.
 */
function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";

  const KEY = "crowdsense_session_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Fire-and-forget POST. Uses `navigator.sendBeacon` when available
 * (works during page unload) and falls back to fetch.
 */
function sendBatch(events: CapturedEvent[]): void {
  if (events.length === 0) return;

  const payload = JSON.stringify({ events });

  // sendBeacon is the most reliable path during beforeunload
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon(INGEST_ENDPOINT, blob);
    if (sent) return;
    // If sendBeacon fails (e.g. payload too large), fall through to fetch
  }

  // Fallback: non-blocking fetch with keepalive so the browser
  // can finish the request even during page teardown.
  fetch(INGEST_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Silently discard on failure -- telemetry is best-effort
  });
}

export function useEventCapture() {
  const queueRef = useRef<CapturedEvent[]>([]);
  const sessionIdRef = useRef<string>("");

  // Lazily resolve the session ID on the client only
  const getResolvedSessionId = useCallback(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = getSessionId();
    }
    return sessionIdRef.current;
  }, []);

  const flush = useCallback(() => {
    if (queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0);
    sendBatch(batch);
  }, []);

  /**
   * Record a CROWDSENSE event.
   *
   * Supported events:
   *   market.viewed, market.watched, market.unwatched
   *   property.analyzed, property.compared, property.saved
   *   confluence.ran        (properties: verdict, score)
   *   alert.created         (properties: metric, threshold)
   *   scenario.slider_moved (properties: sliderName, value)
   *   workflow.step_completed (properties: stepNumber, gateResult)
   *   rate.checked
   *   session.page_viewed   (properties: pageName)
   */
  const capture = useCallback(
    (
      event: CrowdsenseEvent,
      properties?: Record<string, string | number | boolean>,
    ) => {
      const entry: CapturedEvent = {
        event,
        timestamp: new Date().toISOString(),
        sessionId: getResolvedSessionId(),
        properties,
      };
      queueRef.current.push(entry);

      if (queueRef.current.length >= MAX_BATCH_SIZE) {
        flush();
      }
    },
    [flush, getResolvedSessionId],
  );

  useEffect(() => {
    const handleBeforeUnload = () => flush();

    window.addEventListener("beforeunload", handleBeforeUnload);
    const interval = setInterval(flush, FLUSH_INTERVAL_MS);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(interval);
      flush(); // final drain on unmount
    };
  }, [flush]);

  return { capture };
}
