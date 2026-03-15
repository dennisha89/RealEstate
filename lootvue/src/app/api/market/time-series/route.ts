/**
 * GET /api/market/time-series?series=MORTGAGE30US&period=5y
 *
 * Returns historical time-series data from FRED for charting.
 * Supports multiple series and configurable time periods.
 *
 * Query params:
 * - series: FRED series ID (required). Supports comma-separated: MORTGAGE30US,FEDFUNDS
 * - period: 1y, 2y, 5y, 10y, max (default: 5y)
 *
 * Supported series:
 * - MORTGAGE30US: 30-year fixed mortgage rate
 * - MORTGAGE15US: 15-year fixed mortgage rate
 * - FEDFUNDS: Federal funds rate
 * - DGS10: 10-year Treasury yield
 * - MSPUS: Median sales price of houses sold
 * - CSUSHPINSA: Case-Shiller Home Price Index
 * - PERMIT: New private housing permits
 * - PERMIT1: Single-family permits
 * - UNRATE: Unemployment rate
 * - CPIAUCSL: Consumer Price Index
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchFREDData } from "@/lib/engines/data-sources";
import { cachedFetch, CACHE_TTL } from "@/lib/cache";
import { compose, withRateLimit, withCache, jsonError, jsonSuccess } from "@/lib/api/middleware";

const ALLOWED_SERIES = new Set([
  "MORTGAGE30US", "MORTGAGE15US", "FEDFUNDS", "DGS10",
  "MSPUS", "CSUSHPINSA", "PERMIT", "PERMIT1",
  "UNRATE", "CPIAUCSL", "GDP",
]);

const PERIOD_TO_LIMIT: Record<string, number> = {
  "1y": 12,
  "2y": 24,
  "5y": 60,
  "10y": 120,
  "max": 500,
};

async function handler(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return jsonError("FRED_API_KEY not configured", 503);
  }

  const seriesParam = req.nextUrl.searchParams.get("series");
  if (!seriesParam) {
    return jsonError("Query parameter 'series' is required", 400);
  }

  const seriesIds = seriesParam.split(",").map((s) => s.trim().toUpperCase());
  const invalid = seriesIds.filter((s) => !ALLOWED_SERIES.has(s));
  if (invalid.length > 0) {
    return jsonError(`Unknown series: ${invalid.join(", ")}. Allowed: ${Array.from(ALLOWED_SERIES).join(", ")}`, 400);
  }

  if (seriesIds.length > 5) {
    return jsonError("Maximum 5 series per request", 400);
  }

  const period = req.nextUrl.searchParams.get("period") ?? "5y";
  const limit = PERIOD_TO_LIMIT[period];
  if (!limit) {
    return jsonError(`Invalid period. Use: ${Object.keys(PERIOD_TO_LIMIT).join(", ")}`, 400);
  }

  // Fetch all series in parallel with caching
  const results = await Promise.allSettled(
    seriesIds.map((id) =>
      cachedFetch<{ date: string; value: number }[]>(
        `fred:ts:${id}:${period}`,
        async () => {
          const result = await fetchFREDData(apiKey, id);
          if (result.status === "error") return null;
          // Trim to requested period
          const data = result.data.slice(0, limit);
          return { data, source: `FRED (${id})` };
        },
        CACHE_TTL.FRED
      )
    )
  );

  const seriesData: Record<string, { date: string; value: number }[]> = {};
  const sources: string[] = [];

  for (let i = 0; i < seriesIds.length; i++) {
    const id = seriesIds[i];
    const result = results[i];
    if (result.status === "fulfilled" && result.value) {
      // Reverse so oldest is first (FRED returns desc)
      seriesData[id] = [...result.value.data].reverse();
      sources.push(result.value.source);
    } else {
      seriesData[id] = [];
    }
  }

  return jsonSuccess({
    series: seriesData,
    period,
    sources,
    lastUpdated: new Date().toISOString(),
  });
}

export const GET = compose(
  withRateLimit(100, 60_000),
  withCache(60 * 60 * 1000) // 1 hour cache
)(handler);
