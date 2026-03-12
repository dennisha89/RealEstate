// ============================================================
// Follow The Money — Unified Compositor Engine
// Aggregates all money-flow intelligence engines into a single
// composite profile that reveals where capital is moving and
// what it means for real estate values.
// ============================================================

import type { TrendMetric } from "../types/market-intelligence";
import type { InstitutionalCapitalProfile, SmartMoneySignal } from "./institutional-capital-engine";
import type { CapitalMigrationProfile } from "./capital-migration-engine";
import type { TransactionPipelineProfile, PipelineSignal } from "./transaction-pipeline-engine";
import type { AlternativeSignalsProfile, EmergingSignal } from "./alternative-signals-engine";
import type { CostInsuranceProfile, CostSignal } from "./cost-insurance-engine";

// --- Types ---

export interface FollowTheMoneyProfile {
  zipCode: string;
  generatedAt: string;

  // Sub-profiles
  institutionalCapital: InstitutionalCapitalProfile;
  capitalMigration: CapitalMigrationProfile;
  transactionPipeline: TransactionPipelineProfile;
  alternativeSignals: AlternativeSignalsProfile;
  costInsurance: CostInsuranceProfile;

  // Composite scores
  compositeScore: MoneyFlowCompositeScore;

  // Unified signal list
  allSignals: UnifiedSignal[];
  topSignals: UnifiedSignal[]; // top 5 most impactful

  // Capital flow summary
  capitalFlowSummary: CapitalFlowSummary;

  // Money velocity
  moneyVelocity: MoneyVelocity;

  // Investment timing
  timingAssessment: TimingAssessment;
}

export interface MoneyFlowCompositeScore {
  overall: number; // 0-100
  components: {
    institutionalCapital: { score: number; weight: number; weighted: number };
    capitalMigration: { score: number; weight: number; weighted: number };
    transactionPipeline: { score: number; weight: number; weighted: number };
    alternativeSignals: { score: number; weight: number; weighted: number };
    costInsurance: { score: number; weight: number; weighted: number };
  };
  confidence: "high" | "medium" | "low";
  interpretation: string;
}

export interface UnifiedSignal {
  source: "institutional" | "migration" | "pipeline" | "alternative" | "cost_insurance";
  signal: string;
  direction: "bullish" | "bearish" | "neutral";
  strength: "strong" | "moderate" | "weak";
  leadTime: string;
  detail: string;
  actionability: "immediate" | "near_term" | "long_term";
}

export interface CapitalFlowSummary {
  netCapitalDirection: "strong_inflow" | "inflow" | "balanced" | "outflow" | "strong_outflow";
  estimatedCapitalInflow: number; // $ annual
  estimatedCapitalOutflow: number;
  netFlow: number;
  primarySources: string[]; // where money is coming from
  primaryDestinations: string[]; // where money is going (if outflow)
  capitalComposition: {
    institutional: number; // % of inflows
    domestic1031: number;
    foreign: number;
    taxMigration: number;
    organic: number; // local economic growth
  };
  narrative: string;
}

export interface MoneyVelocity {
  transactionVelocity: "accelerating" | "stable" | "decelerating";
  capitalDeploymentRate: "fast" | "normal" | "slow";
  daysOnMarket: number;
  inventoryTurnover: number; // times per year
  mortgageApplicationRate: "high" | "normal" | "low";
  velocityScore: number; // 0-100
  interpretation: string;
}

export interface TimingAssessment {
  overallTiming: "excellent" | "good" | "neutral" | "caution" | "wait";
  buySignalStrength: number; // 0-100
  riskLevel: "low" | "moderate" | "elevated" | "high";
  timeHorizon: string; // recommended investment horizon
  catalysts: string[]; // upcoming events that could move prices
  risks: string[]; // factors that could hurt returns
  recommendation: string;
}

// --- Weights for composite scoring ---
const COMPONENT_WEIGHTS = {
  institutionalCapital: 0.25,
  capitalMigration: 0.20,
  transactionPipeline: 0.20,
  alternativeSignals: 0.20,
  costInsurance: 0.15,
};

// --- Analysis Functions ---

/**
 * Compute the unified money flow composite score
 */
export function computeCompositeScore(
  institutionalScore: number,
  migrationScore: number,
  pipelineScore: number,
  alternativeScore: number,
  costScore: number
): MoneyFlowCompositeScore {
  const components = {
    institutionalCapital: {
      score: institutionalScore,
      weight: COMPONENT_WEIGHTS.institutionalCapital,
      weighted: institutionalScore * COMPONENT_WEIGHTS.institutionalCapital,
    },
    capitalMigration: {
      score: migrationScore,
      weight: COMPONENT_WEIGHTS.capitalMigration,
      weighted: migrationScore * COMPONENT_WEIGHTS.capitalMigration,
    },
    transactionPipeline: {
      score: pipelineScore,
      weight: COMPONENT_WEIGHTS.transactionPipeline,
      weighted: pipelineScore * COMPONENT_WEIGHTS.transactionPipeline,
    },
    alternativeSignals: {
      score: alternativeScore,
      weight: COMPONENT_WEIGHTS.alternativeSignals,
      weighted: alternativeScore * COMPONENT_WEIGHTS.alternativeSignals,
    },
    costInsurance: {
      score: costScore,
      weight: COMPONENT_WEIGHTS.costInsurance,
      weighted: costScore * COMPONENT_WEIGHTS.costInsurance,
    },
  };

  const overall = Math.round(
    components.institutionalCapital.weighted +
    components.capitalMigration.weighted +
    components.transactionPipeline.weighted +
    components.alternativeSignals.weighted +
    components.costInsurance.weighted
  );

  // Confidence based on score spread
  const scores = [institutionalScore, migrationScore, pipelineScore, alternativeScore, costScore];
  const spread = Math.max(...scores) - Math.min(...scores);
  const confidence = spread < 20 ? "high" : spread < 40 ? "medium" : "low";

  let interpretation: string;
  if (overall >= 75) {
    interpretation = "Strong capital inflows across multiple channels. Money is aggressively moving into this market — strong buy signal.";
  } else if (overall >= 60) {
    interpretation = "Positive capital flow dynamics. Multiple money signals point to growing demand and investment interest.";
  } else if (overall >= 45) {
    interpretation = "Balanced money flows. No dominant capital trend — market is in equilibrium.";
  } else if (overall >= 30) {
    interpretation = "Capital flows weakening. Some outflow signals present — proceed with caution and focus on fundamentals.";
  } else {
    interpretation = "Significant capital outflows. Smart money is reducing exposure. High risk for near-term price pressure.";
  }

  return { overall, components, confidence, interpretation };
}

/**
 * Unify all signals from sub-engines into a single ranked list
 */
export function unifySignals(
  smartMoney: SmartMoneySignal[],
  pipelineSignals: PipelineSignal[],
  emergingSignals: EmergingSignal[],
  costSignals: CostSignal[]
): UnifiedSignal[] {
  const unified: UnifiedSignal[] = [];

  // Convert SmartMoneySignals
  for (const s of smartMoney) {
    unified.push({
      source: "institutional",
      signal: s.signal,
      direction: s.implication.toLowerCase().includes("headwind") || s.implication.toLowerCase().includes("exiting") ? "bearish" : "bullish",
      strength: s.strength,
      leadTime: s.timeHorizon,
      detail: s.implication,
      actionability: parseActionability(s.timeHorizon),
    });
  }

  // Convert PipelineSignals
  for (const s of pipelineSignals) {
    unified.push({
      source: "pipeline",
      signal: s.indicator,
      direction: s.direction,
      strength: s.confidence === "high" ? "strong" : s.confidence === "medium" ? "moderate" : "weak",
      leadTime: s.leadTime,
      detail: s.detail,
      actionability: parseActionability(s.leadTime),
    });
  }

  // Convert EmergingSignals
  for (const s of emergingSignals) {
    unified.push({
      source: "alternative",
      signal: s.signal,
      direction: "bullish", // alternative signals are mostly demand indicators
      strength: s.strength,
      leadTime: s.leadTime,
      detail: s.detail,
      actionability: parseActionability(s.leadTime),
    });
  }

  // Convert CostSignals
  for (const s of costSignals) {
    unified.push({
      source: "cost_insurance",
      signal: s.signal,
      direction: s.impact === "positive" ? "bullish" : s.impact === "negative" ? "bearish" : "neutral",
      strength: s.magnitude === "high" ? "strong" : s.magnitude === "medium" ? "moderate" : "weak",
      leadTime: "6-12 months",
      detail: s.detail,
      actionability: "near_term",
    });
  }

  // Sort by strength: strong > moderate > weak
  const strengthOrder = { strong: 0, moderate: 1, weak: 2 };
  unified.sort((a, b) => strengthOrder[a.strength] - strengthOrder[b.strength]);

  return unified;
}

/**
 * Assess investment timing based on all money flow data
 */
export function assessTiming(
  compositeScore: number,
  signals: UnifiedSignal[]
): TimingAssessment {
  const bullish = signals.filter(s => s.direction === "bullish");
  const bearish = signals.filter(s => s.direction === "bearish");
  const strongBullish = bullish.filter(s => s.strength === "strong").length;
  const strongBearish = bearish.filter(s => s.strength === "strong").length;

  const buySignalStrength = Math.min(100, Math.max(0,
    50 + (strongBullish * 10) - (strongBearish * 12) + (compositeScore - 50) * 0.5
  ));

  let overallTiming: TimingAssessment["overallTiming"];
  if (buySignalStrength >= 80) overallTiming = "excellent";
  else if (buySignalStrength >= 60) overallTiming = "good";
  else if (buySignalStrength >= 40) overallTiming = "neutral";
  else if (buySignalStrength >= 25) overallTiming = "caution";
  else overallTiming = "wait";

  let riskLevel: TimingAssessment["riskLevel"];
  if (strongBearish === 0 && compositeScore >= 60) riskLevel = "low";
  else if (strongBearish <= 1 && compositeScore >= 45) riskLevel = "moderate";
  else if (strongBearish <= 2) riskLevel = "elevated";
  else riskLevel = "high";

  const catalysts = bullish
    .filter(s => s.strength === "strong")
    .map(s => s.signal)
    .slice(0, 5);

  const risks = bearish
    .filter(s => s.strength === "strong" || s.strength === "moderate")
    .map(s => s.signal)
    .slice(0, 5);

  const timeHorizon = compositeScore >= 60 ? "3-5 years (growth)" : compositeScore >= 40 ? "5-7 years (stability)" : "7-10 years (recovery)";

  let recommendation: string;
  if (overallTiming === "excellent") {
    recommendation = "Multiple strong capital inflow signals. Smart money is aggressively entering. Consider accelerating acquisition timeline.";
  } else if (overallTiming === "good") {
    recommendation = "Favorable money flow dynamics support investment. Proceed with standard due diligence — fundamentals are aligned.";
  } else if (overallTiming === "neutral") {
    recommendation = "Mixed signals. Focus on property-specific fundamentals rather than macro capital flows. Be selective.";
  } else if (overallTiming === "caution") {
    recommendation = "Capital flow signals are weakening. Only invest in properties with strong standalone fundamentals and margin of safety.";
  } else {
    recommendation = "Significant capital outflow signals. Consider waiting for stabilization before deploying capital in this market.";
  }

  return {
    overallTiming,
    buySignalStrength: Math.round(buySignalStrength),
    riskLevel,
    timeHorizon,
    catalysts,
    risks,
    recommendation,
  };
}

/**
 * Summarize capital flows from migration data
 */
export function summarizeCapitalFlows(
  migrationProfile: CapitalMigrationProfile,
  institutionalProfile: InstitutionalCapitalProfile
): CapitalFlowSummary {
  const exchangeNet = migrationProfile.exchange1031.inboundVolume.current - migrationProfile.exchange1031.outboundVolume.current;
  const foreignCapital = migrationProfile.foreignCapital.totalInvestmentVolume.current;
  const taxMigrationNet = migrationProfile.taxMigration.netIncomeFlow;
  const institutionalBuying = institutionalProfile.llcPurchaseActivity.entitySellingVsBuying > 1;

  const estimatedInflow = Math.max(0, exchangeNet) + foreignCapital + Math.max(0, taxMigrationNet);
  const estimatedOutflow = Math.abs(Math.min(0, exchangeNet)) + Math.abs(Math.min(0, taxMigrationNet));
  const netFlow = estimatedInflow - estimatedOutflow;

  let netCapitalDirection: CapitalFlowSummary["netCapitalDirection"];
  if (netFlow > 100_000_000) netCapitalDirection = "strong_inflow";
  else if (netFlow > 0) netCapitalDirection = "inflow";
  else if (netFlow > -10_000_000) netCapitalDirection = "balanced";
  else if (netFlow > -100_000_000) netCapitalDirection = "outflow";
  else netCapitalDirection = "strong_outflow";

  const primarySources = [
    ...migrationProfile.exchange1031.topOriginMarkets.slice(0, 3).map(m => m.market),
    ...migrationProfile.foreignCapital.topOriginCountries.slice(0, 2).map(c => c.country),
  ];

  const primaryDestinations = migrationProfile.exchange1031.topDestinationMarkets
    .slice(0, 3)
    .map(m => m.market);

  const totalInflow = estimatedInflow || 1;
  const capitalComposition = {
    institutional: institutionalBuying ? 30 : 10,
    domestic1031: Math.round((Math.max(0, exchangeNet) / totalInflow) * 100) || 20,
    foreign: Math.round((foreignCapital / totalInflow) * 100) || 10,
    taxMigration: Math.round((Math.max(0, taxMigrationNet) / totalInflow) * 100) || 15,
    organic: 0,
  };
  capitalComposition.organic = 100 - capitalComposition.institutional - capitalComposition.domestic1031 - capitalComposition.foreign - capitalComposition.taxMigration;

  const narrative = `Capital is ${netCapitalDirection.replace(/_/g, " ")} this market. `
    + `Primary sources: ${primarySources.join(", ")}. `
    + `${institutionalBuying ? "Institutional investors are net buyers." : "Institutional investors are net neutral/sellers."} `
    + `Net capital flow: $${(netFlow / 1_000_000).toFixed(0)}M annually.`;

  return {
    netCapitalDirection,
    estimatedCapitalInflow: estimatedInflow,
    estimatedCapitalOutflow: estimatedOutflow,
    netFlow,
    primarySources,
    primaryDestinations,
    capitalComposition,
    narrative,
  };
}

// --- Helpers ---

function parseActionability(timeHorizon: string): UnifiedSignal["actionability"] {
  if (timeHorizon.includes("0-") || timeHorizon.includes("1-3")) return "immediate";
  if (timeHorizon.includes("3-") || timeHorizon.includes("6-")) return "near_term";
  return "long_term";
}
