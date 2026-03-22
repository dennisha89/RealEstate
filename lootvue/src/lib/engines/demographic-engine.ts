// ============================================================
// Dimension 3: Demographic Velocity Engine
// ============================================================

import type { DemographicVelocity, TrendMetric, ProfessionalInflux, DimensionScore } from "../types/market-intelligence";

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 */
export function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Determine trend direction from growth rates
 */
export function determineTrend(
  oneYearChange: number,
  threeYearCAGR: number,
  fiveYearCAGR: number
): "accelerating" | "stable" | "decelerating" | "declining" {
  if (oneYearChange < 0 && threeYearCAGR < 0) return "declining";
  if (oneYearChange > threeYearCAGR && threeYearCAGR > 0) return "accelerating";
  if (oneYearChange < threeYearCAGR * 0.5 && threeYearCAGR > 0) return "decelerating";
  return "stable";
}

/**
 * Build a TrendMetric from time-series data points
 */
export function buildTrendMetric(
  current: number,
  oneYearAgo: number,
  threeYearAgo: number,
  fiveYearAgo: number,
  nationalAverage?: number
): TrendMetric {
  const oneYearChange = oneYearAgo > 0
    ? ((current - oneYearAgo) / oneYearAgo) * 100
    : 0;
  const threeYearCAGR = calculateCAGR(threeYearAgo, current, 3);
  const fiveYearCAGR = calculateCAGR(fiveYearAgo, current, 5);
  const trend = determineTrend(oneYearChange, threeYearCAGR, fiveYearCAGR);

  // Percentile vs national (0 = worst, 50 = average, 100 = best)
  let percentile = 50;
  if (nationalAverage && nationalAverage > 0) {
    const ratio = current / nationalAverage;
    percentile = Math.max(0, Math.min(100, Math.round(ratio * 50)));
  }

  return {
    current,
    oneYearAgo,
    threeYearAgo,
    fiveYearAgo,
    oneYearChange: Math.round(oneYearChange * 100) / 100,
    threeYearCAGR: Math.round(threeYearCAGR * 100) / 100,
    fiveYearCAGR: Math.round(fiveYearCAGR * 100) / 100,
    trend,
    percentile,
  };
}

/**
 * Analyze demographics for a market area (zip code / metro)
 * In production, this pulls from Census ACS, IRS SOI, BLS data.
 */
export function analyzeDemographics(data: RawDemographicData): DemographicVelocity {
  return {
    populationGrowth: buildTrendMetric(
      data.population.current,
      data.population.oneYearAgo,
      data.population.threeYearAgo,
      data.population.fiveYearAgo,
      data.population.nationalAvg
    ),
    medianHouseholdIncome: buildTrendMetric(
      data.medianIncome.current,
      data.medianIncome.oneYearAgo,
      data.medianIncome.threeYearAgo,
      data.medianIncome.fiveYearAgo,
      data.medianIncome.nationalAvg
    ),
    netMigration: buildTrendMetric(
      data.netMigration.current,
      data.netMigration.oneYearAgo,
      data.netMigration.threeYearAgo,
      data.netMigration.fiveYearAgo
    ),
    professionalInflux: {
      doctorsPerCapita: buildTrendMetric(
        data.professionals.doctors.current,
        data.professionals.doctors.oneYearAgo,
        data.professionals.doctors.threeYearAgo,
        data.professionals.doctors.fiveYearAgo
      ),
      engineersPerCapita: buildTrendMetric(
        data.professionals.engineers.current,
        data.professionals.engineers.oneYearAgo,
        data.professionals.engineers.threeYearAgo,
        data.professionals.engineers.fiveYearAgo
      ),
      techWorkersPerCapita: buildTrendMetric(
        data.professionals.tech.current,
        data.professionals.tech.oneYearAgo,
        data.professionals.tech.threeYearAgo,
        data.professionals.tech.fiveYearAgo
      ),
      highIncomeHouseholdsPct: buildTrendMetric(
        data.professionals.highIncome.current,
        data.professionals.highIncome.oneYearAgo,
        data.professionals.highIncome.threeYearAgo,
        data.professionals.highIncome.fiveYearAgo
      ),
    },
    educationLevelShift: {
      bachelorsPct: buildTrendMetric(
        data.education.bachelors.current,
        data.education.bachelors.oneYearAgo,
        data.education.bachelors.threeYearAgo,
        data.education.bachelors.fiveYearAgo,
        data.education.bachelors.nationalAvg
      ),
      graduatePct: buildTrendMetric(
        data.education.graduate.current,
        data.education.graduate.oneYearAgo,
        data.education.graduate.threeYearAgo,
        data.education.graduate.fiveYearAgo,
        data.education.graduate.nationalAvg
      ),
    },
    ageCohorts: {
      millennials25to39Pct: buildTrendMetric(
        data.ageCohorts.millennials.current,
        data.ageCohorts.millennials.oneYearAgo,
        data.ageCohorts.millennials.threeYearAgo,
        data.ageCohorts.millennials.fiveYearAgo
      ),
      youngFamiliesPct: buildTrendMetric(
        data.ageCohorts.youngFamilies.current,
        data.ageCohorts.youngFamilies.oneYearAgo,
        data.ageCohorts.youngFamilies.threeYearAgo,
        data.ageCohorts.youngFamilies.fiveYearAgo
      ),
      retireesPct: buildTrendMetric(
        data.ageCohorts.retirees.current,
        data.ageCohorts.retirees.oneYearAgo,
        data.ageCohorts.retirees.threeYearAgo,
        data.ageCohorts.retirees.fiveYearAgo
      ),
    },
    householdFormationRate: buildTrendMetric(
      data.householdFormation.current,
      data.householdFormation.oneYearAgo,
      data.householdFormation.threeYearAgo,
      data.householdFormation.fiveYearAgo
    ),
  };
}

export function scoreDemographics(demographics: DemographicVelocity): DimensionScore {
  let score = 50;
  const keyFactors: string[] = [];

  // Population growth (20 points)
  const popGrowth = demographics.populationGrowth;
  if (popGrowth.threeYearCAGR > 2.0) {
    score += 20;
    keyFactors.push(`Rapid population growth: ${popGrowth.threeYearCAGR.toFixed(1)}% CAGR`);
  } else if (popGrowth.threeYearCAGR > 1.0) {
    score += 12;
    keyFactors.push(`Solid population growth: ${popGrowth.threeYearCAGR.toFixed(1)}% CAGR`);
  } else if (popGrowth.threeYearCAGR > 0.5) {
    score += 5;
  } else if (popGrowth.threeYearCAGR < 0) {
    score -= 15;
    keyFactors.push(`Population declining: ${popGrowth.threeYearCAGR.toFixed(1)}% CAGR`);
  }

  // Income growth (15 points)
  const incomeGrowth = demographics.medianHouseholdIncome;
  if (incomeGrowth.threeYearCAGR > 5.0) {
    score += 15;
    keyFactors.push(`Strong income growth: ${incomeGrowth.threeYearCAGR.toFixed(1)}% CAGR`);
  } else if (incomeGrowth.threeYearCAGR > 3.0) {
    score += 8;
  } else if (incomeGrowth.threeYearCAGR < 0) {
    score -= 10;
    keyFactors.push(`Declining incomes`);
  }

  // Net migration (10 points)
  if (demographics.netMigration.trend === "accelerating" && demographics.netMigration.current > 0) {
    score += 10;
    keyFactors.push("Accelerating net in-migration");
  } else if (demographics.netMigration.current > 0) {
    score += 5;
  } else if (demographics.netMigration.current < 0) {
    score -= 10;
    keyFactors.push("Net out-migration (people leaving)");
  }

  // Professional influx (10 points)
  const highIncome = demographics.professionalInflux.highIncomeHouseholdsPct;
  if (highIncome.trend === "accelerating") {
    score += 10;
    keyFactors.push("High-income households increasing rapidly");
  } else if (highIncome.oneYearChange > 2) {
    score += 5;
    keyFactors.push("High-income households growing");
  }

  // Doctors moving in specifically
  const docs = demographics.professionalInflux.doctorsPerCapita;
  if (docs.oneYearChange > 3) {
    score += 5;
    keyFactors.push(`Doctor density up ${docs.oneYearChange.toFixed(1)}% YoY`);
  }

  // Education level shifts
  const education = demographics.educationLevelShift.bachelorsPct;
  if (education.trend === "accelerating") {
    score += 5;
    keyFactors.push("Rising education levels (gentrification signal)");
  }

  // Millennial influx
  const millennials = demographics.ageCohorts.millennials25to39Pct;
  if (millennials.oneYearChange > 1) {
    score += 5;
    keyFactors.push("Young professionals moving in");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    weight: 0.15,
    weightedScore: score * 0.15,
    keyFactors,
    dataCompleteness: 80, // Census data is periodic
  };
}

// --- Raw data input type (what data providers return) ---
export interface RawDemographicData {
  population: TimeSeriesData;
  medianIncome: TimeSeriesData;
  netMigration: TimeSeriesData;
  professionals: {
    doctors: TimeSeriesData;
    engineers: TimeSeriesData;
    tech: TimeSeriesData;
    highIncome: TimeSeriesData;
  };
  education: {
    bachelors: TimeSeriesData;
    graduate: TimeSeriesData;
  };
  ageCohorts: {
    millennials: TimeSeriesData;
    youngFamilies: TimeSeriesData;
    retirees: TimeSeriesData;
  };
  householdFormation: TimeSeriesData;
}

export interface TimeSeriesData {
  current: number;
  oneYearAgo: number;
  threeYearAgo: number;
  fiveYearAgo: number;
  nationalAvg?: number;
}
