/**
 * Supply Pipeline Confluence Engine
 * Answers: "How constrained is housing supply?" — the #1 driver of local prices.
 * INVERTED: constrained supply = HIGH score = bullish for existing owners.
 * Weights: Permits(25%) Pipeline(20%) Costs(20%) Shadow(10%) Removal(10%) MF(15%)
 */
export interface SupplyPipelineInput {
  residentialPermitsYoY: number; commercialPermitsYoY: number;
  permitTrend: "accelerating" | "stable" | "decelerating" | "collapsing";
  housingStarts: number; housingStartsYoY: number;
  completions: number; completionsYoY: number;
  startsToCompletionRatio: number; avgConstructionTimeline: number;
  constructionCostIndex: number; constructionCostYoY: number; lumberPriceYoY: number;
  laborAvailability: "surplus" | "adequate" | "tight" | "severe_shortage";
  contractorBacklog: number;
  entitledUnbuiltLots: number; entitledUnbuiltTrend: "growing" | "stable" | "shrinking";
  expiredPermits: number;
  demolitionPermits: number; officeToResidentialConversions: number;
  multifamilyUnitsUnderConstruction: number;
  multifamilyDeliveryNext12mo: number; multifamilyAbsorptionRate: number;
}

interface ComponentScore { score: number; weight: number; source: string }

export interface SupplyPipelineResult {
  confluenceScore: number;
  componentScores: {
    permitSignal: ComponentScore; constructionPipeline: ComponentScore;
    costPressure: ComponentScore; shadowSupply: ComponentScore;
    supplyRemoval: ComponentScore; multifamilyWave: ComponentScore;
  };
  agreement: "strong" | "moderate" | "mixed" | "divergent";
  agreementDetail: string;
  verdict: "SEVERELY_CONSTRAINED" | "CONSTRAINED" | "BALANCED" | "OVERSUPPLIED" | "GLUT";
  supplyForecast: string; costFloor: string; multifamilyImpact: string;
  thesis: string; priceImplications: string[]; supplyRisks: string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const W = {
  permitSignal: 0.25, constructionPipeline: 0.20, costPressure: 0.20,
  shadowSupply: 0.10, supplyRemoval: 0.10, multifamilyWave: 0.15,
} as const;
const SOURCES = {
  permitSignal: "Census Building Permits Survey",
  constructionPipeline: "Census New Residential Construction",
  costPressure: "PPI Construction, BLS, lumber futures",
  shadowSupply: "Local planning/entitlement records",
  supplyRemoval: "Demolition permits, adaptive reuse filings",
  multifamilyWave: "Dodge Construction, CoStar pipeline",
} as const;

// -- Component Scorers (INVERTED: high = constrained = bullish) ---------------

function scorePermits(i: SupplyPipelineInput): number {
  const permitDelta = clamp(50 - i.residentialPermitsYoY * 2, 0, 100);
  const commDelta = clamp(50 - i.commercialPermitsYoY, 0, 80);
  const trendMap = { collapsing: 95, decelerating: 70, stable: 45, accelerating: 15 } as const;
  return clamp(Math.round(permitDelta * 0.45 + commDelta * 0.20 + trendMap[i.permitTrend] * 0.35), 0, 100);
}

function scorePipeline(i: SupplyPipelineInput): number {
  const ratioScore = clamp(Math.round((1.5 - i.startsToCompletionRatio) * 60 + 20), 0, 100);
  const startsDecline = clamp(Math.round(50 - i.housingStartsYoY * 2), 0, 100);
  const timelineDelay = clamp(Math.round((i.avgConstructionTimeline - 12) * 5 + 40), 0, 100);
  return clamp(Math.round(ratioScore * 0.40 + startsDecline * 0.35 + timelineDelay * 0.25), 0, 100);
}

function scoreCosts(i: SupplyPipelineInput): number {
  const costIdx = clamp(Math.round((i.constructionCostIndex - 80) * 0.8), 0, 100);
  const costYoY = clamp(Math.round(i.constructionCostYoY * 5 + 30), 0, 100);
  const lumber = clamp(Math.round(i.lumberPriceYoY * 3 + 40), 0, 100);
  const laborMap = { severe_shortage: 95, tight: 70, adequate: 40, surplus: 15 } as const;
  const backlog = clamp(Math.round(i.contractorBacklog * 8), 0, 100);
  return clamp(Math.round(
    costIdx * 0.20 + costYoY * 0.25 + lumber * 0.15 + laborMap[i.laborAvailability] * 0.25 + backlog * 0.15
  ), 0, 100);
}

function scoreShadow(i: SupplyPipelineInput): number {
  const trendMap = { shrinking: 80, stable: 50, growing: 20 } as const;
  const expired = clamp(Math.round(i.expiredPermits * 3 + 30), 0, 100);
  return clamp(Math.round(trendMap[i.entitledUnbuiltTrend] * 0.60 + expired * 0.40), 0, 100);
}

function scoreRemoval(i: SupplyPipelineInput): number {
  const demo = clamp(Math.round(i.demolitionPermits * 4 + 20), 0, 100);
  const conv = clamp(Math.round(i.officeToResidentialConversions * 5 + 20), 0, 100);
  return clamp(Math.round(demo * 0.60 + conv * 0.40), 0, 100);
}

function scoreMF(i: SupplyPipelineInput): number {
  const delivery = i.multifamilyDeliveryNext12mo > 0
    ? clamp(Math.round(100 - i.multifamilyDeliveryNext12mo / 50), 0, 100) : 90;
  const absorption = clamp(Math.round(i.multifamilyAbsorptionRate * 1.1), 0, 100);
  const pipeline = i.multifamilyUnitsUnderConstruction > 0
    ? clamp(Math.round(100 - i.multifamilyUnitsUnderConstruction / 100), 0, 100) : 85;
  return clamp(Math.round(delivery * 0.40 + absorption * 0.35 + pipeline * 0.25), 0, 100);
}

// -- Core Engine --------------------------------------------------------------

export function computeSupplyPipelineConfluence(input: SupplyPipelineInput): SupplyPipelineResult {
  const cs: SupplyPipelineResult["componentScores"] = {
    permitSignal: { score: scorePermits(input), weight: W.permitSignal, source: SOURCES.permitSignal },
    constructionPipeline: { score: scorePipeline(input), weight: W.constructionPipeline, source: SOURCES.constructionPipeline },
    costPressure: { score: scoreCosts(input), weight: W.costPressure, source: SOURCES.costPressure },
    shadowSupply: { score: scoreShadow(input), weight: W.shadowSupply, source: SOURCES.shadowSupply },
    supplyRemoval: { score: scoreRemoval(input), weight: W.supplyRemoval, source: SOURCES.supplyRemoval },
    multifamilyWave: { score: scoreMF(input), weight: W.multifamilyWave, source: SOURCES.multifamilyWave },
  };

  const confluenceScore = Math.round(Object.values(cs).reduce((s, c) => s + c.score * c.weight, 0));
  const scores = Object.values(cs).map(c => c.score);
  const bull = scores.filter(s => s > 60).length;
  const bear = scores.filter(s => s < 40).length;

  const agreement: SupplyPipelineResult["agreement"] =
    bull >= 5 ? "strong" : bull >= 4 ? "moderate" : bear >= 4 ? "divergent" : "mixed";
  const agreementDetail = `${bull}/6 constrained (>60), ${bear}/6 loose (<40). `
    + (agreement === "strong" ? "Near-unanimous supply constraint across all dimensions."
      : agreement === "moderate" ? "Most supply indicators point to constraint, minor exceptions."
      : agreement === "divergent" ? "Supply signals broadly indicate oversupply or easing."
      : "Supply signals are split — some constrained, some easing.");

  const verdict: SupplyPipelineResult["verdict"] =
    confluenceScore >= 80 ? "SEVERELY_CONSTRAINED" : confluenceScore >= 62 ? "CONSTRAINED"
    : confluenceScore >= 42 ? "BALANCED" : confluenceScore >= 25 ? "OVERSUPPLIED" : "GLUT";

  const estUnits = Math.round(input.completions + input.multifamilyDeliveryNext12mo);
  const supplyForecast = `Supply pipeline will deliver ~${estUnits.toLocaleString()} units in 12-18 months. `
    + `Starts-to-completion ratio of ${input.startsToCompletionRatio.toFixed(2)} indicates `
    + `${input.startsToCompletionRatio > 1 ? "a building pipeline" : "a draining pipeline"}.`;

  const floorPerSqft = Math.round(input.constructionCostIndex * 2.5);
  const costFloor = `Construction costs at index ${input.constructionCostIndex} `
    + `(${input.constructionCostYoY > 0 ? "+" : ""}${input.constructionCostYoY.toFixed(1)}% YoY) `
    + `create a replacement cost floor near $${floorPerSqft}/sqft — new builds below this are unprofitable.`;

  const multifamilyImpact = input.multifamilyDeliveryNext12mo > 0
    ? `${input.multifamilyDeliveryNext12mo.toLocaleString()} MF units delivering in 12mo with `
      + `${input.multifamilyAbsorptionRate.toFixed(0)}% absorption — `
      + `${input.multifamilyAbsorptionRate >= 70 ? "healthy demand absorbing supply" : "expect rent pressure from oversupply"}.`
    : "No significant multifamily delivery pipeline — rental supply stable.";

  const top2 = Object.entries(cs).sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 2).map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase().trim());

  const priceImplications: string[] = [];
  if (cs.permitSignal.score >= 70) priceImplications.push("Permit declines signal future supply shortage — upward price pressure in 12-18 months.");
  if (cs.costPressure.score >= 70) priceImplications.push("High construction costs create a rising price floor — existing homes benefit.");
  if (cs.multifamilyWave.score < 40) priceImplications.push("Large multifamily wave may soften rents and cap appreciation.");
  if (cs.constructionPipeline.score >= 65) priceImplications.push("Draining construction pipeline reduces competition from new inventory.");
  if (cs.supplyRemoval.score >= 60) priceImplications.push("Demolitions and conversions are removing supply — tightening the market.");
  if (priceImplications.length === 0) priceImplications.push("Supply is roughly balanced — prices follow demand-side dynamics.");

  const supplyRisks: string[] = [];
  if (input.entitledUnbuiltTrend === "growing") supplyRisks.push("Growing entitled-but-unbuilt lots could release a supply wave if financing loosens.");
  if (input.laborAvailability === "surplus") supplyRisks.push("Labor surplus could accelerate construction, easing constraints faster than expected.");
  if (input.startsToCompletionRatio > 1.3) supplyRisks.push(`High starts-to-completion ratio (${input.startsToCompletionRatio.toFixed(2)}) — large wave of completions coming.`);
  if (input.multifamilyAbsorptionRate < 50) supplyRisks.push("Low multifamily absorption — rent concessions and vacancy risk rising.");
  if (input.constructionCostYoY < -5) supplyRisks.push("Falling construction costs could unlock new supply if builders restart paused projects.");
  if (supplyRisks.length === 0) supplyRisks.push("No major supply risks identified — current trajectory appears stable.");

  let thesis: string;
  if (verdict === "SEVERELY_CONSTRAINED" || verdict === "CONSTRAINED") {
    thesis = `Supply confluence ${confluenceScore}/100 with ${agreement} agreement signals `
      + `${verdict === "SEVERELY_CONSTRAINED" ? "severe" : "meaningful"} constraint. `
      + `${top2[0]} and ${top2[1]} drive the tightest conditions. Permit trend is ${input.permitTrend}, `
      + `labor is ${input.laborAvailability.replace("_", " ")}, and costs are `
      + `${input.constructionCostYoY > 5 ? "surging" : input.constructionCostYoY > 0 ? "rising" : "falling"}. `
      + `Existing inventory benefits from limited new competition.`;
  } else if (verdict === "BALANCED") {
    thesis = `Supply confluence ${confluenceScore}/100 indicates balanced conditions. `
      + `${top2[0]} suggests constraint but offset by looser signals elsewhere. `
      + `Monitor permit trends and multifamily deliveries for directional shifts.`;
  } else {
    thesis = `Supply confluence ${confluenceScore}/100 signals ${verdict === "GLUT" ? "a supply glut" : "oversupply"}. `
      + `${agreement === "divergent" ? "Broadly loose signals" : "Mixed signals leaning bearish"} with `
      + `${input.permitTrend} permits and ${input.multifamilyDeliveryNext12mo.toLocaleString()} MF units incoming. `
      + `New supply will compete with existing inventory — expect price pressure.`;
  }

  return {
    confluenceScore, componentScores: cs, agreement, agreementDetail, verdict,
    supplyForecast, costFloor, multifamilyImpact, thesis, priceImplications, supplyRisks,
  };
}
