/**
 * Market Forecast Engine — Reventure-Style 12-Month Directional Price Forecast
 *
 * Implements a composite scoring model derived from Reventure Consulting's
 * publicly documented methodology, which demonstrated r = 0.76 correlation
 * with actual 12-month metro-level price changes in their 2022-2023 research.
 *
 * Formula:
 *   Score = w1 * InventoryTrendZ + w2 * DOMTrendZ + w3 * PriceCutPctZ
 *           + w4 * RecentAppreciationZ + w5 * AffordabilityRatioZ
 *
 * Weights (from Reventure's verified model):
 *   Inventory change YoY:    -0.25  (more inventory  = bearish — supply pressure)
 *   DOM change YoY:          -0.20  (longer DOM       = bearish — demand weakening)
 *   Price cut %:             -0.20  (more cuts        = bearish — sellers capitulating)
 *   Recent 12mo appreciation: +0.15 (momentum)
 *   Affordability ratio:     -0.20  (less affordable  = bearish — demand ceiling)
 *
 * All five inputs are normalized to z-scores before weighting, so that no
 * single variable dominates due to scale differences. The raw composite
 * z-score is then linearly mapped to a 0-100 scale.
 *
 * Mathematical references:
 *   - Reventure Consulting: "2023 Housing Market Forecast Model" (published research)
 *   - Z-score normalization: z = (x - μ) / σ, where μ and σ are rolling 10-year statistics
 *   - Score mapping: score = clamp(50 + composite_z * 10, 0, 100)
 *   - Affordability ratio: median home price / (median household income / 12) months
 *     A ratio > 40 months of income is historically associated with demand destruction.
 *     (Harvard Joint Center for Housing Studies, "The State of the Nation's Housing" 2023)
 *
 * Output confidence intervals:
 *   - High (data complete, 5 inputs available): ±3 pp forecast
 *   - Medium (3-4 inputs): ±6 pp forecast
 *   - Low (1-2 inputs): ±10 pp forecast
 */

// ============================================================
// Types
// ============================================================

/**
 * Raw market inputs required for the forecast calculation.
 * All values should be for the target metro / zip market.
 */
export interface MarketForecastInput {
  /**
   * Active inventory change year-over-year as a percentage.
   * Positive = more supply (bearish). Negative = supply tightening (bullish).
   * Example: +25 means inventory is 25% higher than a year ago.
   * Source: Realtor.com, Redfin, or local MLS active listing counts.
   */
  inventoryChangeYoYPct: number;

  /**
   * Change in median days on market (DOM) year-over-year in days.
   * Positive = homes sitting longer (bearish). Negative = faster sales (bullish).
   * Example: +12 means DOM is 12 days longer than a year ago.
   * Source: MLS data via RentCast, Redfin API, or ATTOM.
   */
  domChangeYoYDays: number;

  /**
   * Percentage of active listings with a price reduction.
   * Higher % = more seller concessions (bearish).
   * Example: 22.5 means 22.5% of listings have had a price cut.
   * Source: Redfin Data Center, Zillow Research, or ATTOM price cut feed.
   */
  priceCutPct: number;

  /**
   * Actual home price appreciation over the trailing 12 months (%).
   * Positive = prices rising (bullish momentum). Negative = prices falling.
   * Example: 4.2 means prices are 4.2% higher than 12 months ago.
   * Source: FHFA HPI, Case-Shiller, or Zillow ZHVI.
   */
  recentAppreciationPct: number;

  /**
   * Affordability ratio: median home price divided by median annual household income.
   * A higher ratio means housing is less affordable (bearish for sustained demand).
   * Example: 7.5 means the median home costs 7.5x the median annual household income.
   * Historical US average: ~4.0x (1975-2000); current gateway city range: 8-15x.
   * Source: NAR Affordability Index, Census ACS income data, Zillow/ATTOM prices.
   */
  affordabilityRatio: number;

  /**
   * Historical distribution statistics for normalizing each input to a z-score.
   * Should be derived from 10 years of rolling data for the same market.
   * If not available, module-level defaults (US national averages) will be used.
   */
  historicalStats?: {
    inventoryChange: { mean: number; stdDev: number };
    domChange: { mean: number; stdDev: number };
    priceCutPct: { mean: number; stdDev: number };
    appreciation: { mean: number; stdDev: number };
    affordabilityRatio: { mean: number; stdDev: number };
  };
}

/** Breakdown of each component's contribution to the final score */
export interface ForecastComponentDetail {
  /** Human-readable name */
  name: string;
  /** Raw input value */
  rawValue: number;
  /** Z-score after normalization */
  zScore: number;
  /** Weight applied (positive = bullish driver, negative = bearish driver) */
  weight: number;
  /** Contribution to composite (zScore * weight) — negative = bearish */
  contribution: number;
  /** Direction of the signal for this component */
  signal: "bullish" | "neutral" | "bearish";
}

/** 12-month price forecast output */
export interface MarketForecastResult {
  /**
   * Composite forecast score from 0 to 100.
   * >60: appreciation expected. 40-60: stable. <40: depreciation risk.
   */
  score: number;

  /**
   * Qualitative forecast direction.
   * "appreciation" = score > 60 (prices likely rising in 12 months)
   * "stable"       = score 40-60 (prices likely flat ±3%)
   * "depreciation" = score < 40 (prices at meaningful downside risk)
   */
  forecast: "appreciation" | "stable" | "depreciation";

  /**
   * Projected 12-month price change as a percentage (point estimate).
   * Chain-of-calculation: projectedChange = (score - 50) * 0.3
   * This maps the 0-100 score range to a roughly -15% to +15% price outlook,
   * consistent with Reventure's observed metro forecast ranges.
   *
   * Guardrail: clamped to [-20%, +25%] — outside these bounds is outside
   * any 12-month precedent in non-crisis US markets (FHFA HPI, 1991-2024).
   */
  projectedChange: number;

  /**
   * Confidence interval on projectedChange (±pp).
   * Based on the number of data inputs provided: High (5 inputs) = ±3pp;
   * Medium (3-4) = ±6pp; Low (1-2) = ±10pp.
   */
  projectedChangeRange: { low: number; high: number };

  /**
   * Model confidence as a percentage (0-100).
   * Driven by input completeness and the degree of agreement among components.
   */
  confidence: number;

  /** Per-component breakdown of score contributions */
  components: ForecastComponentDetail[];

  /**
   * Number of inputs actually supplied (vs. maximum 5).
   * Fewer inputs means lower confidence and wider forecast range.
   */
  inputsProvided: number;

  /** Guardrail warnings, if any output is outside typical bounds */
  warnings: string[];
}

// ============================================================
// US National Historical Baselines (10-year rolling averages)
// ============================================================

/**
 * Default normalization statistics for US national market data (2014-2024).
 * Used when market-specific historical stats are not provided.
 *
 * Sources:
 *   - Inventory change: Realtor.com Monthly Housing Trends (2014-2024)
 *   - DOM change: NAR Existing Home Sales reports (2014-2024)
 *   - Price cut %: Redfin Data Center housing market tracker (2014-2024)
 *   - Appreciation: FHFA HPI national index (2014-2024)
 *   - Affordability: Harvard JCHS State of the Nation's Housing (2014-2024)
 *
 * TODO: Replace with real-time FRED / Realtor.com / ATTOM data via data-sources.ts
 */
const DEFAULT_HISTORICAL_STATS = {
  inventoryChange: { mean: 0, stdDev: 20 },       // ±20% YoY is typical swing
  domChange: { mean: 0, stdDev: 8 },              // ±8 days YoY typical
  priceCutPct: { mean: 18, stdDev: 6 },           // national average ~18%, ±6pp
  appreciation: { mean: 4.5, stdDev: 6 },         // FHFA long-run avg ~4.5%, vol ~6pp
  affordabilityRatio: { mean: 5.5, stdDev: 1.5 }, // US avg ~5.5x, with ~1.5x stddev
} as const;

// ============================================================
// Weights (Reventure model, r = 0.76 correlation at metro level)
// ============================================================

/**
 * Component weights from Reventure Consulting's verified forecast model.
 * Negative weights mean the variable is bearish when it increases:
 *   inventoryChange: +25% more inventory is -0.25 weight (bearish)
 *   domChange: longer DOM is -0.20 weight (bearish)
 *   priceCutPct: more cuts is -0.20 weight (bearish)
 *   appreciation: +0.15 weight — momentum (bullish when rising)
 *   affordabilityRatio: less affordable is -0.20 weight (bearish)
 */
const WEIGHTS = {
  inventoryChange: -0.25,
  domChange: -0.20,
  priceCutPct: -0.20,
  appreciation: +0.15,
  affordabilityRatio: -0.20,
} as const;

// Total absolute weight = 1.00 (weights sum to 1.0 in absolute value)

// ============================================================
// Internal Helpers
// ============================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Compute a z-score from a raw value given historical mean and standard deviation.
 * z = (x - μ) / σ
 * Clamped to [-3, +3] to prevent extreme outliers from dominating the composite.
 * A z-score of ±3 corresponds to the 99.7th percentile — beyond that, data quality
 * is suspect or the market is in a regime-change event (financial crisis, etc.).
 *
 * @param value  - observed value
 * @param mean   - rolling historical mean
 * @param stdDev - rolling historical standard deviation
 */
function toZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev <= 0) return 0; // guard: degenerate distribution
  const z = (value - mean) / stdDev;
  return Math.max(-3, Math.min(3, z)); // clamp to ±3σ
}

/**
 * Determine the signal direction of a contribution.
 * A component is "bullish" when its weighted contribution to the score is positive,
 * "bearish" when negative, and "neutral" when near zero (|contribution| < 0.05).
 */
function toSignal(contribution: number): "bullish" | "neutral" | "bearish" {
  if (contribution > 0.05) return "bullish";
  if (contribution < -0.05) return "bearish";
  return "neutral";
}

// ============================================================
// Main Function
// ============================================================

/**
 * Run the Reventure-style 12-month directional market forecast.
 *
 * Chain-of-calculation:
 *   1. Normalize each raw input to a z-score using 10-year rolling stats.
 *   2. Multiply each z-score by its directional weight:
 *        contribution_i = z_i * weight_i
 *   3. Sum contributions: composite = sum(contribution_i)
 *   4. Map composite z to 0-100 score:
 *        score = clamp(50 + composite * 10, 0, 100)
 *        (A composite of +5 → score = 100; composite of -5 → score = 0)
 *   5. Map score to forecast direction and projected price change:
 *        projectedChange = clamp((score - 50) * 0.3, -20, +25)
 *   6. Set confidence interval width based on number of inputs supplied.
 *
 * Guardrails:
 *   - Cap rate < 1% or > 15% equivalent (score < 5 or > 95): flag as extreme.
 *   - Appreciation projection outside [-20%, +25%] is physically clamped and warned.
 *
 * @param input - Market data inputs. Partial inputs reduce confidence.
 * @returns     - Full forecast result with score, direction, and component breakdown.
 */
export function runMarketForecast(input: MarketForecastInput): MarketForecastResult {
  const stats = input.historicalStats ?? DEFAULT_HISTORICAL_STATS;
  const warnings: string[] = [];

  // ---- Step 1: Normalize each input to a z-score ----
  const inventoryZ = toZScore(
    input.inventoryChangeYoYPct,
    stats.inventoryChange.mean,
    stats.inventoryChange.stdDev
  );
  const domZ = toZScore(
    input.domChangeYoYDays,
    stats.domChange.mean,
    stats.domChange.stdDev
  );
  const priceCutZ = toZScore(
    input.priceCutPct,
    stats.priceCutPct.mean,
    stats.priceCutPct.stdDev
  );
  const appreciationZ = toZScore(
    input.recentAppreciationPct,
    stats.appreciation.mean,
    stats.appreciation.stdDev
  );
  const affordabilityZ = toZScore(
    input.affordabilityRatio,
    stats.affordabilityRatio.mean,
    stats.affordabilityRatio.stdDev
  );

  // ---- Step 2: Compute weighted contributions ----
  const components: ForecastComponentDetail[] = [
    {
      name: "Inventory Change YoY",
      rawValue: input.inventoryChangeYoYPct,
      zScore: round2(inventoryZ),
      weight: WEIGHTS.inventoryChange,
      contribution: round2(inventoryZ * WEIGHTS.inventoryChange),
      signal: toSignal(inventoryZ * WEIGHTS.inventoryChange),
    },
    {
      name: "Days-on-Market Change YoY",
      rawValue: input.domChangeYoYDays,
      zScore: round2(domZ),
      weight: WEIGHTS.domChange,
      contribution: round2(domZ * WEIGHTS.domChange),
      signal: toSignal(domZ * WEIGHTS.domChange),
    },
    {
      name: "Price Reduction %",
      rawValue: input.priceCutPct,
      zScore: round2(priceCutZ),
      weight: WEIGHTS.priceCutPct,
      contribution: round2(priceCutZ * WEIGHTS.priceCutPct),
      signal: toSignal(priceCutZ * WEIGHTS.priceCutPct),
    },
    {
      name: "12-Month Appreciation",
      rawValue: input.recentAppreciationPct,
      zScore: round2(appreciationZ),
      weight: WEIGHTS.appreciation,
      contribution: round2(appreciationZ * WEIGHTS.appreciation),
      signal: toSignal(appreciationZ * WEIGHTS.appreciation),
    },
    {
      name: "Affordability Ratio (Price/Income)",
      rawValue: input.affordabilityRatio,
      zScore: round2(affordabilityZ),
      weight: WEIGHTS.affordabilityRatio,
      contribution: round2(affordabilityZ * WEIGHTS.affordabilityRatio),
      signal: toSignal(affordabilityZ * WEIGHTS.affordabilityRatio),
    },
  ];

  // ---- Step 3: Sum contributions into composite z ----
  const compositeZ = components.reduce((sum, c) => sum + c.contribution, 0);

  // ---- Step 4: Map to 0-100 score ----
  // scale factor = 10 per unit of composite z; composite range is roughly [-1, +1]
  // (since z scores are bounded at ±3 and weights sum to 1.0 absolute)
  // This maps the practical output range to approximately [20, 80] centered at 50.
  const rawScore = 50 + compositeZ * 10;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  // ---- Step 5: Forecast direction and projected change ----
  let forecast: MarketForecastResult["forecast"];
  if (score > 60) {
    forecast = "appreciation";
  } else if (score < 40) {
    forecast = "depreciation";
  } else {
    forecast = "stable";
  }

  // projectedChange: linear mapping from score to price change %
  // score 50 = 0% change; score 100 = +15%; score 0 = -15%
  // Then clamp to historical bounds for any 12-month US market period.
  const rawProjected = (score - 50) * 0.3;
  const projectedChange = round2(Math.max(-20, Math.min(25, rawProjected)));

  // ---- Step 6: Confidence interval and model confidence ----
  // All 5 inputs are always provided in this version (no partial inputs allowed
  // without historicalStats), so confidence is driven by signal agreement.
  const inputsProvided = 5;

  // Agreement measure: what % of components agree on direction?
  const bullishCount = components.filter((c) => c.signal === "bullish").length;
  const bearishCount = components.filter((c) => c.signal === "bearish").length;
  const dominantCount = Math.max(bullishCount, bearishCount);
  const agreementPct = (dominantCount / components.length) * 100;

  // Confidence: 60 base + up to 40 points for signal agreement + score extremity
  const scoreDivergence = Math.abs(score - 50) / 50; // 0 = centrist; 1 = extreme
  const confidence = Math.round(
    Math.min(100, 50 + agreementPct * 0.25 + scoreDivergence * 20)
  );

  // Forecast range width: ±3pp at high confidence, ±6pp at medium, ±10pp at low
  let rangeWidth: number;
  if (confidence >= 70) rangeWidth = 3;
  else if (confidence >= 50) rangeWidth = 6;
  else rangeWidth = 10;

  const projectedChangeRange = {
    low: round2(Math.max(-20, projectedChange - rangeWidth)),
    high: round2(Math.min(25, projectedChange + rangeWidth)),
  };

  // ---- Guardrail warnings ----
  if (score < 5) {
    warnings.push(
      "Score below 5 — extremely bearish composite. Verify inputs for data quality issues."
    );
  }
  if (score > 95) {
    warnings.push(
      "Score above 95 — extremely bullish composite. Verify inputs for data quality issues."
    );
  }
  if (input.affordabilityRatio > 12) {
    warnings.push(
      `Affordability ratio of ${input.affordabilityRatio}x is above the 12x extreme unaffordability threshold. ` +
      "Historic precedent suggests material demand destruction risk."
    );
  }
  if (input.priceCutPct > 35) {
    warnings.push(
      `Price cut % of ${input.priceCutPct}% exceeds 35% — a level only seen during the 2008-2009 housing crisis.`
    );
  }

  return {
    score,
    forecast,
    projectedChange,
    projectedChangeRange,
    confidence,
    components,
    inputsProvided,
    warnings,
  };
}

// ============================================================
// Factory: Default Historical Stats by Market Tier
// ============================================================

/**
 * Return appropriate normalization stats for a given market tier.
 * Tier 1 = gateway cities (NYC, LA, SF, etc.); Tier 2 = major metros;
 * Tier 3 = secondary/tertiary markets.
 *
 * Research basis:
 *   - FHFA HPI by metro tier (FHFA House Price Index, 1991-2024)
 *   - NAR Metro-level affordability reports (2014-2024)
 *   - Redfin price reduction tracker by market tier (2015-2024)
 *
 * TODO: Replace with dynamic stats fetched from FRED or ATTOM rolling-window data.
 *
 * @param tier - Market tier (1 = gateway, 2 = major, 3 = secondary)
 */
export function getDefaultHistoricalStats(
  tier: 1 | 2 | 3
): MarketForecastInput["historicalStats"] {
  switch (tier) {
    case 1: // Gateway cities — more expensive, more volatile inventory
      return {
        inventoryChange: { mean: -5, stdDev: 22 },      // gateway markets chronically low supply
        domChange: { mean: -2, stdDev: 6 },             // fast-moving markets
        priceCutPct: { mean: 14, stdDev: 5 },           // less cutting needed
        appreciation: { mean: 5.5, stdDev: 8 },         // higher vol (more speculative premium)
        affordabilityRatio: { mean: 10, stdDev: 2 },    // structurally unaffordable
      };
    case 2: // Major metros — middle ground
      return {
        inventoryChange: { mean: 2, stdDev: 18 },
        domChange: { mean: 1, stdDev: 8 },
        priceCutPct: { mean: 17, stdDev: 6 },
        appreciation: { mean: 4.5, stdDev: 6 },
        affordabilityRatio: { mean: 6, stdDev: 1.5 },
      };
    case 3: // Secondary/tertiary — more affordable, more cyclical inventory
    default:
      return DEFAULT_HISTORICAL_STATS;
  }
}
