import { NextRequest, NextResponse } from "next/server";
import { fetchFREDData } from "@/lib/engines/data-sources";
import { cachedFetch, CACHE_TTL } from "@/lib/cache";
import { z } from "zod";

/**
 * GET /api/time-series?series=MORTGAGE30US,PERMIT,UNRATE&start=2020-01-01
 *
 * Returns FRED time-series data formatted for chart consumption.
 * Uses server-side caching to avoid repeated API calls.
 *
 * Response format:
 * {
 *   series: {
 *     MORTGAGE30US: [{ date: "2024-01", value: 6.95 }, ...],
 *     PERMIT: [{ date: "2024-01", value: 1480000 }, ...],
 *   },
 *   merged: [{ date: "2024-01", MORTGAGE30US: 6.95, PERMIT: 1480000 }, ...],
 *   sources: { MORTGAGE30US: "FRED (real)", ... },
 * }
 */

const querySchema = z.object({
  series: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional(),
});

// Common FRED series for real estate analysis
const ALLOWED_SERIES = new Set([
  "MORTGAGE30US",   // 30-Year Fixed Rate
  "MORTGAGE15US",   // 15-Year Fixed Rate
  "MSPUS",          // Median Sales Price
  "HOUST",          // Housing Starts
  "HOUST1F",        // Housing Starts: 1 Unit
  "PERMIT",         // Building Permits
  "PERMIT1",        // Single Family Permits
  "HSN1F",          // New Home Sales
  "EXHOSLUSM495S",  // Existing Home Sales
  "CSUSHPINSA",     // Case-Shiller Home Price Index (national)
  "USSTHPI",        // All-Transactions HPI
  "UNRATE",         // Unemployment Rate
  "FEDFUNDS",       // Federal Funds Rate
  "CPIAUCSL",       // CPI
  "GDP",            // GDP
  "M2V",            // M2 Money Velocity
  "UMCSENT",        // Consumer Sentiment
  "DGS10",          // 10-Year Treasury
  "NASDAQOMRXMUNI", // Municipal Bond Index
  "RRVRUSQ156N",    // Rental Vacancy Rate
  "EVACANTUSQ176N", // Housing Inventory Estimate
  "ASPNHSUS",       // Avg Sale Price New Homes
  "MSACSR",         // Monthly Supply of New Houses
  "ACTLISCOUUS",    // Active Listing Count
  "MEDDAYONMARUS",  // Median Days on Market
  "MEDLISPRIUS",    // Median Listing Price
  "MEHOINUSA672N",  // Median Household Income
  "POPTHM",         // Population
]);

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = {
      series: url.searchParams.get("series") || "",
      start: url.searchParams.get("start") || undefined,
      end: url.searchParams.get("end") || undefined,
    };

    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "series parameter required (comma-separated FRED series IDs)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.FRED_API_KEY;
    const seriesIds = parsed.data.series
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => ALLOWED_SERIES.has(s))
      .slice(0, 10); // Max 10 series per request

    if (seriesIds.length === 0) {
      return NextResponse.json(
        { error: "No valid series IDs provided", allowed: Array.from(ALLOWED_SERIES).sort() },
        { status: 400 }
      );
    }

    // Fetch each series (with caching)
    const results: Record<string, Array<{ date: string; value: number }>> = {};
    const sources: Record<string, string> = {};

    await Promise.all(
      seriesIds.map(async (seriesId) => {
        const cacheKey = `fred:${seriesId}:${parsed.data.start || ""}:${parsed.data.end || ""}`;

        if (!apiKey) {
          // No API key — return mock FRED-like data
          results[seriesId] = generateMockFREDSeries(seriesId);
          sources[seriesId] = "mock (no FRED_API_KEY configured)";
          return;
        }

        const cached = await cachedFetch(
          cacheKey,
          async () => {
            const result = await fetchFREDData(apiKey, seriesId, parsed.data.start, parsed.data.end);
            if (result.status === "error") return null;
            return { data: result.data, source: result.source };
          },
          CACHE_TTL.FRED
        );

        if (cached) {
          results[seriesId] = cached.data;
          sources[seriesId] = cached.source;
        } else {
          results[seriesId] = generateMockFREDSeries(seriesId);
          sources[seriesId] = "mock (API call failed)";
        }
      })
    );

    // Build merged data (all series aligned by date)
    const allDates = new Set<string>();
    for (const series of Object.values(results)) {
      for (const point of series) {
        allDates.add(point.date);
      }
    }

    const sortedDates = Array.from(allDates).sort();
    const merged = sortedDates.map((date) => {
      const point: Record<string, string | number> = { date };
      for (const [seriesId, series] of Object.entries(results)) {
        const match = series.find((p) => p.date === date);
        if (match) point[seriesId] = match.value;
      }
      return point;
    });

    return NextResponse.json({
      series: results,
      merged,
      sources,
      seriesCount: seriesIds.length,
      dateRange: {
        start: sortedDates[0] || null,
        end: sortedDates[sortedDates.length - 1] || null,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Time series API error:", error);
    return NextResponse.json({ error: "Failed to fetch time series data" }, { status: 500 });
  }
}

/**
 * Generate realistic mock FRED data when no API key is configured.
 * Uses deterministic values based on series ID for consistency.
 */
function generateMockFREDSeries(seriesId: string): Array<{ date: string; value: number }> {
  const points: Array<{ date: string; value: number }> = [];
  const hash = seriesId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const seed = (hash % 100) / 100;

  // Base values by series type
  const baseValues: Record<string, { start: number; trend: number; vol: number }> = {
    MORTGAGE30US: { start: 6.5, trend: 0.005, vol: 0.02 },
    MSPUS: { start: 375000, trend: 0.004, vol: 0.01 },
    HOUST: { start: 1400000, trend: 0.002, vol: 0.04 },
    PERMIT: { start: 1500000, trend: 0.002, vol: 0.03 },
    PERMIT1: { start: 900000, trend: 0.002, vol: 0.03 },
    HSN1F: { start: 650000, trend: 0.001, vol: 0.05 },
    UNRATE: { start: 3.8, trend: -0.002, vol: 0.01 },
    FEDFUNDS: { start: 5.25, trend: -0.003, vol: 0.005 },
    CSUSHPINSA: { start: 310, trend: 0.004, vol: 0.008 },
    USSTHPI: { start: 600, trend: 0.004, vol: 0.008 },
    CPIAUCSL: { start: 310, trend: 0.003, vol: 0.002 },
    GDP: { start: 28000, trend: 0.005, vol: 0.01 },
    M2V: { start: 1.3, trend: 0.001, vol: 0.02 },
    UMCSENT: { start: 65, trend: 0.002, vol: 0.03 },
    DGS10: { start: 4.2, trend: 0.002, vol: 0.02 },
    NASDAQOMRXMUNI: { start: 1200, trend: 0.002, vol: 0.01 },
    ASPNHSUS: { start: 490000, trend: 0.003, vol: 0.02 },
  };

  const config = baseValues[seriesId] || { start: 100 + seed * 900, trend: 0.003, vol: 0.02 };
  let value = config.start;
  let s = hash;

  for (let i = 0; i < 60; i++) {
    const y = 2020 + Math.floor(i / 12);
    const m = (i % 12) + 1;
    s = (s * 16807 + 0) % 2147483647;
    const noise = ((s - 1) / 2147483646 - 0.5) * 2 * config.vol;
    value = value * (1 + config.trend + noise);
    points.push({
      date: `${y}-${String(m).padStart(2, "0")}-01`,
      value: Math.round(value * 100) / 100,
    });
  }

  return points.reverse(); // Most recent first (FRED default)
}
