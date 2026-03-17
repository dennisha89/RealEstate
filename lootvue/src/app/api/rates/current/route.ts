/**
 * GET /api/rates/current
 *
 * Returns current mortgage rates and macro indicators from FRED.
 * This is the first real API route — proving the data pipeline works.
 *
 * Data sources:
 * - FRED MORTGAGE30US: 30-year fixed mortgage rate (weekly)
 * - FRED MORTGAGE15US: 15-year fixed mortgage rate (weekly)
 * - FRED FEDFUNDS: Federal funds effective rate (daily)
 * - FRED DGS10: 10-year Treasury yield (daily)
 *
 * Cache: 1 hour (rates update weekly/daily)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchFREDData } from "@/lib/engines/data-sources";
import { cachedFetch, CACHE_TTL } from "@/lib/cache";
import { compose, withRateLimit, withCache, jsonError, jsonSuccess } from "@/lib/api/middleware";

interface RateData {
  mortgage30yr: number | null;
  mortgage15yr: number | null;
  fedFunds: number | null;
  treasury10yr: number | null;
  mortgage30yrPrior: number | null;
  mortgage30yrChange: number | null;
  fedFundsPrior: number | null;
  spread: number | null;
  yieldCurve: "normal" | "flat" | "inverted" | null;
  rateDirection: "rising" | "stable" | "falling" | null;
  lastUpdated: string;
  sources: string[];
}

const SERIES = {
  MORTGAGE30US: "30yr Fixed Mortgage",
  MORTGAGE15US: "15yr Fixed Mortgage",
  FEDFUNDS: "Federal Funds Rate",
  DGS10: "10yr Treasury Yield",
} as const;

async function handler(_req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    // Return realistic fallback rates when FRED API key not configured
    const fallbackRates: RateData = {
      mortgage30yr: 6.87,
      mortgage15yr: 6.12,
      fedFunds: 4.33,
      treasury10yr: 4.28,
      mortgage30yrPrior: 6.75,
      mortgage30yrChange: 0.12,
      fedFundsPrior: 4.33,
      spread: 2.54,
      yieldCurve: "flat",
      rateDirection: "rising",
      lastUpdated: new Date().toISOString(),
      sources: ["Fallback (set FRED_API_KEY for live data)"],
    };
    return jsonSuccess(fallbackRates, { meta: { cached: false, freshness: "fallback — no API key" } });
  }

  const sources: string[] = [];

  // Fetch all 4 series in parallel, with caching
  const [mortgage30, mortgage15, fedFunds, treasury10] = await Promise.allSettled([
    cachedFetch<{ date: string; value: number }[]>(
      "fred:MORTGAGE30US",
      async () => {
        const result = await fetchFREDData(apiKey, "MORTGAGE30US");
        if (result.status === "error") return null;
        sources.push("FRED (MORTGAGE30US)");
        return { data: result.data, source: "FRED (MORTGAGE30US)" };
      },
      CACHE_TTL.FRED
    ),
    cachedFetch<{ date: string; value: number }[]>(
      "fred:MORTGAGE15US",
      async () => {
        const result = await fetchFREDData(apiKey, "MORTGAGE15US");
        if (result.status === "error") return null;
        sources.push("FRED (MORTGAGE15US)");
        return { data: result.data, source: "FRED (MORTGAGE15US)" };
      },
      CACHE_TTL.FRED
    ),
    cachedFetch<{ date: string; value: number }[]>(
      "fred:FEDFUNDS",
      async () => {
        const result = await fetchFREDData(apiKey, "FEDFUNDS");
        if (result.status === "error") return null;
        sources.push("FRED (FEDFUNDS)");
        return { data: result.data, source: "FRED (FEDFUNDS)" };
      },
      CACHE_TTL.FRED
    ),
    cachedFetch<{ date: string; value: number }[]>(
      "fred:DGS10",
      async () => {
        const result = await fetchFREDData(apiKey, "DGS10");
        if (result.status === "error") return null;
        sources.push("FRED (DGS10)");
        return { data: result.data, source: "FRED (DGS10)" };
      },
      CACHE_TTL.FRED
    ),
  ]);

  // Extract latest values
  const get = (
    r: PromiseSettledResult<{ data: { date: string; value: number }[]; source: string; cached: boolean } | null>,
    offset = 0
  ): number | null => {
    if (r.status !== "fulfilled" || !r.value) return null;
    return r.value.data[offset]?.value ?? null;
  };

  const m30 = get(mortgage30);
  const m30Prior = get(mortgage30, 4); // ~1 month ago
  const m15 = get(mortgage15);
  const ff = get(fedFunds);
  const ffPrior = get(fedFunds, 1);
  const t10 = get(treasury10);

  // Derived metrics
  const spread = m30 !== null && ff !== null ? Math.round((m30 - ff) * 100) / 100 : null;

  let yieldCurve: RateData["yieldCurve"] = null;
  if (ff !== null && t10 !== null) {
    const diff = t10 - ff;
    yieldCurve = diff > 0.25 ? "normal" : diff < -0.25 ? "inverted" : "flat";
  }

  let rateDirection: RateData["rateDirection"] = null;
  if (m30 !== null && m30Prior !== null) {
    const change = m30 - m30Prior;
    rateDirection = change > 0.15 ? "rising" : change < -0.15 ? "falling" : "stable";
  }

  // Track which sources were cached vs fresh
  const allResults = [mortgage30, mortgage15, fedFunds, treasury10];
  for (const r of allResults) {
    if (r.status === "fulfilled" && r.value) {
      const src = r.value.source.replace(" (cached)", "");
      if (!sources.includes(src)) sources.push(src);
    }
  }

  const rateData: RateData = {
    mortgage30yr: m30,
    mortgage15yr: m15,
    fedFunds: ff,
    treasury10yr: t10,
    mortgage30yrPrior: m30Prior,
    mortgage30yrChange: m30 !== null && m30Prior !== null ? Math.round((m30 - m30Prior) * 100) / 100 : null,
    fedFundsPrior: ffPrior,
    spread,
    yieldCurve,
    rateDirection,
    lastUpdated: new Date().toISOString(),
    sources,
  };

  return jsonSuccess(rateData, {
    meta: {
      cached: allResults.some((r) => r.status === "fulfilled" && r.value?.cached),
      freshness: "FRED updates weekly (mortgage) and daily (fed funds, treasury)",
    },
  });
}

// Apply middleware: rate limit + response cache
export const GET = compose(
  withRateLimit(100, 60_000),
  withCache(60 * 60 * 1000) // 1 hour
)(handler);
