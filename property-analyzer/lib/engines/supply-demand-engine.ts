// ============================================================
// Dimension 7: Supply-Demand Dynamics Engine
// ============================================================

import type { SupplyDemandDynamics, DimensionScore } from "../types/market-intelligence";
import { buildTrendMetric, type TimeSeriesData } from "./demographic-engine";

export interface RawSupplyDemandData {
  monthsOfInventory: TimeSeriesData;
  daysOnMarket: TimeSeriesData;
  listToSaleRatio: TimeSeriesData;
  newConstruction: {
    unitsPlanned: number;
    unitsUnderConstruction: number;
    estimatedDeliveryMonths: number;
    monthlySalesRate: number;
  };
  rental: {
    vacancyRate: TimeSeriesData;
    rentGrowthRate: TimeSeriesData;
    medianRent: number;
    medianHomePrice: number;
  };
  affordability: {
    medianHomePrice: number;
    medianHouseholdIncome: number;
    currentMortgageRate: number;
  };
}

export function analyzeSupplyDemand(data: RawSupplyDemandData): SupplyDemandDynamics {
  // Affordability calculations — compute mortgage payment first (used by both rent-to-own and affordability)
  const monthlyIncome = data.affordability.medianHouseholdIncome / 12;
  const loanAmount = data.affordability.medianHomePrice * 0.80; // 20% down
  const monthlyRate = data.affordability.currentMortgageRate / 100 / 12;
  const n = 360;
  const monthlyPayment = monthlyRate > 0
    ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
    : loanAmount / n;

  // Rent-to-Own ratio: monthly rent / actual monthly PITI (mortgage + tax + insurance estimate)
  // Uses real mortgage payment at current rates instead of fixed /300 divisor.
  // > 1.0 = cheaper to rent; < 1.0 = cheaper to own
  const monthlyTaxInsurance = (data.affordability.medianHomePrice * 0.018) / 12; // ~1.8% annual (tax + insurance)
  const monthlyOwnershipCost = monthlyPayment + monthlyTaxInsurance;
  const rentToOwnRatio = monthlyOwnershipCost > 0
    ? data.rental.medianRent / monthlyOwnershipCost
    : 1.0;

  const priceToIncomeRatio = data.affordability.medianHouseholdIncome > 0
    ? data.affordability.medianHomePrice / data.affordability.medianHouseholdIncome
    : 0;
  const mortgageToIncomeRatio = monthlyIncome > 0 ? monthlyPayment / monthlyIncome : 0;

  // Affordability index: 100 = payment equals 25% of income
  // Uses 25% qualifying ratio per NAR Housing Affordability Index methodology.
  // Source: https://www.nar.realtor/research-and-statistics/housing-statistics/housing-affordability-index/methodology
  const affordabilityIndex = mortgageToIncomeRatio > 0 ? (0.25 / mortgageToIncomeRatio) * 100 : 100;

  let affordabilityTrend: "more_affordable" | "stable" | "less_affordable" = "stable";
  if (affordabilityIndex > 110) affordabilityTrend = "more_affordable";
  else if (affordabilityIndex < 80) affordabilityTrend = "less_affordable";

  // Absorption rate
  const monthsToAbsorb = data.newConstruction.monthlySalesRate > 0
    ? (data.newConstruction.unitsPlanned + data.newConstruction.unitsUnderConstruction) / data.newConstruction.monthlySalesRate
    : 0;

  // Market temperature
  const moi = data.monthsOfInventory.current;
  let marketTemperature: "cold" | "cool" | "balanced" | "warm" | "hot" = "balanced";
  if (moi < 2) marketTemperature = "hot";
  else if (moi < 3) marketTemperature = "warm";
  else if (moi < 5) marketTemperature = "balanced";
  else if (moi < 7) marketTemperature = "cool";
  else marketTemperature = "cold";

  return {
    monthsOfInventory: buildTrendMetric(
      data.monthsOfInventory.current,
      data.monthsOfInventory.oneYearAgo,
      data.monthsOfInventory.threeYearAgo,
      data.monthsOfInventory.fiveYearAgo
    ),
    daysOnMarket: buildTrendMetric(
      data.daysOnMarket.current,
      data.daysOnMarket.oneYearAgo,
      data.daysOnMarket.threeYearAgo,
      data.daysOnMarket.fiveYearAgo
    ),
    listToSaleRatio: buildTrendMetric(
      data.listToSaleRatio.current,
      data.listToSaleRatio.oneYearAgo,
      data.listToSaleRatio.threeYearAgo,
      data.listToSaleRatio.fiveYearAgo
    ),
    newConstructionPipeline: {
      unitsPlanned: data.newConstruction.unitsPlanned,
      unitsUnderConstruction: data.newConstruction.unitsUnderConstruction,
      estimatedDeliveryMonths: data.newConstruction.estimatedDeliveryMonths,
      absorptionRate: data.newConstruction.monthlySalesRate,
      monthsToAbsorb: Math.round(monthsToAbsorb * 10) / 10,
    },
    rentalMarket: {
      vacancyRate: buildTrendMetric(
        data.rental.vacancyRate.current,
        data.rental.vacancyRate.oneYearAgo,
        data.rental.vacancyRate.threeYearAgo,
        data.rental.vacancyRate.fiveYearAgo
      ),
      rentGrowthRate: buildTrendMetric(
        data.rental.rentGrowthRate.current,
        data.rental.rentGrowthRate.oneYearAgo,
        data.rental.rentGrowthRate.threeYearAgo,
        data.rental.rentGrowthRate.fiveYearAgo
      ),
      rentToOwnRatio: Math.round(rentToOwnRatio * 100) / 100,
    },
    affordability: {
      priceToIncomeRatio: Math.round(priceToIncomeRatio * 100) / 100,
      mortgagePaymentToIncomeRatio: Math.round(mortgageToIncomeRatio * 100) / 100,
      affordabilityIndex: Math.round(affordabilityIndex),
      trend: affordabilityTrend,
    },
    marketTemperature,
  };
}

export function scoreSupplyDemand(sd: SupplyDemandDynamics): DimensionScore {
  let score = 50;
  const keyFactors: string[] = [];

  // Market temperature
  if (sd.marketTemperature === "hot") {
    score += 10;
    keyFactors.push("Hot market (< 2 months inventory)");
  } else if (sd.marketTemperature === "warm") {
    score += 5;
  } else if (sd.marketTemperature === "cold") {
    score -= 5;
    keyFactors.push("Cold market (7+ months inventory)");
  }

  // Days on market trend (decreasing = strengthening)
  if (sd.daysOnMarket.trend === "declining") {
    score += 10;
    keyFactors.push("Days on market declining (demand increasing)");
  } else if (sd.daysOnMarket.trend === "accelerating") {
    score -= 5;
    keyFactors.push("Days on market increasing (demand softening)");
  }

  // List-to-sale ratio
  if (sd.listToSaleRatio.current > 1.0) {
    score += 5;
    keyFactors.push(`Properties selling above list (${(sd.listToSaleRatio.current * 100).toFixed(1)}%)`);
  } else if (sd.listToSaleRatio.current < 0.95) {
    score += 5; // Buyer leverage
    keyFactors.push("Room to negotiate below list price");
  }

  // Rent growth (strong signal for investors)
  const rentGrowth = sd.rentalMarket.rentGrowthRate;
  if (rentGrowth.threeYearCAGR > 5) {
    score += 15;
    keyFactors.push(`Strong rent growth: ${rentGrowth.threeYearCAGR.toFixed(1)}% CAGR`);
  } else if (rentGrowth.threeYearCAGR > 3) {
    score += 8;
    keyFactors.push(`Healthy rent growth: ${rentGrowth.threeYearCAGR.toFixed(1)}% CAGR`);
  } else if (rentGrowth.threeYearCAGR < 0) {
    score -= 10;
    keyFactors.push("Rents declining");
  }

  // Rental vacancy
  if (sd.rentalMarket.vacancyRate.current < 4) {
    score += 10;
    keyFactors.push(`Tight rental market: ${sd.rentalMarket.vacancyRate.current}% vacancy`);
  } else if (sd.rentalMarket.vacancyRate.current > 8) {
    score -= 10;
    keyFactors.push(`High rental vacancy: ${sd.rentalMarket.vacancyRate.current}%`);
  }

  // New construction pipeline risk
  if (sd.newConstructionPipeline.monthsToAbsorb > 24) {
    score -= 10;
    keyFactors.push("Large construction pipeline (supply risk)");
  }

  // Affordability
  if (sd.affordability.priceToIncomeRatio > 6) {
    score -= 5;
    keyFactors.push(`Stretched affordability: ${sd.affordability.priceToIncomeRatio}x price-to-income`);
  } else if (sd.affordability.priceToIncomeRatio < 3.5) {
    score += 5;
    keyFactors.push("Affordable market relative to incomes");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    weight: 0.15,
    weightedScore: score * 0.15,
    keyFactors,
    dataCompleteness: 80,
  };
}
