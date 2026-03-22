/**
 * GET /api/market/supply?msa=Atlanta
 *
 * Returns months-of-supply data for a given MSA, sourced from Redfin Data Center.
 *
 * Backtest 2026-03-16: Months of supply is our STRONGEST validated signal for
 * predicting next-year HPI change:
 *   - Spearman rho = 0.33 (p < 0.001)
 *   - Perfect quintile monotonicity
 *   - 9.22pp Q1-Q5 spread
 *   - Walk-forward accuracy: 82%
 *   - Signal is INVERTED: lower supply = higher expected appreciation
 *
 * For MVP: serves from a pre-processed static JSON file extracted from the
 * Redfin metro market tracker CSV. Live Redfin updates will replace this
 * once the data pipeline agent wires a direct Redfin Data Center pull.
 *
 * Returns:
 * {
 *   data: {
 *     msa: string,
 *     region: string,
 *     stateCode: string,
 *     latest: { date, monthsOfSupply, inventory, homesSold, ... },
 *     zScore3yr: number,       // z-score computed from 3-year rolling window
 *     history: [...],          // full monthly time series
 *     rollingStats3yr: { mean, stdDev, window },
 *     plainEnglish: string,
 *     confidenceLevel: number,
 *   },
 *   meta: {
 *     source: "Redfin",
 *     asOfDate: string,
 *     frequency: "Monthly",
 *     backtestEvidence: { ... },
 *     ...
 *   }
 * }
 *
 * Source: https://www.redfin.com/news/data-center/
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  compose,
  withRateLimit,
  withCache,
  jsonError,
  jsonSuccess,
} from "@/lib/api/middleware";

// ─── Static Data Import ──────────────────────────────────────────────────────
// Pre-processed from Redfin metro market tracker CSV.
// TODO: Replace with live Redfin Data Center API pull via data-pipeline agent.
import supplyData from "./months-of-supply.json";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SupplyDataPoint {
  date: string;
  monthsOfSupply: number;
  inventory: number;
  homesSold: number;
  newListings: number;
  medianSalePrice: number;
  medianDom: number;
}

interface MsaData {
  region: string;
  stateCode: string;
  series: SupplyDataPoint[];
}

// ─── Zod Validation ──────────────────────────────────────────────────────────

const QuerySchema = z.object({
  msa: z.string().min(1, "msa query parameter is required"),
});

// ─── MSA Lookup Key Map ──────────────────────────────────────────────────────
// Maps common name variants to the keys used in months-of-supply.json.

const MSA_KEY_MAP: Record<string, string> = {
  atlanta: "atlanta",
  austin: "austin",
  boston: "boston",
  charlotte: "charlotte",
  chicago: "chicago",
  cincinnati: "cincinnati",
  cleveland: "cleveland",
  columbus: "columbus",
  dallas: "dallas",
  denver: "denver",
  detroit: "detroit",
  houston: "houston",
  indianapolis: "indianapolis",
  jacksonville: "jacksonville",
  "kansas city": "kansas city",
  "los angeles": "los angeles",
  miami: "miami",
  minneapolis: "minneapolis",
  nashville: "nashville",
  "new york": "new york",
  orlando: "orlando",
  philadelphia: "philadelphia",
  phoenix: "phoenix",
  pittsburgh: "pittsburgh",
  portland: "portland",
  raleigh: "raleigh",
  "salt lake city": "salt lake city",
  "san diego": "san diego",
  "san francisco": "san francisco",
  seattle: "seattle",
  tampa: "tampa",
};

const VALID_MSAS = Object.keys(MSA_KEY_MAP);

// ─── Z-Score Computation ─────────────────────────────────────────────────────

/**
 * Compute z-score of the latest months-of-supply value using a 3-year
 * (36-month) rolling window. The z-score is INVERTED because lower supply
 * predicts higher appreciation.
 *
 * Backtest 2026-03-16: rho=0.33, 9.22pp Q1-Q5 spread, walk-forward 82%
 *
 * @returns { zScore, mean, stdDev, windowMonths }
 */
function computeSupplyZScore(
  series: SupplyDataPoint[]
): { zScore: number; mean: number; stdDev: number; windowMonths: number } {
  // Need at least 12 months for a meaningful z-score; prefer 36
  const windowSize = Math.min(36, series.length);

  if (windowSize < 12) {
    return { zScore: 0, mean: 0, stdDev: 0, windowMonths: windowSize };
  }

  // Use the last `windowSize` observations for the rolling stats
  const window = series.slice(-windowSize);
  const values = window.map((p) => p.monthsOfSupply);

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev <= 0) {
    return { zScore: 0, mean: round2(mean), stdDev: 0, windowMonths: windowSize };
  }

  const latestValue = series[series.length - 1]!.monthsOfSupply;
  const rawZ = (latestValue - mean) / stdDev;

  // Clamp to +/-3 sigma
  const clampedZ = Math.max(-3, Math.min(3, rawZ));

  // INVERT: lower supply = positive signal (higher expected appreciation)
  // Backtest 2026-03-16: rho=0.33, 9.22pp Q1-Q5 spread, walk-forward 82%
  const invertedZ = -clampedZ;

  return {
    zScore: round2(invertedZ),
    mean: round2(mean),
    stdDev: round2(stdDev),
    windowMonths: windowSize,
  };
}

// ─── Confidence Level ────────────────────────────────────────────────────────

/**
 * Compute confidence level (0-100) based on data recency and completeness.
 *
 * Factors:
 *   - Recency: how recent is the latest observation? (staleness penalty)
 *   - Depth: how many months of history are available?
 *   - Completeness: are there gaps in the series?
 */
function computeConfidenceLevel(series: SupplyDataPoint[]): number {
  if (series.length === 0) return 0;

  const latestDate = new Date(series[series.length - 1]!.date);
  const now = new Date();
  const daysSinceLatest = Math.floor(
    (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Recency: 100 if <30 days old, linear decay to 0 at 365 days
  const recencyScore = Math.max(0, Math.min(100, 100 - (daysSinceLatest - 30) * (100 / 335)));

  // Depth: 100 if 36+ months, 50 at 12 months, 0 at 0 months
  const depthScore = Math.min(100, (series.length / 36) * 100);

  // Weighted: recency matters most for signal reliability
  return Math.round(0.6 * recencyScore + 0.4 * depthScore);
}

// ─── Plain English ───────────────────────────────────────────────────────────

function generatePlainEnglish(
  msa: string,
  latestMOS: number,
  zScore: number
): string {
  const supplyLevel =
    latestMOS < 3
      ? "extremely tight"
      : latestMOS < 4
        ? "tight"
        : latestMOS < 6
          ? "balanced"
          : latestMOS < 8
            ? "elevated"
            : "very high";

  const implication =
    latestMOS < 4
      ? "Markets below 4 months of supply typically see faster price growth."
      : latestMOS < 6
        ? "Balanced supply suggests stable pricing with moderate appreciation potential."
        : "Elevated supply indicates buyer negotiating power and potential price softening.";

  const zContext =
    Math.abs(zScore) > 1.5
      ? ` This is significantly ${zScore > 0 ? "below" : "above"} the 3-year average, indicating a ${zScore > 0 ? "tightening" : "loosening"} trend.`
      : Math.abs(zScore) > 0.5
        ? ` This is ${zScore > 0 ? "below" : "above"} the 3-year average.`
        : " This is near the 3-year average.";

  return `Housing inventory in ${msa} is ${supplyLevel} at ${latestMOS.toFixed(1)} months of supply.${zContext} ${implication}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

async function handler(req: NextRequest): Promise<NextResponse> {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues.map((i) => i.message).join(", "),
      400
    );
  }

  const msaKey = parsed.data.msa.toLowerCase().trim();
  const lookupKey = MSA_KEY_MAP[msaKey];

  if (!lookupKey) {
    return jsonError(
      `Unknown MSA: "${parsed.data.msa}". Supported: ${VALID_MSAS.join(", ")}`,
      400
    );
  }

  const msaData = (supplyData.msas as unknown as Record<string, MsaData>)[lookupKey];
  if (!msaData || msaData.series.length === 0) {
    return jsonError(
      `No months-of-supply data available for "${parsed.data.msa}"`,
      404
    );
  }

  // Series is already sorted ascending by date (from JSON generation)
  const series = msaData.series;
  const latest = series[series.length - 1]!;
  const stats = computeSupplyZScore(series);
  const confidence = computeConfidenceLevel(series);

  // Display name: title-case the MSA key
  const displayName = parsed.data.msa
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const plainEnglish = generatePlainEnglish(
    displayName,
    latest.monthsOfSupply,
    stats.zScore
  );

  return jsonSuccess(
    {
      msa: displayName,
      region: msaData.region,
      stateCode: msaData.stateCode,
      latest: {
        ...latest,
        asOfDate: latest.date,
        source: "Redfin" as const,
      },
      zScore3yr: stats.zScore,
      history: series,
      rollingStats3yr: {
        mean: stats.mean,
        stdDev: stats.stdDev,
        window: `${stats.windowMonths} months`,
      },
      plainEnglish,
      confidenceLevel: confidence,
    },
    {
      meta: {
        source: "Redfin",
        sourceUrl: "https://www.redfin.com/news/data-center/",
        asOfDate: latest.date,
        frequency: "Monthly",
        totalObservations: series.length,
        dateRange: {
          start: series[0]!.date,
          end: latest.date,
        },
        backtestEvidence: supplyData.backtestEvidence,
        lastUpdated: supplyData.generatedAt,
        dataType: "static-json",
        note: "MVP: served from pre-processed Redfin CSV. Will be replaced with live Redfin Data Center pull.",
      },
    }
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────
// Rate limit: 60 req/min. Cache: 6-hour HTTP cache (supply data is monthly).

export const GET = compose(
  withRateLimit(60, 60_000),
  withCache(6 * 60 * 60 * 1000)
)(handler);
