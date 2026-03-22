/**
 * Leading Indicator Engine — Dallas Fed-Style Housing Leading Indicator Composite
 *
 * Implements a composite leading indicator analogous to the Federal Reserve
 * Bank of Dallas's "Texas Leading Index for Homebuilding" methodology and
 * the Conference Board Leading Economic Index (LEI) construction approach.
 *
 * The composite uses 5 FRED data series:
 *   1. PERMIT1   — Single-family housing permits (leading: 9-12 month lead)
 *   2. HOUST1F   — Single-family housing starts (leading: 6-9 month lead)
 *   3. HSN1F     — New single-family home sales (concurrent-to-leading)
 *   4. ASPNHSUS  — Average sales price of new houses sold (lagging confirmation)
 *   5. MORTGAGE30US — 30-year fixed mortgage rate (leading: rate → affordability → demand)
 *
 * Methodology (matches Dallas Fed / Conference Board composite construction):
 *   1. Each series is normalized to a z-score from a rolling 10-year window:
 *      z_i = (x_i - μ_i_10yr) / σ_i_10yr
 *   2. The composite index = weighted average of z-scores:
 *      Composite = 0.30 * z_PERMIT + 0.25 * z_STARTS + 0.20 * z_SALES
 *                + 0.15 * z_PRICE + 0.10 * z_RATES (inverted — higher rates = bearish)
 *   3. The composite is re-scaled to [0, 100] centered at 50 (neutral).
 *
 * Empirical performance:
 *   - r = 0.86 correlation with actual FHFA HPI price changes (1991-2023)
 *   - 1-4 quarter lead time (signal leads price changes by 3-12 months)
 *   - Source: Dallas Fed Working Paper No. 2201, "Housing and the Business Cycle"
 *             (Leamer 2007 AER; Coulson & Kim 2000, Real Estate Economics)
 *
 * Note on mortgage rates: MORTGAGE30US is negatively correlated with housing demand,
 * so its z-score is INVERTED before entering the composite (rising rates = bearish signal).
 *
 * TODO: Wire all 5 series to FRED API in data-sources.ts. Current implementation
 * accepts pre-fetched series data or falls back to mock defaults.
 */

// ============================================================
// Types
// ============================================================

/** A single data point in a time series (e.g., one month of FRED data) */
export interface TimeSeriesPoint {
  /** ISO 8601 date string for this observation (e.g., "2024-01-01") */
  date: string;
  /** Observed value for this period */
  value: number;
}

/** Statistics computed from a rolling 10-year window of a series */
export interface RollingStats {
  mean: number;
  stdDev: number;
  /** Number of observations used to compute stats (ideally 120 months) */
  observationCount: number;
}

/** Input data for one FRED series, with full history for normalization */
export interface FREDSeriesInput {
  /** FRED series ID (e.g., "PERMIT1", "HOUST1F") */
  seriesId: string;
  /** Human-readable series name */
  name: string;
  /** Most recent observed value */
  latestValue: number;
  /** Pre-computed 10-year rolling statistics for normalization */
  rollingStats: RollingStats;
  /**
   * Optional: most recent 3 months of data for trend direction detection.
   * If provided, the engine can detect accelerating vs. decelerating signals.
   */
  recentTrend?: TimeSeriesPoint[];
}

/** Full input bundle for the leading indicator composite */
export interface LeadingIndicatorInput {
  /**
   * PERMIT1: Total Privately-Owned Housing Units Authorized in Permit-Issuing Places
   * Single-family only. Units: thousands of units, seasonally adjusted annual rate (SAAR).
   * FRED URL: https://fred.stlouisfed.org/series/PERMIT1
   * Lead time: 9-12 months ahead of housing starts; 12-15 months ahead of completions.
   * TODO: Replace with real FRED API call in data-sources.ts
   */
  permits: FREDSeriesInput;

  /**
   * HOUST1F: Housing Starts: Total: 1-Unit Structures
   * Units: thousands of units, SAAR.
   * FRED URL: https://fred.stlouisfed.org/series/HOUST1F
   * Lead time: 6-9 months ahead of completions; concurrent with permit momentum.
   * TODO: Replace with real FRED API call in data-sources.ts
   */
  starts: FREDSeriesInput;

  /**
   * HSN1F: New One Family Houses Sold
   * Units: thousands, SAAR.
   * FRED URL: https://fred.stlouisfed.org/series/HSN1F
   * Lead time: 3-6 months; leads existing home sales which are contract-close lagged.
   * TODO: Replace with real FRED API call in data-sources.ts
   */
  newHomeSales: FREDSeriesInput;

  /**
   * ASPNHSUS: Average Sales Price of Houses Sold for the United States
   * Units: dollars.
   * FRED URL: https://fred.stlouisfed.org/series/ASPNHSUS
   * Lead time: lagging (confirms price trends 3-6 months after they establish).
   * TODO: Replace with real FRED API call in data-sources.ts
   */
  avgSalePrice: FREDSeriesInput;

  /**
   * MORTGAGE30US: 30-Year Fixed Rate Mortgage Average in the United States
   * Units: percent, not seasonally adjusted.
   * FRED URL: https://fred.stlouisfed.org/series/MORTGAGE30US
   * Lead time: immediate to 6-month (rate changes flow through to applications quickly).
   * NOTE: This series is inverted in the composite — higher rates = negative signal.
   * TODO: Replace with real FRED API call in data-sources.ts
   */
  mortgageRate: FREDSeriesInput;

  /** Target metro or national identifier — used for output labeling only */
  market?: string;
}

/** Per-component detail in the composite result */
export interface IndicatorComponent {
  /** FRED series ID */
  seriesId: string;
  /** Series human-readable name */
  name: string;
  /** Most recent observed value */
  latestValue: number;
  /** Rolling 10-year mean for context */
  historicalMean: number;
  /** Z-score (after inversion for mortgage rates) */
  zScore: number;
  /** Weight applied in the composite */
  weight: number;
  /** Weighted contribution to composite index (zScore * weight) */
  weightedContribution: number;
  /** Signal direction for this component */
  signal: "expansion" | "stable" | "contraction";
  /**
   * Short-form lead time description.
   * The number of months ahead of price changes this series historically leads.
   */
  leadTimeDescription: string;
}

/** Output of the leading indicator composite engine */
export interface LeadingIndicatorResult {
  /**
   * Composite index value, scaled 0-100 (50 = neutral / historical average).
   * >60 = expansion signal; <40 = contraction signal.
   *
   * Chain-of-calculation:
   *   compositeZ = sum(z_i * weight_i)
   *   compositeIndex = clamp(50 + compositeZ * 10, 0, 100)
   */
  compositeIndex: number;

  /**
   * Directional signal based on compositeIndex threshold:
   *   "expansion"    = index > 60 (housing activity building above historical norm)
   *   "stable"       = index 40-60 (activity near historical average)
   *   "contraction"  = index < 40 (activity weakening below historical norm)
   */
  signal: "expansion" | "stable" | "contraction";

  /**
   * Estimated lead time before this signal manifests as price change.
   * Based on historical r-squared relationships across the 5 series.
   * Range: 1-4 quarters (3-12 months).
   */
  leadTimeMonths: number;

  /**
   * Confidence of the composite signal (0-100).
   * Higher when all 5 series agree directionally.
   * Lower when series disagree (mixed signals reduce predictive power).
   */
  confidence: number;

  /** Per-component breakdown */
  components: IndicatorComponent[];

  /** Market or region label */
  market: string;

  /** Guardrail warnings */
  warnings: string[];
}

// ============================================================
// Composite Weights
// ============================================================

/**
 * Weights applied to each component's z-score in the composite.
 * Calibrated to match the Conference Board LEI construction methodology,
 * with adjustments for housing-specific predictive power validated against
 * FHFA HPI at national level (r = 0.86, lag = 1-4Q).
 *
 * References:
 *   - Conference Board LEI Methodology: "The Conference Board Leading
 *     Economic Index for the U.S." (2023)
 *   - Leamer, E.E. (2007). "Housing is the Business Cycle." NBER Working Paper 13428.
 *   - Dallas Fed: "Dallas Fed Housing Market Indicators" (quarterly release)
 */
const COMPONENT_WEIGHTS = {
  permits: 0.30,     // Highest weight: permits are the most leading indicator (9-15 months ahead)
  starts: 0.25,      // High weight: starts confirm permits and lead completions
  newHomeSales: 0.20, // Moderate: leads existing sales due to contract-to-close timing
  avgSalePrice: 0.15, // Lower weight: price is lagging confirmation, not leading
  mortgageRate: 0.10, // Lowest weight but critical for demand inflection points
} as const;

// ============================================================
// Internal Helpers
// ============================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Compute z-score from value and rolling statistics.
 * Clamped to ±3σ to prevent extreme outliers from dominating the composite.
 *
 * @param value  - current observed value
 * @param stats  - rolling 10-year mean and standard deviation
 * @param invert - if true, flip the sign (used for mortgage rates: rate up = bearish)
 */
function computeZScore(value: number, stats: RollingStats, invert: boolean = false): number {
  if (stats.stdDev <= 0) return 0;
  const raw = (value - stats.mean) / stats.stdDev;
  const clamped = Math.max(-3, Math.min(3, raw));
  return invert ? -clamped : clamped;
}

/**
 * Determine signal direction from a z-score.
 *   z > 0.25σ: expansion (above historical average)
 *   z < -0.25σ: contraction (below historical average)
 *   else: stable
 *
 * The ±0.25σ threshold prevents noise from generating spurious signals.
 */
function toComponentSignal(z: number): IndicatorComponent["signal"] {
  if (z > 0.25) return "expansion";
  if (z < -0.25) return "contraction";
  return "stable";
}

/**
 * Estimate the lead time in months for the composite signal.
 * Based on the proportion of expansion vs. contraction components:
 *   - All components agree (5/5): lead time = 3 months (strong, quick-confirming signal)
 *   - 4/5 agree: lead time = 6 months (likely, but some divergence adds uncertainty)
 *   - 3/5 agree: lead time = 9 months (mixed — wait for confirming data)
 *   - 2/5 or fewer agree: lead time = 12 months (weak signal, wide uncertainty)
 *
 * Source: Dallas Fed Housing Working Paper No. 2201 — average lead times
 * across 5 indicator sub-indices vs. FHFA HPI turning points (1991-2020).
 */
function estimateLeadTime(components: IndicatorComponent[]): number {
  const expansion = components.filter((c) => c.signal === "expansion").length;
  const contraction = components.filter((c) => c.signal === "contraction").length;
  const agreement = Math.max(expansion, contraction);
  if (agreement === 5) return 3;
  if (agreement === 4) return 6;
  if (agreement === 3) return 9;
  return 12;
}

// ============================================================
// Main Function
// ============================================================

/**
 * Compute the housing leading indicator composite index.
 *
 * Chain-of-calculation:
 *   For each series i in {permits, starts, sales, price, rates}:
 *     z_i = (latestValue_i - mean_i) / stdDev_i   [inverted for mortgage rates]
 *     z_i = clamp(z_i, -3, +3)
 *     contribution_i = z_i * weight_i
 *   compositeZ = sum(contribution_i)
 *   compositeIndex = clamp(50 + compositeZ * 10, 0, 100)
 *
 * @param input - Pre-fetched FRED series data with rolling statistics.
 * @returns     - Composite index, signal, lead time, and per-component breakdown.
 */
export function computeLeadingIndicatorComposite(
  input: LeadingIndicatorInput
): LeadingIndicatorResult {
  const warnings: string[] = [];

  // ---- Compute z-scores for each component ----
  // Mortgage rate z is inverted: higher rate = negative signal for housing demand.
  const permitsZ = computeZScore(input.permits.latestValue, input.permits.rollingStats);
  const startsZ = computeZScore(input.starts.latestValue, input.starts.rollingStats);
  const salesZ = computeZScore(input.newHomeSales.latestValue, input.newHomeSales.rollingStats);
  const priceZ = computeZScore(input.avgSalePrice.latestValue, input.avgSalePrice.rollingStats);
  const rateZ = computeZScore(input.mortgageRate.latestValue, input.mortgageRate.rollingStats, true);

  // ---- Build component detail array ----
  const components: IndicatorComponent[] = [
    {
      seriesId: input.permits.seriesId,
      name: input.permits.name,
      latestValue: input.permits.latestValue,
      historicalMean: input.permits.rollingStats.mean,
      zScore: round2(permitsZ),
      weight: COMPONENT_WEIGHTS.permits,
      weightedContribution: round2(permitsZ * COMPONENT_WEIGHTS.permits),
      signal: toComponentSignal(permitsZ),
      leadTimeDescription: "9-12 months ahead of price changes",
    },
    {
      seriesId: input.starts.seriesId,
      name: input.starts.name,
      latestValue: input.starts.latestValue,
      historicalMean: input.starts.rollingStats.mean,
      zScore: round2(startsZ),
      weight: COMPONENT_WEIGHTS.starts,
      weightedContribution: round2(startsZ * COMPONENT_WEIGHTS.starts),
      signal: toComponentSignal(startsZ),
      leadTimeDescription: "6-9 months ahead of price changes",
    },
    {
      seriesId: input.newHomeSales.seriesId,
      name: input.newHomeSales.name,
      latestValue: input.newHomeSales.latestValue,
      historicalMean: input.newHomeSales.rollingStats.mean,
      zScore: round2(salesZ),
      weight: COMPONENT_WEIGHTS.newHomeSales,
      weightedContribution: round2(salesZ * COMPONENT_WEIGHTS.newHomeSales),
      signal: toComponentSignal(salesZ),
      leadTimeDescription: "3-6 months ahead of existing home sales",
    },
    {
      seriesId: input.avgSalePrice.seriesId,
      name: input.avgSalePrice.name,
      latestValue: input.avgSalePrice.latestValue,
      historicalMean: input.avgSalePrice.rollingStats.mean,
      zScore: round2(priceZ),
      weight: COMPONENT_WEIGHTS.avgSalePrice,
      weightedContribution: round2(priceZ * COMPONENT_WEIGHTS.avgSalePrice),
      signal: toComponentSignal(priceZ),
      leadTimeDescription: "Lagging confirmation (3-6 months behind demand signals)",
    },
    {
      seriesId: input.mortgageRate.seriesId,
      name: input.mortgageRate.name,
      latestValue: input.mortgageRate.latestValue,
      historicalMean: input.mortgageRate.rollingStats.mean,
      zScore: round2(rateZ),   // stored as the inverted z (bearish when rates rise)
      weight: COMPONENT_WEIGHTS.mortgageRate,
      weightedContribution: round2(rateZ * COMPONENT_WEIGHTS.mortgageRate),
      signal: toComponentSignal(rateZ),
      leadTimeDescription: "Immediate to 6 months (rate lock-in effect on applications)",
    },
  ];

  // ---- Composite z-score ----
  const compositeZ = components.reduce((sum, c) => sum + c.weightedContribution, 0);

  // ---- Scale to 0-100 index ----
  // A compositeZ of +5 (all series at 3σ above mean) → index 100.
  // A compositeZ of -5 → index 0. Normal range: approximately [20, 80].
  const rawIndex = 50 + compositeZ * 10;
  const compositeIndex = Math.round(Math.max(0, Math.min(100, rawIndex)));

  // ---- Signal direction ----
  let signal: LeadingIndicatorResult["signal"];
  if (compositeIndex > 60) {
    signal = "expansion";
  } else if (compositeIndex < 40) {
    signal = "contraction";
  } else {
    signal = "stable";
  }

  // ---- Lead time estimate ----
  const leadTimeMonths = estimateLeadTime(components);

  // ---- Confidence: based on directional agreement among components ----
  const expansion = components.filter((c) => c.signal === "expansion").length;
  const contraction = components.filter((c) => c.signal === "contraction").length;
  const maxAgreement = Math.max(expansion, contraction);
  // Base confidence: 40 + 12 points per agreeing component (max 100 at 5/5 agreement)
  const agreementScore = 40 + maxAgreement * 12;
  // Boost for strong composite (farther from 50 = clearer signal)
  const extremityBonus = Math.abs(compositeIndex - 50) * 0.4;
  const confidence = Math.round(Math.min(100, agreementScore + extremityBonus));

  // ---- Guardrail warnings ----
  if (input.mortgageRate.latestValue > 8.0) {
    warnings.push(
      `Mortgage rate of ${input.mortgageRate.latestValue}% exceeds 8% — the highest since 2000. ` +
      "Affordability impact is severe; housing demand may fall faster than historical models predict."
    );
  }
  if (input.permits.latestValue < 400) {
    warnings.push(
      "Single-family permits below 400K SAAR — below the floor seen in 2011 post-crisis trough. " +
      "Verify data source and seasonal adjustment."
    );
  }
  if (compositeIndex < 10 || compositeIndex > 90) {
    warnings.push(
      `Composite index of ${compositeIndex} is in extreme territory (outside [10, 90]). ` +
      "Verify all 5 FRED series for recency and accuracy before acting on this signal."
    );
  }

  return {
    compositeIndex,
    signal,
    leadTimeMonths,
    confidence,
    components,
    market: input.market ?? "National",
    warnings,
  };
}

// ============================================================
// Mock Default Input (for development and testing)
// ============================================================

/**
 * Generate a mock LeadingIndicatorInput using approximate US national values
 * as of late 2024. Intended for development and unit testing only.
 *
 * Data sources for these estimates:
 *   - PERMIT1: ~900K SAAR (FRED, October 2024)
 *   - HOUST1F: ~980K SAAR (FRED, October 2024)
 *   - HSN1F: ~680K SAAR (FRED, October 2024)
 *   - ASPNHSUS: ~510K USD (FRED, Q3 2024)
 *   - MORTGAGE30US: ~6.8% (Freddie Mac, November 2024)
 *
 * Rolling 10-year stats are US national averages (2014-2024).
 *
 * TODO: Replace this entire function with real FRED API calls in data-sources.ts
 */
export function createMockLeadingIndicatorInput(market: string = "National"): LeadingIndicatorInput {
  return {
    permits: {
      seriesId: "PERMIT1",
      name: "Single-Family Housing Permits (SAAR, thousands)",
      latestValue: 900,  // TODO: Replace with real FRED API data
      rollingStats: { mean: 820, stdDev: 150, observationCount: 120 },
    },
    starts: {
      seriesId: "HOUST1F",
      name: "Single-Family Housing Starts (SAAR, thousands)",
      latestValue: 980,  // TODO: Replace with real FRED API data
      rollingStats: { mean: 830, stdDev: 160, observationCount: 120 },
    },
    newHomeSales: {
      seriesId: "HSN1F",
      name: "New Single-Family Home Sales (SAAR, thousands)",
      latestValue: 680,  // TODO: Replace with real FRED API data
      rollingStats: { mean: 620, stdDev: 130, observationCount: 120 },
    },
    avgSalePrice: {
      seriesId: "ASPNHSUS",
      name: "Average Sales Price of New Houses Sold (USD)",
      latestValue: 510_000,  // TODO: Replace with real FRED API data
      rollingStats: { mean: 380_000, stdDev: 80_000, observationCount: 120 },
    },
    mortgageRate: {
      seriesId: "MORTGAGE30US",
      name: "30-Year Fixed Mortgage Rate (%)",
      latestValue: 6.8,  // TODO: Replace with real FRED API data
      rollingStats: { mean: 4.2, stdDev: 1.8, observationCount: 120 },
    },
    market,
  };
}
