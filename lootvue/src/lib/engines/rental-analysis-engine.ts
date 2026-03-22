// ============================================================
// Rental Analysis Engine
// Deep rental market analysis at address, street, zip, and
// state level with fine-grained breakdowns.
// ============================================================

import type { TrendMetric } from "../types/market-intelligence";
import { buildTrendMetric, type TimeSeriesData } from "./demographic-engine";

// --- Types ---

export interface RentalAnalysis {
  scope: RentalScope;
  rentEstimate: RentEstimate;
  comparableRentals: ComparableRental[];
  marketMetrics: RentalMarketMetrics;
  breakdown: RentalBreakdown;
  seasonality: RentalSeasonality;
  tenantDemographics: TenantDemographics;
  regulatoryEnvironment: RentalRegulations;
  investorMetrics: RentalInvestorMetrics;
  historicalRents: HistoricalRentData[];
}

export interface RentalScope {
  type: "address" | "street" | "zip" | "city" | "state";
  address?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  state?: string;
}

export interface RentEstimate {
  low: number;
  mid: number;
  high: number;
  confidence: number; // 0-100
  methodology: string;
  adjustments: RentAdjustment[];
  pricePerSqft: { low: number; mid: number; high: number };
}

export interface RentAdjustment {
  factor: string;
  description: string;
  dollarImpact: number;
  direction: "increase" | "decrease";
}

export interface ComparableRental {
  address: string;
  rent: number;
  sqft: number;
  rentPerSqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  distance: number; // miles
  daysOnMarket: number;
  listDate: string;
  amenities: string[];
  petPolicy: string;
  parkingIncluded: boolean;
  utilitiesIncluded: string[];
  similarity: number; // 0-100
}

export interface RentalMarketMetrics {
  medianRent: TrendMetric;
  averageRent: TrendMetric;
  rentPerSqft: TrendMetric;
  vacancyRate: TrendMetric;
  daysToLease: TrendMetric; // avg days to find tenant
  applicationVolume: TrendMetric; // apps per listing
  renewalRate: TrendMetric; // % of tenants renewing
  rentToIncomeRatio: number; // avg rent / avg income
  affordabilityThreshold: number; // max rent at 30% of median income

  byBedroom: {
    studio: { medianRent: number; vacancyRate: number; rentGrowthYoY: number };
    oneBed: { medianRent: number; vacancyRate: number; rentGrowthYoY: number };
    twoBed: { medianRent: number; vacancyRate: number; rentGrowthYoY: number };
    threeBed: { medianRent: number; vacancyRate: number; rentGrowthYoY: number };
    fourPlusBed: { medianRent: number; vacancyRate: number; rentGrowthYoY: number };
  };

  byPropertyType: {
    singleFamily: { medianRent: number; pctOfMarket: number; rentGrowthYoY: number };
    apartment: { medianRent: number; pctOfMarket: number; rentGrowthYoY: number };
    condo: { medianRent: number; pctOfMarket: number; rentGrowthYoY: number };
    townhouse: { medianRent: number; pctOfMarket: number; rentGrowthYoY: number };
    duplex: { medianRent: number; pctOfMarket: number; rentGrowthYoY: number };
  };
}

export interface RentalBreakdown {
  /** What tenants are paying at different price points */
  distribution: {
    under1000: number; // % of rentals
    range1000to1500: number;
    range1500to2000: number;
    range2000to2500: number;
    range2500to3000: number;
    over3000: number;
  };

  /** Amenity premiums - how much each amenity adds to rent */
  amenityPremiums: {
    amenity: string;
    avgPremium: number;
    pctOfListingsWithAmenity: number;
  }[];

  /** Location premiums within the zip */
  locationPremiums: {
    subArea: string;
    premiumVsZipMedian: number; // % above/below
    reasoning: string;
  }[];

  /** Condition/age adjustment */
  conditionAdjustments: {
    newConstruction: number; // % premium vs avg
    recentlyRenovated: number;
    averageCondition: number;
    needsWork: number; // % discount
  };

  /** Furnished vs unfurnished */
  furnishedPremium: number; // % premium

  /** Short-term rental potential */
  shortTermRental: {
    estimatedNightlyRate: number;
    estimatedOccupancy: number;
    estimatedMonthlyRevenue: number;
    vsLongTermRent: number; // % difference
    regulatoryAllowed: boolean;
    permitRequired: boolean;
    competingListings: number;
  };
}

export interface RentalSeasonality {
  /** Monthly rent index (100 = annual avg) */
  monthlyIndex: { month: string; index: number; vacancyRate: number }[];
  bestMonthToList: string;
  worstMonthToList: string;
  peakRentPremium: number; // % above annual avg
  troughDiscount: number; // % below annual avg
  peakMoveInMonth: string;
  leastCompetitiveMonth: string;
}

export interface TenantDemographics {
  renterPct: number; // % of households that rent
  avgAge: number;
  avgHouseholdSize: number;
  avgIncome: number;
  avgCreditScore: number;
  avgLengthOfStay: number; // months
  topEmployers: string[];
  studentPct: number;
  militaryPct: number;
  section8Pct: number;
  petOwnerPct: number;
  evictionRate: number;
  avgDaysDelinquent: number;
}

export interface RentalRegulations {
  rentControlActive: boolean;
  maxAnnualIncrease?: number; // %
  justCauseEviction: boolean;
  relocationAssistanceRequired: boolean;
  shortTermRentalRestrictions: string;
  securityDepositLimit?: number; // months of rent
  requiredDisclosures: string[];
  landlordLicenseRequired: boolean;
  inspectionRequired: boolean;
  leadPaintDisclosure: boolean;
  bedbugDisclosure: boolean;
  habitabilityStandards: string;
}

export interface RentalInvestorMetrics {
  grossYield: number; // annual rent / property value
  netYield: number; // after expenses
  priceToRentRatio: number; // property price / annual rent
  breakEvenRent: number; // minimum rent to cover PITI + expenses
  cashFlowAtMarketRent: number;
  rentCoverageRatio: number; // rent / (PITI + expenses)
  timeToBreakEven: number; // months to recoup vacancy/turnover costs
  avgTurnoverCost: number; // cost per tenant turnover
  annualTurnoverRate: number;
  effectiveGrossIncome: number; // after vacancy
  operatingExpenseRatio: number; // expenses / gross income
}

export interface HistoricalRentData {
  date: string; // YYYY-MM
  medianRent: number;
  avgRent: number;
  vacancyRate: number;
  inventory: number; // available rentals
  yoyChange: number;
}

// --- Analysis Functions ---

/**
 * Estimate rent for a specific property based on comps and adjustments
 */
export function estimateRent(
  property: {
    sqft: number;
    bedrooms: number;
    bathrooms: number;
    yearBuilt: number;
    condition?: "new" | "renovated" | "average" | "needs_work";
    amenities?: string[];
    parking?: boolean;
    petFriendly?: boolean;
  },
  comps: ComparableRental[],
  marketMetrics: RentalMarketMetrics
): RentEstimate {
  if (comps.length === 0) {
    // Fall back to market metrics
    const bedroomKey = property.bedrooms <= 0 ? "studio"
      : property.bedrooms === 1 ? "oneBed"
      : property.bedrooms === 2 ? "twoBed"
      : property.bedrooms === 3 ? "threeBed"
      : "fourPlusBed";

    const baseRent = marketMetrics.byBedroom[bedroomKey].medianRent;
    return {
      low: Math.round(baseRent * 0.9),
      mid: Math.round(baseRent),
      high: Math.round(baseRent * 1.1),
      confidence: 40,
      methodology: "Market median by bedroom count (no comparable rentals found)",
      adjustments: [],
      pricePerSqft: {
        low: property.sqft > 0 ? Math.round((baseRent * 0.9) / property.sqft * 100) / 100 : 0,
        mid: property.sqft > 0 ? Math.round(baseRent / property.sqft * 100) / 100 : 0,
        high: property.sqft > 0 ? Math.round((baseRent * 1.1) / property.sqft * 100) / 100 : 0,
      },
    };
  }

  // Weighted average of comps (weight by similarity)
  const totalWeight = comps.reduce((s, c) => s + c.similarity, 0);
  const weightedRent = totalWeight > 0
    ? comps.reduce((s, c) => s + c.rent * c.similarity, 0) / totalWeight
    : comps.reduce((s, c) => s + c.rent, 0) / comps.length;

  // Apply adjustments
  const adjustments: RentAdjustment[] = [];

  // Sqft adjustment
  const avgCompSqft = comps.reduce((s, c) => s + c.sqft, 0) / comps.length;
  const sqftDiff = property.sqft - avgCompSqft;
  if (Math.abs(sqftDiff) > 100) {
    const sqftAdj = Math.round(sqftDiff * (marketMetrics.rentPerSqft.current / 2));
    adjustments.push({
      factor: "Square footage",
      description: `${sqftDiff > 0 ? "Larger" : "Smaller"} than avg comp by ${Math.abs(sqftDiff)} sqft`,
      dollarImpact: sqftAdj,
      direction: sqftDiff > 0 ? "increase" : "decrease",
    });
  }

  // Age/condition adjustment
  const avgCompAge = new Date().getFullYear() - (comps.reduce((s, c) => s + c.yearBuilt, 0) / comps.length);
  const propertyAge = new Date().getFullYear() - property.yearBuilt;
  const ageDiff = avgCompAge - propertyAge;
  if (Math.abs(ageDiff) > 5) {
    const ageAdj = Math.round(ageDiff * 5); // ~$5/mo per year newer
    adjustments.push({
      factor: "Property age",
      description: `${ageDiff > 0 ? "Newer" : "Older"} than avg comp by ${Math.abs(Math.round(ageDiff))} years`,
      dollarImpact: ageAdj,
      direction: ageDiff > 0 ? "increase" : "decrease",
    });
  }

  // Condition adjustment
  if (property.condition === "new" || property.condition === "renovated") {
    const condAdj = Math.round(weightedRent * 0.08);
    adjustments.push({
      factor: "Condition",
      description: `${property.condition} condition premium`,
      dollarImpact: condAdj,
      direction: "increase",
    });
  } else if (property.condition === "needs_work") {
    const condAdj = Math.round(weightedRent * -0.10);
    adjustments.push({
      factor: "Condition",
      description: "Below average condition discount",
      dollarImpact: Math.abs(condAdj),
      direction: "decrease",
    });
  }

  // Parking adjustment
  if (property.parking) {
    const parkComps = comps.filter(c => c.parkingIncluded);
    if (parkComps.length < comps.length / 2) {
      adjustments.push({
        factor: "Parking",
        description: "Parking included (less common in area)",
        dollarImpact: 75,
        direction: "increase",
      });
    }
  }

  // Pet-friendly adjustment
  if (property.petFriendly) {
    adjustments.push({
      factor: "Pet policy",
      description: "Pet-friendly premium (pet deposit opportunity)",
      dollarImpact: 50,
      direction: "increase",
    });
  }

  // Calculate adjusted rent
  const totalAdj = adjustments.reduce((s, a) => s + (a.direction === "increase" ? a.dollarImpact : -a.dollarImpact), 0);
  const adjustedRent = Math.round(weightedRent + totalAdj);

  // Confidence based on comp count and similarity
  const avgSimilarity = comps.reduce((s, c) => s + c.similarity, 0) / comps.length;
  const confidence = Math.min(95, Math.round(avgSimilarity * 0.5 + comps.length * 5));

  return {
    low: Math.round(adjustedRent * 0.92),
    mid: adjustedRent,
    high: Math.round(adjustedRent * 1.08),
    confidence,
    methodology: `Weighted comp analysis (${comps.length} comps, ${adjustments.length} adjustments)`,
    adjustments,
    pricePerSqft: {
      low: property.sqft > 0 ? Math.round((adjustedRent * 0.92) / property.sqft * 100) / 100 : 0,
      mid: property.sqft > 0 ? Math.round(adjustedRent / property.sqft * 100) / 100 : 0,
      high: property.sqft > 0 ? Math.round((adjustedRent * 1.08) / property.sqft * 100) / 100 : 0,
    },
  };
}

/**
 * Build rental market metrics from raw data
 */
export function buildRentalMarketMetrics(data: RawRentalMarketData): RentalMarketMetrics {
  return {
    medianRent: buildTrendMetric(data.medianRent.current, data.medianRent.oneYearAgo, data.medianRent.threeYearAgo, data.medianRent.fiveYearAgo),
    averageRent: buildTrendMetric(data.averageRent.current, data.averageRent.oneYearAgo, data.averageRent.threeYearAgo, data.averageRent.fiveYearAgo),
    rentPerSqft: buildTrendMetric(data.rentPerSqft.current, data.rentPerSqft.oneYearAgo, data.rentPerSqft.threeYearAgo, data.rentPerSqft.fiveYearAgo),
    vacancyRate: buildTrendMetric(data.vacancyRate.current, data.vacancyRate.oneYearAgo, data.vacancyRate.threeYearAgo, data.vacancyRate.fiveYearAgo),
    daysToLease: buildTrendMetric(data.daysToLease.current, data.daysToLease.oneYearAgo, data.daysToLease.threeYearAgo, data.daysToLease.fiveYearAgo),
    applicationVolume: buildTrendMetric(data.appVolume.current, data.appVolume.oneYearAgo, data.appVolume.threeYearAgo, data.appVolume.fiveYearAgo),
    renewalRate: buildTrendMetric(data.renewalRate.current, data.renewalRate.oneYearAgo, data.renewalRate.threeYearAgo, data.renewalRate.fiveYearAgo),
    rentToIncomeRatio: data.rentToIncomeRatio,
    affordabilityThreshold: data.affordabilityThreshold,
    byBedroom: data.byBedroom,
    byPropertyType: data.byPropertyType,
  };
}

/**
 * Generate rental seasonality analysis
 */
export function analyzeSeasonality(historicalRents: HistoricalRentData[]): RentalSeasonality {
  // Group by month and calculate average index
  const monthlyData: Record<string, { rents: number[]; vacancies: number[] }> = {};
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (const data of historicalRents) {
    const monthIdx = parseInt(data.date.split("-")[1]!) - 1;
    const month = months[monthIdx]!;
    if (!monthlyData[month]) monthlyData[month] = { rents: [], vacancies: [] };
    monthlyData[month]!.rents.push(data.medianRent);
    monthlyData[month]!.vacancies.push(data.vacancyRate);
  }

  const overallAvgRent = historicalRents.length > 0
    ? historicalRents.reduce((s, d) => s + d.medianRent, 0) / historicalRents.length
    : 1;

  const monthlyIndex = months.map(month => {
    const data = monthlyData[month];
    if (!data || data.rents.length === 0) return { month, index: 100, vacancyRate: 5 };
    const avgRent = data.rents.reduce((a, b) => a + b, 0) / data.rents.length;
    const avgVacancy = data.vacancies.reduce((a, b) => a + b, 0) / data.vacancies.length;
    return {
      month,
      index: Math.round((avgRent / overallAvgRent) * 100),
      vacancyRate: Math.round(avgVacancy * 10) / 10,
    };
  });

  const peak = monthlyIndex.reduce((max, m) => m.index > max.index ? m : max, monthlyIndex[0]!);
  const trough = monthlyIndex.reduce((min, m) => m.index < min.index ? m : min, monthlyIndex[0]!);
  const leastVacancy = monthlyIndex.reduce((min, m) => m.vacancyRate < min.vacancyRate ? m : min, monthlyIndex[0]!);

  return {
    monthlyIndex,
    bestMonthToList: peak.month,
    worstMonthToList: trough.month,
    peakRentPremium: peak.index - 100,
    troughDiscount: 100 - trough.index,
    peakMoveInMonth: leastVacancy.month,
    leastCompetitiveMonth: monthlyIndex.reduce((max, m) => m.vacancyRate > max.vacancyRate ? m : max, monthlyIndex[0]!).month,
  };
}

/**
 * Calculate investor-specific rental metrics
 */
export function calculateInvestorMetrics(
  propertyValue: number,
  estimatedRent: number,
  monthlyMortgage: number,
  monthlyExpenses: number,
  vacancyRate: number
): RentalInvestorMetrics {
  const annualGrossRent = estimatedRent * 12;
  const effectiveGrossIncome = annualGrossRent * (1 - vacancyRate / 100);
  const annualExpenses = monthlyExpenses * 12;
  const annualMortgage = monthlyMortgage * 12;

  const grossYield = (annualGrossRent / propertyValue) * 100;
  const netYield = ((effectiveGrossIncome - annualExpenses) / propertyValue) * 100;
  const priceToRentRatio = propertyValue / annualGrossRent;
  const breakEvenRent = monthlyMortgage + monthlyExpenses;
  const cashFlowAtMarketRent = estimatedRent - breakEvenRent;
  const rentCoverageRatio = breakEvenRent > 0 ? estimatedRent / breakEvenRent : 0;
  const avgTurnoverCost = estimatedRent * 2 + 500; // ~2 months rent + cleaning/repairs
  const annualTurnoverRate = 0.40; // 40% national avg
  const timeToBreakEven = avgTurnoverCost > 0 ? Math.round(avgTurnoverCost / cashFlowAtMarketRent) : 0;
  const operatingExpenseRatio = effectiveGrossIncome > 0 ? annualExpenses / effectiveGrossIncome : 0;

  return {
    grossYield: Math.round(grossYield * 100) / 100,
    netYield: Math.round(netYield * 100) / 100,
    priceToRentRatio: Math.round(priceToRentRatio * 100) / 100,
    breakEvenRent: Math.round(breakEvenRent),
    cashFlowAtMarketRent: Math.round(cashFlowAtMarketRent),
    rentCoverageRatio: Math.round(rentCoverageRatio * 100) / 100,
    timeToBreakEven: Math.max(0, timeToBreakEven),
    avgTurnoverCost: Math.round(avgTurnoverCost),
    annualTurnoverRate,
    effectiveGrossIncome: Math.round(effectiveGrossIncome),
    operatingExpenseRatio: Math.round(operatingExpenseRatio * 100) / 100,
  };
}

// --- Raw data types ---

export interface RawRentalMarketData {
  medianRent: TimeSeriesData;
  averageRent: TimeSeriesData;
  rentPerSqft: TimeSeriesData;
  vacancyRate: TimeSeriesData;
  daysToLease: TimeSeriesData;
  appVolume: TimeSeriesData;
  renewalRate: TimeSeriesData;
  rentToIncomeRatio: number;
  affordabilityThreshold: number;
  byBedroom: RentalMarketMetrics["byBedroom"];
  byPropertyType: RentalMarketMetrics["byPropertyType"];
}
