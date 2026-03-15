import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAggregatedSignals,
  hasRealEvents,
} from "@/lib/events/event-store";

const querySchema = z.object({
  zip: z.string().length(5).optional(),
});

interface CommunitySignal {
  zip: string;
  marketName: string;
  watcherCount: number;
  watcherChange7d: number;
  searchVolume: number;
  searchVolumeChange7d: number;
  comparisonCount: number;
  avgAlertThreshold: {
    capRate: number;
    hyperScore: number;
  };
  sentiment: "bullish" | "neutral" | "bearish";
  hotness: number;
  source: "live" | "mock";
}

// Same market database as the markets page
const MARKETS = [
  { name: "Austin", state: "TX", zip: "78701", hyperScore: 82, capRate: 7.1, signal: "bullish" as const },
  { name: "Nashville", state: "TN", zip: "37201", hyperScore: 76, capRate: 6.5, signal: "bullish" as const },
  { name: "Tampa", state: "FL", zip: "33601", hyperScore: 68, capRate: 6.8, signal: "neutral" as const },
  { name: "Phoenix", state: "AZ", zip: "85001", hyperScore: 52, capRate: 5.8, signal: "bearish" as const },
  { name: "Denver", state: "CO", zip: "80201", hyperScore: 58, capRate: 5.2, signal: "neutral" as const },
  { name: "Raleigh", state: "NC", zip: "27601", hyperScore: 84, capRate: 6.9, signal: "bullish" as const },
  { name: "Charlotte", state: "NC", zip: "28202", hyperScore: 74, capRate: 6.3, signal: "bullish" as const },
  { name: "Dallas", state: "TX", zip: "75201", hyperScore: 70, capRate: 6.0, signal: "neutral" as const },
  { name: "Atlanta", state: "GA", zip: "30301", hyperScore: 72, capRate: 6.5, signal: "bullish" as const },
  { name: "Las Vegas", state: "NV", zip: "89101", hyperScore: 55, capRate: 5.5, signal: "neutral" as const },
];

// ---------------------------------------------------------------------------
// Mock signal generation (deterministic fallback)
// ---------------------------------------------------------------------------

/**
 * Deterministic pseudo-random from a seed string.
 * Returns a value in [0, 1).
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs((Math.sin(hash) * 10000) % 1);
}

function generateMockSignal(market: typeof MARKETS[number]): CommunitySignal {
  const s = market.hyperScore / 100;
  const r1 = seededRandom(market.zip + "watchers");
  const r2 = seededRandom(market.zip + "search");
  const r3 = seededRandom(market.zip + "comp");
  const r4 = seededRandom(market.zip + "threshold");

  // Higher hyperScore -> more watchers, more search volume, higher hotness
  const watcherCount = Math.round(30 + s * 80 + r1 * 20);
  const watcherChange7d = Math.round((s - 0.4) * 50 + (r1 - 0.5) * 20);
  const searchVolume = Math.round(200 + s * 600 + r2 * 150);
  const searchVolumeChange7d = Math.round((s - 0.35) * 40 + (r2 - 0.5) * 15);
  const comparisonCount = Math.round(5 + s * 30 + r3 * 10);

  // Average alert thresholds across "investors" watching this market
  const avgCapRateThreshold = Math.round((5.0 + r4 * 2.5) * 10) / 10;
  const avgHyperScoreThreshold = Math.round(55 + r4 * 25);

  // Composite hotness: weighted blend of watchers, search, and hyperScore
  const hotness = Math.min(
    100,
    Math.max(
      0,
      Math.round(s * 60 + (watcherChange7d > 0 ? 15 : 0) + (searchVolumeChange7d > 0 ? 10 : 0) + r1 * 15)
    )
  );

  return {
    zip: market.zip,
    marketName: `${market.name}, ${market.state}`,
    watcherCount,
    watcherChange7d,
    searchVolume,
    searchVolumeChange7d,
    comparisonCount,
    avgAlertThreshold: {
      capRate: avgCapRateThreshold,
      hyperScore: avgHyperScoreThreshold,
    },
    sentiment: market.signal,
    hotness,
    source: "mock",
  };
}

// ---------------------------------------------------------------------------
// Live signal generation from captured events
// ---------------------------------------------------------------------------

function generateLiveSignal(
  market: typeof MARKETS[number],
): CommunitySignal | null {
  const aggregated = getAggregatedSignals(market.zip);
  if (!aggregated) return null;

  return {
    zip: market.zip,
    marketName: `${market.name}, ${market.state}`,
    watcherCount: aggregated.watcherCount,
    // 7d change is not computable from a simple in-memory store
    // without time-bucketed retention -- fall back to 0
    watcherChange7d: 0,
    searchVolume: aggregated.searchVolume,
    searchVolumeChange7d: 0,
    comparisonCount: aggregated.comparisonCount,
    avgAlertThreshold: aggregated.avgAlertThreshold,
    sentiment: aggregated.sentiment,
    hotness: aggregated.hotness,
    source: "live",
  };
}

/**
 * For a given market, return the live signal if real events exist,
 * otherwise fall back to the deterministic mock.
 */
function resolveSignal(market: typeof MARKETS[number]): CommunitySignal {
  if (hasRealEvents(market.zip)) {
    const live = generateLiveSignal(market);
    if (live) return live;
  }
  return generateMockSignal(market);
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

/**
 * GET /api/community-signals
 *
 * Returns aggregated anonymous user behavior signals for tracked markets.
 * Optional query param: ?zip=78701 to filter to a single market.
 *
 * When real CROWDSENSE events have been captured for a market, signals
 * are computed from live data. Otherwise, deterministic mock signals are
 * returned as a fallback.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      zip: searchParams.get("zip") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { zip } = parsed.data;

    if (zip) {
      const market = MARKETS.find((m) => m.zip === zip);
      if (!market) {
        return NextResponse.json(
          { error: `No market data for zip ${zip}` },
          { status: 404 }
        );
      }
      const signal = resolveSignal(market);
      return NextResponse.json({
        signals: [signal],
        generatedAt: new Date().toISOString(),
      });
    }

    // Return all markets, sorted by hotness descending
    const signals = MARKETS.map(resolveSignal).sort(
      (a, b) => b.hotness - a.hotness
    );

    // Determine how many signals came from live data vs mock
    const liveCount = signals.filter((s) => s.source === "live").length;
    const mockCount = signals.filter((s) => s.source === "mock").length;

    // Aggregate stats across all markets
    const totalWatchers = signals.reduce((sum, s) => sum + s.watcherCount, 0);
    const totalSearches = signals.reduce((sum, s) => sum + s.searchVolume, 0);
    const avgCapRateTarget =
      Math.round(
        (signals.reduce((sum, s) => sum + s.avgAlertThreshold.capRate, 0) / signals.length) * 10
      ) / 10;

    // Most compared: top 3 markets by comparison count
    const topCompared = [...signals]
      .sort((a, b) => b.comparisonCount - a.comparisonCount)
      .slice(0, 3)
      .map((s) => s.marketName.split(",")[0]);

    return NextResponse.json({
      signals,
      aggregate: {
        totalWatchers,
        totalSearches,
        avgCapRateTarget,
        topComparedMarkets: topCompared,
        hotMarkets: signals.filter((s) => s.hotness > 70).length,
      },
      sources: { live: liveCount, mock: mockCount },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Community signals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch community signals" },
      { status: 500 }
    );
  }
}
