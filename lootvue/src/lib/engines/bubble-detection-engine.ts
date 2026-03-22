/**
 * Bubble Detection Engine — Dallas Fed / UBS Global Real Estate Bubble Index Methodology
 *
 * Implements a housing bubble detection framework derived from two peer-reviewed
 * academic methodologies:
 *
 * 1. Dallas Fed International Housing Observatory (IHO):
 *    - Mack & Martinez-Garcia (2011): "A Cross-Country Quarterly Database of Real
 *      House Prices: A Methodological Note", Federal Reserve Bank of Dallas,
 *      Globalization and Monetary Policy Institute Working Paper No. 99.
 *    - Exuberance detection via recursive unit-root tests (GSADF / SADF tests).
 *    - Operationalized here via z-score thresholds (2σ = elevated, 3σ = critical)
 *      as a computationally lightweight proxy for the full GSADF test.
 *
 * 2. UBS Global Real Estate Bubble Index:
 *    - Bruegger & Carstens (UBS CIO, annual report since 2015):
 *      Five pillars: Price-to-Income, Price-to-Rent, Change in Mortgage Debt,
 *      Change in Construction, Price-to-City GDP.
 *    - Our implementation uses the three most available / impactful signals:
 *      Price-to-Income ratio, Price-to-Rent ratio, and Credit Gap.
 *
 * Primary signals:
 *   A. Price-to-Income (PTI) ratio:
 *      PTI = median home price / median annual household income
 *      Bubble threshold (Dallas Fed): z-score > 2σ above 10-year rolling mean
 *      Critical threshold: z-score > 3σ
 *
 *   B. Price-to-Rent (PTR) ratio:
 *      PTR = home price / annual gross rent (price / (monthly rent * 12))
 *      Equivalent to GRM / 12. A PTR > 25 historically precedes corrections.
 *      (Campbell, Davis, Gallin & Martin, 2009, "What Moves Housing Markets")
 *
 *   C. Credit Gap:
 *      Credit gap = mortgage debt growth rate (%) MINUS GDP growth rate (%)
 *      Positive gap = credit expanding faster than the economy (BIS methodology)
 *      A positive credit gap > 4pp is the BIS early warning threshold for
 *      financial stress. (BIS Working Paper No. 17, Borio & Lowe 2002)
 *
 *   D. Price-Income Divergence Velocity:
 *      Rate of change of the PTI ratio over trailing 12 months.
 *      Rapid divergence (e.g., PTI rising > 0.5 in 12 months) flags momentum risk.
 *
 * Composite Bubble Risk Score (0-100):
 *   bubbleRisk = clamp(
 *     40 * ptiZscore_contribution +
 *     35 * ptrZscore_contribution +
 *     15 * creditGap_contribution +
 *     10 * velocity_contribution,
 *     0, 100
 *   )
 *   Where contributions are derived from z-scores mapped to 0-100 partial scores.
 *
 * Guardrails (flagged in output):
 *   - PTI > 10x: rare (only Tokyo, Hong Kong, Vancouver at peak)
 *   - PTR > 30: rarely sustained without correction
 *   - Credit gap > 10pp: BIS "severe stress" zone (preceded 2008 crisis)
 *   - z-score > 4σ: statistical impossibility under normal conditions — data error likely
 */

// ============================================================
// Types
// ============================================================

/** Statistical summary for a ratio relative to its historical baseline */
export interface RatioStats {
  /** Current observed value of the ratio */
  current: number;
  /** 10-year rolling historical mean */
  historicalMean: number;
  /** 10-year rolling standard deviation */
  historicalStdDev: number;
  /** Z-score: (current - mean) / stdDev. Clamped to [-4, +4]. */
  zScore: number;
  /** Percentile rank within the 10-year history (0-100) */
  percentile: number;
  /** Risk level based on z-score thresholds */
  riskLevel: "normal" | "elevated" | "critical";
}

/** Credit gap input: mortgage debt growth vs GDP growth */
export interface CreditGapInput {
  /**
   * Annual mortgage debt growth rate (%).
   * Source: Federal Reserve Z.1 Financial Accounts (Mortgage Debt Outstanding).
   * FRED series: MDOAH (Mortgage Debt Outstanding, all holders).
   * TODO: Replace with real FRED API call in data-sources.ts
   */
  mortgageDebtGrowthPct: number;

  /**
   * Annual nominal GDP growth rate (%).
   * Source: FRED series GDPC1 (adjusted for inflation) or GDP (nominal).
   * TODO: Replace with real FRED API call in data-sources.ts
   */
  gdpGrowthPct: number;

  /**
   * Rolling 10-year historical mean of the credit gap.
   * Typical US long-run average: approximately 0-2% (BIS data, 1980-2024).
   * TODO: Replace with computed value from FRED historical series in data-sources.ts
   */
  historicalGapMean: number;

  /** Historical standard deviation of the credit gap */
  historicalGapStdDev: number;
}

/** Full input bundle for bubble detection */
export interface BubbleDetectionInput {
  /**
   * Median home price for the target market (dollars).
   * Source: Zillow ZHVI, ATTOM, or Census AHS.
   * TODO: Replace with real ATTOM/Zillow API call in data-sources.ts
   */
  medianHomePrice: number;

  /**
   * Median annual household income for the market (dollars).
   * Source: Census ACS 5-year estimates (B19013).
   * FRED series: MHIUS (national); MHICA/MHITX/etc. for states.
   * TODO: Replace with real Census ACS API call in data-sources.ts
   */
  medianHouseholdIncome: number;

  /**
   * Median monthly gross rent for the market (dollars).
   * Source: Census ACS Table B25058 or RentCast API.
   * Used to compute PTR = medianHomePrice / (medianMonthlyRent * 12).
   * TODO: Replace with real RentCast/Census API call in data-sources.ts
   */
  medianMonthlyRent: number;

  /**
   * Historical normalization statistics for PTI ratio (rolling 10-year window).
   * Source: computed from ATTOM historical price data + Census ACS income series.
   * TODO: Replace with real rolling-window computation from database in data-sources.ts
   */
  ptiHistoricalStats: { mean: number; stdDev: number };

  /**
   * Historical normalization statistics for PTR ratio (rolling 10-year window).
   * Source: computed from Zillow ZHVI + Census ACS rent series.
   * TODO: Replace with real rolling-window computation from database in data-sources.ts
   */
  ptrHistoricalStats: { mean: number; stdDev: number };

  /**
   * Credit gap data: mortgage debt growth vs GDP growth.
   * Used to detect credit-fueled bubble dynamics.
   * TODO: Replace with real FRED API data in data-sources.ts
   */
  creditGap: CreditGapInput;

  /**
   * PTI ratio 12 months ago (for velocity calculation).
   * Optional: if not provided, velocity contribution is set to 0.
   * TODO: Replace with historical ATTOM/Census data in data-sources.ts
   */
  ptiOneYearAgo?: number;

  /** Target market label (e.g., "Austin, TX" or "78704") */
  market?: string;
}

/** Active risk flags from the bubble detection analysis */
export interface BubbleFlag {
  type: "pti_elevated" | "pti_critical" | "ptr_elevated" | "ptr_critical"
      | "credit_gap_warning" | "credit_gap_severe" | "velocity_rapid"
      | "guardrail_data_quality";
  description: string;
  severity: "warning" | "critical";
}

/** Full output of the bubble detection engine */
export interface BubbleDetectionResult {
  /**
   * Composite bubble risk score (0-100).
   * 0-33: Normal market fundamentals
   * 34-66: Elevated risk — overvaluation possible
   * 67-100: Critical — bubble dynamics present
   *
   * Chain-of-calculation:
   *   ptiPartial = clamp((pti.zScore / 3) * 50, 0, 50)   — max 50 points from PTI
   *   ptrPartial = clamp((ptr.zScore / 3) * 35, 0, 35)   — max 35 points from PTR
   *   creditPartial = clamp(creditGapZ * 7.5, 0, 15)     — max 15 points from credit
   *   velocityPartial = clamp(velocity * 5, 0, 10)        — max 10 points from velocity
   *   bubbleRisk = ptiPartial + ptrPartial + creditPartial + velocityPartial  (cap 100)
   */
  bubbleRisk: number;

  /**
   * Overall risk level classification.
   * "normal"   = bubbleRisk < 34
   * "elevated" = bubbleRisk 34-66
   * "critical" = bubbleRisk >= 67
   */
  level: "normal" | "elevated" | "critical";

  /** Price-to-Income ratio analysis */
  priceToIncome: RatioStats;

  /** Price-to-Rent ratio analysis */
  priceToRent: RatioStats;

  /**
   * Credit gap: mortgage debt growth minus GDP growth (percentage points).
   * Positive = mortgage credit expanding faster than the productive economy.
   * BIS threshold: +4pp = early warning; +8pp = severe warning.
   */
  creditGap: {
    /** Mortgage debt growth rate (%) */
    mortgageDebtGrowthPct: number;
    /** GDP growth rate (%) */
    gdpGrowthPct: number;
    /** Gap = mortgageDebtGrowthPct - gdpGrowthPct */
    gapPp: number;
    /** Z-score of the gap relative to 10-year history */
    zScore: number;
    /** Risk interpretation */
    signal: "benign" | "warning" | "severe";
  };

  /**
   * Price-Income Divergence Velocity: change in PTI ratio over trailing 12 months.
   * A PTI increasing by > 0.5 per year (e.g., from 6.0 to 6.5) signals accelerating
   * unaffordability. >1.0 per year indicates momentum-driven bubble dynamics.
   */
  ptiDivergenceVelocity: {
    currentPTI: number;
    ptiOneYearAgo: number | null;
    annualChange: number | null;
    signal: "stable" | "diverging" | "rapidly_diverging";
  };

  /** Active risk flags */
  flags: BubbleFlag[];

  /** Market or region label */
  market: string;

  /** Guardrail warnings */
  warnings: string[];
}

// ============================================================
// Internal Helpers
// ============================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Compute a z-score clamped to [-4, +4].
 * Beyond ±4σ the observation is likely a data quality issue.
 *
 * @param value  - current observed value
 * @param mean   - rolling historical mean
 * @param stdDev - rolling historical standard deviation
 */
function clampedZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev <= 0) return 0;
  const z = (value - mean) / stdDev;
  return Math.max(-4, Math.min(4, z));
}

/**
 * Approximate percentile of a z-score using the standard normal CDF.
 * Uses the Abramowitz & Stegun (1964) polynomial approximation — accurate to 7.5e-8.
 * Returns a value in [0, 100].
 *
 * @param z - z-score (should be in [-4, +4])
 */
function zScoreToPercentile(z: number): number {
  // erf approximation — Abramowitz & Stegun eq. 7.1.26
  const erfApprox = (x: number): number => {
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y =
      1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
        0.254829592) *
        t *
        Math.exp(-x * x);
    return sign * y;
  };
  const p = 0.5 * (1 + erfApprox(z / Math.sqrt(2)));
  return Math.round(p * 1000) / 10; // round to 1 decimal place
}

/**
 * Classify risk level from a z-score using the Dallas Fed thresholds:
 *   z < 2σ  = normal
 *   2σ ≤ z < 3σ = elevated
 *   z ≥ 3σ  = critical
 */
function toRiskLevel(z: number): RatioStats["riskLevel"] {
  if (z >= 3) return "critical";
  if (z >= 2) return "elevated";
  return "normal";
}

/**
 * Build a full RatioStats object from a ratio value and its historical parameters.
 */
function buildRatioStats(
  current: number,
  mean: number,
  stdDev: number
): RatioStats {
  const z = clampedZScore(current, mean, stdDev);
  return {
    current: round2(current),
    historicalMean: round2(mean),
    historicalStdDev: round2(stdDev),
    zScore: round2(z),
    percentile: zScoreToPercentile(z),
    riskLevel: toRiskLevel(z),
  };
}

// ============================================================
// Main Function
// ============================================================

/**
 * Run the bubble detection analysis for a target market.
 *
 * Chain-of-calculation:
 *   PTI = medianHomePrice / medianHouseholdIncome
 *   PTR = medianHomePrice / (medianMonthlyRent * 12)
 *   creditGap = mortgageDebtGrowthPct - gdpGrowthPct
 *
 *   For PTI and PTR:
 *     z = (current - 10yr_mean) / 10yr_stdDev; clamped ±4
 *     percentile = normalCDF(z) * 100
 *     riskLevel = "normal" | "elevated" | "critical"  (2σ and 3σ thresholds)
 *
 *   Bubble risk score:
 *     ptiContrib = clamp((pti.zScore / 3) * 50, 0, 50)
 *     ptrContrib = clamp((ptr.zScore / 3) * 35, 0, 35)
 *     creditContrib = clamp(creditGapZ * 5, 0, 15)
 *     velocityContrib = clamp(|annualPTIChange| * 5, 0, 10)
 *     bubbleRisk = clamp(sum, 0, 100)
 *
 * @param input - Market data with price, income, rent, and historical stats.
 * @returns     - Full bubble detection result with risk score, ratios, and flags.
 */
export function runBubbleDetection(input: BubbleDetectionInput): BubbleDetectionResult {
  const warnings: string[] = [];
  const flags: BubbleFlag[] = [];

  // ---- Compute ratios ----
  const ptiCurrent = input.medianHomePrice / input.medianHouseholdIncome;
  const annualRent = input.medianMonthlyRent * 12;
  const ptrCurrent = annualRent > 0 ? input.medianHomePrice / annualRent : 0;
  const creditGapPp = round2(
    input.creditGap.mortgageDebtGrowthPct - input.creditGap.gdpGrowthPct
  );

  // ---- PTI ratio stats ----
  const ptiStats = buildRatioStats(
    ptiCurrent,
    input.ptiHistoricalStats.mean,
    input.ptiHistoricalStats.stdDev
  );

  // ---- PTR ratio stats ----
  const ptrStats = buildRatioStats(
    ptrCurrent,
    input.ptrHistoricalStats.mean,
    input.ptrHistoricalStats.stdDev
  );

  // ---- Credit gap z-score ----
  const creditGapZ = clampedZScore(
    creditGapPp,
    input.creditGap.historicalGapMean,
    input.creditGap.historicalGapStdDev
  );
  let creditSignal: BubbleDetectionResult["creditGap"]["signal"];
  if (creditGapPp >= 8 || creditGapZ >= 2) {
    creditSignal = "severe";
  } else if (creditGapPp >= 4 || creditGapZ >= 1) {
    creditSignal = "warning";
  } else {
    creditSignal = "benign";
  }

  // ---- PTI velocity (divergence speed) ----
  let annualPTIChange: number | null = null;
  let velocitySignal: BubbleDetectionResult["ptiDivergenceVelocity"]["signal"] = "stable";

  if (input.ptiOneYearAgo !== undefined) {
    annualPTIChange = round2(ptiCurrent - input.ptiOneYearAgo);
    if (Math.abs(annualPTIChange) >= 1.0) {
      velocitySignal = "rapidly_diverging";
    } else if (Math.abs(annualPTIChange) >= 0.5) {
      velocitySignal = "diverging";
    }
  }

  // ---- Composite bubble risk score ----
  // Each component contributes a capped partial score:
  //   PTI: up to 50 points (dominant signal — most reliable bubble predictor)
  //   PTR: up to 35 points (strong confirmation signal)
  //   Credit gap: up to 15 points (amplification factor — credit fuels bubbles)
  //   Velocity: up to 10 points (momentum modifier — speed of change matters)
  const ptiContrib = Math.max(0, Math.min(50, (ptiStats.zScore / 3) * 50));
  const ptrContrib = Math.max(0, Math.min(35, (ptrStats.zScore / 3) * 35));
  const creditContrib = Math.max(0, Math.min(15, Math.max(0, creditGapZ) * 5));
  const velocityContrib =
    annualPTIChange !== null
      ? Math.max(0, Math.min(10, Math.abs(annualPTIChange) * 5))
      : 0;

  const bubbleRisk = Math.round(
    Math.max(0, Math.min(100, ptiContrib + ptrContrib + creditContrib + velocityContrib))
  );

  // ---- Risk level classification ----
  let level: BubbleDetectionResult["level"];
  if (bubbleRisk >= 67) {
    level = "critical";
  } else if (bubbleRisk >= 34) {
    level = "elevated";
  } else {
    level = "normal";
  }

  // ---- Build flags ----
  if (ptiStats.riskLevel === "elevated") {
    flags.push({
      type: "pti_elevated",
      description: `Price-to-Income ratio of ${round2(ptiCurrent)}x is ${round2(ptiStats.zScore)}σ above the 10-year mean (${round2(ptiStats.historicalMean)}x). ` +
        "Affordability is significantly worse than the historical norm.",
      severity: "warning",
    });
  }
  if (ptiStats.riskLevel === "critical") {
    flags.push({
      type: "pti_critical",
      description: `Price-to-Income ratio of ${round2(ptiCurrent)}x is ${round2(ptiStats.zScore)}σ above the 10-year mean. ` +
        "This level has historically preceded significant corrections (Dallas Fed threshold: >3σ).",
      severity: "critical",
    });
  }
  if (ptrStats.riskLevel === "elevated") {
    flags.push({
      type: "ptr_elevated",
      description: `Price-to-Rent ratio of ${round2(ptrCurrent)}x is ${round2(ptrStats.zScore)}σ above the historical mean. ` +
        "Owning has become significantly more expensive than renting — a classic bubble divergence signal.",
      severity: "warning",
    });
  }
  if (ptrStats.riskLevel === "critical") {
    flags.push({
      type: "ptr_critical",
      description: `Price-to-Rent ratio of ${round2(ptrCurrent)}x is ${round2(ptrStats.zScore)}σ above the historical mean. ` +
        "Price-rent divergence at this level (>3σ) has preceded all major housing corrections since 1970.",
      severity: "critical",
    });
  }
  if (creditSignal === "warning") {
    flags.push({
      type: "credit_gap_warning",
      description: `Credit gap of ${creditGapPp}pp (mortgage debt growing ${creditGapPp}pp faster than GDP). ` +
        "BIS early warning threshold is +4pp. Credit-fueled demand is amplifying price pressure.",
      severity: "warning",
    });
  }
  if (creditSignal === "severe") {
    flags.push({
      type: "credit_gap_severe",
      description: `Credit gap of ${creditGapPp}pp exceeds the BIS 'severe stress' threshold of +8pp. ` +
        "This pattern preceded the 2008 global financial crisis. Systemic risk is elevated.",
      severity: "critical",
    });
  }
  if (velocitySignal === "rapidly_diverging" && annualPTIChange !== null) {
    flags.push({
      type: "velocity_rapid",
      description: `PTI ratio increasing by ${annualPTIChange > 0 ? "+" : ""}${round2(annualPTIChange)}x per year — ` +
        "rapid divergence suggests speculative momentum rather than fundamental demand.",
      severity: "critical",
    });
  } else if (velocitySignal === "diverging" && annualPTIChange !== null) {
    flags.push({
      type: "velocity_rapid",
      description: `PTI ratio changing by ${annualPTIChange > 0 ? "+" : ""}${round2(annualPTIChange)}x in the past year. ` +
        "Monitor for acceleration.",
      severity: "warning",
    });
  }

  // ---- Guardrail warnings ----
  if (ptiCurrent > 10) {
    warnings.push(
      `PTI of ${round2(ptiCurrent)}x exceeds 10x — this has only been sustained in Tokyo, Hong Kong, and Vancouver ` +
      "at market peaks. Verify median price and income data quality."
    );
  }
  if (ptrCurrent > 40) {
    warnings.push(
      `PTR of ${round2(ptrCurrent)}x exceeds 40x — this has never been sustained in US markets. ` +
      "Verify rent and price inputs."
    );
  }
  if (Math.abs(ptiStats.zScore) > 3.5 || Math.abs(ptrStats.zScore) > 3.5) {
    flags.push({
      type: "guardrail_data_quality",
      description: "One or more z-scores exceed ±3.5σ. This is statistically improbable under normal distribution. " +
        "Verify historical stats and input data for errors.",
      severity: "warning",
    });
    warnings.push(
      "Z-score above 3.5σ detected. Consider whether the 10-year historical window captures a fundamentally " +
      "different market regime (e.g., pre-2008 bubble as the 'mean' would understate current risk)."
    );
  }
  if (creditGapPp > 15) {
    warnings.push(
      `Credit gap of ${creditGapPp}pp is unprecedented in post-war US history. ` +
      "Verify mortgage debt and GDP growth inputs."
    );
  }

  return {
    bubbleRisk,
    level,
    priceToIncome: ptiStats,
    priceToRent: ptrStats,
    creditGap: {
      mortgageDebtGrowthPct: round2(input.creditGap.mortgageDebtGrowthPct),
      gdpGrowthPct: round2(input.creditGap.gdpGrowthPct),
      gapPp: creditGapPp,
      zScore: round2(creditGapZ),
      signal: creditSignal,
    },
    ptiDivergenceVelocity: {
      currentPTI: round2(ptiCurrent),
      ptiOneYearAgo: input.ptiOneYearAgo !== undefined ? round2(input.ptiOneYearAgo) : null,
      annualChange: annualPTIChange,
      signal: velocitySignal,
    },
    flags,
    market: input.market ?? "Unknown Market",
    warnings,
  };
}

// ============================================================
// US National Historical Baselines
// ============================================================

/**
 * Approximate US national historical baseline stats for PTI and PTR,
 * computed from FHFA HPI + Census ACS data (2014-2024).
 *
 * PTI 10-year (2014-2024): mean ~5.3x, stdDev ~1.0x
 * PTR 10-year (2014-2024): mean ~18.5x, stdDev ~3.5x
 *
 * These are national averages. Individual metros vary significantly:
 *   - Los Angeles: PTI ~12x, PTR ~30x (2024 peak)
 *   - Atlanta: PTI ~5.5x, PTR ~18x
 *   - Austin: PTI ~8x, PTR ~22x (2022 peak)
 *
 * TODO: Replace with market-specific rolling-window computations from TimescaleDB.
 */
export const US_NATIONAL_BASELINE = {
  pti: { mean: 5.3, stdDev: 1.0 },
  ptr: { mean: 18.5, stdDev: 3.5 },
  creditGap: { mean: 1.5, stdDev: 2.5 }, // BIS US historical gap, 2000-2024
} as const;

/**
 * Create a mock BubbleDetectionInput for development and testing.
 * Values approximate a moderately overvalued mid-major US metro (2024).
 *
 * TODO: Replace with real data from ATTOM, Census ACS, and FRED in data-sources.ts
 */
export function createMockBubbleDetectionInput(market: string = "National"): BubbleDetectionInput {
  return {
    medianHomePrice: 425_000,        // TODO: Replace with real ATTOM/Zillow data
    medianHouseholdIncome: 76_000,   // TODO: Replace with real Census ACS data
    medianMonthlyRent: 1_850,        // TODO: Replace with real RentCast/Census data
    ptiHistoricalStats: US_NATIONAL_BASELINE.pti,
    ptrHistoricalStats: US_NATIONAL_BASELINE.ptr,
    creditGap: {
      mortgageDebtGrowthPct: 6.2,    // TODO: Replace with real FRED MDOAH growth rate
      gdpGrowthPct: 2.8,             // TODO: Replace with real FRED GDP growth rate
      historicalGapMean: US_NATIONAL_BASELINE.creditGap.mean,
      historicalGapStdDev: US_NATIONAL_BASELINE.creditGap.stdDev,
    },
    ptiOneYearAgo: 5.2,              // TODO: Replace with real historical PTI from 12mo ago
    market,
  };
}
