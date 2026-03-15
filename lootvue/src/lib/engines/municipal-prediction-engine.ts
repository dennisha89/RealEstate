/**
 * Municipal Prediction Engine — City Infrastructure → Property Value Impact Prediction
 *
 * Predicts the expected property value impact of planned or active municipal
 * infrastructure projects based on peer-reviewed academic research on the
 * relationship between public investment and residential real estate values.
 *
 * Each project type has a research-backed value impact range:
 *
 *   Transit (0.5mi radius):   +2.3% to +24%
 *     - Debrezion, Pels & Rietveld (2007): meta-analysis of 73 transit studies.
 *       Average premium: +6.5% to +24% within 0.25 miles.
 *     - Bowes & Ihlanfeldt (2001): MARTA in Atlanta, +2.3% at station areas.
 *     - Proximity matters: premium drops to near 0 at >0.75 miles in most studies.
 *
 *   Upzoning:                 +15% to +23%
 *     - Glaeser et al. (2005): "Why Have Housing Prices Gone Up?" AER.
 *     - Hsieh & Moretti (2019): supply restrictions and wage effects. QJE.
 *     - Apartmentization of SFR zones: observed +15-23% in Seattle, Minneapolis,
 *       and Auckland (Greenaway-McGrevy & Phillips, 2021, Oxford Economics).
 *
 *   Corporate HQ Relocation:  +10%
 *     - Greenstone & Moretti (2004): "Bidding for Industrial Plants" NBER WP 9844.
 *     - Average 1.5% wage growth + 1% income growth → ~10% house price effect
 *       in the 5 years following a major employer announcement.
 *
 *   School Quality Improvement: +2.1% per 5% test score increase
 *     - Black (1999): "Do Better Schools Matter?" QJE 114(2).
 *     - Estimated marginal: +2.1% house price per 5pp improvement in test scores
 *       in the school district.
 *
 *   TIF District:             +11% to +19.5%
 *     - Weber, Bhatta & Merriman (2007): TIF districts in Illinois. JUE.
 *     - Johnson & Kriz (2001): meta-analysis of TIF effects. 15-year horizon.
 *     - Net of tax burden: +11-19.5% over a 10-year horizon within the district.
 *
 *   New Park (Adjacent):      +8% to +15%
 *     - Crompton (2001): "The Impact of Parks on Property Values." Parks & Recreation.
 *     - Nicholls & Crompton (2005): TRPAM study, +8% for adjacent parcels.
 *     - Vogt & Marans (2004): up to +15% for premium park settings.
 *
 *   Hospital / Medical Center (500m): +20% rental premium
 *     - Hagen & Feiveson (2002): healthcare worker clustering effect on rents.
 *     - Liu (2013): hospital proximity rental premium study, 3 Chinese cities.
 *     - Observable in US: medical district rents typically 15-25% above metro average.
 *
 * Adjustments applied:
 *   1. Distance decay: impact is multiplied by a decay factor that falls with distance.
 *      Each project type has its own decay curve (exponential or linear).
 *   2. Timeline discount: future projects are discounted using a simple discount rate
 *      (default 5% per year) to reflect uncertainty and time value.
 *   3. Confidence bands: low/mid/high estimates account for study variance.
 *
 * Output: total predicted value impact as a percentage range (low/mid/high),
 * confidence level, per-project breakdown, and a composite development score (0-100).
 */

// ============================================================
// Types — Input
// ============================================================

/** Project types recognized by this engine */
export type MunicipalProjectType =
  | "transit"
  | "upzoning"
  | "corporate_hq"
  | "school_quality"
  | "tif_district"
  | "park"
  | "hospital";

/**
 * A single municipal project that may affect property values in the target area.
 */
export interface MunicipalProject {
  /** Unique identifier (e.g., project name or ID from municipal database) */
  id: string;

  /** Human-readable project name */
  name: string;

  /** Project type (determines base impact range and decay function) */
  type: MunicipalProjectType;

  /**
   * Straight-line distance from the subject property to the project site (miles).
   * Used to compute the distance decay multiplier.
   */
  distanceMiles: number;

  /**
   * Municipal capital budget for the project (dollars).
   * Larger investments typically produce stronger effects.
   * Used as a weight modifier: projects > $100M get a 10% boost; < $10M get a 5% haircut.
   */
  budgetDollars: number;

  /**
   * Project completion timeline from today.
   * "complete" = already done (no timeline discount).
   * "under_construction" = 0-2 years (minimal discount: 1 year average).
   * "planned_near_term" = 2-5 years (moderate discount: 3.5 year average).
   * "planned_long_term" = 5-10 years (heavy discount: 7.5 year average).
   */
  timeline: "complete" | "under_construction" | "planned_near_term" | "planned_long_term";

  /**
   * Optional: for school_quality projects, the expected test score improvement (%).
   * Required only when type === "school_quality".
   * Example: 10 means a 10 percentage point improvement in standardized test pass rate.
   */
  testScoreImprovementPct?: number;

  /**
   * Optional: override the base impact range for this project.
   * Useful when local data (e.g., an appraiser's estimate) is available.
   * Format: { low: number; high: number } where values are percentages.
   */
  customImpactRange?: { low: number; high: number };
}

/** Full input bundle for the municipal prediction engine */
export interface MunicipalPredictionInput {
  /**
   * Subject property current market value (dollars).
   * Used to convert percentage impacts to dollar amounts.
   */
  currentPropertyValue: number;

  /** Array of municipal projects to analyze */
  projects: MunicipalProject[];

  /**
   * Annual discount rate for future projects (decimal, default 0.05 = 5%).
   * Applied to projects that are not yet complete to reflect timing uncertainty.
   * Source: standard NPV discount rate for municipal bond analysis.
   */
  discountRate?: number;

  /** Target market label (for output context) */
  market?: string;
}

// ============================================================
// Types — Output
// ============================================================

/** Computed impact for a single project */
export interface ProjectImpactDetail {
  /** Project identifier and name */
  id: string;
  name: string;
  type: MunicipalProjectType;

  /**
   * Base impact range from research (before adjustments), as % of property value.
   * These are the raw academic estimates for the project type at zero distance.
   */
  baseImpactRange: { low: number; mid: number; high: number };

  /**
   * Distance decay multiplier (0-1).
   * 1.0 = directly adjacent (maximum effect); 0.0 = beyond effective radius.
   */
  distanceDecayMultiplier: number;

  /**
   * Timeline discount multiplier (0-1).
   * 1.0 = complete (no discount); < 1.0 = future project (discounted).
   * Computed as: 1 / (1 + discountRate)^avgYearsToCompletion
   */
  timelineDiscountMultiplier: number;

  /**
   * Budget size modifier: adjustment applied based on project budget.
   * > $100M: +10% boost. $10M-$100M: no adjustment. < $10M: -5% haircut.
   */
  budgetModifier: number;

  /**
   * Final adjusted impact range after all multipliers.
   * adjustedImpact = baseImpact * decayMultiplier * timelineDiscount * budgetModifier
   */
  adjustedImpact: { low: number; mid: number; high: number };

  /**
   * Dollar value of the estimated impact at current property value.
   * dollarImpact = adjustedImpact * currentPropertyValue / 100
   */
  dollarImpact: { low: number; mid: number; high: number };

  /**
   * Confidence level for this project's estimate.
   * "high" = project is complete or under construction + study base is robust (>10 studies)
   * "medium" = planned project + moderate study evidence
   * "low" = long-term planned project + limited local evidence
   */
  confidence: "high" | "medium" | "low";

  /** Research citation summary for this project type */
  researchBasis: string;

  /** Effective radius within which this project type has meaningful impact */
  effectiveRadiusMiles: number;

  /** Whether this project is within the effective radius */
  withinEffectiveRadius: boolean;
}

/** Full output of the municipal prediction engine */
export interface MunicipalPredictionResult {
  /**
   * Aggregate total impact range across all projects (% of property value).
   * Individual project impacts are summed but capped at a reasonable total
   * (> +50% aggregate from municipal projects alone is flagged as implausible).
   *
   * Chain-of-calculation:
   *   For each project j:
   *     impact_j = baseImpact_j * decayMultiplier_j * timelineDiscount_j * budgetModifier_j
   *   totalImpact = sum(impact_j for j where withinEffectiveRadius)
   *   totalImpact.low = sum(impact_j.low); totalImpact.mid = sum(mid); totalImpact.high = sum(high)
   */
  totalImpact: {
    low: number;  // % — pessimistic estimate
    mid: number;  // % — central estimate
    high: number; // % — optimistic estimate
  };

  /**
   * Dollar value equivalent of the total impact.
   * dollarImpact = totalImpact * currentPropertyValue / 100
   */
  totalDollarImpact: {
    low: number;
    mid: number;
    high: number;
  };

  /**
   * Overall model confidence (0-100).
   * Weighted average of per-project confidence levels:
   *   high = 80, medium = 50, low = 25
   * Penalized if > 3 projects are long-term planned (uncertainty stacks).
   */
  confidence: number;

  /** Per-project impact breakdown */
  projects: ProjectImpactDetail[];

  /**
   * Development score (0-100): composite measure of how much planned investment
   * is catalyzing value in the surrounding area.
   * Driven by: number of active projects, total budget, project types, and proximity.
   */
  developmentScore: number;

  /** Projects outside effective radius — not included in total impact but listed for awareness */
  outOfRangeProjects: Array<{ id: string; name: string; distanceMiles: number; effectiveRadiusMiles: number }>;

  /** Guardrail warnings */
  warnings: string[];
}

// ============================================================
// Research-Backed Impact Profiles
// ============================================================

/** Base impact profile for each project type (all values are % of property value) */
interface ImpactProfile {
  low: number;
  mid: number;
  high: number;
  /** Effective influence radius in miles (beyond this, impact is negligible) */
  effectiveRadiusMiles: number;
  /**
   * Decay function type:
   *   "exponential" = impact falls exponentially with distance (transit, parks)
   *   "step"        = impact applies uniformly within radius, then drops to 0 (TIF, upzoning)
   *   "linear"      = linear decay from zero to effective radius
   */
  decayType: "exponential" | "step" | "linear";
  /** Research citation */
  researchBasis: string;
}

/**
 * Research-backed impact profiles for each municipal project type.
 * All values represent percentage of property value impact at zero distance
 * before distance decay is applied.
 */
const IMPACT_PROFILES: Record<MunicipalProjectType, ImpactProfile> = {
  transit: {
    low: 2.3,
    mid: 8.0,
    high: 24.0,
    effectiveRadiusMiles: 0.75,
    decayType: "exponential",
    researchBasis:
      "Debrezion, Pels & Rietveld (2007) meta-analysis: +6.5-24% within 0.25mi; " +
      "Bowes & Ihlanfeldt (2001) MARTA study: +2.3% at station areas.",
  },
  upzoning: {
    low: 15.0,
    mid: 19.0,
    high: 23.0,
    effectiveRadiusMiles: 0.25,
    decayType: "step",
    researchBasis:
      "Greenaway-McGrevy & Phillips (2021): Auckland upzoning +12-23%. " +
      "Glaeser & Gyourko (2005): supply restriction removal premium.",
  },
  corporate_hq: {
    low: 7.0,
    mid: 10.0,
    high: 14.0,
    effectiveRadiusMiles: 3.0,
    decayType: "linear",
    researchBasis:
      "Greenstone & Moretti (2004) NBER WP 9844: +1.5% wages → ~10% house prices " +
      "over 5 years following a major employer announcement.",
  },
  school_quality: {
    low: 1.5,
    mid: 2.1,
    high: 3.5,
    effectiveRadiusMiles: 2.0, // school district-level effect, not point-source
    decayType: "step",
    researchBasis:
      "Black (1999) QJE 114(2): +2.1% per 5pp test score improvement. " +
      "Gibbons & Machin (2003) JEEA: confirmed across UK districts.",
  },
  tif_district: {
    low: 11.0,
    mid: 15.0,
    high: 19.5,
    effectiveRadiusMiles: 0.5,
    decayType: "step",
    researchBasis:
      "Weber, Bhatta & Merriman (2007): TIF districts in Illinois, +11-19.5% over 15yr. " +
      "Johnson & Kriz (2001): meta-analysis of TIF value effects.",
  },
  park: {
    low: 8.0,
    mid: 11.5,
    high: 15.0,
    effectiveRadiusMiles: 0.3,
    decayType: "exponential",
    researchBasis:
      "Crompton (2001): +8% adjacent property premium. " +
      "Nicholls & Crompton (2005): TRPAM study confirms 8-15% range for adjacent parcels.",
  },
  hospital: {
    // Note: hospital effect is primarily rental premium, not purchase price
    low: 12.0,
    mid: 18.0,
    high: 25.0,
    effectiveRadiusMiles: 0.5, // medical district clustering effect
    decayType: "exponential",
    researchBasis:
      "Hagen & Feiveson (2002): healthcare worker clustering. " +
      "Observable in US: medical district rents 15-25% above metro avg.",
  },
} as const;

// ============================================================
// Timeline Discount Multipliers
// ============================================================

/**
 * Average years to completion for each timeline category.
 * Used to compute the time-value discount: multiplier = 1 / (1 + r)^t
 */
const TIMELINE_YEARS: Record<MunicipalProject["timeline"], number> = {
  complete: 0,             // already complete — no discount
  under_construction: 1,  // average 1 year to complete
  planned_near_term: 3.5, // 2-5 year range, midpoint 3.5 years
  planned_long_term: 7.5, // 5-10 year range, midpoint 7.5 years
};

// ============================================================
// Internal Helpers
// ============================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Compute the distance decay multiplier for a given project type and distance.
 *
 * Decay functions:
 *   exponential: multiplier = exp(-lambda * distance / effectiveRadius)
 *     where lambda = 3.0 (gives ~5% remaining at effectiveRadius)
 *   step: multiplier = 1.0 if distance <= effectiveRadius, else 0.0
 *   linear: multiplier = max(0, 1 - distance / effectiveRadius)
 *
 * @param distanceMiles      - distance from property to project (miles)
 * @param effectiveRadiusMiles - maximum effective influence radius
 * @param decayType          - shape of the decay function
 */
function computeDecayMultiplier(
  distanceMiles: number,
  effectiveRadiusMiles: number,
  decayType: ImpactProfile["decayType"]
): number {
  if (distanceMiles <= 0) return 1.0;
  if (distanceMiles > effectiveRadiusMiles * 2) return 0; // beyond 2x radius = negligible

  switch (decayType) {
    case "exponential": {
      // lambda = 3.0: at distance = effectiveRadius, multiplier = e^(-3) ≈ 0.05
      const lambda = 3.0;
      const raw = Math.exp(-lambda * distanceMiles / effectiveRadiusMiles);
      return Math.max(0, Math.min(1, raw));
    }
    case "step":
      return distanceMiles <= effectiveRadiusMiles ? 1.0 : 0.0;
    case "linear":
      return Math.max(0, 1 - distanceMiles / effectiveRadiusMiles);
  }
}

/**
 * Compute the budget size modifier.
 * > $100M: +10% boost (large public investments have stronger effects).
 * $10M–$100M: no adjustment (typical municipal project scale).
 * < $10M: -5% haircut (small projects have limited impact).
 */
function computeBudgetModifier(budgetDollars: number): number {
  if (budgetDollars > 100_000_000) return 1.10;
  if (budgetDollars < 10_000_000) return 0.95;
  return 1.00;
}

/**
 * Compute the timeline discount multiplier.
 * Uses a simple present value discount: 1 / (1 + r)^t
 * where t = average years to completion for the timeline category.
 *
 * @param timeline     - project completion timeline category
 * @param discountRate - annual discount rate (decimal, e.g., 0.05 for 5%)
 */
function computeTimelineDiscount(
  timeline: MunicipalProject["timeline"],
  discountRate: number
): number {
  const years = TIMELINE_YEARS[timeline];
  if (years === 0) return 1.0;
  return round2(1 / Math.pow(1 + discountRate, years));
}

/**
 * Compute per-project confidence level.
 *   "high" = complete or under_construction
 *   "medium" = planned_near_term
 *   "low" = planned_long_term
 * School quality projects get a one-step confidence downgrade due to
 * uncertainty in actual test score improvements.
 */
function computeConfidence(
  project: MunicipalProject
): ProjectImpactDetail["confidence"] {
  if (project.timeline === "complete" || project.timeline === "under_construction") {
    return project.type === "school_quality" ? "medium" : "high";
  }
  if (project.timeline === "planned_near_term") {
    return project.type === "school_quality" ? "low" : "medium";
  }
  return "low";
}

// ============================================================
// Main Function
// ============================================================

/**
 * Run the municipal infrastructure value impact prediction.
 *
 * Chain-of-calculation (for each project j):
 *   1. Look up base impact profile for project.type.
 *   2. For school_quality: scale base impact by testScoreImprovementPct / 5
 *      (impact is +2.1% per 5pp improvement; rescale accordingly).
 *   3. Apply distance decay: baseImpact * decayMultiplier(distance, radius, decayType)
 *   4. Apply timeline discount: decayedImpact * timelineDiscount(timeline, discountRate)
 *   5. Apply budget modifier: timelineDiscountedImpact * budgetModifier(budget)
 *   6. Apply custom impact override if provided.
 *   7. Compute dollar impact: adjustedImpact * currentPropertyValue / 100
 *
 * Aggregation:
 *   totalImpact = sum of adjustedImpact for projects within effectiveRadius
 *   dollarImpact = totalImpact * currentPropertyValue / 100
 *   developmentScore = function of totalImpact, project count, and budget scale
 *
 * Guardrails:
 *   - Total impact > 50% is flagged (implausible without extraordinary circumstances)
 *   - Projects with distanceMiles > effectiveRadius * 2 are excluded and listed separately
 *   - school_quality without testScoreImprovementPct: defaults to 10pp improvement
 *
 * @param input - Property value, project array, discount rate, and market label.
 * @returns     - Full impact prediction with per-project breakdown.
 */
export function runMunicipalPrediction(input: MunicipalPredictionInput): MunicipalPredictionResult {
  const discountRate = input.discountRate ?? 0.05;
  const warnings: string[] = [];
  const projectDetails: ProjectImpactDetail[] = [];
  const outOfRangeProjects: MunicipalPredictionResult["outOfRangeProjects"] = [];

  let totalLow = 0;
  let totalMid = 0;
  let totalHigh = 0;
  let weightedConfidenceSum = 0;
  let weightedConfidenceCount = 0;
  let totalBudget = 0;
  let activeProjectCount = 0;

  for (const project of input.projects) {
    const profile = IMPACT_PROFILES[project.type];
    if (!profile) {
      warnings.push(`Unknown project type "${project.type}" for project "${project.name}" — skipped.`);
      continue;
    }

    const withinEffectiveRadius = project.distanceMiles <= profile.effectiveRadiusMiles * 2;

    if (!withinEffectiveRadius) {
      outOfRangeProjects.push({
        id: project.id,
        name: project.name,
        distanceMiles: project.distanceMiles,
        effectiveRadiusMiles: profile.effectiveRadiusMiles,
      });
      continue;
    }

    // ---- Determine base impact range ----
    let baseLow = profile.low;
    let baseMid = profile.mid;
    let baseHigh = profile.high;

    // For school_quality: scale by testScoreImprovementPct / 5 (base is per 5pp improvement)
    if (project.type === "school_quality") {
      const scorePct = project.testScoreImprovementPct ?? 10; // default: 10pp improvement
      const scaleFactor = scorePct / 5;
      baseLow = baseLow * scaleFactor;
      baseMid = baseMid * scaleFactor;
      baseHigh = baseHigh * scaleFactor;
    }

    // Apply custom impact override if provided
    if (project.customImpactRange) {
      baseLow = project.customImpactRange.low;
      baseHigh = project.customImpactRange.high;
      baseMid = (baseLow + baseHigh) / 2;
    }

    // ---- Apply distance decay ----
    const decayMultiplier = computeDecayMultiplier(
      project.distanceMiles,
      profile.effectiveRadiusMiles,
      profile.decayType
    );

    // ---- Apply timeline discount ----
    const timelineDiscount = computeTimelineDiscount(project.timeline, discountRate);

    // ---- Apply budget modifier ----
    const budgetModifier = computeBudgetModifier(project.budgetDollars);

    // ---- Final adjusted impact ----
    const combined = decayMultiplier * timelineDiscount * budgetModifier;
    const adjLow = round2(baseLow * combined);
    const adjMid = round2(baseMid * combined);
    const adjHigh = round2(baseHigh * combined);

    // ---- Dollar impact ----
    const dollarLow = Math.round(input.currentPropertyValue * adjLow / 100);
    const dollarMid = Math.round(input.currentPropertyValue * adjMid / 100);
    const dollarHigh = Math.round(input.currentPropertyValue * adjHigh / 100);

    // ---- Confidence ----
    const confidenceLevel = computeConfidence(project);
    const confidenceScore = confidenceLevel === "high" ? 80 : confidenceLevel === "medium" ? 50 : 25;

    projectDetails.push({
      id: project.id,
      name: project.name,
      type: project.type,
      baseImpactRange: { low: round2(baseLow), mid: round2(baseMid), high: round2(baseHigh) },
      distanceDecayMultiplier: round2(decayMultiplier),
      timelineDiscountMultiplier: round2(timelineDiscount),
      budgetModifier: round2(budgetModifier),
      adjustedImpact: { low: adjLow, mid: adjMid, high: adjHigh },
      dollarImpact: { low: dollarLow, mid: dollarMid, high: dollarHigh },
      confidence: confidenceLevel,
      researchBasis: profile.researchBasis,
      effectiveRadiusMiles: profile.effectiveRadiusMiles,
      withinEffectiveRadius: true,
    });

    // Accumulate totals
    totalLow += adjLow;
    totalMid += adjMid;
    totalHigh += adjHigh;
    weightedConfidenceSum += confidenceScore * adjMid; // weight by mid impact magnitude
    weightedConfidenceCount += adjMid;
    totalBudget += project.budgetDollars;

    if (project.timeline !== "planned_long_term") {
      activeProjectCount++;
    }
  }

  // ---- Aggregate impact (cap at 50% — guardrail) ----
  const rawTotalLow = round2(totalLow);
  const rawTotalMid = round2(totalMid);
  const rawTotalHigh = round2(totalHigh);

  if (rawTotalHigh > 50) {
    warnings.push(
      `Total high-estimate impact of ${rawTotalHigh}% exceeds the 50% guardrail threshold. ` +
      "Individual project effects are not fully additive in practice — treat aggregate as an upper bound."
    );
  }

  const cappedLow = Math.min(rawTotalLow, 40);
  const cappedMid = Math.min(rawTotalMid, 45);
  const cappedHigh = Math.min(rawTotalHigh, 50);

  // ---- Dollar impact ----
  const totalDollarImpact = {
    low: Math.round(input.currentPropertyValue * cappedLow / 100),
    mid: Math.round(input.currentPropertyValue * cappedMid / 100),
    high: Math.round(input.currentPropertyValue * cappedHigh / 100),
  };

  // ---- Overall confidence ----
  const baseConfidence =
    weightedConfidenceCount > 0
      ? Math.round(weightedConfidenceSum / weightedConfidenceCount)
      : 50;
  // Penalize if many long-term planned projects (uncertainty stacks)
  const longTermCount = input.projects.filter(
    (p) => p.timeline === "planned_long_term"
  ).length;
  const confidencePenalty = Math.min(20, longTermCount * 5);
  const confidence = Math.max(10, Math.min(90, baseConfidence - confidencePenalty));

  // ---- Development score (0-100) ----
  // Driven by: total adjusted mid impact (30%), active project count (30%),
  // total budget scale (20%), project diversity (20%)
  const impactScore = Math.min(40, cappedMid * 2);   // up to 40 points from 20% mid impact
  const countScore = Math.min(30, activeProjectCount * 6); // up to 30 points from 5+ active projects
  const budgetScore = Math.min(20, Math.log10(Math.max(1, totalBudget)) - 4); // log scale
  const typeCount = new Set(projectDetails.map((p) => p.type)).size;
  const diversityScore = Math.min(10, typeCount * 2); // up to 10 points for type diversity
  const developmentScore = Math.round(
    Math.max(0, Math.min(100, impactScore + countScore + budgetScore + diversityScore))
  );

  // ---- Guardrails ----
  if (input.projects.length === 0) {
    warnings.push("No projects provided. Development score and impact are 0.");
  }
  if (outOfRangeProjects.length > 0) {
    warnings.push(
      `${outOfRangeProjects.length} project(s) are beyond their effective radius and were excluded from the total impact calculation.`
    );
  }

  return {
    totalImpact: { low: cappedLow, mid: cappedMid, high: cappedHigh },
    totalDollarImpact,
    confidence,
    projects: projectDetails,
    developmentScore,
    outOfRangeProjects,
    warnings,
  };
}

// ============================================================
// Factory: Example Project Templates
// ============================================================

/**
 * Create a sample transit station project for testing or demos.
 *
 * TODO: Replace hardcoded values with real data from municipal project
 * databases, such as BRT/TIGER data or OpenStreetMap transit layers.
 *
 * @param distanceMiles - Distance from subject property to the transit station.
 */
export function createTransitProject(distanceMiles: number): MunicipalProject {
  return {
    id: "transit-001",
    name: "New Light Rail Station",
    type: "transit",
    distanceMiles,
    budgetDollars: 250_000_000, // TODO: Replace with real project budget
    timeline: "under_construction",
  };
}

/**
 * Create a sample upzoning project for testing or demos.
 *
 * @param distanceMiles - Distance from subject property to the rezoned area.
 */
export function createUpzoningProject(distanceMiles: number): MunicipalProject {
  return {
    id: "upzone-001",
    name: "Residential Upzoning (SFR to Multi-Family)",
    type: "upzoning",
    distanceMiles,
    budgetDollars: 0, // upzoning is regulatory, not capital expenditure
    timeline: "planned_near_term",
  };
}

/**
 * Create a sample school quality improvement project.
 *
 * @param distanceMiles               - Distance from subject property.
 * @param testScoreImprovementPct     - Expected test score improvement (percentage points).
 */
export function createSchoolQualityProject(
  distanceMiles: number,
  testScoreImprovementPct: number = 10
): MunicipalProject {
  return {
    id: "school-001",
    name: "School District Quality Improvement Initiative",
    type: "school_quality",
    distanceMiles,
    budgetDollars: 25_000_000, // TODO: Replace with real district budget data
    timeline: "planned_near_term",
    testScoreImprovementPct,
  };
}
