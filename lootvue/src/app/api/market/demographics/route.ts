/**
 * GET /api/market/demographics?zip=78745
 *
 * Returns Census ACS demographic data for a ZIP code.
 * Includes population, income, education, age, migration trends.
 *
 * Free API: Census Bureau ACS (requires CENSUS_API_KEY)
 */

import { NextRequest } from "next/server";
import { cachedFetch, CACHE_TTL } from "@/lib/cache";
import { fetchRealDemographics } from "@/lib/engines/data-bridge";
import { compose, withRateLimit, withCache, jsonError, jsonSuccess } from "@/lib/api/middleware";

async function handler(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip");
  if (!zip || zip.length < 5) {
    return jsonError("Query parameter 'zip' is required (5-digit ZIP code)", 400);
  }

  if (!process.env.CENSUS_API_KEY) {
    return jsonError("CENSUS_API_KEY not configured", 503);
  }

  const result = await cachedFetch(
    `census:demo:${zip}`,
    async () => fetchRealDemographics(zip),
    CACHE_TTL.CENSUS
  );

  if (!result) {
    return jsonError("No demographic data found for this ZIP code", 404);
  }

  return jsonSuccess(result.data, {
    meta: { source: result.source, cached: result.cached, zip },
  });
}

export const GET = compose(
  withRateLimit(100, 60_000),
  withCache(24 * 60 * 60 * 1000) // 1 day
)(handler);
