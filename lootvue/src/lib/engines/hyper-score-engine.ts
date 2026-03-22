// ============================================================
// HyperScore Compositor
// Combines all 8 dimension scores into a single composite score
// and generates the final recommendation.
// ============================================================

import type { HyperScore, DimensionScore, KPIDriver } from "../types/market-intelligence";

export interface DimensionScores {
  financial: DimensionScore;
  comps: DimensionScore;
  demographic: DimensionScore;
  economic: DimensionScore;
  infrastructure: DimensionScore;
  qualityOfLife: DimensionScore;
  supplyDemand: DimensionScore;
  macroRisk: DimensionScore;
}

/**
 * Compute the composite HyperScore from all 8 dimensions
 */
export function computeHyperScore(
  dimensions: DimensionScores,
  kpiDrivers: KPIDriver[]
): HyperScore {
  // Calculate weighted composite
  const overall = Math.round(
    dimensions.financial.weightedScore +
    dimensions.comps.weightedScore +
    dimensions.demographic.weightedScore +
    dimensions.economic.weightedScore +
    dimensions.infrastructure.weightedScore +
    dimensions.qualityOfLife.weightedScore +
    dimensions.supplyDemand.weightedScore +
    dimensions.macroRisk.weightedScore
  );

  // Overall data confidence
  const confidence = Math.round(
    Object.values(dimensions).reduce((sum, d) => sum + d.dataCompleteness * d.weight, 0)
  );

  // Determine recommendation
  const recommendation = getRecommendation(overall);

  // Top positive drivers
  const topDrivers = kpiDrivers
    .filter(d => d.impact === "strong_positive" || d.impact === "positive")
    .slice(0, 5);

  // Top risks
  const topRisks = kpiDrivers
    .filter(d => d.impact === "strong_negative" || d.impact === "negative")
    .slice(0, 5);

  return {
    overall,
    dimensions,
    recommendation,
    confidence,
    topDrivers,
    topRisks,
  };
}

function getRecommendation(score: number): HyperScore["recommendation"] {
  if (score >= 90) return "GENERATIONAL_OPPORTUNITY";
  if (score >= 80) return "STRONG_BUY";
  if (score >= 70) return "BUY";
  if (score >= 60) return "LEAN_BUY";
  if (score >= 50) return "NEUTRAL";
  if (score >= 40) return "LEAN_PASS";
  if (score >= 30) return "PASS";
  return "HARD_PASS";
}

/**
 * Generate a natural-language summary of the HyperScore
 */
export function generateHyperScoreSummary(hyperScore: HyperScore): string {
  const lines: string[] = [];

  lines.push(`HyperScore: ${hyperScore.overall}/100 — ${hyperScore.recommendation.replace(/_/g, " ")}`);
  lines.push(`Confidence: ${hyperScore.confidence}%`);
  lines.push("");

  // Dimension breakdown
  lines.push("Dimension Breakdown:");
  const dims = hyperScore.dimensions;
  const dimEntries: [string, DimensionScore][] = [
    ["Financial", dims.financial],
    ["Comps", dims.comps],
    ["Demographics", dims.demographic],
    ["Economy", dims.economic],
    ["Infrastructure", dims.infrastructure],
    ["Quality of Life", dims.qualityOfLife],
    ["Supply/Demand", dims.supplyDemand],
    ["Macro/Risk", dims.macroRisk],
  ];

  for (const [name, dim] of dimEntries) {
    const bar = "█".repeat(Math.round(dim.score / 5)) + "░".repeat(20 - Math.round(dim.score / 5));
    lines.push(`  ${name.padEnd(16)} ${bar} ${dim.score}/100 (${(dim.weight * 100).toFixed(0)}% weight)`);
  }

  lines.push("");

  // Top drivers
  if (hyperScore.topDrivers.length > 0) {
    lines.push("Top Price Drivers:");
    for (const driver of hyperScore.topDrivers) {
      lines.push(`  ↑ ${driver.kpi}: ${driver.value} (${driver.trend})`);
    }
  }

  lines.push("");

  // Top risks
  if (hyperScore.topRisks.length > 0) {
    lines.push("Top Risks:");
    for (const risk of hyperScore.topRisks) {
      lines.push(`  ↓ ${risk.kpi}: ${risk.value} (${risk.trend})`);
    }
  }

  return lines.join("\n");
}
