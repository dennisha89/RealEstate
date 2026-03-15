// ============================================================
// Dimension 2: Comparable Sales Engine
// ============================================================

import type {
  CompsAnalysis,
  CompProperty,
  AdjustedComp,
  CompAdjustment,
  CompsSummary,
  DimensionScore,
} from "../types/market-intelligence";

export type { CompProperty };

interface CompsSearchParams {
  subject: CompProperty;
  radiusMiles?: number;
  maxComps?: number;
  maxAgeDays?: number;
}

/**
 * Default adjustment factors per unit of difference.
 * These are national medians — callers SHOULD provide market-specific
 * factors via the optional `adjustmentFactors` parameter on `calculateAdjustments`.
 *
 * Per Fannie Mae Selling Guide B4-1.3-09 and Appraisal Institute standards,
 * adjustments must reflect the specific market's reaction. Hard-coded
 * national averages are a reasonable fallback when market-specific paired
 * sales data is not available, but should be replaced by data-driven
 * adjustments as market calibration data becomes available.
 *
 * Typical ranges by market type:
 *   sqftPerUnit: $60-80 (rural) | $120-180 (suburban) | $300-600 (urban core)
 *   bedroomPerUnit: $8K-12K (rural) | $12K-20K (suburban) | $20K-50K (urban)
 */
export interface CompAdjustmentFactors {
  sqftPerUnit: number;
  bedroomPerUnit: number;
  bathroomPerUnit: number;
  agePerYear: number;
  garagePerUnit: number;
  distancePenaltyPerMile: number;
}

const DEFAULT_ADJUSTMENT_FACTORS: CompAdjustmentFactors = {
  sqftPerUnit: 150,          // national median $/sqft adjustment
  bedroomPerUnit: 15000,     // national median $/bedroom
  bathroomPerUnit: 10000,    // national median $/bathroom
  agePerYear: 500,           // national median $/year of age difference
  garagePerUnit: 20000,      // national median $/garage space
  distancePenaltyPerMile: 0.02, // 2% penalty per mile distance
};

/**
 * Compute adjustments between subject and a comparable property.
 * Adjustments are applied to the COMP price to estimate what
 * the comp would have sold for if it matched the subject.
 */
export function calculateAdjustments(
  subject: CompProperty,
  comp: CompProperty,
  factors: CompAdjustmentFactors = DEFAULT_ADJUSTMENT_FACTORS
): CompAdjustment[] {
  const adjustments: CompAdjustment[] = [];

  // Square footage adjustment
  const sqftDiff = subject.sqft - comp.sqft;
  if (Math.abs(sqftDiff) > 50) {
    adjustments.push({
      factor: "sqft",
      subjectValue: subject.sqft,
      compValue: comp.sqft,
      dollarAdjustment: sqftDiff * factors.sqftPerUnit,
    });
  }

  // Bedroom adjustment
  const bedDiff = subject.bedrooms - comp.bedrooms;
  if (bedDiff !== 0) {
    adjustments.push({
      factor: "bedrooms",
      subjectValue: subject.bedrooms,
      compValue: comp.bedrooms,
      dollarAdjustment: bedDiff * factors.bedroomPerUnit,
    });
  }

  // Bathroom adjustment
  const bathDiff = subject.bathrooms - comp.bathrooms;
  if (bathDiff !== 0) {
    adjustments.push({
      factor: "bathrooms",
      subjectValue: subject.bathrooms,
      compValue: comp.bathrooms,
      dollarAdjustment: bathDiff * factors.bathroomPerUnit,
    });
  }

  // Age adjustment
  const ageDiff = comp.yearBuilt - subject.yearBuilt; // positive = comp is newer
  if (Math.abs(ageDiff) > 2) {
    adjustments.push({
      factor: "year_built",
      subjectValue: subject.yearBuilt,
      compValue: comp.yearBuilt,
      dollarAdjustment: ageDiff * factors.agePerYear * -1,
    });
  }

  return adjustments;
}

/**
 * Calculate similarity score between subject and comp (0-100)
 */
export function calculateSimilarity(subject: CompProperty, comp: CompProperty, distance: number): number {
  let similarity = 100;

  // Penalize sqft difference
  const sqftPctDiff = Math.abs(subject.sqft - comp.sqft) / subject.sqft;
  similarity -= sqftPctDiff * 40; // up to 40 point penalty

  // Penalize bedroom mismatch
  similarity -= Math.abs(subject.bedrooms - comp.bedrooms) * 10;

  // Penalize bathroom mismatch
  similarity -= Math.abs(subject.bathrooms - comp.bathrooms) * 8;

  // Penalize age difference
  const ageDiff = Math.abs(subject.yearBuilt - comp.yearBuilt);
  similarity -= Math.min(ageDiff * 0.5, 15);

  // Penalize distance
  similarity -= distance * 10;

  return Math.max(0, Math.min(100, Math.round(similarity)));
}

/**
 * Build adjusted comp from a raw comparable sale
 */
export function buildAdjustedComp(subject: CompProperty, comp: CompProperty, distance: number): AdjustedComp {
  const adjustments = calculateAdjustments(subject, comp);
  const totalAdjustment = adjustments.reduce((sum, adj) => sum + adj.dollarAdjustment, 0);
  const adjustedPrice = comp.price + totalAdjustment;
  const similarity = calculateSimilarity(subject, comp, distance);

  return {
    ...comp,
    distance,
    adjustments,
    adjustedPrice,
    adjustedPricePerSqft: adjustedPrice / comp.sqft,
    similarity,
  };
}

/**
 * Analyze comparables and generate summary
 */
export function analyzeComps(params: CompsSearchParams, rawComps: CompProperty[], distances: number[]): CompsAnalysis {
  const { subject } = params;

  // Build adjusted comps
  const comparables: AdjustedComp[] = rawComps
    .map((comp, i) => buildAdjustedComp(subject, comp, distances[i]))
    .sort((a, b) => b.similarity - a.similarity);

  // Summary statistics
  const adjustedPrices = comparables.map(c => c.adjustedPricePerSqft);
  const sortedPrices = [...adjustedPrices].sort((a, b) => a - b);

  const medianPricePerSqft = sortedPrices.length > 0
    ? sortedPrices[Math.floor(sortedPrices.length / 2)]
    : 0;

  const averagePricePerSqft = adjustedPrices.length > 0
    ? adjustedPrices.reduce((a, b) => a + b, 0) / adjustedPrices.length
    : 0;

  // Weight by similarity for implied value
  const totalWeight = comparables.reduce((sum, c) => sum + c.similarity, 0);
  const weightedPricePerSqft = totalWeight > 0
    ? comparables.reduce((sum, c) => sum + c.adjustedPricePerSqft * c.similarity, 0) / totalWeight
    : averagePricePerSqft;

  const impliedValue = Math.round(weightedPricePerSqft * subject.sqft);
  const priceVsComps = subject.price > 0
    ? ((subject.price - impliedValue) / impliedValue) * 100
    : 0;

  // Days on market analysis
  const domValues = comparables
    .map(c => c.daysOnMarket)
    .filter((d): d is number => d !== undefined);
  const medianDOM = domValues.length > 0
    ? domValues.sort((a, b) => a - b)[Math.floor(domValues.length / 2)]
    : 0;

  // Sale-to-list ratio (use 1.0 as default if not available)
  const saleToListRatio = 0.98; // Default; in production, calculated from actual data

  // Absorption rate
  const absorptionRate = 4.5; // Default months of inventory; in production from MLS data

  // Price direction based on comp dates and prices
  const priceDirection: "accelerating" | "stable" | "decelerating" = "stable";

  const summary: CompsSummary = {
    medianPricePerSqft: Math.round(medianPricePerSqft),
    averagePricePerSqft: Math.round(averagePricePerSqft),
    impliedValue,
    priceVsComps: Math.round(priceVsComps * 100) / 100,
    medianDaysOnMarket: medianDOM,
    saleToListRatio,
    absorptionRate,
    priceDirection,
  };

  return {
    subject,
    comparables,
    summary,
  };
}

export function scoreComps(analysis: CompsAnalysis): DimensionScore {
  let score = 50;
  const keyFactors: string[] = [];

  // Price vs comp-implied value (most important)
  const discount = analysis.summary.priceVsComps;
  if (discount < -15) {
    score += 30;
    keyFactors.push(`${Math.abs(discount).toFixed(1)}% below comp-implied value`);
  } else if (discount < -5) {
    score += 15;
    keyFactors.push(`${Math.abs(discount).toFixed(1)}% below comp-implied value`);
  } else if (discount > 10) {
    score -= 20;
    keyFactors.push(`${discount.toFixed(1)}% above comp-implied value`);
  } else if (discount > 5) {
    score -= 10;
    keyFactors.push(`${discount.toFixed(1)}% above comp-implied value`);
  } else {
    keyFactors.push("Priced in line with comps");
  }

  // Sale-to-list ratio (market heat indicator)
  if (analysis.summary.saleToListRatio > 1.02) {
    score += 5; // Hot market can be good for appreciation
    keyFactors.push("Bidding wars present (sale > list price)");
  } else if (analysis.summary.saleToListRatio < 0.95) {
    score += 10; // Negotiation power
    keyFactors.push("Room to negotiate (sale well below list)");
  }

  // Absorption rate
  if (analysis.summary.absorptionRate < 3) {
    score += 5;
    keyFactors.push("Tight inventory (seller's market)");
  } else if (analysis.summary.absorptionRate > 6) {
    score += 10; // More deals available
    keyFactors.push("Buyer's market (6+ months inventory)");
  }

  // Data quality - more comps = higher confidence
  const compCount = analysis.comparables.length;
  const dataCompleteness = Math.min(100, compCount * 15);

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    weight: 0.10,
    weightedScore: score * 0.10,
    keyFactors,
    dataCompleteness,
  };
}
