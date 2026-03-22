/**
 * GET /api/market/permits?msa=Atlanta
 *
 * Returns monthly building permit data for a given MSA, fetched from
 * the FRED public CSV endpoint (no API key required).
 *
 * Data: Census Bureau New Residential Construction — privately-owned
 * housing units authorized by building permits, monthly, seasonally
 * adjusted annual rate (SAAR) where noted, or raw counts.
 *
 * Source: https://fred.stlouisfed.org/graph/fredgraph.csv?id={SERIES_ID}
 *
 * Query params:
 * - msa: MSA name (required). Case-insensitive. See MSA_SERIES_MAP below.
 *
 * Response:
 * {
 *   data: {
 *     msa: string,
 *     series: { date: string, value: number }[],
 *     yoyChange: number   // latest 12-month % change
 *   },
 *   meta: {
 *     source: "FRED",
 *     seriesId: string,
 *     unit: "Thousands of Units, Seasonally Adjusted Annual Rate",
 *     frequency: "Monthly",
 *     lastUpdated: string
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cachedFetch, CACHE_TTL } from "@/lib/cache";
import {
  compose,
  withRateLimit,
  withCache,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";

// ─── MSA → FRED Series ID Map ─────────────────────────────────────────────────
// All series: "New Private Housing Units Authorized by Building Permits" (MSA level)
// Units: Thousands of Units, Not Seasonally Adjusted (monthly)
// Verified against FRED as of 2026-03-16.

const MSA_SERIES_MAP: Record<string, string> = {
  atlanta: "ATLA013BPPRIV",
  austin: "AUST448BPPRIV",
  boston: "BOST625BPPRIV",
  charlotte: "CHAR737BPPRIV",
  chicago: "CHIC917BPPRIV",
  houston: "HOUS448BPPRIV",
  miami: "MIAM112BPPRIV",
  minneapolis: "MINN427BPPRIV",
  "new york": "NEWY636BPPRIV",
  orlando: "ORLA712BPPRIV",
  "san francisco": "SANF806BPPRIV",
  seattle: "SEAT653BPPRIV",
  dallas: "DALL148BPPRIV",
  denver: "DENV708BPPRIV",
  detroit: "DETR826BPPRIV",
  cincinnati: "CINC139BPPRIV",
  cleveland: "CLEV439BPPRIVSA",
  columbus: "COLU139BPPRIV",
  indianapolis: "INDI918BPPRIV",
  jacksonville: "JACK212BPPRIV",
  "kansas city": "KANS129BPPRIV",
  "los angeles": "LOSA106BPPRIV",
  nashville: "NASH947BPPRIV",
  philadelphia: "PHIL942BPPRIV",
  phoenix: "PHOE004BPPRIV",
  pittsburgh: "PITT342BPPRIV",
  portland: "PORT941BPPRIV",
  raleigh: "RALE537BPPRIV",
  "salt lake city": "SALT649BPPRIV",
  "san diego": "SAND706BPPRIV",
  tampa: "TAMP312BPPRIV",
};

const VALID_MSAS = Object.keys(MSA_SERIES_MAP);

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const QuerySchema = z.object({
  msa: z.string().min(1, "msa is required"),
});

// ─── CSV Parser ───────────────────────────────────────────────────────────────

interface TimeSeriesPoint {
  date: string;
  value: number;
}

/**
 * Fetches and parses a FRED CSV endpoint.
 * FRED CSV format: two-column, header row "observation_date,{SERIES_ID}",
 * then one row per observation with YYYY-MM-DD date and numeric value.
 * Missing values are represented as "." — these are filtered out.
 *
 * No API key required for the public CSV endpoint.
 */
async function fetchFREDCsv(seriesId: string): Promise<TimeSeriesPoint[]> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "LootVue/1.0 (real estate analytics; admin@lootvue.com)",
    },
    // Timeout via AbortController — fetch itself has no built-in timeout
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `FRED CSV fetch failed for ${seriesId}: HTTP ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();
  const lines = text.trim().split("\n");

  if (lines.length < 2) {
    throw new Error(`FRED CSV response for ${seriesId} is empty or malformed`);
  }

  // Skip header row (index 0)
  const points: TimeSeriesPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const commaIdx = line.indexOf(",");
    if (commaIdx === -1) continue;

    const dateStr = line.slice(0, commaIdx).trim();
    const valueStr = line.slice(commaIdx + 1).trim();

    // FRED encodes missing values as "."
    if (valueStr === "." || valueStr === "") continue;

    const value = parseFloat(valueStr);
    if (isNaN(value)) continue;

    points.push({ date: dateStr, value });
  }

  return points;
}

// ─── YoY Change Calculation ───────────────────────────────────────────────────

/**
 * Computes year-over-year percentage change between the most recent
 * observation and the observation exactly 12 months prior.
 * Returns 0 if insufficient data.
 */
function computeYoyChange(series: TimeSeriesPoint[]): number {
  if (series.length < 13) return 0;

  // Series is sorted ascending (oldest first after our sort in the handler)
  const latest = series[series.length - 1]!;
  const priorYear = series[series.length - 13]!;

  if (priorYear.value === 0) return 0;

  return Math.round(
    ((latest.value - priorYear.value) / priorYear.value) * 10_000
  ) / 100; // 2 decimal places
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handler(req: NextRequest): Promise<NextResponse> {
  // Parse and validate query params
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues.map((i) => i.message).join(", "),
      400
    );
  }

  const msaKey = parsed.data.msa.toLowerCase().trim();
  const seriesId = MSA_SERIES_MAP[msaKey];

  if (!seriesId) {
    return jsonError(
      `Unknown MSA: "${parsed.data.msa}". Supported: ${VALID_MSAS.join(", ")}`,
      400
    );
  }

  // 7-day cache per series — permit data updates monthly
  const cacheKey = `fred:permits:${seriesId}`;
  const TTL = CACHE_TTL.BLS; // 7 days — same cadence as monthly permit releases

  const result = await cachedFetch<TimeSeriesPoint[]>(
    cacheKey,
    async () => {
      const points = await fetchFREDCsv(seriesId);

      if (points.length === 0) {
        return null;
      }

      // Sort ascending by date (FRED CSV is already ascending, but be explicit)
      points.sort((a, b) => a.date.localeCompare(b.date));

      return {
        data: points,
        source: `FRED (${seriesId})`,
      };
    },
    TTL
  );

  if (!result) {
    return jsonError(
      `No permit data available for ${parsed.data.msa} (series: ${seriesId})`,
      404
    );
  }

  const yoyChange = computeYoyChange(result.data);

  // Canonical MSA name (title-case the input key for display)
  const displayName = parsed.data.msa
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return jsonSuccess(
    {
      msa: displayName,
      series: result.data,
      yoyChange,
    },
    {
      meta: {
        source: "FRED",
        seriesId,
        unit: "Units (Not Seasonally Adjusted, Monthly)",
        frequency: "Monthly",
        cached: result.cached,
        stale: result.stale,
        dataSource: result.source,
        lastUpdated: new Date().toISOString(),
      },
    }
  );
}

export const GET = compose(
  withRateLimit(60, 60_000),
  withCache(6 * 60 * 60 * 1000) // 6-hour HTTP response cache; FRED data is monthly
)(handler);
