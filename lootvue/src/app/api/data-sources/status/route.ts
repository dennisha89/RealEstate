/**
 * GET /api/data-sources/status
 *
 * Returns which data sources are configured and available.
 * Used by the dashboard to show data source health badges.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAvailableDataSources } from "@/lib/engines/data-bridge";
import { getCacheStats } from "@/lib/cache";
import { compose, withRateLimit, jsonSuccess } from "@/lib/api/middleware";

interface DataSourceStatus {
  name: string;
  key: string;
  configured: boolean;
  priority: "P0" | "P1" | "P2";
  refreshFrequency: string;
}

async function handler(_req: NextRequest): Promise<NextResponse> {
  const available = getAvailableDataSources();
  const cacheStats = getCacheStats();

  const sources: DataSourceStatus[] = [
    { name: "ATTOM Property Data", key: "attom", configured: available.attom, priority: "P0", refreshFrequency: "Daily" },
    { name: "RentCast Rental Estimates", key: "rentcast", configured: available.rentcast, priority: "P0", refreshFrequency: "Weekly" },
    { name: "Census ACS Demographics", key: "census", configured: available.census, priority: "P0", refreshFrequency: "Annually" },
    { name: "FRED Economic Indicators", key: "fred", configured: available.fred, priority: "P1", refreshFrequency: "Daily-Weekly" },
    { name: "BLS Employment Data", key: "bls", configured: available.bls, priority: "P1", refreshFrequency: "Monthly" },
    { name: "Walk Score", key: "walkScore", configured: available.walkScore, priority: "P1", refreshFrequency: "Quarterly" },
    { name: "GreatSchools Ratings", key: "greatSchools", configured: available.greatSchools, priority: "P1", refreshFrequency: "Annually" },
  ];

  const configured = sources.filter((s) => s.configured).length;
  const total = sources.length;

  return jsonSuccess({
    sources,
    summary: {
      configured,
      total,
      coverage: `${Math.round((configured / total) * 100)}%`,
    },
    cache: {
      entries: cacheStats.entries,
      keys: cacheStats.keys,
    },
  });
}

export const GET = compose(
  withRateLimit(100, 60_000)
)(handler);
