// ============================================================
// Dimension 4: Economic Engine
// ============================================================

import type { EconomicEngine, MajorEmployer, DimensionScore } from "../types/market-intelligence";
import { buildTrendMetric, type TimeSeriesData } from "./demographic-engine";

export interface RawEconomicData {
  jobGrowth: TimeSeriesData;
  unemployment: TimeSeriesData;
  wageGrowth: TimeSeriesData;
  costOfLivingIndex: number;
  costOfLivingGrowthRate: number;
  businessPermits: TimeSeriesData;
  metroGDP: TimeSeriesData;
  majorEmployers: MajorEmployer[];
  industries: { name: string; pctEmployment: number }[];
}

/**
 * Calculate Herfindahl-Hirschman Index for industry concentration
 * Lower = more diversified (good). Scale: 0-1
 */
export function calculateHerfindahlIndex(industries: { pctEmployment: number }[]): number {
  return industries.reduce((sum, ind) => {
    const share = ind.pctEmployment / 100;
    return sum + share * share;
  }, 0);
}

export function analyzeEconomy(data: RawEconomicData): EconomicEngine {
  const hhi = calculateHerfindahlIndex(data.industries);

  let singleEmployerRisk: "low" | "moderate" | "high" = "low";
  if (hhi > 0.25) singleEmployerRisk = "high";
  else if (hhi > 0.15) singleEmployerRisk = "moderate";

  const wageToCoLRatio = data.costOfLivingGrowthRate > 0
    ? data.wageGrowth.current / data.costOfLivingGrowthRate
    : data.wageGrowth.current > 0 ? 2.0 : 1.0;

  return {
    jobGrowthRate: buildTrendMetric(
      data.jobGrowth.current,
      data.jobGrowth.oneYearAgo,
      data.jobGrowth.threeYearAgo,
      data.jobGrowth.fiveYearAgo,
      data.jobGrowth.nationalAvg
    ),
    unemploymentRate: buildTrendMetric(
      data.unemployment.current,
      data.unemployment.oneYearAgo,
      data.unemployment.threeYearAgo,
      data.unemployment.fiveYearAgo,
      data.unemployment.nationalAvg
    ),
    wageGrowth: buildTrendMetric(
      data.wageGrowth.current,
      data.wageGrowth.oneYearAgo,
      data.wageGrowth.threeYearAgo,
      data.wageGrowth.fiveYearAgo,
      data.wageGrowth.nationalAvg
    ),
    costOfLivingIndex: data.costOfLivingIndex,
    wageToCoLRatio,
    majorEmployers: data.majorEmployers,
    industryDiversification: {
      herfindahlIndex: Math.round(hhi * 1000) / 1000,
      topIndustries: data.industries.slice(0, 5),
      singleEmployerRisk,
    },
    businessPermitTrend: buildTrendMetric(
      data.businessPermits.current,
      data.businessPermits.oneYearAgo,
      data.businessPermits.threeYearAgo,
      data.businessPermits.fiveYearAgo
    ),
    gdpGrowthRate: buildTrendMetric(
      data.metroGDP.current,
      data.metroGDP.oneYearAgo,
      data.metroGDP.threeYearAgo,
      data.metroGDP.fiveYearAgo,
      data.metroGDP.nationalAvg
    ),
  };
}

export function scoreEconomy(economy: EconomicEngine): DimensionScore {
  let score = 50;
  const keyFactors: string[] = [];

  // Job growth (20 points)
  const jobs = economy.jobGrowthRate;
  if (jobs.threeYearCAGR > 3.0) {
    score += 20;
    keyFactors.push(`Strong job growth: ${jobs.threeYearCAGR.toFixed(1)}% CAGR`);
  } else if (jobs.threeYearCAGR > 1.5) {
    score += 12;
    keyFactors.push(`Solid job growth: ${jobs.threeYearCAGR.toFixed(1)}% CAGR`);
  } else if (jobs.threeYearCAGR > 0) {
    score += 5;
  } else {
    score -= 15;
    keyFactors.push(`Job losses: ${jobs.threeYearCAGR.toFixed(1)}% CAGR`);
  }

  // Unemployment (10 points)
  if (economy.unemploymentRate.current < 3.5) {
    score += 10;
    keyFactors.push(`Low unemployment: ${economy.unemploymentRate.current}%`);
  } else if (economy.unemploymentRate.current < 5.0) {
    score += 5;
  } else if (economy.unemploymentRate.current > 7.0) {
    score -= 15;
    keyFactors.push(`High unemployment: ${economy.unemploymentRate.current}%`);
  }

  // Wage growth vs cost of living (10 points)
  if (economy.wageToCoLRatio > 1.5) {
    score += 10;
    keyFactors.push("Wages outpacing cost of living");
  } else if (economy.wageToCoLRatio < 0.8) {
    score -= 10;
    keyFactors.push("Cost of living outpacing wages");
  }

  // Industry diversification (5 points)
  if (economy.industryDiversification.singleEmployerRisk === "high") {
    score -= 10;
    keyFactors.push("High single-employer concentration risk");
  } else if (economy.industryDiversification.singleEmployerRisk === "low") {
    score += 5;
    keyFactors.push("Well-diversified economy");
  }

  // Major employer events (10 points)
  const expansions = economy.majorEmployers.filter(e => e.recentEvent === "expanding" || e.recentEvent === "relocating_in");
  const departures = economy.majorEmployers.filter(e => e.recentEvent === "relocating_out" || e.recentEvent === "layoffs");

  if (expansions.length > 0) {
    score += Math.min(10, expansions.length * 5);
    keyFactors.push(`${expansions.length} major employer(s) expanding/relocating in`);
  }
  if (departures.length > 0) {
    score -= Math.min(15, departures.length * 5);
    keyFactors.push(`${departures.length} major employer(s) leaving/downsizing`);
  }

  // Business permits trend (5 points)
  if (economy.businessPermitTrend.trend === "accelerating") {
    score += 5;
    keyFactors.push("Business permit applications accelerating");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    weight: 0.15,
    weightedScore: score * 0.15,
    keyFactors,
    dataCompleteness: 85,
  };
}
