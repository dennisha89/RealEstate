/**
 * GET /api/market/rankings
 *
 * Returns top market rankings computed from real Census + FRED data.
 * Fetches demographics for a fixed set of top investment markets
 * and ranks them by a simplified HyperScore.
 *
 * Free APIs used:
 * - Census ACS (population, income, education)
 * - FRED (mortgage rates, unemployment)
 */

import { NextRequest } from "next/server";
import { cachedFetch, CACHE_TTL } from "@/lib/cache";
import { fetchRealDemographics, fetchRealFREDData } from "@/lib/engines/data-bridge";
import { compose, withRateLimit, withCache, jsonError, jsonSuccess } from "@/lib/api/middleware";

// Top investment markets to rank
const TOP_MARKETS: { name: string; zip: string; state: string }[] = [
  { name: "Austin, TX", zip: "78745", state: "TX" },
  { name: "Raleigh, NC", zip: "27601", state: "NC" },
  { name: "Tampa, FL", zip: "33602", state: "FL" },
  { name: "Phoenix, AZ", zip: "85004", state: "AZ" },
  { name: "Nashville, TN", zip: "37203", state: "TN" },
  { name: "Charlotte, NC", zip: "28202", state: "NC" },
  { name: "Dallas, TX", zip: "75201", state: "TX" },
  { name: "Atlanta, GA", zip: "30303", state: "GA" },
  { name: "Denver, CO", zip: "80202", state: "CO" },
  { name: "Jacksonville, FL", zip: "32202", state: "FL" },
  { name: "San Antonio, TX", zip: "78205", state: "TX" },
  { name: "Columbus, OH", zip: "43215", state: "OH" },
  { name: "Indianapolis, IN", zip: "46204", state: "IN" },
  { name: "Detroit, MI", zip: "48226", state: "MI" },
  { name: "Cleveland, OH", zip: "44113", state: "OH" },
];

interface MarketRanking {
  name: string;
  zip: string;
  state: string;
  score: number;
  population: number;
  medianIncome: number;
  populationGrowth: number;
  incomeGrowth: number;
  signal: "Buy" | "Hold" | "Watch";
  trend: string;
  dataSource: string;
}

async function handler(_req: NextRequest) {
  const censusKey = process.env.CENSUS_API_KEY;
  const fredKey = process.env.FRED_API_KEY;

  if (!censusKey && !fredKey) {
    return jsonError("At least CENSUS_API_KEY or FRED_API_KEY must be configured", 503);
  }

  // Fetch FRED macro data (shared across all markets)
  const fredData = fredKey
    ? await cachedFetch("fred:macro:rankings", () => fetchRealFREDData(), CACHE_TTL.FRED)
    : null;

  // Fetch demographics for all markets in parallel
  const demoResults = await Promise.allSettled(
    TOP_MARKETS.map((market) =>
      cachedFetch(
        `census:rankings:${market.zip}`,
        () => fetchRealDemographics(market.zip),
        CACHE_TTL.CENSUS
      )
    )
  );

  const rankings: MarketRanking[] = [];

  for (let i = 0; i < TOP_MARKETS.length; i++) {
    const market = TOP_MARKETS[i];
    const demoResult = demoResults[i];

    if (demoResult.status !== "fulfilled" || !demoResult.value) {
      // Skip markets where Census data is unavailable
      continue;
    }

    const demo = demoResult.value.data;
    const pop = demo.population.current;
    const income = demo.medianIncome.current;

    // Calculate growth rates
    const popGrowth = demo.population.oneYearAgo > 0
      ? ((pop - demo.population.oneYearAgo) / demo.population.oneYearAgo) * 100
      : 0;
    const incomeGrowth = demo.medianIncome.oneYearAgo > 0
      ? ((income - demo.medianIncome.oneYearAgo) / demo.medianIncome.oneYearAgo) * 100
      : 0;

    // Simplified scoring (0-100)
    // Weights: population growth (25), income level (25), income growth (25), education (25)
    const popScore = Math.min(100, Math.max(0, 50 + popGrowth * 20));
    const incomeScore = Math.min(100, Math.max(0, (income / 100_000) * 100));
    const incGrowthScore = Math.min(100, Math.max(0, 50 + incomeGrowth * 10));
    const eduScore = Math.min(100, demo.education?.bachelors?.current ?? 30);

    const score = Math.round(
      popScore * 0.25 + incomeScore * 0.25 + incGrowthScore * 0.25 + eduScore * 0.25
    );

    // Signal
    const signal: MarketRanking["signal"] = score >= 70 ? "Buy" : score >= 50 ? "Hold" : "Watch";

    // Trend description
    const trend = popGrowth > 2
      ? `Population booming (+${popGrowth.toFixed(1)}%)`
      : popGrowth > 0
      ? `Steady growth (+${popGrowth.toFixed(1)}%)`
      : `Population declining (${popGrowth.toFixed(1)}%)`;

    rankings.push({
      name: market.name,
      zip: market.zip,
      state: market.state,
      score,
      population: pop,
      medianIncome: income,
      populationGrowth: Math.round(popGrowth * 100) / 100,
      incomeGrowth: Math.round(incomeGrowth * 100) / 100,
      signal,
      trend,
      dataSource: demoResult.value.source,
    });
  }

  // Sort by score descending
  rankings.sort((a, b) => b.score - a.score);

  return jsonSuccess({
    rankings,
    macro: fredData?.data ? {
      mortgageRate: fredData.data.mortgageRate30yr,
      unemploymentRate: fredData.data.unemploymentRate,
      source: fredData.source,
    } : null,
    lastUpdated: new Date().toISOString(),
  });
}

export const GET = compose(
  withRateLimit(20, 60_000), // Lower limit — fetches 15 Census calls
  withCache(6 * 60 * 60 * 1000) // 6 hour cache
)(handler);
