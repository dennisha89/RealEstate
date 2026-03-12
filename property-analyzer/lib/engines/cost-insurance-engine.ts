// ============================================================
// Cost & Insurance Intelligence Engine
// Tracks construction costs, insurance premiums, replacement
// cost analysis, claims density, insurer market exits, and
// municipal bond yield spreads — all factors that affect the
// true cost of ownership and investment returns.
// ============================================================

import type { TrendMetric } from "../types/market-intelligence";
import { buildTrendMetric, type TimeSeriesData } from "./demographic-engine";

// --- Types ---

export interface CostInsuranceProfile {
  zipCode: string;
  constructionCosts: ConstructionCostMetrics;
  insuranceLandscape: InsuranceLandscape;
  replacementCostAnalysis: ReplacementCost;
  muniBondSignals: MuniBondSignals;
  utilityAndTaxBurden: UtilityTaxBurden;
  costOfOwnership: CostOfOwnership;
  costInsuranceScore: number; // 0-100 (higher = more favorable cost environment)
  costSignals: CostSignal[];
}

/** Construction cost tracking — affects new supply and renovation ROI */
export interface ConstructionCostMetrics {
  costPerSqft: TrendMetric; // residential new construction
  commercialCostPerSqft: TrendMetric;
  laborCostIndex: TrendMetric; // indexed to 100
  materialCostIndex: TrendMetric;
  concreteCost: TrendMetric; // $/cubic yard
  lumberCost: TrendMetric; // $/board foot
  steelCost: TrendMetric; // $/ton
  laborAvailability: "surplus" | "adequate" | "tight" | "severe_shortage";
  avgContractorBacklog: number; // weeks
  subcontractorPricing: "competitive" | "firm" | "escalating";
  permitFees: TrendMetric;
  impactFees: TrendMetric; // developer fees for schools, roads, etc.
  totalSoftCosts: number; // % of hard costs (permits, engineering, legal)
  costBreakdown: {
    foundation: number; // % of total
    framing: number;
    roofing: number;
    electrical: number;
    plumbing: number;
    hvac: number;
    finishing: number;
    landscaping: number;
    softCosts: number;
  };
  renovationCosts: {
    kitchenRemodel: { low: number; mid: number; high: number };
    bathroomRemodel: { low: number; mid: number; high: number };
    roofReplacement: { low: number; mid: number; high: number };
    hvacReplacement: { low: number; mid: number; high: number };
    windowReplacement: { low: number; mid: number; high: number };
    additionPerSqft: { low: number; mid: number; high: number };
  };
  signal: "costs_declining" | "costs_stable" | "costs_rising" | "costs_surging";
}

/** Insurance market intelligence — insurer exits are red flags */
export interface InsuranceLandscape {
  avgHomeownerPremium: TrendMetric; // annual $
  premiumPerSqft: TrendMetric;
  premiumChange5yr: number; // % change
  activeInsurers: number; // count of carriers writing in this market
  insurerExits: { insurer: string; exitDate: string; reason: string }[];
  insurerEntries: { insurer: string; entryDate: string }[];
  netInsurerChange: number; // entries - exits (negative = red flag)
  floodInsurance: {
    required: boolean;
    avgPremium: number;
    nfipPolicies: number;
    privatePolicies: number;
    repetitiveLossProperties: number;
    zoneChanges: string[]; // recent FEMA map changes
  };
  windstormInsurance: {
    required: boolean;
    avgPremium: number;
    separateDeductible: boolean;
    deductiblePct: number; // % of coverage
  };
  claimsDensity: TrendMetric; // claims per 1000 policies
  avgClaimAmount: TrendMetric;
  topClaimTypes: { type: string; pct: number; avgAmount: number }[];
  catastropheExposure: {
    hurricaneRisk: "high" | "moderate" | "low" | "none";
    earthquakeRisk: "high" | "moderate" | "low" | "none";
    wildfireRisk: "high" | "moderate" | "low" | "none";
    floodRisk: "high" | "moderate" | "low" | "none";
    tornadoRisk: "high" | "moderate" | "low" | "none";
    hailRisk: "high" | "moderate" | "low" | "none";
  };
  insurabilityRisk: "normal" | "elevated" | "high" | "crisis";
  signal: "favorable" | "stable" | "challenging" | "crisis";
}

/** What it costs to rebuild — affects insurance adequacy and investment math */
export interface ReplacementCost {
  estimatedReplacementPerSqft: number;
  totalReplacementCost: number; // for median home
  replacementVsMarketValue: number; // ratio (<1 = cheaper to build, >1 = cheaper to buy)
  demolitionCost: number; // per sqft
  siteWorkCost: number; // per sqft
  timeToRebuild: number; // months
  codeComplianceAdder: number; // % increase for current code compliance
  greenBuildingPremium: number; // % for energy-efficient builds
  historicPreservationAdder: number; // % for historic district compliance
  trend: "replacement_cost_rising" | "stable" | "replacement_cost_falling";
}

/** Municipal bond yields reveal fiscal health and infrastructure commitment */
export interface MuniBondSignals {
  generalObligationYield: TrendMetric; // % yield
  revenueRondYield: TrendMetric;
  yieldSpreadVsAAA: number; // basis points above AAA munis
  creditRating: string; // "AAA", "AA+", etc.
  creditRatingTrend: "upgrading" | "stable" | "downgrading";
  recentIssuances: {
    purpose: string;
    amount: number;
    term: number; // years
    yield: number;
    date: string;
  }[];
  totalOutstandingDebt: number;
  debtPerCapita: number;
  debtServiceRatio: number; // debt payments / total revenue
  pensionFundingRatio: number; // % funded (<80% = red flag)
  recentRatingActions: string[];
  fiscalHealthSignal: "strong" | "adequate" | "weak" | "distressed";
}

/** Total cost of ownership beyond mortgage */
export interface UtilityTaxBurden {
  propertyTaxRate: TrendMetric; // effective rate %
  avgAnnualPropertyTax: TrendMetric;
  specialAssessments: { name: string; annualCost: number; endDate: string }[];
  hoaFees: { avg: number; median: number; trend: "rising" | "stable" | "falling" };
  avgMonthlyUtilities: {
    electric: number;
    gas: number;
    water: number;
    sewer: number;
    trash: number;
    internet: number;
    total: number;
  };
  utilityTrend: "rising" | "stable" | "falling";
  transferTaxRate: number; // % at sale
  recordingFees: number;
  closingCostEstimate: number; // % of purchase price
}

/** Total cost of ownership composite */
export interface CostOfOwnership {
  monthlyMortgageMedian: number; // for median-priced home at current rates
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHOA: number;
  monthlyUtilities: number;
  monthlyMaintenance: number; // estimated 1% of value / 12
  totalMonthlyCost: number;
  totalAnnualCost: number;
  costAsPercentOfMedianIncome: number;
  costVsRenting: number; // % difference (positive = owning costs more)
  breakEvenYears: number; // years before buying beats renting
  fiveYearCostComparison: {
    owning: number;
    renting: number;
    equityBuilt: number;
    netAdvantage: number; // positive = buying wins
  };
}

export interface CostSignal {
  category: string;
  signal: string;
  impact: "positive" | "negative" | "neutral";
  magnitude: "high" | "medium" | "low";
  detail: string;
}

// --- Analysis Functions ---

/**
 * Generate cost and insurance signals
 */
export function generateCostSignals(profile: CostInsuranceProfile): CostSignal[] {
  const signals: CostSignal[] = [];

  // Construction costs
  const cc = profile.constructionCosts;
  if (cc.signal === "costs_surging") {
    signals.push({
      category: "Construction",
      signal: "Construction costs surging",
      impact: "positive", // limits new supply = supports existing values
      magnitude: "high",
      detail: `Labor: ${cc.laborAvailability}. Contractor backlog: ${cc.avgContractorBacklog} weeks. Rising costs limit new supply, supporting existing home values.`,
    });
  } else if (cc.signal === "costs_declining") {
    signals.push({
      category: "Construction",
      signal: "Construction costs declining",
      impact: "negative", // enables more supply
      magnitude: "medium",
      detail: "Falling construction costs enable more building, which may increase supply pressure on existing inventory.",
    });
  }

  // Insurance red flags
  const ins = profile.insuranceLandscape;
  if (ins.signal === "crisis") {
    signals.push({
      category: "Insurance",
      signal: "Insurance market in crisis",
      impact: "negative",
      magnitude: "high",
      detail: `${Math.abs(ins.netInsurerChange)} insurer(s) have exited. Premiums up ${ins.premiumChange5yr.toFixed(0)}% over 5 years. Insurability risk: ${ins.insurabilityRisk}.`,
    });
  } else if (ins.netInsurerChange < 0) {
    signals.push({
      category: "Insurance",
      signal: `${Math.abs(ins.netInsurerChange)} insurer(s) exiting market`,
      impact: "negative",
      magnitude: "medium",
      detail: "Fewer carriers means less competition and higher premiums. Watch for availability issues.",
    });
  }

  // Replacement cost arbitrage
  const rc = profile.replacementCostAnalysis;
  if (rc.replacementVsMarketValue > 1.2) {
    signals.push({
      category: "Replacement Cost",
      signal: `Cheaper to buy than build (replacement ${((rc.replacementVsMarketValue - 1) * 100).toFixed(0)}% above market)`,
      impact: "positive",
      magnitude: "high",
      detail: "Existing homes are priced below replacement cost — natural price floor as builders can't compete.",
    });
  } else if (rc.replacementVsMarketValue < 0.8) {
    signals.push({
      category: "Replacement Cost",
      signal: "Market prices significantly above replacement cost",
      impact: "negative",
      magnitude: "medium",
      detail: "Builders can profitably build new supply, creating competition for existing inventory.",
    });
  }

  // Municipal fiscal health
  const muni = profile.muniBondSignals;
  if (muni.fiscalHealthSignal === "distressed") {
    signals.push({
      category: "Municipal Finance",
      signal: "Municipal fiscal distress",
      impact: "negative",
      magnitude: "high",
      detail: `Credit rating: ${muni.creditRating} (${muni.creditRatingTrend}). Pension funding: ${muni.pensionFundingRatio.toFixed(0)}%. Debt per capita: $${muni.debtPerCapita.toLocaleString()}.`,
    });
  } else if (muni.fiscalHealthSignal === "strong" && muni.creditRatingTrend === "upgrading") {
    signals.push({
      category: "Municipal Finance",
      signal: "Strong municipal fiscal health, credit upgrading",
      impact: "positive",
      magnitude: "medium",
      detail: "Strong fiscal position enables infrastructure investment and stable services without tax increases.",
    });
  }

  // Cost of ownership
  const cost = profile.costOfOwnership;
  if (cost.costVsRenting < -10) {
    signals.push({
      category: "Cost of Ownership",
      signal: `Owning ${Math.abs(cost.costVsRenting).toFixed(0)}% cheaper than renting`,
      impact: "positive",
      magnitude: "high",
      detail: `Monthly cost: $${cost.totalMonthlyCost.toLocaleString()} vs renting. Break-even in ${cost.breakEvenYears.toFixed(1)} years.`,
    });
  } else if (cost.costVsRenting > 20) {
    signals.push({
      category: "Cost of Ownership",
      signal: `Owning ${cost.costVsRenting.toFixed(0)}% more expensive than renting`,
      impact: "negative",
      magnitude: "medium",
      detail: `High ownership costs may dampen buyer demand. Break-even: ${cost.breakEvenYears.toFixed(1)} years.`,
    });
  }

  return signals;
}

/**
 * Score cost & insurance environment (0-100, higher = more favorable)
 */
export function scoreCostInsurance(profile: CostInsuranceProfile): number {
  let score = 50;

  // Construction costs (high costs = limited supply = good for values)
  const cc = profile.constructionCosts;
  if (cc.signal === "costs_surging") score += 8;
  else if (cc.signal === "costs_rising") score += 4;
  else if (cc.signal === "costs_declining") score -= 5;

  // Insurance environment
  const ins = profile.insuranceLandscape;
  if (ins.signal === "favorable") score += 8;
  else if (ins.signal === "challenging") score -= 8;
  else if (ins.signal === "crisis") score -= 15;

  // Replacement cost
  const rc = profile.replacementCostAnalysis;
  if (rc.replacementVsMarketValue > 1.2) score += 10;
  else if (rc.replacementVsMarketValue > 1.0) score += 5;
  else if (rc.replacementVsMarketValue < 0.8) score -= 8;

  // Municipal fiscal health
  const muni = profile.muniBondSignals;
  if (muni.fiscalHealthSignal === "strong") score += 8;
  else if (muni.fiscalHealthSignal === "weak") score -= 5;
  else if (muni.fiscalHealthSignal === "distressed") score -= 12;

  // Cost of ownership vs renting
  const cost = profile.costOfOwnership;
  if (cost.costVsRenting < -10) score += 8;
  else if (cost.costVsRenting > 20) score -= 8;

  return Math.max(0, Math.min(100, score));
}
