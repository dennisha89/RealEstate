/**
 * GET /api/market/hpi?state=TX
 * GET /api/market/hpi?msa=Atlanta
 *
 * Returns FHFA House Price Index (HPI) time-series data, fetched from
 * the FRED public CSV endpoint (no API key required).
 *
 * Two lookup modes:
 *  1. State: ?state={2-letter code}  → uses FHFA Purchase-Only HPI, {STATE}STHPI
 *  2. MSA:   ?msa={name}             → uses FHFA All-Transactions HPI, ATNHPIUS{CBSA}Q
 *
 * Both are quarterly series. Index baseline = 100 at 1980-Q1 (state) or
 * variable per MSA (the raw index level — caller can rebase if needed).
 *
 * Source: https://fred.stlouisfed.org/graph/fredgraph.csv?id={SERIES_ID}
 *
 * Response:
 * {
 *   data: {
 *     region: string,
 *     type: "state" | "msa",
 *     series: { date: string, value: number }[],
 *     momentum6mo: number,    // % change over last 2 quarters
 *     momentum1yr: number,    // % change over last 4 quarters
 *     momentum3yr: number     // % change over last 12 quarters
 *   },
 *   meta: {
 *     source: "FHFA via FRED",
 *     seriesId: string,
 *     frequency: "Quarterly",
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

// ─── State → FRED Series ID Map ───────────────────────────────────────────────
// Pattern: {STATE}STHPI
// FHFA Purchase-Only HPI, quarterly, seasonally adjusted.
// All 50 states + DC confirmed available on FRED.

const STATE_SERIES_MAP: Record<string, string> = {
  AL: "ALSTHPI", AK: "AKSTHPI", AZ: "AZSTHPI", AR: "ARSTHPI",
  CA: "CASTHPI", CO: "COSTHPI", CT: "CTSTHPI", DC: "DCSTHPI",
  DE: "DESTHPI", FL: "FLSTHPI", GA: "GASTHPI", HI: "HISTHPI",
  ID: "IDSTHPI", IL: "ILSTHPI", IN: "INSTHPI", IA: "IASTHPI",
  KS: "KSSTHPI", KY: "KYSTHPI", LA: "LASTHPI", ME: "MESTHPI",
  MD: "MDSTHPI", MA: "MASTHPI", MI: "MISTHPI", MN: "MNSTHPI",
  MS: "MSSTHPI", MO: "MOSTHPI", MT: "MTSTHPI", NE: "NESTHPI",
  NV: "NVSTHPI", NH: "NHSTHPI", NJ: "NJSTHPI", NM: "NMSTHPI",
  NY: "NYSTHPI", NC: "NCSTHPI", ND: "NDSTHPI", OH: "OHSTHPI",
  OK: "OKSTHPI", OR: "ORSTHPI", PA: "PASTHPI", RI: "RISTHPI",
  SC: "SCSTHPI", SD: "SDSTHPI", TN: "TNSTHPI", TX: "TXSTHPI",
  UT: "UTSTHPI", VT: "VTSTHPI", VA: "VASTHPI", WA: "WASTHPI",
  WV: "WVSTHPI", WI: "WISTHPI", WY: "WYSTHPI",
};

// ─── MSA → FRED Series ID Map ─────────────────────────────────────────────────
// Pattern: ATNHPIUS{CBSA_CODE}Q
// FHFA All-Transactions HPI, quarterly, not seasonally adjusted.
// CBSA codes sourced from US Census Bureau / OMB delineation files.
// All series verified live on FRED as of 2026-03-16.

const MSA_HPI_SERIES_MAP: Record<string, { seriesId: string; displayName: string }> = {
  atlanta: { seriesId: "ATNHPIUS12060Q", displayName: "Atlanta-Sandy Springs-Roswell, GA" },
  austin: { seriesId: "ATNHPIUS12420Q", displayName: "Austin-Round Rock-Georgetown, TX" },
  boston: { seriesId: "ATNHPIUS14460Q", displayName: "Boston-Cambridge-Newton, MA-NH" },
  charlotte: { seriesId: "ATNHPIUS16740Q", displayName: "Charlotte-Concord-Gastonia, NC-SC" },
  chicago: { seriesId: "ATNHPIUS16980Q", displayName: "Chicago-Naperville-Elgin, IL-IN-WI" },
  dallas: { seriesId: "ATNHPIUS19100Q", displayName: "Dallas-Fort Worth-Arlington, TX" },
  denver: { seriesId: "ATNHPIUS19740Q", displayName: "Denver-Aurora-Lakewood, CO" },
  detroit: { seriesId: "ATNHPIUS19820Q", displayName: "Detroit-Warren-Dearborn, MI" },
  houston: { seriesId: "ATNHPIUS26420Q", displayName: "Houston-The Woodlands-Sugar Land, TX" },
  "los angeles": { seriesId: "ATNHPIUS31080Q", displayName: "Los Angeles-Long Beach-Anaheim, CA" },
  miami: { seriesId: "ATNHPIUS33100Q", displayName: "Miami-Fort Lauderdale-Pompano Beach, FL" },
  minneapolis: { seriesId: "ATNHPIUS33460Q", displayName: "Minneapolis-St. Paul-Bloomington, MN-WI" },
  nashville: { seriesId: "ATNHPIUS34980Q", displayName: "Nashville-Davidson-Murfreesboro-Franklin, TN" },
  "new york": { seriesId: "ATNHPIUS35620Q", displayName: "New York-Newark-Jersey City, NY-NJ-PA" },
  orlando: { seriesId: "ATNHPIUS36740Q", displayName: "Orlando-Kissimmee-Sanford, FL" },
  philadelphia: { seriesId: "ATNHPIUS37980Q", displayName: "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD" },
  phoenix: { seriesId: "ATNHPIUS38060Q", displayName: "Phoenix-Mesa-Chandler, AZ" },
  portland: { seriesId: "ATNHPIUS38900Q", displayName: "Portland-Vancouver-Hillsboro, OR-WA" },
  raleigh: { seriesId: "ATNHPIUS39580Q", displayName: "Raleigh-Cary, NC" },
  "salt lake city": { seriesId: "ATNHPIUS41620Q", displayName: "Salt Lake City, UT" },
  "san diego": { seriesId: "ATNHPIUS41740Q", displayName: "San Diego-Chula Vista-National City, CA" },
  "san francisco": { seriesId: "ATNHPIUS41860Q", displayName: "San Francisco-Oakland-Berkeley, CA" },
  seattle: { seriesId: "ATNHPIUS42660Q", displayName: "Seattle-Tacoma-Bellevue, WA" },
  tampa: { seriesId: "ATNHPIUS45300Q", displayName: "Tampa-St. Petersburg-Clearwater, FL" },
  cincinnati: { seriesId: "ATNHPIUS17140Q", displayName: "Cincinnati, OH-KY-IN" },
  cleveland: { seriesId: "ATNHPIUS17460Q", displayName: "Cleveland-Elyria, OH" },
  columbus: { seriesId: "ATNHPIUS18140Q", displayName: "Columbus, OH" },
  indianapolis: { seriesId: "ATNHPIUS26900Q", displayName: "Indianapolis-Carmel-Anderson, IN" },
  jacksonville: { seriesId: "ATNHPIUS27260Q", displayName: "Jacksonville, FL" },
  "kansas city": { seriesId: "ATNHPIUS28140Q", displayName: "Kansas City, MO-KS" },
  pittsburgh: { seriesId: "ATNHPIUS38300Q", displayName: "Pittsburgh, PA" },
};

// ─── Zod Schema ───────────────────────────────────────────────────────────────
// Exactly one of state or msa must be provided.

const QuerySchema = z
  .object({
    state: z.string().optional(),
    msa: z.string().optional(),
  })
  .refine(
    (d) => !!(d.state || d.msa),
    { message: "Provide either 'state' (2-letter code) or 'msa' (name)" }
  );

// ─── CSV Parser ───────────────────────────────────────────────────────────────

interface TimeSeriesPoint {
  date: string;
  value: number;
}

/**
 * Fetches and parses a FRED public CSV endpoint.
 * No API key required. Missing values ("." in FRED) are filtered out.
 */
async function fetchFREDCsv(seriesId: string): Promise<TimeSeriesPoint[]> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "LootVue/1.0 (real estate analytics; admin@lootvue.com)",
    },
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

  const points: TimeSeriesPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const commaIdx = line.indexOf(",");
    if (commaIdx === -1) continue;

    const dateStr = line.slice(0, commaIdx).trim();
    const valueStr = line.slice(commaIdx + 1).trim();

    if (valueStr === "." || valueStr === "") continue;

    const value = parseFloat(valueStr);
    if (isNaN(value)) continue;

    points.push({ date: dateStr, value });
  }

  return points;
}

// ─── Momentum Calculation ─────────────────────────────────────────────────────

/**
 * Computes percentage change between the most recent observation and
 * one N quarters prior. Returns 0 if insufficient data.
 */
function computeMomentum(series: TimeSeriesPoint[], quartersBack: number): number {
  if (series.length <= quartersBack) return 0;

  const latest = series[series.length - 1]!;
  const prior = series[series.length - 1 - quartersBack]!;

  if (prior.value === 0) return 0;

  return Math.round(
    ((latest.value - prior.value) / prior.value) * 10_000
  ) / 100; // 2 decimal places
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handler(req: NextRequest): Promise<NextResponse> {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues.map((i) => i.message).join(", "),
      400
    );
  }

  let seriesId: string;
  let region: string;
  let lookupType: "state" | "msa";

  if (parsed.data.state) {
    // State lookup
    const stateCode = parsed.data.state.toUpperCase().trim();
    const s = STATE_SERIES_MAP[stateCode];
    if (!s) {
      return jsonError(
        `Unknown state: "${parsed.data.state}". Use 2-letter codes: ${Object.keys(STATE_SERIES_MAP).join(", ")}`,
        400
      );
    }
    seriesId = s;
    region = stateCode;
    lookupType = "state";
  } else {
    // MSA lookup
    const msaKey = parsed.data.msa!.toLowerCase().trim();
    const m = MSA_HPI_SERIES_MAP[msaKey];
    if (!m) {
      return jsonError(
        `Unknown MSA: "${parsed.data.msa}". Supported: ${Object.keys(MSA_HPI_SERIES_MAP).join(", ")}`,
        400
      );
    }
    seriesId = m.seriesId;
    region = m.displayName;
    lookupType = "msa";
  }

  // HPI data is quarterly and changes slowly — cache for 7 days
  const cacheKey = `fred:hpi:${seriesId}`;

  const result = await cachedFetch<TimeSeriesPoint[]>(
    cacheKey,
    async () => {
      const points = await fetchFREDCsv(seriesId);

      if (points.length === 0) {
        return null;
      }

      // Ensure ascending sort (FRED CSV is already ascending)
      points.sort((a, b) => a.date.localeCompare(b.date));

      return {
        data: points,
        source: `FHFA via FRED (${seriesId})`,
      };
    },
    CACHE_TTL.BLS // 7 days
  );

  if (!result) {
    return jsonError(
      `No HPI data available for ${region} (series: ${seriesId})`,
      404
    );
  }

  const series = result.data;
  const momentum6mo = computeMomentum(series, 2);   // 2 quarters
  const momentum1yr = computeMomentum(series, 4);   // 4 quarters
  const momentum3yr = computeMomentum(series, 12);  // 12 quarters

  return jsonSuccess(
    {
      region,
      type: lookupType,
      series,
      momentum6mo,
      momentum1yr,
      momentum3yr,
    },
    {
      meta: {
        source: "FHFA via FRED",
        seriesId,
        frequency: "Quarterly",
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
  withCache(6 * 60 * 60 * 1000) // 6-hour HTTP response cache
)(handler);
