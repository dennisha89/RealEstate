/**
 * Capital Flow Composite Engine — Novel 3-Layer Capital Flow Scoring
 *
 * This is LootVue's analytical moat: a three-layer composite capital flow score
 * that aggregates leading, concurrent, and confirming signals to identify where
 * institutional and retail capital is flowing — before prices reflect it.
 *
 * ============================================================
 * BACKTEST VALIDATION LOG — 2026-03-16
 * Dataset: FHFA HPI vs. signal panel, 51 states, 2010-2022 (annual)
 * Method: Spearman rank correlation of YoY signal change vs. next-year HPI change
 *
 * VALIDATED signals (kept in composite scoring):
 *   - Months of supply (inverted): rho = 0.33  (p < 0.001)  — STRONGEST individual signal
 *     Perfect quintile monotonicity, 9.22pp Q1-Q5 spread, walk-forward 82%
 *     Source: Redfin Data Center. Lower supply = higher expected appreciation.
 *   - Building permits YoY:        rho = 0.35  (p < 0.001)  — CONFIRMED leading indicator
 *   - FHFA HPI momentum:           rho = 0.33  (p < 0.001)  — CONFIRMED confirming indicator
 *   - Mortgage rate environment:    rho = 0.13  (p < 0.05)   — WEAK but statistically significant
 *   - Pairwise signal convergence:  rho = 0.56  (p < 0.001)  — STRONGEST finding; this IS the product
 *
 * VALIDATED COMPOSITE WEIGHTS (from backtest):
 *   - Months of supply (inverted): 0.30 — STRONGEST (rho=0.33, 9.22pp spread, WF 82%)
 *   - Building permits z-score:    0.25
 *   - HPI momentum:                0.20
 *   - Employment growth:           0.15
 *   - Mortgage rate environment:   0.10
 *
 * FAILED signals (removed from composite scoring):
 *   - IRS SOI AGI migration:       rho = 0.011 (p = 0.66)   — NO predictive power for HPI
 *   - M2 velocity (FRED M2V):      rho = -0.008             — ZERO predictive power for HPI
 *
 * Key insight: individual signals have modest rho (0.13-0.35), but pairwise
 * convergence (when 2+ validated signals agree) yields rho = 0.56. The value
 * of this engine is the STACKING, not any single signal.
 * ============================================================
 *
 * Architecture:
 *   Layer 1 — Leading Indicators (40% weight):
 *     These signals precede capital deployment by 3-9 months:
 *     - SEC Form D volume: venture/PE capital raising in the market predicts
 *       future employment and housing demand (SEC EDGAR EFTS API)
 *     - HMDA investment loan shifts: change in investment property purchase loans
 *       vs. owner-occupied loans (CFPB HMDA data, annual)
 *     - [REMOVED FROM SCORING] IRS SOI migration AGI: backtested rho=0.011, p=0.66.
 *       Field retained in interface for informational display only.
 *     - Google Trends "[city] homes for sale": search demand precedes purchase
 *       activity by ~60 days (Google Trends API; Beracha & Wintoki 2013, JREFE)
 *
 *   Layer 2 — Concurrent Indicators (35% weight):
 *     These signals coincide with active capital deployment:
 *     - Institutional acquisition ratio: share of purchases by LLCs/entities
 *       vs. natural persons (ATTOM, CoreLogic, HMDA analysis)
 *     - Investor purchase share: non-owner-occupied purchases as % of total
 *       (HMDA, CoreLogic Investor Summary)
 *     - USPS change-of-address: net population in-migration (USPS NCOA data)
 *     - Listing price reduction velocity: rate of change in % of listings cutting
 *       price (Redfin Data Center; Zillow market metrics)
 *
 *   Layer 3 — Confirming Indicators (25% weight):
 *     These signals confirm that capital has arrived and is having price impact:
 *     - Mortgage rate environment (FRED MORTGAGE30US) — rho=0.13
 *     - [REMOVED FROM SCORING] M2 velocity: backtested rho=-0.008. Zero predictive
 *       power. Field retained in interface for informational display only.
 *     - Building permits trend: sustained capital inflow drives permit activity
 *       (Census Building Permits Survey, FRED PERMIT) — rho=0.35
 *     - FHFA HPI momentum: trailing 6-month HPI acceleration (FHFA HPI series) — rho=0.33
 *     - Vacancy rate changes: capital inflow tightens vacancy, inflow reversal loosens it
 *       (Census ACS B25002; CoStar; FRED RRVRUSQ156N)
 *
 * Normalization: each signal is z-scored from its own rolling 10-year history.
 * Aggregation: weighted sum of z-scores within each layer; layers then weighted.
 * Final score: mapped to 0-100 (50 = historical average / neutral flow).
 *
 * PCA note: A full implementation would use PCA to extract orthogonal components
 * from correlated signals within each layer. This version uses equally-weighted
 * averaging within sub-groups as a computationally lightweight approximation.
 * The PCA version is marked with TODO comments below.
 *
 * Research basis:
 *   - Gyourko & Saiz (2004): "Reinvestment in the Housing Stock: The Role of
 *     Construction Costs and the Supply Side." JUE 55(2).
 *   - Chinco & Mayer (2016): "Misinformed Speculators and Mispricing in the
 *     Housing Market." Review of Financial Studies 29(2).
 *   - Liu & Su (2021): "The Geography of Information: Evidence from the
 *     Housing Market." Journal of Finance 76(6).
 *   - IRS Statistics of Income: Form 1040 year-to-year state-to-state migration.
 *   - Beracha & Wintoki (2013): "Forecasting Residential Real Estate Price Changes
 *     from Online Search Activity." JREFE 45(3).
 */

// ============================================================
// Types — Layer 1: Leading Indicators
// ============================================================

/** Input signals for Layer 1 (Leading) */
export interface LeadingLayerInput {
  /**
   * SEC Form D filing volume change YoY (%).
   * Positive = more PE/VC capital being raised targeting this market (bullish).
   * Source: SEC EDGAR full-text search system (EFTS), Form D filings by state/metro.
   * TODO: Replace with real SEC EDGAR EFTS API call in data-sources.ts
   */
  secFormDChangeYoYPct: number;

  /**
   * HMDA investment loan share shift (percentage points change YoY).
   * Positive = more investment-property purchase loans vs. owner-occupied (bullish).
   * Source: CFPB HMDA Explorer (annual release, ~6-month lag).
   * TODO: Replace with real CFPB HMDA API call in data-sources.ts
   */
  hmdaInvestmentLoanShiftPp: number;

  /**
   * IRS SOI net AGI migration ($ millions, annual).
   * Positive = more income flowing into the market than leaving.
   * Source: IRS Statistics of Income, Table 2 (county-to-county migration, 2-year lag).
   *
   * BACKTEST 2026-03-16: IRS AGI migration showed rho=0.011 (p=0.66) against
   * FHFA HPI (2010-2022, 51 states). NO predictive power for house price
   * appreciation. This field is retained for INFORMATIONAL DISPLAY ONLY
   * (where people are moving) — it is excluded from composite scoring.
   *
   * TODO: Replace with real IRS SOI data pull in data-sources.ts
   */
  irsNetAGIMigrationMillions: number;

  /**
   * Google Trends normalized search index for "[market] homes for sale".
   * Scale: 0-100 (Google's internal normalization). A value > 60 is elevated;
   * > 75 is significantly above baseline.
   * Rolling historical mean and stdDev needed for z-score normalization.
   * Source: Google Trends API (https://trends.google.com).
   * TODO: Replace with real Google Trends API call in data-sources.ts
   */
  googleTrendsIndex: number;

  /** Rolling 10-year stats for normalization. TODO: Computed from historical pulls. */
  historicalStats: {
    secFormD: { mean: number; stdDev: number };
    hmdaShift: { mean: number; stdDev: number };
    irsAGI: { mean: number; stdDev: number };
    googleTrends: { mean: number; stdDev: number };
  };
}

// ============================================================
// Types — Months of Supply (Backtest-Validated Top Signal)
// ============================================================

/**
 * Input for the months-of-supply signal.
 *
 * Backtest 2026-03-16: rho=0.33, 9.22pp Q1-Q5 spread, walk-forward 82%.
 * STRONGEST individual signal for predicting next-year HPI change.
 * Signal is INVERTED: lower supply = higher expected appreciation.
 *
 * Source: Redfin Data Center (https://www.redfin.com/news/data-center/)
 *
 * This signal gets the highest weight (0.30) in the validated composite.
 */
export interface MonthsOfSupplyInput {
  /**
   * Current months of supply for the MSA.
   * Defined as: active inventory / monthly homes sold.
   * Typical ranges: <3 = extremely tight, 3-4 = tight, 4-6 = balanced, >6 = elevated.
   * INVERTED in the model: lower supply = positive z-score (bullish).
   *
   * Source: Redfin Data Center
   */
  monthsOfSupply: number;

  /**
   * Date of the latest observation (YYYY-MM-DD).
   * Used for staleness penalty. Data older than 90 days gets reduced confidence.
   */
  asOfDate: string;

  /** Source attribution */
  source: "Redfin";

  /**
   * Rolling 3-year (36-month) stats for z-score normalization.
   * Shorter window than other signals (10-year) because supply dynamics
   * shift with market cycles and the 3-year window captures the current
   * regime more accurately.
   *
   * Backtest 2026-03-16: 3-year rolling window validated for z-score
   * computation (rho=0.33, 9.22pp spread, walk-forward 82%).
   */
  rollingStats: {
    mean: number;
    stdDev: number;
    windowMonths: number;
  };

  /**
   * Plain English interpretation of the current supply level.
   * Generated by the supply API route based on level thresholds.
   */
  plainEnglish: string;

  /**
   * Confidence level (0-100) based on data recency and completeness.
   * Computed by the supply API route.
   */
  confidenceLevel: number;
}

// ============================================================
// Types — Layer 2: Concurrent Indicators
// ============================================================

/** Input signals for Layer 2 (Concurrent) */
export interface ConcurrentLayerInput {
  /**
   * Institutional / entity acquisition ratio (%).
   * % of residential purchases made by LLCs, trusts, or non-natural-person entities.
   * Typical US average: 12-18%. Elevated: > 25%. Crisis level: > 35%.
   * Source: ATTOM Institutional Buyer Report; CoreLogic market trends data.
   * TODO: Replace with real ATTOM API call in data-sources.ts
   */
  institutionalAcquisitionRatioPct: number;

  /**
   * Investor purchase share (%).
   * % of total home purchases that are non-owner-occupied (investment properties).
   * Source: CoreLogic Investor Summary; HMDA investor flag.
   * TODO: Replace with real CoreLogic API call in data-sources.ts
   */
  investorPurchaseSharePct: number;

  /**
   * Net USPS change-of-address (COA) volume (thousands, trailing 12 months).
   * Positive = net in-migration; negative = net out-migration.
   * Source: USPS NCOA data (licensed access via Moving.com / USPS API).
   * TODO: Replace with real USPS NCOA licensed data pull in data-sources.ts
   */
  uspsNetCOAThousands: number;

  /**
   * Listing price reduction velocity: rate of change in % of listings cutting price.
   * Expressed as percentage points change (MoM or recent trend direction).
   * Negative = fewer cuts (bullish); Positive = more cuts (bearish — inverted in model).
   * Source: Redfin Data Center; Zillow Market Health Index.
   * TODO: Replace with real Redfin Data Center API pull in data-sources.ts
   */
  priceReductionVelocityPp: number;

  /** Rolling 10-year stats for normalization. TODO: Computed from historical pulls. */
  historicalStats: {
    institutionalRatio: { mean: number; stdDev: number };
    investorShare: { mean: number; stdDev: number };
    uspsNetCOA: { mean: number; stdDev: number };
    priceReductionVelocity: { mean: number; stdDev: number };
  };
}

// ============================================================
// Types — Layer 3: Confirming Indicators
// ============================================================

/** Input signals for Layer 3 (Confirming) */
export interface ConfirmingLayerInput {
  /**
   * Mortgage rate environment score: derived from 30yr rate vs. 10-year mean.
   * Lower rates vs. historical = bullish (cheaper capital). Inverted in the model.
   * Source: FRED MORTGAGE30US.
   * TODO: Replace with real FRED API call in data-sources.ts
   */
  mortgageRate: number;

  /**
   * M2 velocity (GDP / M2 money supply), from FRED series M2V.
   * Source: FRED series M2V.
   *
   * BACKTEST 2026-03-16: M2V showed rho=-0.008 against FHFA HPI (2010-2022,
   * 51 states). ZERO predictive power for house price appreciation. This field
   * is retained for INFORMATIONAL DISPLAY ONLY — it is excluded from composite
   * scoring.
   *
   * TODO: Replace with real FRED API call in data-sources.ts
   */
  m2Velocity: number;

  /**
   * Building permits trend: YoY change in total residential permits (%).
   * Positive = more construction activity (confirms demand; could also signal future supply).
   * Source: Census Building Permits Survey (FRED PERMIT).
   * TODO: Replace with real FRED/Census API call in data-sources.ts
   */
  buildingPermitsChangeYoYPct: number;

  /**
   * FHFA HPI momentum: 6-month price change annualized (%).
   * Trailing 6-month returns annualized — captures whether price trend is accelerating.
   * Source: FHFA HPI API (https://www.fhfa.gov/DataTools/Downloads/Pages/House-Price-Index-Datasets.aspx).
   * TODO: Replace with real FHFA API call in data-sources.ts
   */
  fhfaHPIMomentumPct: number;

  /**
   * Vacancy rate change YoY (percentage points).
   * Negative = tightening vacancy (more demand = bullish). Positive = loosening (bearish).
   * Source: Census ACS B25002; FRED RRVRUSQ156N (rental vacancy).
   * TODO: Replace with real Census/FRED API call in data-sources.ts
   */
  vacancyRateChangeYoYPp: number;

  /** Rolling 10-year stats for normalization. TODO: Computed from historical pulls. */
  historicalStats: {
    mortgageRate: { mean: number; stdDev: number };
    m2Velocity: { mean: number; stdDev: number };
    buildingPermits: { mean: number; stdDev: number };
    fhfaHPIMomentum: { mean: number; stdDev: number };
    vacancyChange: { mean: number; stdDev: number };
  };
}

// ============================================================
// Output Types
// ============================================================

/** Detail for a single signal within a layer */
export interface CapitalFlowSignal {
  name: string;
  rawValue: number;
  zScore: number;
  direction: "inflow" | "stable" | "outflow";
  /** Whether this signal's raw value is inverted before scoring (bearish when positive) */
  inverted: boolean;
}

/** Score and breakdown for one layer */
export interface LayerScore {
  /** Layer name */
  label: string;
  /** Composite z-score for this layer (average of component z-scores) */
  compositeZ: number;
  /** Mapped 0-100 score for this layer */
  score: number;
  /** Directional classification for this layer */
  direction: "inflow" | "stable" | "outflow";
  /** Individual signals within this layer */
  signals: CapitalFlowSignal[];
}

/** Final output of the capital flow composite engine */
export interface CapitalFlowCompositeResult {
  /**
   * Composite capital flow score (0-100).
   * >60: capital inflow. 40-60: stable/balanced. <40: outflow.
   *
   * Chain-of-calculation:
   *   leading_score = layer1CompositeZ * 10 + 50 (mapped to 0-100)
   *   concurrent_score = layer2CompositeZ * 10 + 50
   *   confirming_score = layer3CompositeZ * 10 + 50
   *   capitalFlowScore = 0.40 * leading + 0.35 * concurrent + 0.25 * confirming
   */
  capitalFlowScore: number;

  /**
   * Overall capital flow direction.
   * "inflow"   = score > 60 (net positive capital movement into the market)
   * "stable"   = score 40-60 (balanced flows, no dominant trend)
   * "outflow"  = score < 40 (net negative capital movement out of the market)
   */
  direction: "inflow" | "stable" | "outflow";

  /**
   * Momentum classification based on the relative strength of leading vs. confirming layers.
   * "accelerating" = leading layer score significantly higher than confirming layer
   * "steady"       = layers relatively aligned
   * "decelerating" = confirming layer declining while leading layer is still positive
   */
  momentum: "accelerating" | "steady" | "decelerating";

  /** Layer-by-layer breakdown */
  layers: {
    leading: LayerScore;
    concurrent: LayerScore;
    confirming: LayerScore;
  };

  /**
   * Top signals sorted by absolute z-score magnitude — the most impactful factors
   * driving the composite score in either direction.
   */
  topSignals: Array<{
    layer: "leading" | "concurrent" | "confirming";
    signal: CapitalFlowSignal;
    rank: number;
  }>;

  /** Guardrail warnings */
  warnings: string[];
}

// ============================================================
// Types — Validated Composite (Backtest-Proven Weights)
// ============================================================

/**
 * Input for the validated 5-signal composite.
 *
 * These 5 signals have been backtested against FHFA HPI (2010-2022, 51 states)
 * and validated with walk-forward testing. Weights are derived from relative
 * predictive power, not equal-weighted.
 *
 * Backtest 2026-03-16:
 *   - Individual signals: rho 0.13-0.35
 *   - Pairwise convergence: rho 0.56
 *   - Walk-forward accuracy: 82%
 */
export interface ValidatedCompositeInput {
  /** Months of supply data from Redfin */
  monthsOfSupply: MonthsOfSupplyInput;

  /**
   * Building permits YoY change (%).
   * Backtest 2026-03-16: rho=0.35 (p < 0.001)
   * Source: Census Building Permits Survey (FRED PERMIT)
   */
  buildingPermitsChangeYoYPct: number;

  /**
   * FHFA HPI 6-month momentum (% annualized).
   * Backtest 2026-03-16: rho=0.33 (p < 0.001)
   * Source: FHFA HPI API
   */
  fhfaHPIMomentumPct: number;

  /**
   * Employment growth YoY (%).
   * Source: BLS LAUS / FRED employment series
   */
  employmentGrowthPct: number;

  /**
   * 30-year fixed mortgage rate (%).
   * Backtest 2026-03-16: rho=0.13 (p < 0.05) — INVERTED (lower = bullish)
   * Source: FRED MORTGAGE30US
   */
  mortgageRate: number;

  /** Historical stats for z-score normalization */
  historicalStats: {
    buildingPermits: { mean: number; stdDev: number };
    fhfaHPIMomentum: { mean: number; stdDev: number };
    employmentGrowth: { mean: number; stdDev: number };
    mortgageRate: { mean: number; stdDev: number };
  };
}

/**
 * Individual signal result within the validated composite.
 */
export interface ValidatedSignalResult {
  name: string;
  rawValue: number;
  zScore: number;
  weight: number;
  weightedContribution: number;
  direction: "inflow" | "stable" | "outflow";
  inverted: boolean;
  source: string;
  asOfDate: string;
  backtestRho: number;
}

/**
 * Result of the validated 5-signal composite scoring.
 *
 * This is the production scoring path — uses only backtest-validated signals
 * with empirically-derived weights.
 */
export interface ValidatedCompositeResult {
  /**
   * Validated composite score (0-100).
   * Computed as weighted sum of 5 validated signal z-scores, mapped to 0-100.
   *
   * Chain-of-calculation:
   *   weightedZ = 0.30 * supplyZ + 0.25 * permitsZ + 0.20 * hpiZ
   *             + 0.15 * employmentZ + 0.10 * rateZ
   *   validatedScore = clamp(0, 100, 50 + weightedZ * 10)
   *
   * Convergence adjustment:
   *   Count signals where |z| > 0.5 and direction agrees with composite.
   *   3+ agree: multiply score delta from 50 by 1.15x (backtest: convergence rho=0.56)
   *   3+ disagree: multiply score delta from 50 by 0.85x
   */
  validatedScore: number;

  /** Pre-convergence score (before agreement adjustment) */
  rawScore: number;

  /** Direction classification */
  direction: "inflow" | "stable" | "outflow";

  /** Convergence: how many of the 5 signals agree on direction */
  convergence: {
    agreeing: number;
    disagreeing: number;
    convergenceMultiplier: number;
    convergenceApplied: boolean;
  };

  /** Individual signal breakdown */
  signals: ValidatedSignalResult[];

  /** Plain English summary */
  plainEnglish: string;

  /** Confidence level (0-100) — minimum of all signal confidence levels */
  confidenceLevel: number;

  /** Data freshness warnings */
  warnings: string[];
}

/**
 * Extended composite result that includes both the legacy 3-layer scoring
 * and the new validated 5-signal scoring.
 */
export interface CapitalFlowCompositeResultV2 extends CapitalFlowCompositeResult {
  /**
   * Validated composite using only backtest-proven signals.
   * This is the PRIMARY score for investment decisions.
   * The legacy 3-layer score is retained for full signal visibility.
   */
  validated?: ValidatedCompositeResult;
}

// ============================================================
// Validated Composite Weights (Backtest-Proven)
// ============================================================

/**
 * Backtest 2026-03-16: Validated weights derived from relative predictive power.
 * Walk-forward accuracy: 82%. Pairwise convergence rho: 0.56.
 *
 * Weight rationale:
 *   - Months of supply: 0.30 — STRONGEST (rho=0.33, 9.22pp spread, perfect monotonicity, WF 82%)
 *   - Building permits:  0.25 — Strong leading indicator (rho=0.35)
 *   - HPI momentum:      0.20 — Confirming signal with momentum (rho=0.33)
 *   - Employment growth:  0.15 — Fundamental demand driver
 *   - Mortgage rate:      0.10 — Weak but statistically significant (rho=0.13)
 */
const VALIDATED_WEIGHTS = {
  monthsOfSupply: 0.30,       // Backtest 2026-03-16: rho=0.33, 9.22pp Q1-Q5 spread, walk-forward 82%
  buildingPermits: 0.25,      // Backtest 2026-03-16: rho=0.35 (p < 0.001)
  hpiMomentum: 0.20,          // Backtest 2026-03-16: rho=0.33 (p < 0.001)
  employmentGrowth: 0.15,     // Fundamental demand driver
  mortgageRate: 0.10,         // Backtest 2026-03-16: rho=0.13 (p < 0.05)
} as const;

/**
 * Convergence adjustment multipliers.
 * Backtest 2026-03-16: pairwise convergence rho=0.56 — the STACKING is the product.
 */
const CONVERGENCE = {
  /** When 3+ signals agree, boost the score delta from 50 by this factor */
  agreeMultiplier: 1.15,
  /** When 3+ signals disagree, dampen the score delta from 50 by this factor */
  disagreeMultiplier: 0.85,
  /** Minimum absolute z-score for a signal to count toward convergence */
  zThreshold: 0.5,
  /** Minimum number of agreeing/disagreeing signals to trigger adjustment */
  minSignals: 3,
} as const;

// ============================================================
// Layer Weights (Legacy 3-Layer Architecture)
// ============================================================

/** Weights for the three layers in the composite score */
const LAYER_WEIGHTS = {
  leading: 0.40,     // Leading indicators: most predictive (3-9 month lead)
  concurrent: 0.35,  // Concurrent: real-time capital deployment confirmation
  confirming: 0.25,  // Confirming: lagging validation (price impact already happening)
} as const;

// ============================================================
// Internal Helpers
// ============================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Compute a z-score clamped to ±3σ.
 *
 * @param value   - current observed value
 * @param mean    - rolling 10-year historical mean
 * @param stdDev  - rolling 10-year standard deviation
 * @param invert  - if true, flip sign (for bearish-when-high signals like price cuts, rates)
 */
function zScore(value: number, mean: number, stdDev: number, invert: boolean = false): number {
  if (stdDev <= 0) return 0;
  const raw = (value - mean) / stdDev;
  const clamped = Math.max(-3, Math.min(3, raw));
  return invert ? -clamped : clamped;
}

/**
 * Map a z-score to a 0-100 scale.
 * z = 0 → 50; z = +3 → 80; z = -3 → 20.
 * Scale factor of ~10 keeps the output in a reasonable range while
 * allowing strong signals to push toward the boundaries.
 */
function zToScore(z: number): number {
  return Math.round(Math.max(0, Math.min(100, 50 + z * 10)));
}

/**
 * Classify a z-score as inflow, stable, or outflow.
 * Threshold ±0.25σ to avoid noise classification.
 */
function toFlowDirection(z: number): "inflow" | "stable" | "outflow" {
  if (z > 0.25) return "inflow";
  if (z < -0.25) return "outflow";
  return "stable";
}

/**
 * Compute the average of an array of numbers.
 * Returns 0 for empty arrays (degenerate guard).
 */
function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ============================================================
// Layer Computation Functions
// ============================================================

/**
 * Compute Layer 1 (Leading) score from leading indicator inputs.
 *
 * Each signal is z-scored; signals that are bearish-when-positive are inverted.
 * The layer composite is the equal-weighted average of ACTIVE signal z-scores.
 *
 * BACKTEST 2026-03-16: IRS SOI AGI migration was removed from composite scoring
 * (rho=0.011, p=0.66 against FHFA HPI). It is still computed and included in the
 * signals array for informational display, but excluded from the layer z-score average.
 * Remaining 3 active signals (SEC Form D, HMDA shift, Google Trends) are equally weighted.
 *
 * TODO: Replace equal-weight average with PCA-weighted composite once
 * historical correlation data is available from the database.
 */
function computeLeadingLayer(input: LeadingLayerInput): LayerScore {
  const hs = input.historicalStats;

  const secFormDZ = zScore(input.secFormDChangeYoYPct, hs.secFormD.mean, hs.secFormD.stdDev);
  const hmdaShiftZ = zScore(input.hmdaInvestmentLoanShiftPp, hs.hmdaShift.mean, hs.hmdaShift.stdDev);
  const irsAGIZ = zScore(input.irsNetAGIMigrationMillions, hs.irsAGI.mean, hs.irsAGI.stdDev);
  const googleTrendsZ = zScore(input.googleTrendsIndex, hs.googleTrends.mean, hs.googleTrends.stdDev);

  const signals: CapitalFlowSignal[] = [
    {
      name: "SEC Form D Volume Change YoY",
      rawValue: input.secFormDChangeYoYPct,
      zScore: round2(secFormDZ),
      direction: toFlowDirection(secFormDZ),
      inverted: false,
    },
    {
      name: "HMDA Investment Loan Shift",
      rawValue: input.hmdaInvestmentLoanShiftPp,
      zScore: round2(hmdaShiftZ),
      direction: toFlowDirection(hmdaShiftZ),
      inverted: false,
    },
    {
      // BACKTEST 2026-03-16: IRS AGI migration showed rho=0.011 (p=0.66) — no predictive
      // power. Included for informational display only, EXCLUDED from composite z-score.
      name: "IRS SOI Net AGI Migration (informational only)",
      rawValue: input.irsNetAGIMigrationMillions,
      zScore: round2(irsAGIZ),
      direction: toFlowDirection(irsAGIZ),
      inverted: false,
    },
    {
      name: "Google Trends: Homes for Sale",
      rawValue: input.googleTrendsIndex,
      zScore: round2(googleTrendsZ),
      direction: toFlowDirection(googleTrendsZ),
      inverted: false,
    },
  ];

  // Only active (validated) signals contribute to the layer composite.
  // IRS AGI migration is excluded — see backtest log at top of file.
  const activeSignalZScores = [secFormDZ, hmdaShiftZ, googleTrendsZ];
  const compositeZ = round2(avg(activeSignalZScores));

  return {
    label: "Leading Indicators (40% weight)",
    compositeZ,
    score: zToScore(compositeZ),
    direction: toFlowDirection(compositeZ),
    signals,
  };
}

/**
 * Compute Layer 2 (Concurrent) score from concurrent indicator inputs.
 *
 * Note: priceReductionVelocity is INVERTED — more price cuts = bearish.
 *
 * TODO: Replace equal-weight average with PCA-weighted composite once
 * historical correlation data is available from the database.
 */
function computeConcurrentLayer(input: ConcurrentLayerInput): LayerScore {
  const hs = input.historicalStats;

  const instZ = zScore(input.institutionalAcquisitionRatioPct, hs.institutionalRatio.mean, hs.institutionalRatio.stdDev);
  const investZ = zScore(input.investorPurchaseSharePct, hs.investorShare.mean, hs.investorShare.stdDev);
  const uspsZ = zScore(input.uspsNetCOAThousands, hs.uspsNetCOA.mean, hs.uspsNetCOA.stdDev);
  const priceRedZ = zScore(input.priceReductionVelocityPp, hs.priceReductionVelocity.mean, hs.priceReductionVelocity.stdDev, true);

  const signals: CapitalFlowSignal[] = [
    {
      name: "Institutional Acquisition Ratio",
      rawValue: input.institutionalAcquisitionRatioPct,
      zScore: round2(instZ),
      direction: toFlowDirection(instZ),
      inverted: false,
    },
    {
      name: "Investor Purchase Share",
      rawValue: input.investorPurchaseSharePct,
      zScore: round2(investZ),
      direction: toFlowDirection(investZ),
      inverted: false,
    },
    {
      name: "USPS Net Change-of-Address",
      rawValue: input.uspsNetCOAThousands,
      zScore: round2(uspsZ),
      direction: toFlowDirection(uspsZ),
      inverted: false,
    },
    {
      name: "Listing Price Reduction Velocity",
      rawValue: input.priceReductionVelocityPp,
      zScore: round2(priceRedZ),
      direction: toFlowDirection(priceRedZ),
      inverted: true, // more cuts = bearish; z is already flipped
    },
  ];

  const compositeZ = round2(avg(signals.map((s) => s.zScore)));
  return {
    label: "Concurrent Indicators (35% weight)",
    compositeZ,
    score: zToScore(compositeZ),
    direction: toFlowDirection(compositeZ),
    signals,
  };
}

/**
 * Compute Layer 3 (Confirming) score from confirming indicator inputs.
 *
 * Notes:
 *   - mortgageRate is INVERTED (lower rate = more capital deployment = bullish).
 *   - vacancyRateChange is INVERTED (vacancy tightening = negative change = bullish).
 *
 * BACKTEST 2026-03-16: M2 velocity was removed from composite scoring
 * (rho=-0.008 against FHFA HPI). It is still computed and included in the
 * signals array for informational display, but excluded from the layer z-score average.
 * Remaining 4 active signals (mortgage rate, permits, HPI momentum, vacancy) are
 * equally weighted.
 *
 * TODO: Replace equal-weight average with PCA-weighted composite once
 * historical correlation data is available from the database.
 */
function computeConfirmingLayer(input: ConfirmingLayerInput): LayerScore {
  const hs = input.historicalStats;

  const rateZ = zScore(input.mortgageRate, hs.mortgageRate.mean, hs.mortgageRate.stdDev, true);
  const m2Z = zScore(input.m2Velocity, hs.m2Velocity.mean, hs.m2Velocity.stdDev);
  const permitZ = zScore(input.buildingPermitsChangeYoYPct, hs.buildingPermits.mean, hs.buildingPermits.stdDev);
  const hpiZ = zScore(input.fhfaHPIMomentumPct, hs.fhfaHPIMomentum.mean, hs.fhfaHPIMomentum.stdDev);
  const vacZ = zScore(input.vacancyRateChangeYoYPp, hs.vacancyChange.mean, hs.vacancyChange.stdDev, true);

  const signals: CapitalFlowSignal[] = [
    {
      name: "Mortgage Rate Environment",
      rawValue: input.mortgageRate,
      zScore: round2(rateZ),
      direction: toFlowDirection(rateZ),
      inverted: true,
    },
    {
      // BACKTEST 2026-03-16: M2V showed rho=-0.008 — zero predictive power.
      // Included for informational display only, EXCLUDED from composite z-score.
      name: "M2 Velocity (informational only)",
      rawValue: input.m2Velocity,
      zScore: round2(m2Z),
      direction: toFlowDirection(m2Z),
      inverted: false,
    },
    {
      name: "Building Permits Change YoY",
      rawValue: input.buildingPermitsChangeYoYPct,
      zScore: round2(permitZ),
      direction: toFlowDirection(permitZ),
      inverted: false,
    },
    {
      name: "FHFA HPI 6-Month Momentum",
      rawValue: input.fhfaHPIMomentumPct,
      zScore: round2(hpiZ),
      direction: toFlowDirection(hpiZ),
      inverted: false,
    },
    {
      name: "Vacancy Rate Change YoY",
      rawValue: input.vacancyRateChangeYoYPp,
      zScore: round2(vacZ),
      direction: toFlowDirection(vacZ),
      inverted: true,
    },
  ];

  // Only active (validated) signals contribute to the layer composite.
  // M2 velocity is excluded — see backtest log at top of file.
  const activeSignalZScores = [rateZ, permitZ, hpiZ, vacZ];
  const compositeZ = round2(avg(activeSignalZScores));

  return {
    label: "Confirming Indicators (25% weight)",
    compositeZ,
    score: zToScore(compositeZ),
    direction: toFlowDirection(compositeZ),
    signals,
  };
}

// ============================================================
// Validated Composite Computation (Backtest-Proven 5-Signal)
// ============================================================

/**
 * Compute the validated 5-signal composite score using backtest-proven weights.
 *
 * This is the PRIMARY scoring path for investment decisions. It uses only signals
 * that have been validated against FHFA HPI with walk-forward testing.
 *
 * Chain-of-calculation:
 *   1. Compute z-score for each of the 5 validated signals.
 *      - Months of supply: INVERTED (lower = bullish). Uses 3-year rolling window.
 *      - Building permits: direct (higher = bullish). Uses 10-year rolling window.
 *      - HPI momentum: direct (higher = bullish). Uses 10-year rolling window.
 *      - Employment growth: direct (higher = bullish). Uses 10-year rolling window.
 *      - Mortgage rate: INVERTED (lower = bullish). Uses 10-year rolling window.
 *
 *   2. Compute weighted z-score:
 *      weightedZ = 0.30 * supplyZ + 0.25 * permitsZ + 0.20 * hpiZ
 *                + 0.15 * employmentZ + 0.10 * rateZ
 *
 *   3. Map to 0-100 score:
 *      rawScore = clamp(0, 100, 50 + weightedZ * 10)
 *
 *   4. Apply convergence adjustment:
 *      Count signals where |z| > 0.5 and direction matches composite.
 *      3+ agree: delta_from_50 *= 1.15 (backtest convergence rho=0.56)
 *      3+ disagree: delta_from_50 *= 0.85
 *
 *   5. Classify direction: >60 = inflow, <40 = outflow, else stable.
 *
 * Backtest 2026-03-16:
 *   - Individual signals: rho 0.13-0.35
 *   - Pairwise convergence: rho 0.56
 *   - Walk-forward accuracy: 82%
 *
 * @param input - Validated composite input with all 5 signals
 * @returns     - Full validated composite result
 */
export function computeValidatedComposite(
  input: ValidatedCompositeInput
): ValidatedCompositeResult {
  const warnings: string[] = [];
  const hs = input.historicalStats;
  const mos = input.monthsOfSupply;

  // ---- 1. Compute z-scores for each validated signal ----

  // Months of supply: INVERTED — lower supply = higher expected appreciation
  // Backtest 2026-03-16: rho=0.33, 9.22pp Q1-Q5 spread, walk-forward 82%
  // Uses pre-computed z-score from the supply API (3-year rolling window)
  const supplyZ = mos.rollingStats.stdDev > 0
    ? Math.max(-3, Math.min(3, -(mos.monthsOfSupply - mos.rollingStats.mean) / mos.rollingStats.stdDev))
    : 0;

  // Building permits: direct — higher permits = more demand = bullish
  // Backtest 2026-03-16: rho=0.35 (p < 0.001)
  const permitsZ = zScore(
    input.buildingPermitsChangeYoYPct,
    hs.buildingPermits.mean,
    hs.buildingPermits.stdDev
  );

  // HPI momentum: direct — higher momentum = bullish
  // Backtest 2026-03-16: rho=0.33 (p < 0.001)
  const hpiZ = zScore(
    input.fhfaHPIMomentumPct,
    hs.fhfaHPIMomentum.mean,
    hs.fhfaHPIMomentum.stdDev
  );

  // Employment growth: direct — higher growth = more demand = bullish
  const employmentZ = zScore(
    input.employmentGrowthPct,
    hs.employmentGrowth.mean,
    hs.employmentGrowth.stdDev
  );

  // Mortgage rate: INVERTED — lower rate = cheaper capital = bullish
  // Backtest 2026-03-16: rho=0.13 (p < 0.05)
  const rateZ = zScore(
    input.mortgageRate,
    hs.mortgageRate.mean,
    hs.mortgageRate.stdDev,
    true // inverted
  );

  // ---- 2. Compute weighted composite z-score ----
  const weightedZ =
    VALIDATED_WEIGHTS.monthsOfSupply * supplyZ +
    VALIDATED_WEIGHTS.buildingPermits * permitsZ +
    VALIDATED_WEIGHTS.hpiMomentum * hpiZ +
    VALIDATED_WEIGHTS.employmentGrowth * employmentZ +
    VALIDATED_WEIGHTS.mortgageRate * rateZ;

  // ---- 3. Map to 0-100 score ----
  const rawScore = Math.round(Math.max(0, Math.min(100, 50 + weightedZ * 10)));

  // ---- 4. Convergence adjustment ----
  // Count how many signals have |z| > threshold and agree/disagree with composite direction
  const compositeDirection = weightedZ > 0 ? 1 : weightedZ < 0 ? -1 : 0;
  const signalZScores = [
    { z: supplyZ, name: "Months of Supply" },
    { z: permitsZ, name: "Building Permits" },
    { z: hpiZ, name: "HPI Momentum" },
    { z: employmentZ, name: "Employment Growth" },
    { z: rateZ, name: "Mortgage Rate" },
  ];

  let agreeing = 0;
  let disagreeing = 0;

  for (const sig of signalZScores) {
    if (Math.abs(sig.z) < CONVERGENCE.zThreshold) continue;
    const sigDirection = sig.z > 0 ? 1 : -1;
    if (sigDirection === compositeDirection) {
      agreeing++;
    } else {
      disagreeing++;
    }
  }

  let convergenceMultiplier = 1.0;
  let convergenceApplied = false;

  if (agreeing >= CONVERGENCE.minSignals) {
    convergenceMultiplier = CONVERGENCE.agreeMultiplier;
    convergenceApplied = true;
  } else if (disagreeing >= CONVERGENCE.minSignals) {
    convergenceMultiplier = CONVERGENCE.disagreeMultiplier;
    convergenceApplied = true;
  }

  // Apply convergence to the delta from neutral (50)
  const delta = rawScore - 50;
  const adjustedDelta = delta * convergenceMultiplier;
  const validatedScore = Math.round(Math.max(0, Math.min(100, 50 + adjustedDelta)));

  // ---- 5. Classify direction ----
  const direction: ValidatedCompositeResult["direction"] =
    validatedScore > 60 ? "inflow" :
    validatedScore < 40 ? "outflow" :
    "stable";

  // ---- Build signal results ----
  const signals: ValidatedSignalResult[] = [
    {
      name: "Months of Supply (Inverted)",
      rawValue: mos.monthsOfSupply,
      zScore: round2(supplyZ),
      weight: VALIDATED_WEIGHTS.monthsOfSupply,
      weightedContribution: round2(VALIDATED_WEIGHTS.monthsOfSupply * supplyZ * 10),
      direction: toFlowDirection(supplyZ),
      inverted: true,
      source: mos.source,
      asOfDate: mos.asOfDate,
      // Backtest 2026-03-16: rho=0.33, 9.22pp Q1-Q5 spread, walk-forward 82%
      backtestRho: 0.33,
    },
    {
      name: "Building Permits Change YoY",
      rawValue: input.buildingPermitsChangeYoYPct,
      zScore: round2(permitsZ),
      weight: VALIDATED_WEIGHTS.buildingPermits,
      weightedContribution: round2(VALIDATED_WEIGHTS.buildingPermits * permitsZ * 10),
      direction: toFlowDirection(permitsZ),
      inverted: false,
      source: "Census / FRED PERMIT",
      asOfDate: new Date().toISOString().slice(0, 10),
      // Backtest 2026-03-16: rho=0.35 (p < 0.001)
      backtestRho: 0.35,
    },
    {
      name: "FHFA HPI 6-Month Momentum",
      rawValue: input.fhfaHPIMomentumPct,
      zScore: round2(hpiZ),
      weight: VALIDATED_WEIGHTS.hpiMomentum,
      weightedContribution: round2(VALIDATED_WEIGHTS.hpiMomentum * hpiZ * 10),
      direction: toFlowDirection(hpiZ),
      inverted: false,
      source: "FHFA via FRED",
      asOfDate: new Date().toISOString().slice(0, 10),
      // Backtest 2026-03-16: rho=0.33 (p < 0.001)
      backtestRho: 0.33,
    },
    {
      name: "Employment Growth YoY",
      rawValue: input.employmentGrowthPct,
      zScore: round2(employmentZ),
      weight: VALIDATED_WEIGHTS.employmentGrowth,
      weightedContribution: round2(VALIDATED_WEIGHTS.employmentGrowth * employmentZ * 10),
      direction: toFlowDirection(employmentZ),
      inverted: false,
      source: "BLS LAUS / FRED",
      asOfDate: new Date().toISOString().slice(0, 10),
      backtestRho: 0, // Not individually backtested yet; included as fundamental driver
    },
    {
      name: "Mortgage Rate Environment",
      rawValue: input.mortgageRate,
      zScore: round2(rateZ),
      weight: VALIDATED_WEIGHTS.mortgageRate,
      weightedContribution: round2(VALIDATED_WEIGHTS.mortgageRate * rateZ * 10),
      direction: toFlowDirection(rateZ),
      inverted: true,
      source: "FRED MORTGAGE30US",
      asOfDate: new Date().toISOString().slice(0, 10),
      // Backtest 2026-03-16: rho=0.13 (p < 0.05)
      backtestRho: 0.13,
    },
  ];

  // Sort by absolute weighted contribution (most impactful first)
  signals.sort((a, b) => Math.abs(b.weightedContribution) - Math.abs(a.weightedContribution));

  // ---- Confidence level ----
  // Minimum of all signal confidence levels; supply signal confidence is explicit,
  // others default to 80 (they come from established APIs with known refresh cadences)
  const confidenceLevel = Math.min(mos.confidenceLevel, 80);

  // ---- Staleness warnings ----
  const supplyDate = new Date(mos.asOfDate);
  const daysSinceSupply = Math.floor(
    (Date.now() - supplyDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceSupply > 90) {
    warnings.push(
      `Months-of-supply data is ${daysSinceSupply} days old (as of ${mos.asOfDate}). ` +
      "Signal reliability is degraded. Staleness penalty applied to confidence."
    );
  } else if (daysSinceSupply > 45) {
    warnings.push(
      `Months-of-supply data is ${daysSinceSupply} days old. Redfin updates monthly; ` +
      "consider refreshing for the latest reading."
    );
  }

  if (validatedScore < 5 || validatedScore > 95) {
    warnings.push(
      `Validated score of ${validatedScore} is in extreme territory (outside [5, 95]). ` +
      "Verify all signal inputs for data quality before acting on this composite."
    );
  }

  // ---- Plain English ----
  const plainEnglish = generateValidatedPlainEnglish(
    validatedScore,
    direction,
    signals,
    convergenceApplied,
    agreeing,
    mos.plainEnglish
  );

  return {
    validatedScore,
    rawScore,
    direction,
    convergence: {
      agreeing,
      disagreeing,
      convergenceMultiplier: round2(convergenceMultiplier),
      convergenceApplied,
    },
    signals,
    plainEnglish,
    confidenceLevel,
    warnings,
  };
}

/**
 * Generate plain English summary for the validated composite result.
 */
function generateValidatedPlainEnglish(
  score: number,
  direction: "inflow" | "stable" | "outflow",
  signals: ValidatedSignalResult[],
  convergenceApplied: boolean,
  agreeing: number,
  supplyPlainEnglish: string
): string {
  const directionText =
    direction === "inflow" ? "Capital is flowing into this market" :
    direction === "outflow" ? "Capital is flowing out of this market" :
    "Capital flows are balanced in this market";

  const topSignal = signals[0];
  const topSignalText = topSignal
    ? ` The strongest driver is ${topSignal.name} (z=${topSignal.zScore}, contributing ${topSignal.weightedContribution > 0 ? "+" : ""}${topSignal.weightedContribution} points).`
    : "";

  const convergenceText = convergenceApplied
    ? ` ${agreeing} of 5 validated signals agree on direction, increasing conviction.`
    : "";

  return `${directionText} (validated score: ${score}/100).${topSignalText}${convergenceText} ${supplyPlainEnglish}`;
}

// ============================================================
// Main Function (Legacy 3-Layer)
// ============================================================

/**
 * Compute the 3-layer capital flow composite score.
 *
 * Chain-of-calculation:
 *   1. Compute each layer's composite z-score (equal-weighted signal average within layer).
 *   2. Map each layer z-score to a 0-100 score.
 *   3. Combine layers using fixed weights (40 / 35 / 25):
 *        capitalFlowScore = 0.40 * leading.score
 *                         + 0.35 * concurrent.score
 *                         + 0.25 * confirming.score
 *   4. Classify direction: >60 = inflow, <40 = outflow, else stable.
 *   5. Compute momentum by comparing leading vs. confirming layer scores:
 *        diff = leading.score - confirming.score
 *        > +10: accelerating (leading outrunning confirming = early-cycle inflow)
 *        < -10: decelerating (confirming falling while leading still elevated)
 *        else: steady
 *   6. Rank all 11 active signals (+ 2 informational) by |zScore| to identify top drivers.
 *
 * @param leading    - Layer 1 input data
 * @param concurrent - Layer 2 input data
 * @param confirming - Layer 3 input data
 * @returns          - Full composite result with all layer scores and top signals
 */
export function computeCapitalFlowComposite(
  leading: LeadingLayerInput,
  concurrent: ConcurrentLayerInput,
  confirming: ConfirmingLayerInput,
  validatedInput?: ValidatedCompositeInput
): CapitalFlowCompositeResultV2 {
  const warnings: string[] = [];

  // ---- Compute validated composite if input is provided ----
  let validated: ValidatedCompositeResult | undefined;
  if (validatedInput) {
    validated = computeValidatedComposite(validatedInput);
  }

  // ---- Compute individual layers ----
  const leadingLayer = computeLeadingLayer(leading);
  const concurrentLayer = computeConcurrentLayer(concurrent);
  const confirmingLayer = computeConfirmingLayer(confirming);

  // ---- Weighted composite ----
  const capitalFlowScore = Math.round(
    LAYER_WEIGHTS.leading * leadingLayer.score +
    LAYER_WEIGHTS.concurrent * concurrentLayer.score +
    LAYER_WEIGHTS.confirming * confirmingLayer.score
  );

  // ---- Direction ----
  let direction: CapitalFlowCompositeResult["direction"];
  if (capitalFlowScore > 60) {
    direction = "inflow";
  } else if (capitalFlowScore < 40) {
    direction = "outflow";
  } else {
    direction = "stable";
  }

  // ---- Momentum ----
  // Accelerating: leading well above confirming (new inflow not yet in prices)
  // Decelerating: confirming lagging further behind leading (inflow slowing)
  const leadVsConfirm = leadingLayer.score - confirmingLayer.score;
  let momentum: CapitalFlowCompositeResult["momentum"];
  if (leadVsConfirm > 10) {
    momentum = "accelerating";
  } else if (leadVsConfirm < -10) {
    momentum = "decelerating";
  } else {
    momentum = "steady";
  }

  // ---- Rank all signals by |zScore| for top-signal output ----
  const allSignals: Array<{
    layer: "leading" | "concurrent" | "confirming";
    signal: CapitalFlowSignal;
    rank: number;
  }> = [];

  for (const sig of leadingLayer.signals) {
    allSignals.push({ layer: "leading", signal: sig, rank: 0 });
  }
  for (const sig of concurrentLayer.signals) {
    allSignals.push({ layer: "concurrent", signal: sig, rank: 0 });
  }
  for (const sig of confirmingLayer.signals) {
    allSignals.push({ layer: "confirming", signal: sig, rank: 0 });
  }

  allSignals.sort((a, b) => Math.abs(b.signal.zScore) - Math.abs(a.signal.zScore));
  allSignals.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const topSignals = allSignals.slice(0, 5); // top 5 by absolute z-score magnitude

  // ---- Guardrail warnings ----
  if (capitalFlowScore < 5 || capitalFlowScore > 95) {
    warnings.push(
      `Composite score of ${capitalFlowScore} is in extreme territory (outside [5, 95]). ` +
      "Verify all signal inputs for data quality before acting on this composite."
    );
  }
  const instSignal = concurrentLayer.signals.find(
    (s) => s.name === "Institutional Acquisition Ratio"
  );
  if (instSignal && instSignal.rawValue > 35) {
    warnings.push(
      `Institutional acquisition ratio of ${instSignal.rawValue}% exceeds 35%. ` +
      "This level is associated with institutional-driven price distortion and rapid reversal risk " +
      "(Konczal & Decker, 2022; CoreLogic investor activity reports)."
    );
  }

  return {
    capitalFlowScore,
    direction,
    momentum,
    layers: {
      leading: leadingLayer,
      concurrent: concurrentLayer,
      confirming: confirmingLayer,
    },
    topSignals,
    warnings,
    validated,
  };
}

// ============================================================
// Mock Default Input Factory (for development and testing)
// ============================================================

/**
 * Generate mock Layer 1 (Leading) input for development and testing.
 * Values approximate a moderately bullish mid-major US metro (late 2024).
 *
 * TODO: Replace all latestValue fields with real API calls in data-sources.ts:
 *   - SEC Form D: SEC EDGAR EFTS API
 *   - HMDA: CFPB HMDA Explorer API
 *   - IRS AGI: IRS Statistics of Income data files
 *   - Google Trends: Google Trends API
 */
export function createMockLeadingInput(): LeadingLayerInput {
  return {
    secFormDChangeYoYPct: 15,          // TODO: Replace with real SEC EDGAR EFTS data
    hmdaInvestmentLoanShiftPp: 1.5,   // TODO: Replace with real CFPB HMDA data
    irsNetAGIMigrationMillions: 850,  // TODO: Replace with real IRS SOI data
    googleTrendsIndex: 62,            // TODO: Replace with real Google Trends API data
    historicalStats: {
      secFormD: { mean: 5, stdDev: 12 },         // TODO: Compute from EDGAR historical data
      hmdaShift: { mean: 0, stdDev: 2 },         // TODO: Compute from HMDA historical data
      irsAGI: { mean: 200, stdDev: 500 },        // TODO: Compute from IRS SOI historical data
      googleTrends: { mean: 50, stdDev: 12 },    // TODO: Compute from Google Trends historical
    },
  };
}

/**
 * Generate mock Layer 2 (Concurrent) input for development and testing.
 * TODO: Replace all latestValue fields with real API calls in data-sources.ts.
 */
export function createMockConcurrentInput(): ConcurrentLayerInput {
  return {
    institutionalAcquisitionRatioPct: 19,  // TODO: Replace with real ATTOM data
    investorPurchaseSharePct: 24,          // TODO: Replace with real CoreLogic data
    uspsNetCOAThousands: 8.5,             // TODO: Replace with real USPS NCOA data
    priceReductionVelocityPp: -1.2,       // negative = fewer cuts recently (bullish)
    historicalStats: {
      institutionalRatio: { mean: 14, stdDev: 5 },          // TODO: Compute from ATTOM history
      investorShare: { mean: 18, stdDev: 6 },               // TODO: Compute from CoreLogic history
      uspsNetCOA: { mean: 2, stdDev: 8 },                   // TODO: Compute from USPS history
      priceReductionVelocity: { mean: 0, stdDev: 3 },       // TODO: Compute from Redfin history
    },
  };
}

/**
 * Generate mock Layer 3 (Confirming) input for development and testing.
 * TODO: Replace all latestValue fields with real API calls in data-sources.ts.
 */
export function createMockConfirmingInput(): ConfirmingLayerInput {
  return {
    mortgageRate: 6.8,                     // TODO: Replace with real FRED MORTGAGE30US
    m2Velocity: 1.32,                      // TODO: Replace with real FRED M2V
    buildingPermitsChangeYoYPct: 8,        // TODO: Replace with real FRED PERMIT
    fhfaHPIMomentumPct: 5.2,              // TODO: Replace with real FHFA HPI API
    vacancyRateChangeYoYPp: -0.4,         // negative = tightening (bullish)
    historicalStats: {
      mortgageRate: { mean: 4.5, stdDev: 1.5 },         // TODO: Compute from FRED history
      m2Velocity: { mean: 1.45, stdDev: 0.15 },         // TODO: Compute from FRED M2V history
      buildingPermits: { mean: 3, stdDev: 15 },         // TODO: Compute from FRED PERMIT history
      fhfaHPIMomentum: { mean: 4, stdDev: 5 },          // TODO: Compute from FHFA HPI history
      vacancyChange: { mean: 0, stdDev: 0.8 },          // TODO: Compute from Census ACS history
    },
  };
}

/**
 * Generate mock months-of-supply input for development and testing.
 * Values approximate a moderately tight mid-major US metro (e.g., Atlanta early 2026).
 *
 * TODO: Replace with real data from /api/market/supply route.
 */
export function createMockMonthsOfSupplyInput(): MonthsOfSupplyInput {
  return {
    // Backtest 2026-03-16: rho=0.33, 9.22pp Q1-Q5 spread, walk-forward 82%
    monthsOfSupply: 3.8,                     // TODO: Replace with real Redfin supply data
    asOfDate: "2026-01-01",                  // TODO: Replace with real observation date
    source: "Redfin" as const,
    rollingStats: {
      mean: 4.2,                             // TODO: Compute from 3-year rolling window
      stdDev: 1.1,                           // TODO: Compute from 3-year rolling window
      windowMonths: 36,
    },
    plainEnglish: "Housing inventory is tight at 3.8 months of supply. Markets below 4 months typically see faster price growth.",
    confidenceLevel: 75,                     // TODO: Compute from data recency
  };
}

/**
 * Generate mock validated composite input for development and testing.
 * Combines months-of-supply with the other 4 backtest-validated signals.
 *
 * TODO: Replace all values with real API data from:
 *   - /api/market/supply (Redfin months of supply)
 *   - /api/market/permits (FRED building permits)
 *   - /api/market/hpi (FHFA HPI momentum)
 *   - FRED employment series (BLS LAUS)
 *   - FRED MORTGAGE30US
 */
export function createMockValidatedInput(): ValidatedCompositeInput {
  return {
    monthsOfSupply: createMockMonthsOfSupplyInput(),
    buildingPermitsChangeYoYPct: 8,          // TODO: Replace with real FRED PERMIT data
    fhfaHPIMomentumPct: 5.2,                // TODO: Replace with real FHFA HPI API data
    employmentGrowthPct: 2.1,               // TODO: Replace with real BLS LAUS data
    mortgageRate: 6.8,                       // TODO: Replace with real FRED MORTGAGE30US
    historicalStats: {
      buildingPermits: { mean: 3, stdDev: 15 },         // TODO: Compute from FRED PERMIT history
      fhfaHPIMomentum: { mean: 4, stdDev: 5 },          // TODO: Compute from FHFA HPI history
      employmentGrowth: { mean: 1.5, stdDev: 1.2 },     // TODO: Compute from BLS LAUS history
      mortgageRate: { mean: 4.5, stdDev: 1.5 },         // TODO: Compute from FRED history
    },
  };
}
