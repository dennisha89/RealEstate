/**
 * useMarketSignals — Data flow hook: API routes -> Confluence Engine -> Chart props
 *
 * This is the MISSING data bridge that connects:
 *   1. /api/market/supply   (Redfin months-of-supply, static JSON — REAL DATA)
 *   2. /api/market/permits  (FRED building permits CSV — REAL DATA)
 *   3. /api/market/hpi      (FRED FHFA HPI CSV — REAL DATA)
 *   4. /api/market/time-series?series=MORTGAGE30US (FRED 30yr rate — REAL DATA)
 *
 * ...through the market-portfolio-confluence engine:
 *   buildMarketConfluence() -> MarketConfluence (score, signals, convergence, verdict)
 *
 * ...and outputs chart-ready props for:
 *   - CapitalFlowMap (MarketScore[])
 *   - SignalConvergenceChart (SignalDatum[])
 *   - HPIForecastChart (already self-contained, just needs geoKey)
 *
 * Data flow:
 *   [API Routes] --> [useMarketSignals] --> [Confluence Engine] --> [Chart Components]
 *        |                  |                       |                      |
 *   Real FRED/Redfin   Parallel fetch      buildMarketConfluence()   MarketScore[]
 *   data via HTTP       + Zod validate      computeConvergence()     SignalDatum[]
 *                                            scoreToVerdict()
 *
 * Caching: SWR pattern — returns stale data immediately, revalidates in background.
 * Error handling: partial results shown with degraded confidence; never crashes.
 *
 * BACKTEST VALIDATION (2026-03-16):
 *   - Months of supply: rho=0.33, weight 0.30 — STRONGEST
 *   - Building permits: rho=0.35, weight 0.25
 *   - HPI momentum: rho=0.33, weight 0.20
 *   - Employment growth: rho=0.11, weight 0.15
 *   - Mortgage rates: rho=0.13, weight 0.10
 *   - Pairwise convergence: rho=0.56 — the product edge
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { z } from "zod";
import {
  buildMarketConfluence,
  type MarketConfluence,
  type MarketSignalInput,
  type GeoNode,
} from "@/lib/engines/confluence/market-portfolio-confluence";
import type { SignalDatum } from "@/components/charts/SignalConvergenceChart";
import type { MarketScore, SignalValue } from "@/components/charts/CapitalFlowMap";

// ============================================================
// Zod Schemas for API Response Validation
// ============================================================

const SupplyResponseSchema = z.object({
  data: z.object({
    msa: z.string(),
    region: z.string(),
    stateCode: z.string(),
    latest: z.object({
      date: z.string(),
      monthsOfSupply: z.number(),
      inventory: z.number().optional(),
      homesSold: z.number().optional(),
      medianSalePrice: z.number().optional(),
      asOfDate: z.string(),
      source: z.literal("Redfin"),
    }),
    zScore3yr: z.number(),
    history: z.array(z.object({
      date: z.string(),
      monthsOfSupply: z.number(),
    }).passthrough()),
    rollingStats3yr: z.object({
      mean: z.number(),
      stdDev: z.number(),
      window: z.string(),
    }),
    plainEnglish: z.string(),
    confidenceLevel: z.number(),
  }),
  meta: z.object({
    source: z.string(),
    asOfDate: z.string(),
  }).passthrough(),
});

const PermitsResponseSchema = z.object({
  data: z.object({
    msa: z.string(),
    series: z.array(z.object({ date: z.string(), value: z.number() })),
    yoyChange: z.number(),
  }),
  meta: z.object({
    source: z.string(),
    seriesId: z.string(),
  }).passthrough(),
});

const HPIResponseSchema = z.object({
  data: z.object({
    region: z.string(),
    type: z.enum(["state", "msa"]),
    series: z.array(z.object({ date: z.string(), value: z.number() })),
    momentum6mo: z.number(),
    momentum1yr: z.number(),
    momentum3yr: z.number(),
  }),
  meta: z.object({
    source: z.string(),
    seriesId: z.string(),
  }).passthrough(),
});

/**
 * Time-series API wraps response in jsonSuccess which returns { data: { series, ... } }.
 * The series field is a Record<string, Array<{date, value}>>.
 */
const TimeSeriesResponseSchema = z.object({
  data: z.object({
    series: z.record(z.string(), z.array(z.object({
      date: z.string(),
      value: z.number(),
    }))),
    period: z.string().optional(),
    sources: z.array(z.string()).optional(),
    lastUpdated: z.string().optional(),
  }),
});

// ============================================================
// Types
// ============================================================

export interface MarketSignalData {
  supply: z.infer<typeof SupplyResponseSchema>["data"] | null;
  permits: z.infer<typeof PermitsResponseSchema>["data"] | null;
  hpi: z.infer<typeof HPIResponseSchema>["data"] | null;
  mortgageRate: number | null;
}

export type FetchStatus = "idle" | "loading" | "success" | "partial" | "error";

export interface UseMarketSignalsResult {
  /** Raw API data for each signal */
  data: MarketSignalData;
  /** Computed confluence from the engine */
  confluence: MarketConfluence | null;
  /** Chart-ready signal data for SignalConvergenceChart */
  signalChartData: SignalDatum[];
  /** Chart-ready market scores for CapitalFlowMap */
  mapData: MarketScore[];
  /** Overall fetch status */
  status: FetchStatus;
  /** Per-signal fetch status */
  signalStatus: {
    supply: FetchStatus;
    permits: FetchStatus;
    hpi: FetchStatus;
    rates: FetchStatus;
  };
  /** Errors encountered */
  errors: string[];
  /** Timestamp of last successful fetch */
  lastFetchedAt: string | null;
  /** Refetch all data */
  refetch: () => void;
}

// ============================================================
// In-memory client-side cache (per MSA key)
// ============================================================

interface CacheEntry {
  data: MarketSignalData;
  confluence: MarketConfluence | null;
  fetchedAt: number;
}

const clientCache = new Map<string, CacheEntry>();
const CLIENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ============================================================
// Fetch helpers with retry
// ============================================================

async function fetchWithRetry(
  url: string,
  retries: number = 2,
  timeoutMs: number = 10_000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) return response;

      // Don't retry 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < retries) {
        // Exponential backoff: 1s, 2s
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
      }
    }
  }

  throw lastError ?? new Error("Fetch failed after retries");
}

// ============================================================
// Z-score helpers for computing signal z-scores from API data
// ============================================================

/**
 * Compute z-score for building permits YoY change.
 * Uses the permits time series to derive a rough 10-year mean/stddev.
 *
 * Backtest 2026-03-16: rho=0.35 (p < 0.001), weight 0.25
 */
function computePermitsZScore(series: Array<{ date: string; value: number }>, yoyChange: number): number {
  if (series.length < 24) return 0;

  // Compute trailing YoY changes for the last 10 years (120 months) if available
  const yoyChanges: number[] = [];
  const windowSize = Math.min(series.length - 12, 120);

  for (let i = series.length - 1; i >= 12 && yoyChanges.length < windowSize; i--) {
    const current = series[i]!.value;
    const prior = series[i - 12]!.value;
    if (prior > 0) {
      yoyChanges.push(((current - prior) / prior) * 100);
    }
  }

  if (yoyChanges.length < 12) return 0;

  const mean = yoyChanges.reduce((s, v) => s + v, 0) / yoyChanges.length;
  const variance = yoyChanges.reduce((s, v) => s + (v - mean) ** 2, 0) / yoyChanges.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev <= 0) return 0;

  const rawZ = (yoyChange - mean) / stdDev;
  return Math.max(-3, Math.min(3, rawZ));
}

/**
 * Compute z-score for HPI momentum (6-month annualized).
 * Backtest 2026-03-16: rho=0.33 (p < 0.001), weight 0.20
 */
function computeHPIMomentumZScore(series: Array<{ date: string; value: number }>, momentum6mo: number): number {
  if (series.length < 12) return 0;

  // Compute trailing 6-month momentum values for z-score normalization
  const momentumValues: number[] = [];
  const windowSize = Math.min(series.length - 2, 40); // ~10 years of quarterly data

  for (let i = series.length - 1; i >= 2 && momentumValues.length < windowSize; i--) {
    const current = series[i]!.value;
    const prior = series[i - 2]!.value; // 2 quarters back = ~6 months
    if (prior > 0) {
      momentumValues.push(((current - prior) / prior) * 100);
    }
  }

  if (momentumValues.length < 8) return 0;

  const mean = momentumValues.reduce((s, v) => s + v, 0) / momentumValues.length;
  const variance = momentumValues.reduce((s, v) => s + (v - mean) ** 2, 0) / momentumValues.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev <= 0) return 0;

  const rawZ = (momentum6mo - mean) / stdDev;
  return Math.max(-3, Math.min(3, rawZ));
}

/**
 * Compute z-score for mortgage rate environment.
 * INVERTED: lower rates = bullish (cheaper capital for buyers).
 * Backtest 2026-03-16: rho=0.13 (p < 0.05), weight 0.10
 */
function computeRateZScore(currentRate: number): number {
  // 10-year stats for 30yr mortgage rate (2014-2024 from FRED MORTGAGE30US)
  // Historical mean: ~4.5%, stdDev: ~1.4%
  const historicalMean = 4.5;
  const historicalStdDev = 1.4;

  const rawZ = (currentRate - historicalMean) / historicalStdDev;
  // INVERT: lower rate = positive z-score (bullish)
  return Math.max(-3, Math.min(3, -rawZ));
}

// ============================================================
// Conversion: Confluence -> Chart Data
// ============================================================

function confluenceToSignalChartData(
  confluence: MarketConfluence,
  data: MarketSignalData
): SignalDatum[] {
  return confluence.signals.map(signal => {
    let label = "";
    let value = signal.zScore;

    switch (signal.id) {
      case "months_of_supply":
        label = data.supply
          ? `${data.supply.latest.monthsOfSupply.toFixed(1)} mo`
          : `z=${signal.zScore.toFixed(1)}`;
        break;
      case "building_permits":
        label = data.permits
          ? `${data.permits.yoyChange >= 0 ? "+" : ""}${data.permits.yoyChange.toFixed(1)}% YoY`
          : `z=${signal.zScore.toFixed(1)}`;
        break;
      case "hpi_momentum":
        label = data.hpi
          ? `${data.hpi.momentum6mo >= 0 ? "+" : ""}${data.hpi.momentum6mo.toFixed(1)}% 6mo`
          : `z=${signal.zScore.toFixed(1)}`;
        break;
      case "employment_growth":
        label = `z=${signal.zScore.toFixed(1)}`;
        break;
      case "mortgage_rates":
        label = data.mortgageRate
          ? `${data.mortgageRate.toFixed(2)}%`
          : `z=${signal.zScore.toFixed(1)}`;
        break;
    }

    return {
      name: signal.name,
      plainEnglish: signal.plainEnglish,
      value,
      label,
      direction: signal.direction,
    };
  });
}

/**
 * Convert a set of MSA confluence results into CapitalFlowMap MarketScore[] format.
 */
function confluenceToMapData(
  confluences: Map<string, MarketConfluence>
): MarketScore[] {
  const results: MarketScore[] = [];

  for (const [, confluence] of confluences) {
    const signalMap: SignalValue = {
      monthsOfSupply: "neutral",
      permits: "neutral",
      employment: "neutral",
      rates: "neutral",
      hpiMomentum: "neutral",
    };

    for (const signal of confluence.signals) {
      switch (signal.id) {
        case "months_of_supply":
          signalMap.monthsOfSupply = signal.direction;
          break;
        case "building_permits":
          signalMap.permits = signal.direction;
          break;
        case "employment_growth":
          signalMap.employment = signal.direction;
          break;
        case "mortgage_rates":
          signalMap.rates = signal.direction;
          break;
        case "hpi_momentum":
          signalMap.hpiMomentum = signal.direction;
          break;
      }
    }

    const bullishCount = confluence.signals.filter(s => s.direction === "bullish").length;

    // For city-level geos, stateCode comes from geo.parent; for state-level, from geo.code
    const stateCode = confluence.geo.level === "state"
      ? confluence.geo.code
      : (confluence.geo.parent ?? confluence.geo.code.toUpperCase().slice(0, 2));

    // topMetro: for city-level geos use the display name; for state-level leave blank
    const topMetro = confluence.geo.level === "city"
      ? confluence.geo.name
      : "";

    results.push({
      stateCode,
      stateName: confluence.geo.name,
      score: confluence.compositeScore,
      convergence: bullishCount,
      signals: signalMap,
      topMetro,
      medianHomePrice: 0, // enriched by caller from supply data if available
      yoyAppreciation: 0, // enriched by caller from HPI data if available
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

// ============================================================
// Supported MSAs (intersection of all 4 API routes)
// ============================================================

/** MSAs supported by all three market signal endpoints (supply + permits + HPI) */
export const SUPPORTED_MSAS = [
  "atlanta", "austin", "boston", "charlotte", "chicago", "cincinnati",
  "cleveland", "columbus", "dallas", "denver", "detroit", "houston",
  "indianapolis", "jacksonville", "kansas city", "los angeles", "miami",
  "minneapolis", "nashville", "new york", "orlando", "philadelphia",
  "phoenix", "pittsburgh", "portland", "raleigh", "salt lake city",
  "san diego", "san francisco", "seattle", "tampa",
] as const;

export type SupportedMSA = typeof SUPPORTED_MSAS[number];

// ============================================================
// Main Hook
// ============================================================

/**
 * useMarketSignals — fetches real market data from 4 API routes in parallel,
 * runs it through the confluence engine, and returns chart-ready output.
 *
 * @param msa - MSA name (e.g., "austin", "atlanta"). Case-insensitive.
 * @param stateCode - Optional 2-letter state code for HPI state-level data.
 * @param enabled - Set to false to skip fetching (default: true).
 */
export function useMarketSignals(
  msa: string | null,
  stateCode?: string,
  enabled: boolean = true
): UseMarketSignalsResult {
  const [data, setData] = useState<MarketSignalData>({
    supply: null,
    permits: null,
    hpi: null,
    mortgageRate: null,
  });
  const [confluence, setConfluence] = useState<MarketConfluence | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [signalStatus, setSignalStatus] = useState<UseMarketSignalsResult["signalStatus"]>({
    supply: "idle",
    permits: "idle",
    hpi: "idle",
    rates: "idle",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAllSignals = useCallback(async () => {
    if (!msa || !enabled) return;

    const msaKey = msa.toLowerCase().trim();

    // Check client cache
    const cached = clientCache.get(msaKey);
    if (cached && Date.now() - cached.fetchedAt < CLIENT_CACHE_TTL) {
      setData(cached.data);
      setConfluence(cached.confluence);
      setStatus(cached.confluence ? "success" : "partial");
      setSignalStatus({
        supply: cached.data.supply ? "success" : "error",
        permits: cached.data.permits ? "success" : "error",
        hpi: cached.data.hpi ? "success" : "error",
        rates: cached.data.mortgageRate !== null ? "success" : "error",
      });
      setLastFetchedAt(new Date(cached.fetchedAt).toISOString());
      return;
    }

    // Abort any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStatus("loading");
    setSignalStatus({ supply: "loading", permits: "loading", hpi: "loading", rates: "loading" });
    setErrors([]);

    const newErrors: string[] = [];
    const newSignalStatus: UseMarketSignalsResult["signalStatus"] = {
      supply: "loading",
      permits: "loading",
      hpi: "loading",
      rates: "loading",
    };

    // Fetch all 4 API routes in parallel
    const [supplyResult, permitsResult, hpiResult, ratesResult] = await Promise.allSettled([
      // 1. Supply (Redfin static JSON)
      fetchWithRetry(`/api/market/supply?msa=${encodeURIComponent(msaKey)}`)
        .then(async res => {
          const json = await res.json();
          const parsed = SupplyResponseSchema.safeParse(json);
          if (!parsed.success) {
            throw new Error(`Supply API validation failed: ${parsed.error.issues.map(i => i.message).join(", ")}`);
          }
          return parsed.data.data;
        }),

      // 2. Permits (FRED CSV)
      fetchWithRetry(`/api/market/permits?msa=${encodeURIComponent(msaKey)}`)
        .then(async res => {
          const json = await res.json();
          const parsed = PermitsResponseSchema.safeParse(json);
          if (!parsed.success) {
            throw new Error(`Permits API validation failed: ${parsed.error.issues.map(i => i.message).join(", ")}`);
          }
          return parsed.data.data;
        }),

      // 3. HPI (FRED CSV) — use state if provided, else MSA
      fetchWithRetry(
        stateCode
          ? `/api/market/hpi?state=${encodeURIComponent(stateCode)}`
          : `/api/market/hpi?msa=${encodeURIComponent(msaKey)}`
      )
        .then(async res => {
          const json = await res.json();
          const parsed = HPIResponseSchema.safeParse(json);
          if (!parsed.success) {
            throw new Error(`HPI API validation failed: ${parsed.error.issues.map(i => i.message).join(", ")}`);
          }
          return parsed.data.data;
        }),

      // 4. Mortgage rate (FRED time series)
      fetchWithRetry("/api/market/time-series?series=MORTGAGE30US&period=1y")
        .then(async res => {
          const json = await res.json();
          const parsed = TimeSeriesResponseSchema.safeParse(json);
          if (!parsed.success) {
            throw new Error(`Time series API validation failed: ${parsed.error.issues.map(i => i.message).join(", ")}`);
          }
          const series = parsed.data.data.series["MORTGAGE30US"];
          if (!series || series.length === 0) {
            throw new Error("No MORTGAGE30US data returned");
          }
          return series[series.length - 1]!.value;
        }),
    ]);

    // Process results
    const supplyData = supplyResult.status === "fulfilled" ? supplyResult.value : null;
    const permitsData = permitsResult.status === "fulfilled" ? permitsResult.value : null;
    const hpiData = hpiResult.status === "fulfilled" ? hpiResult.value : null;
    const rateData = ratesResult.status === "fulfilled" ? ratesResult.value : null;

    if (supplyResult.status === "rejected") {
      newErrors.push(`Supply: ${supplyResult.reason}`);
      newSignalStatus.supply = "error";
    } else {
      newSignalStatus.supply = "success";
    }

    if (permitsResult.status === "rejected") {
      newErrors.push(`Permits: ${permitsResult.reason}`);
      newSignalStatus.permits = "error";
    } else {
      newSignalStatus.permits = "success";
    }

    if (hpiResult.status === "rejected") {
      newErrors.push(`HPI: ${hpiResult.reason}`);
      newSignalStatus.hpi = "error";
    } else {
      newSignalStatus.hpi = "success";
    }

    if (ratesResult.status === "rejected") {
      newErrors.push(`Rates: ${ratesResult.reason}`);
      newSignalStatus.rates = "error";
    } else {
      newSignalStatus.rates = "success";
    }

    const newData: MarketSignalData = {
      supply: supplyData,
      permits: permitsData,
      hpi: hpiData,
      mortgageRate: rateData,
    };

    // ---- Build MarketSignalInput for the confluence engine ----
    const signalInput: MarketSignalInput = {};

    if (supplyData) {
      signalInput.monthsOfSupply = {
        value: supplyData.latest.monthsOfSupply,
        zScore: supplyData.zScore3yr,
        previousZScore: supplyData.zScore3yr, // No prior data yet; trend = stable
        asOfDate: supplyData.latest.asOfDate,
        source: "Redfin",
      };
    }

    if (permitsData && permitsData.series.length > 0) {
      const permitsZ = computePermitsZScore(permitsData.series, permitsData.yoyChange);
      signalInput.buildingPermits = {
        value: permitsData.yoyChange / 100, // convert percentage to decimal
        zScore: permitsZ,
        previousZScore: permitsZ,
        asOfDate: permitsData.series[permitsData.series.length - 1]!.date,
        source: "Census / FRED",
      };
    }

    if (hpiData && hpiData.series.length > 0) {
      const hpiZ = computeHPIMomentumZScore(hpiData.series, hpiData.momentum6mo);
      signalInput.hpiMomentum = {
        value: hpiData.momentum6mo / 100,
        zScore: hpiZ,
        previousZScore: hpiZ,
        asOfDate: hpiData.series[hpiData.series.length - 1]!.date,
        source: "FHFA via FRED",
      };
    }

    if (rateData !== null) {
      const rateZ = computeRateZScore(rateData);
      signalInput.mortgageRates = {
        value: rateData,
        zScore: rateZ,
        previousZScore: rateZ,
        asOfDate: new Date().toISOString().slice(0, 10),
        source: "FRED MORTGAGE30US",
      };
    }

    // ---- Build GeoNode ----
    const geo: GeoNode = {
      level: stateCode ? "state" : "city",
      code: stateCode ?? msaKey,
      name: msa.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "),
      parent: stateCode ? "US" : stateCode,
    };

    // ---- Compute confluence ----
    let newConfluence: MarketConfluence | null = null;
    const hasAnySignal = Object.keys(signalInput).length > 0;

    if (hasAnySignal) {
      try {
        newConfluence = buildMarketConfluence(geo, signalInput);
      } catch (err) {
        newErrors.push(`Confluence engine: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ---- Update state ----
    const anySuccess = supplyData || permitsData || hpiData || rateData !== null;
    const allSuccess = supplyData && permitsData && hpiData && rateData !== null;

    setData(newData);
    setConfluence(newConfluence);
    setSignalStatus(newSignalStatus);
    setErrors(newErrors);
    setLastFetchedAt(new Date().toISOString());
    setStatus(allSuccess ? "success" : anySuccess ? "partial" : "error");

    // ---- Update client cache ----
    clientCache.set(msaKey, {
      data: newData,
      confluence: newConfluence,
      fetchedAt: Date.now(),
    });
  }, [msa, stateCode, enabled]);

  // Initial fetch and refetch on MSA change
  useEffect(() => {
    fetchAllSignals();

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchAllSignals]);

  // Compute chart data
  const signalChartData: SignalDatum[] = confluence
    ? confluenceToSignalChartData(confluence, data)
    : [];

  // Map data: for a single MSA, we return just that MSA as a MarketScore
  const mapData: MarketScore[] = confluence
    ? [{
        stateCode: stateCode ?? confluence.geo.code.toUpperCase().slice(0, 2),
        stateName: confluence.geo.name,
        score: confluence.compositeScore,
        convergence: confluence.convergence.bullishCount,
        signals: {
          monthsOfSupply: confluence.signals.find(s => s.id === "months_of_supply")?.direction ?? "neutral",
          permits: confluence.signals.find(s => s.id === "building_permits")?.direction ?? "neutral",
          employment: confluence.signals.find(s => s.id === "employment_growth")?.direction ?? "neutral",
          rates: confluence.signals.find(s => s.id === "mortgage_rates")?.direction ?? "neutral",
          hpiMomentum: confluence.signals.find(s => s.id === "hpi_momentum")?.direction ?? "neutral",
        },
        topMetro: msa
          ? msa.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
          : "",
        medianHomePrice: data.supply?.latest.medianSalePrice ?? 0,
        yoyAppreciation: data.hpi?.momentum1yr ?? 0,
      }]
    : [];

  return {
    data,
    confluence,
    signalChartData,
    mapData,
    status,
    signalStatus,
    errors,
    lastFetchedAt,
    refetch: fetchAllSignals,
  };
}

// ============================================================
// Multi-MSA Hook (for the Markets page heatmap)
// ============================================================

/**
 * MSA → state code lookup.
 * Sourced from Redfin supply data (months-of-supply.json).
 * Used to group MSA-level signals into state-level scores.
 */
const MSA_TO_STATE: Record<string, string> = {
  atlanta: "GA", austin: "TX", boston: "MA", charlotte: "NC",
  chicago: "IL", cincinnati: "OH", cleveland: "OH", columbus: "OH",
  dallas: "TX", denver: "CO", detroit: "MI", houston: "TX",
  indianapolis: "IN", jacksonville: "FL", "kansas city": "MO",
  "los angeles": "CA", miami: "FL", minneapolis: "MN", nashville: "TN",
  "new york": "NY", orlando: "FL", philadelphia: "PA", phoenix: "AZ",
  pittsburgh: "PA", portland: "OR", raleigh: "NC", "salt lake city": "UT",
  "san diego": "CA", "san francisco": "CA", seattle: "WA", tampa: "FL",
};

const STATE_CODE_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

/** Per-MSA fetched signal data, before state-level aggregation */
interface MsaSignalData {
  msa: string;
  stateCode: string;
  supplyZScore: number;
  supplyValue: number;
  supplyAsOfDate: string;
  permitsZScore: number;
  permitsYoy: number;
  permitsAsOfDate: string;
  hpiZScore: number;
  hpiMomentum6mo: number;
  hpiMomentum1yr: number;
  hpiAsOfDate: string;
  medianHomePrice: number;
  /** Which signals had real data (vs neutral fallback) */
  hasSupply: boolean;
  hasPermits: boolean;
  hasHpi: boolean;
  /** Top metro display name */
  displayName: string;
}

export interface UseMultiMarketResult {
  /** All computed confluences, keyed by state code */
  confluences: Map<string, MarketConfluence>;
  /** Chart-ready data for CapitalFlowMap */
  mapData: MarketScore[];
  /** Fetch status */
  status: FetchStatus;
  /** Number of states successfully scored */
  loadedCount: number;
  /** Total states attempted */
  totalCount: number;
  /** Errors */
  errors: string[];
  /** Count of signals fetched per type */
  signalCoverage: {
    supply: number;
    permits: number;
    hpi: number;
    rates: boolean;
  };
  /** Refetch all */
  refetch: () => void;
}

/**
 * useMultiMarketSignals — fetches ALL available signals for multiple MSAs
 * in parallel, aggregates to state-level scores, and returns chart-ready data.
 *
 * Designed for the Markets page heatmap which needs state-level confluence
 * scores for 30+ MSAs across ~15 states.
 *
 * Signals fetched (4 of 5 available):
 *   1. Supply (Redfin static JSON, no key) — weight 0.30
 *   2. Permits (FRED CSV, no key) — weight 0.25
 *   3. HPI (FRED CSV, no key) — weight 0.20
 *   4. Mortgage rate (FRED JSON, FRED_API_KEY) — weight 0.10
 *   5. Employment growth — NO API ROUTE, uses neutral z=0.0
 *
 * State-level aggregation: when multiple MSAs map to the same state,
 * z-scores are averaged (equal weight per MSA within a state).
 *
 * @param msas - Array of MSA slugs to fetch
 * @param enabled - Set to false to skip fetching
 */
export function useMultiMarketSignals(
  msas: readonly string[] = SUPPORTED_MSAS,
  enabled: boolean = true
): UseMultiMarketResult {
  const [confluences, setConfluences] = useState<Map<string, MarketConfluence>>(new Map());
  const [mapData, setMapData] = useState<MarketScore[]>([]);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [loadedCount, setLoadedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [signalCoverage, setSignalCoverage] = useState<UseMultiMarketResult["signalCoverage"]>({
    supply: 0, permits: 0, hpi: 0, rates: false,
  });
  const fetchingRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (!enabled || fetchingRef.current) return;
    fetchingRef.current = true;

    setStatus("loading");
    setErrors([]);

    const newErrors: string[] = [];
    let supplyCount = 0;
    let permitsCount = 0;
    let hpiCount = 0;

    // ── Step 1: Fetch national mortgage rate ONCE ──
    let mortgageRate: number | null = null;
    let mortgageRateZ = 0;
    try {
      const res = await fetchWithRetry("/api/market/time-series?series=MORTGAGE30US&period=1y");
      const json = await res.json();
      const parsed = TimeSeriesResponseSchema.safeParse(json);
      if (parsed.success) {
        const series = parsed.data.data.series["MORTGAGE30US"];
        if (series && series.length > 0) {
          mortgageRate = series[series.length - 1]!.value;
          mortgageRateZ = computeRateZScore(mortgageRate);
        }
      }
    } catch (err) {
      newErrors.push(`Rates: ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── Step 2: Fetch supply + permits + HPI for all MSAs in parallel batches ──
    const allMsaData: MsaSignalData[] = [];
    const BATCH_SIZE = 6;

    for (let i = 0; i < msas.length; i += BATCH_SIZE) {
      const batch = msas.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (msa): Promise<MsaSignalData> => {
          const stateCode = MSA_TO_STATE[msa] ?? "";
          const displayName = msa.split(" ").map(w =>
            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          ).join(" ");

          // Fetch all 3 MSA-level signals in parallel
          const [supplyResult, permitsResult, hpiResult] = await Promise.allSettled([
            // Supply (Redfin static JSON)
            fetchWithRetry(`/api/market/supply?msa=${encodeURIComponent(msa)}`, 1, 8_000)
              .then(async res => {
                const json = await res.json();
                const parsed = SupplyResponseSchema.safeParse(json);
                if (!parsed.success) throw new Error("Validation failed");
                return parsed.data.data;
              }),

            // Permits (FRED CSV, no key needed)
            fetchWithRetry(`/api/market/permits?msa=${encodeURIComponent(msa)}`, 1, 10_000)
              .then(async res => {
                const json = await res.json();
                const parsed = PermitsResponseSchema.safeParse(json);
                if (!parsed.success) throw new Error("Validation failed");
                return parsed.data.data;
              }),

            // HPI (FRED CSV, no key needed)
            fetchWithRetry(`/api/market/hpi?msa=${encodeURIComponent(msa)}`, 1, 10_000)
              .then(async res => {
                const json = await res.json();
                const parsed = HPIResponseSchema.safeParse(json);
                if (!parsed.success) throw new Error("Validation failed");
                return parsed.data.data;
              }),
          ]);

          const supply = supplyResult.status === "fulfilled" ? supplyResult.value : null;
          const permits = permitsResult.status === "fulfilled" ? permitsResult.value : null;
          const hpi = hpiResult.status === "fulfilled" ? hpiResult.value : null;

          // Compute z-scores for available signals
          const supplyZ = supply ? supply.zScore3yr : 0;
          const permitsZ = permits && permits.series.length > 0
            ? computePermitsZScore(permits.series, permits.yoyChange) : 0;
          const hpiZ = hpi && hpi.series.length > 0
            ? computeHPIMomentumZScore(hpi.series, hpi.momentum6mo) : 0;

          return {
            msa,
            stateCode: supply?.stateCode ?? stateCode,
            supplyZScore: supplyZ,
            supplyValue: supply?.latest.monthsOfSupply ?? 0,
            supplyAsOfDate: supply?.latest.asOfDate ?? "",
            permitsZScore: permitsZ,
            permitsYoy: permits?.yoyChange ?? 0,
            permitsAsOfDate: permits && permits.series.length > 0
              ? permits.series[permits.series.length - 1]!.date : "",
            hpiZScore: hpiZ,
            hpiMomentum6mo: hpi?.momentum6mo ?? 0,
            hpiMomentum1yr: hpi?.momentum1yr ?? 0,
            hpiAsOfDate: hpi && hpi.series.length > 0
              ? hpi.series[hpi.series.length - 1]!.date : "",
            medianHomePrice: supply?.latest.medianSalePrice ?? 0,
            hasSupply: supply !== null,
            hasPermits: permits !== null,
            hasHpi: hpi !== null,
            displayName,
          };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          const d = result.value;
          allMsaData.push(d);
          if (d.hasSupply) supplyCount++;
          if (d.hasPermits) permitsCount++;
          if (d.hasHpi) hpiCount++;
        } else {
          newErrors.push(String(result.reason));
        }
      }
    }

    // ── Step 3: Group MSAs by state, aggregate signals ──
    const stateGroups = new Map<string, MsaSignalData[]>();
    for (const msaData of allMsaData) {
      if (!msaData.stateCode) continue;
      const existing = stateGroups.get(msaData.stateCode) ?? [];
      existing.push(msaData);
      stateGroups.set(msaData.stateCode, existing);
    }

    // ── Step 4: Build state-level confluences ──
    const newConfluences = new Map<string, MarketConfluence>();
    const newMapData: MarketScore[] = [];
    let stateSuccessCount = 0;

    for (const [stateCode, msaGroup] of stateGroups) {
      // Average z-scores across MSAs for this state
      const avgSupplyZ = average(msaGroup.filter(m => m.hasSupply).map(m => m.supplyZScore));
      const avgPermitsZ = average(msaGroup.filter(m => m.hasPermits).map(m => m.permitsZScore));
      const avgHpiZ = average(msaGroup.filter(m => m.hasHpi).map(m => m.hpiZScore));

      // Find most recent dates
      const supplyDates = msaGroup.filter(m => m.hasSupply && m.supplyAsOfDate);
      const permitsDates = msaGroup.filter(m => m.hasPermits && m.permitsAsOfDate);
      const hpiDates = msaGroup.filter(m => m.hasHpi && m.hpiAsOfDate);

      // Build signal input
      const signalInput: MarketSignalInput = {};
      const hasAnySupply = msaGroup.some(m => m.hasSupply);
      const hasAnyPermits = msaGroup.some(m => m.hasPermits);
      const hasAnyHpi = msaGroup.some(m => m.hasHpi);

      if (hasAnySupply) {
        const avgSupplyValue = average(msaGroup.filter(m => m.hasSupply).map(m => m.supplyValue));
        signalInput.monthsOfSupply = {
          value: avgSupplyValue,
          zScore: avgSupplyZ,
          previousZScore: avgSupplyZ, // No prior data yet
          asOfDate: supplyDates.sort((a, b) => b.supplyAsOfDate.localeCompare(a.supplyAsOfDate))[0]?.supplyAsOfDate ?? "",
          source: "Redfin",
        };
      }

      if (hasAnyPermits) {
        const avgPermitsYoy = average(msaGroup.filter(m => m.hasPermits).map(m => m.permitsYoy));
        signalInput.buildingPermits = {
          value: avgPermitsYoy / 100, // convert percentage to decimal
          zScore: avgPermitsZ,
          previousZScore: avgPermitsZ,
          asOfDate: permitsDates.sort((a, b) => b.permitsAsOfDate.localeCompare(a.permitsAsOfDate))[0]?.permitsAsOfDate ?? "",
          source: "Census / FRED",
        };
      }

      if (hasAnyHpi) {
        const avgMomentum = average(msaGroup.filter(m => m.hasHpi).map(m => m.hpiMomentum6mo));
        signalInput.hpiMomentum = {
          value: avgMomentum / 100, // convert percentage to decimal
          zScore: avgHpiZ,
          previousZScore: avgHpiZ,
          asOfDate: hpiDates.sort((a, b) => b.hpiAsOfDate.localeCompare(a.hpiAsOfDate))[0]?.hpiAsOfDate ?? "",
          source: "FHFA via FRED",
        };
      }

      // Employment: no API route yet — use neutral z=0.0
      // (weight 0.15, skipped — confluence engine handles missing signals)

      if (mortgageRate !== null) {
        signalInput.mortgageRates = {
          value: mortgageRate,
          zScore: mortgageRateZ,
          previousZScore: mortgageRateZ,
          asOfDate: new Date().toISOString().slice(0, 10),
          source: "FRED MORTGAGE30US",
        };
      }

      const stateName = STATE_CODE_TO_NAME[stateCode] ?? stateCode;
      const geo: GeoNode = {
        level: "state",
        code: stateCode,
        name: stateName,
        parent: "US",
      };

      try {
        const confluence = buildMarketConfluence(geo, signalInput);
        newConfluences.set(stateCode, confluence);

        // Pick the top MSA as "topMetro" — highest supply data availability, then by name
        const topMsa = msaGroup.sort((a, b) => {
          const aScore = (a.hasSupply ? 4 : 0) + (a.hasPermits ? 2 : 0) + (a.hasHpi ? 1 : 0);
          const bScore = (b.hasSupply ? 4 : 0) + (b.hasPermits ? 2 : 0) + (b.hasHpi ? 1 : 0);
          return bScore - aScore;
        })[0]!;

        // Compute YoY appreciation from HPI momentum
        const avgYoy = average(msaGroup.filter(m => m.hasHpi).map(m => m.hpiMomentum1yr));
        const avgPrice = average(msaGroup.filter(m => m.medianHomePrice > 0).map(m => m.medianHomePrice));

        // Build signal directions from the confluence
        const signalMap: SignalValue = {
          monthsOfSupply: "neutral",
          permits: "neutral",
          employment: "neutral",
          rates: "neutral",
          hpiMomentum: "neutral",
        };

        for (const signal of confluence.signals) {
          switch (signal.id) {
            case "months_of_supply": signalMap.monthsOfSupply = signal.direction; break;
            case "building_permits": signalMap.permits = signal.direction; break;
            case "employment_growth": signalMap.employment = signal.direction; break;
            case "mortgage_rates": signalMap.rates = signal.direction; break;
            case "hpi_momentum": signalMap.hpiMomentum = signal.direction; break;
          }
        }

        newMapData.push({
          stateCode,
          stateName,
          score: confluence.compositeScore,
          convergence: confluence.convergence.bullishCount,
          signals: signalMap,
          topMetro: topMsa.displayName,
          medianHomePrice: Math.round(avgPrice),
          yoyAppreciation: Math.round(avgYoy * 10) / 10,
        });

        stateSuccessCount++;
      } catch (err) {
        newErrors.push(`${stateCode}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Sort by score descending
    newMapData.sort((a, b) => b.score - a.score);

    setConfluences(newConfluences);
    setMapData(newMapData);
    setLoadedCount(stateSuccessCount);
    setErrors(newErrors);
    setSignalCoverage({
      supply: supplyCount,
      permits: permitsCount,
      hpi: hpiCount,
      rates: mortgageRate !== null,
    });
    setStatus(
      stateSuccessCount > 0 && (supplyCount > 0 || permitsCount > 0 || hpiCount > 0)
        ? "success"
        : stateSuccessCount > 0
          ? "partial"
          : "error"
    );
    fetchingRef.current = false;
  }, [msas, enabled]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    confluences,
    mapData,
    status,
    loadedCount,
    totalCount: stateGroups_count(msas),
    errors,
    signalCoverage,
    refetch: fetchAll,
  };
}

/** Compute average of an array, returns 0 for empty arrays */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Count unique states from MSA list (for totalCount) */
function stateGroups_count(msas: readonly string[]): number {
  const states = new Set<string>();
  for (const msa of msas) {
    const state = MSA_TO_STATE[msa];
    if (state) states.add(state);
  }
  return states.size;
}
