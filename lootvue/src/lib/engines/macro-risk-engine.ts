// ============================================================
// Dimension 8: Macro & Risk Factors Engine
// ============================================================

import type { MacroRiskFactors, DimensionScore } from "../types/market-intelligence";
import { buildTrendMetric, type TimeSeriesData } from "./demographic-engine";
import { calculateMortgagePayment } from "./financial-engine";

export interface RawMacroRiskData {
  interestRate: {
    current: number;
    forecastDirection: "rising" | "stable" | "falling";
    loanAmount: number;
    loanTermYears: number;
  };
  propertyTax: {
    currentRate: number;
    assessmentHistory: TimeSeriesData;
  };
  insurance: {
    floodZone: boolean;
    floodZoneType?: string;
    wildfireRisk: "low" | "moderate" | "high" | "extreme";
    hurricaneRisk: "low" | "moderate" | "high";
    earthquakeRisk: "low" | "moderate" | "high";
    insuranceCostHistory: TimeSeriesData;
  };
  climate: {
    overallScore: number;
    heatRisk: "low" | "moderate" | "high";
    seaLevelRisk: "none" | "low" | "moderate" | "high";
    droughtRisk: "low" | "moderate" | "high";
  };
  regulatory: {
    rentControlActive: boolean;
    rentControlProposed: boolean;
    evictionMoratoriumHistory: boolean;
    landlordFriendlinessScore: number;
  };
  marketCyclePosition: MacroRiskFactors["marketCyclePosition"];
}

export function analyzeMacroRisk(data: RawMacroRiskData): MacroRiskFactors {
  // Calculate payment impact per 1% rate change
  const currentPayment = calculateMortgagePayment(
    data.interestRate.loanAmount,
    data.interestRate.current,
    data.interestRate.loanTermYears
  );
  const higherPayment = calculateMortgagePayment(
    data.interestRate.loanAmount,
    data.interestRate.current + 1,
    data.interestRate.loanTermYears
  );
  const paymentImpactPer1Pct = higherPayment - currentPayment;

  let buyerPoolImpact: "expanding" | "stable" | "shrinking" = "stable";
  if (data.interestRate.forecastDirection === "falling") buyerPoolImpact = "expanding";
  else if (data.interestRate.forecastDirection === "rising") buyerPoolImpact = "shrinking";

  // Reassessment risk
  const assessmentGrowth = data.propertyTax.assessmentHistory.current > 0
    ? ((data.propertyTax.assessmentHistory.current - data.propertyTax.assessmentHistory.threeYearAgo) / data.propertyTax.assessmentHistory.threeYearAgo) * 100
    : 0;
  let reassessmentRisk: "low" | "moderate" | "high" = "low";
  if (assessmentGrowth > 20) reassessmentRisk = "high";
  else if (assessmentGrowth > 10) reassessmentRisk = "moderate";

  return {
    interestRateSensitivity: {
      currentRate: data.interestRate.current,
      forecastDirection: data.interestRate.forecastDirection,
      paymentImpactPer1Pct,
      buyerPoolImpact,
    },
    propertyTaxTrajectory: {
      currentRate: data.propertyTax.currentRate,
      assessmentTrend: buildTrendMetric(
        data.propertyTax.assessmentHistory.current,
        data.propertyTax.assessmentHistory.oneYearAgo,
        data.propertyTax.assessmentHistory.threeYearAgo,
        data.propertyTax.assessmentHistory.fiveYearAgo
      ),
      reassessmentRisk,
    },
    insuranceRisk: {
      floodZone: data.insurance.floodZone,
      floodZoneType: data.insurance.floodZoneType,
      wildfireRisk: data.insurance.wildfireRisk,
      hurricaneRisk: data.insurance.hurricaneRisk,
      earthquakeRisk: data.insurance.earthquakeRisk,
      insuranceCostTrend: buildTrendMetric(
        data.insurance.insuranceCostHistory.current,
        data.insurance.insuranceCostHistory.oneYearAgo,
        data.insurance.insuranceCostHistory.threeYearAgo,
        data.insurance.insuranceCostHistory.fiveYearAgo
      ),
    },
    climateRisk: data.climate,
    regulatoryRisk: data.regulatory,
    marketCyclePosition: data.marketCyclePosition,
  };
}

export function scoreMacroRisk(macro: MacroRiskFactors): DimensionScore {
  // This dimension is scored INVERSELY: higher score = LESS risk
  let score = 70; // Start optimistic, deduct for risks
  const keyFactors: string[] = [];

  // Interest rate direction
  if (macro.interestRateSensitivity.forecastDirection === "falling") {
    score += 10;
    keyFactors.push("Rates forecast falling (tailwind)");
  } else if (macro.interestRateSensitivity.forecastDirection === "rising") {
    score -= 15;
    keyFactors.push(`Rates rising (+$${macro.interestRateSensitivity.paymentImpactPer1Pct}/mo per 1%)`);
  }

  // Flood zone
  if (macro.insuranceRisk.floodZone) {
    score -= 15;
    keyFactors.push("Property in flood zone");
  }

  // Wildfire/hurricane risk
  if (macro.insuranceRisk.wildfireRisk === "extreme") {
    score -= 20;
    keyFactors.push("Extreme wildfire risk");
  } else if (macro.insuranceRisk.wildfireRisk === "high") {
    score -= 10;
    keyFactors.push("High wildfire risk");
  }

  if (macro.insuranceRisk.hurricaneRisk === "high") {
    score -= 10;
    keyFactors.push("High hurricane risk");
  }

  // Climate risk
  if (macro.climateRisk.overallScore > 70) {
    score -= 10;
    keyFactors.push("Elevated long-term climate risk");
  } else if (macro.climateRisk.overallScore < 30) {
    score += 5;
    keyFactors.push("Low climate risk");
  }

  // Regulatory
  if (macro.regulatoryRisk.rentControlActive) {
    score -= 15;
    keyFactors.push("Active rent control in effect");
  } else if (macro.regulatoryRisk.rentControlProposed) {
    score -= 5;
    keyFactors.push("Rent control legislation proposed");
  }

  if (macro.regulatoryRisk.landlordFriendlinessScore > 70) {
    score += 5;
    keyFactors.push("Landlord-friendly regulatory environment");
  } else if (macro.regulatoryRisk.landlordFriendlinessScore < 30) {
    score -= 10;
    keyFactors.push("Landlord-unfriendly regulatory environment");
  }

  // Market cycle
  if (macro.marketCyclePosition === "early_expansion" || macro.marketCyclePosition === "recovery") {
    score += 10;
    keyFactors.push(`Market cycle: ${macro.marketCyclePosition.replace("_", " ")}`);
  } else if (macro.marketCyclePosition === "peak" || macro.marketCyclePosition === "late_expansion") {
    score -= 10;
    keyFactors.push(`Market cycle: ${macro.marketCyclePosition.replace("_", " ")} (caution)`);
  }

  // Property tax trajectory
  if (macro.propertyTaxTrajectory.reassessmentRisk === "high") {
    score -= 5;
    keyFactors.push("High property tax reassessment risk");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    weight: 0.05,
    weightedScore: score * 0.05,
    keyFactors,
    dataCompleteness: 70,
  };
}
