/**
 * Server-side in-memory event store for CROWDSENSE.
 * Extracted from the route file so aggregation helpers can be imported
 * by other routes without violating Next.js route export rules.
 *
 * In production, replace with Supabase / TimescaleDB.
 */

export interface StoredEvent {
  event: string;
  timestamp: string;
  sessionId: string;
  zip?: string;
  properties?: Record<string, string | number | boolean>;
}

export interface AggregatedSignals {
  watcherCount: number;
  uniqueSessions: number;
  searchVolume: number;
  comparisonCount: number;
  confluenceRuns: number;
  avgConfluenceScore: number;
  alertCount: number;
  avgAlertThreshold: { capRate: number; hyperScore: number };
  sentiment: "bullish" | "neutral" | "bearish";
  hotness: number;
  eventCount: number;
}

const eventStore = new Map<string, StoredEvent[]>();
const MAX_EVENTS_PER_BUCKET = 5_000;

export function storeEvent(evt: StoredEvent): void {
  const key = evt.zip ?? "__global__";
  let bucket = eventStore.get(key);
  if (!bucket) {
    bucket = [];
    eventStore.set(key, bucket);
  }
  bucket.push(evt);
  if (bucket.length > MAX_EVENTS_PER_BUCKET) {
    bucket.splice(0, bucket.length - MAX_EVENTS_PER_BUCKET);
  }
}

export function getAggregatedSignals(zip?: string): AggregatedSignals | null {
  let events: StoredEvent[];
  if (zip) {
    events = eventStore.get(zip) ?? [];
  } else {
    events = [];
    for (const bucket of eventStore.values()) {
      events = events.concat(bucket);
    }
  }
  if (events.length === 0) return null;

  const sessionSet = new Set<string>();
  events.forEach((e) => sessionSet.add(e.sessionId));

  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.event] = (counts[e.event] ?? 0) + 1;
  }

  const watcherCount = (counts["market.watched"] ?? 0) - (counts["market.unwatched"] ?? 0);
  const searchVolume = (counts["market.viewed"] ?? 0) + (counts["property.analyzed"] ?? 0) + (counts["session.page_viewed"] ?? 0);
  const comparisonCount = counts["property.compared"] ?? 0;
  const confluenceRuns = counts["confluence.ran"] ?? 0;

  let confluenceScoreSum = 0;
  let confluenceScoreCount = 0;
  const confluenceEvents = events.filter((e) => e.event === "confluence.ran");
  for (const e of confluenceEvents) {
    const score = e.properties?.["score"];
    if (typeof score === "number") { confluenceScoreSum += score; confluenceScoreCount += 1; }
  }
  const avgConfluenceScore = confluenceScoreCount > 0 ? Math.round((confluenceScoreSum / confluenceScoreCount) * 10) / 10 : 0;

  const alertEvents = events.filter((e) => e.event === "alert.created");
  const alertCount = alertEvents.length;
  let capRateSum = 0, capRateCount = 0, hyperScoreSum = 0, hyperScoreCount = 0;
  for (const e of alertEvents) {
    const metric = e.properties?.["metric"];
    const threshold = e.properties?.["threshold"];
    if (metric === "capRate" && typeof threshold === "number") { capRateSum += threshold; capRateCount += 1; }
    if (metric === "hyperScore" && typeof threshold === "number") { hyperScoreSum += threshold; hyperScoreCount += 1; }
  }

  const avgCapRate = capRateCount > 0 ? Math.round((capRateSum / capRateCount) * 10) / 10 : 6.0;
  const avgHyperScore = hyperScoreCount > 0 ? Math.round(hyperScoreSum / hyperScoreCount) : 70;

  let bullishVotes = 0, bearishVotes = 0;
  for (const e of confluenceEvents) {
    const verdict = e.properties?.["verdict"];
    if (verdict === "buy" || verdict === "bullish") bullishVotes += 1;
    if (verdict === "avoid" || verdict === "bearish") bearishVotes += 1;
  }
  let sentiment: "bullish" | "neutral" | "bearish" = "neutral";
  if (bullishVotes > bearishVotes * 1.5) sentiment = "bullish";
  else if (bearishVotes > bullishVotes * 1.5) sentiment = "bearish";

  const activityScore = Math.min(100, Math.round(
    (sessionSet.size * 5 + searchVolume * 0.5 + comparisonCount * 3 + confluenceRuns * 4) / Math.max(1, events.length / 50)
  ));

  return {
    watcherCount: Math.max(0, watcherCount), uniqueSessions: sessionSet.size,
    searchVolume, comparisonCount, confluenceRuns, avgConfluenceScore,
    alertCount, avgAlertThreshold: { capRate: avgCapRate, hyperScore: avgHyperScore },
    sentiment, hotness: activityScore, eventCount: events.length,
  };
}

export function hasRealEvents(zip?: string): boolean {
  if (zip) { const bucket = eventStore.get(zip); return !!bucket && bucket.length > 0; }
  return eventStore.size > 0;
}
