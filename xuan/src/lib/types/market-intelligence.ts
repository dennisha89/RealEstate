// ============================================================
// Hyper-Multidimensional Analysis System - Core Types
// ============================================================

// --- Dimension 1: Financial Fundamentals ---
export interface FinancialFundamentals {
  monthlyCashFlow: number;
  annualCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  grossRentMultiplier: number; // GRM = Price / Annual Rent
  debtServiceCoverageRatio: number; // DSCR = NOI / Debt Service
  expenseRatio: number; // Total expenses / Gross income
  breakEvenOccupancy: number; // Min occupancy to cover costs
  mortgageStressTest: MortgageStressTest;
}

export interface MortgageStressTest {
  currentRate: number;
  currentPayment: number;
  scenarios: { rate: number; payment: number; cashFlow: number }[];
}

// --- Dimension 2: Comparable Sales ---
export interface CompsAnalysis {
  subject: CompProperty;
  comparables: AdjustedComp[];
  summary: CompsSummary;
}

export interface CompProperty {
  address: string;
  price: number;
  sqft: number;
  pricePerSqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  lotSize?: number;
  daysOnMarket?: number;
  saleDate?: string;
}

export interface AdjustedComp extends CompProperty {
  distance: number; // miles from subject
  adjustments: CompAdjustment[];
  adjustedPrice: number;
  adjustedPricePerSqft: number;
  similarity: number; // 0-100 similarity score
}

export interface CompAdjustment {
  factor: string; // e.g., "sqft", "bedrooms", "age", "condition"
  subjectValue: number | string;
  compValue: number | string;
  dollarAdjustment: number;
}

export interface CompsSummary {
  medianPricePerSqft: number;
  averagePricePerSqft: number;
  impliedValue: number; // Subject's implied value from comps
  priceVsComps: number; // % above or below comp-implied value
  medianDaysOnMarket: number;
  saleToListRatio: number; // avg sale price / list price
  absorptionRate: number; // months of inventory
  priceDirection: "accelerating" | "stable" | "decelerating";
}

// --- Dimension 3: Demographic Velocity ---
export interface DemographicVelocity {
  populationGrowth: TrendMetric;
  medianHouseholdIncome: TrendMetric;
  netMigration: TrendMetric; // IRS SOI data
  professionalInflux: ProfessionalInflux;
  educationLevelShift: {
    bachelorsPct: TrendMetric;
    graduatePct: TrendMetric;
  };
  ageCohorts: {
    millennials25to39Pct: TrendMetric;
    youngFamiliesPct: TrendMetric;
    retireesPct: TrendMetric;
  };
  householdFormationRate: TrendMetric;
}

export interface ProfessionalInflux {
  doctorsPerCapita: TrendMetric;
  engineersPerCapita: TrendMetric;
  techWorkersPerCapita: TrendMetric;
  highIncomeHouseholdsPct: TrendMetric; // households earning > $150k
}

export interface TrendMetric {
  current: number;
  oneYearAgo: number;
  threeYearAgo: number;
  fiveYearAgo: number;
  oneYearChange: number; // percentage change
  threeYearCAGR: number; // compound annual growth rate
  fiveYearCAGR: number;
  trend: "accelerating" | "stable" | "decelerating" | "declining";
  percentile: number; // vs national average (0-100)
}

// --- Dimension 4: Economic Engine ---
export interface EconomicEngine {
  jobGrowthRate: TrendMetric;
  unemploymentRate: TrendMetric;
  wageGrowth: TrendMetric;
  costOfLivingIndex: number; // 100 = national avg
  wageToCoLRatio: number; // wage growth vs CoL growth
  majorEmployers: MajorEmployer[];
  industryDiversification: {
    herfindahlIndex: number; // 0-1, lower = more diverse
    topIndustries: { name: string; pctEmployment: number }[];
    singleEmployerRisk: "low" | "moderate" | "high";
  };
  businessPermitTrend: TrendMetric;
  gdpGrowthRate: TrendMetric; // metro-level GDP
}

export interface MajorEmployer {
  name: string;
  industry: string;
  employees: number;
  recentEvent?: "expanding" | "stable" | "layoffs" | "relocating_in" | "relocating_out";
  eventDate?: string;
  impactAssessment?: string;
}

// --- Dimension 5: Infrastructure & Development ---
export interface InfrastructureDevelopment {
  buildingPermits: {
    residential: TrendMetric;
    commercial: TrendMetric;
    totalValue: TrendMetric;
  };
  zoningChanges: ZoningChange[];
  transitProjects: DevelopmentProject[];
  commercialDevelopment: DevelopmentProject[];
  medicalFacilities: DevelopmentProject[];
  schoolProjects: DevelopmentProject[];
  techOfficeOpenings: DevelopmentProject[];
  infrastructureScore: number; // 0-100 composite
  developmentPipeline: {
    totalProjects: number;
    totalInvestment: number;
    completionTimeline: string;
  };
}

export interface ZoningChange {
  area: string;
  fromZone: string;
  toZone: string;
  densityImpact: "increase" | "decrease" | "neutral";
  estimatedUnits?: number;
  status: "proposed" | "approved" | "enacted";
  date: string;
}

export interface DevelopmentProject {
  name: string;
  type: string;
  investment: number;
  status: "planned" | "under_construction" | "completed";
  completionDate?: string;
  distanceFromSubject?: number; // miles
  impactRadius: number; // estimated impact radius in miles
  valueImpactEstimate?: number; // estimated % impact on nearby property values
}

// --- Dimension 6: Quality of Life ---
export interface QualityOfLife {
  schoolRatings: {
    elementary: SchoolRating[];
    middle: SchoolRating[];
    high: SchoolRating[];
    averageRating: number; // 1-10
    ratingTrend: "improving" | "stable" | "declining";
  };
  crimeRate: {
    violentPer1000: TrendMetric;
    propertyPer1000: TrendMetric;
    overallTrend: "improving" | "stable" | "worsening";
    vsMetroAverage: number; // % above or below
  };
  walkability: {
    walkScore: number;
    transitScore: number;
    bikeScore: number;
  };
  healthcare: {
    doctorsPerCapita: number;
    nearestHospitalMiles: number;
    hospitalRating?: number;
  };
  greenSpace: {
    parkAcresPerCapita: number;
    nearestParkMiles: number;
  };
  neighborhoodVibrancy: {
    restaurantsPerCapita: number;
    retailDensity: number;
    nightlifeScore?: number;
  };
}

export interface SchoolRating {
  name: string;
  rating: number; // 1-10
  distance: number; // miles
  previousRating?: number;
  trend: "improving" | "stable" | "declining";
}

// --- Dimension 7: Supply-Demand Dynamics ---
export interface SupplyDemandDynamics {
  monthsOfInventory: TrendMetric;
  daysOnMarket: TrendMetric;
  listToSaleRatio: TrendMetric; // > 1.0 = bidding wars
  newConstructionPipeline: {
    unitsPlanned: number;
    unitsUnderConstruction: number;
    estimatedDeliveryMonths: number;
    absorptionRate: number; // units sold per month
    monthsToAbsorb: number;
  };
  rentalMarket: {
    vacancyRate: TrendMetric;
    rentGrowthRate: TrendMetric;
    rentToOwnRatio: number; // monthly rent / (home price / 300)
  };
  affordability: {
    priceToIncomeRatio: number;
    mortgagePaymentToIncomeRatio: number;
    affordabilityIndex: number; // 100 = market avg
    trend: "more_affordable" | "stable" | "less_affordable";
  };
  marketTemperature: "cold" | "cool" | "balanced" | "warm" | "hot";
}

// --- Dimension 8: Macro & Risk ---
export interface MacroRiskFactors {
  interestRateSensitivity: {
    currentRate: number;
    forecastDirection: "rising" | "stable" | "falling";
    paymentImpactPer1Pct: number; // $ change per 1% rate move
    buyerPoolImpact: "expanding" | "stable" | "shrinking";
  };
  propertyTaxTrajectory: {
    currentRate: number;
    assessmentTrend: TrendMetric;
    reassessmentRisk: "low" | "moderate" | "high";
  };
  insuranceRisk: {
    floodZone: boolean;
    floodZoneType?: string;
    wildfireRisk: "low" | "moderate" | "high" | "extreme";
    hurricaneRisk: "low" | "moderate" | "high";
    earthquakeRisk: "low" | "moderate" | "high";
    insuranceCostTrend: TrendMetric;
  };
  climateRisk: {
    overallScore: number; // 0-100, lower = less risk
    heatRisk: "low" | "moderate" | "high";
    seaLevelRisk: "none" | "low" | "moderate" | "high";
    droughtRisk: "low" | "moderate" | "high";
  };
  regulatoryRisk: {
    rentControlActive: boolean;
    rentControlProposed: boolean;
    evictionMoratoriumHistory: boolean;
    landlordFriendlinessScore: number; // 0-100
  };
  marketCyclePosition: "early_expansion" | "mid_expansion" | "late_expansion" | "peak" | "early_contraction" | "contraction" | "trough" | "recovery";
}

// --- Composite HyperScore ---
export interface HyperScore {
  overall: number; // 0-100
  dimensions: {
    financial: DimensionScore;
    comps: DimensionScore;
    demographic: DimensionScore;
    economic: DimensionScore;
    infrastructure: DimensionScore;
    qualityOfLife: DimensionScore;
    supplyDemand: DimensionScore;
    macroRisk: DimensionScore;
  };
  recommendation: "GENERATIONAL_OPPORTUNITY" | "STRONG_BUY" | "BUY" | "LEAN_BUY" | "NEUTRAL" | "LEAN_PASS" | "PASS" | "HARD_PASS";
  confidence: number; // 0-100 based on data completeness
  topDrivers: KPIDriver[];
  topRisks: KPIDriver[];
}

export interface DimensionScore {
  score: number; // 0-100
  weight: number; // 0-1
  weightedScore: number;
  keyFactors: string[];
  dataCompleteness: number; // 0-100
}

export interface KPIDriver {
  kpi: string;
  dimension: string;
  impact: "strong_positive" | "positive" | "neutral" | "negative" | "strong_negative";
  value: string; // formatted current value
  trend: string; // formatted trend description
  rank: number; // 1 = most impactful
}

// --- Appreciation Prediction ---
export interface AppreciationPrediction {
  oneYear: PredictionResult;
  threeYear: PredictionResult;
  fiveYear: PredictionResult;
  primaryDrivers: AppreciationDriver[];
  scenarios: AppreciationScenario[];
}

export interface PredictionResult {
  predicted: number; // % appreciation
  low: number; // confidence interval low
  high: number; // confidence interval high
  confidence: number; // 0-100
}

export interface AppreciationDriver {
  factor: string;
  contribution: number; // % of total predicted appreciation attributable
  currentValue: number;
  direction: "accelerating" | "stable" | "decelerating";
  sensitivity: number; // how much appreciation changes per 1% change in this factor
}

export interface AppreciationScenario {
  name: string; // "bull", "base", "bear"
  assumptions: Record<string, number>;
  oneYearAppreciation: number;
  threeYearAppreciation: number;
  fiveYearAppreciation: number;
}

// --- Deal Finder ---
export interface DealCriteria {
  markets: string[]; // zip codes or metro areas
  propertyTypes: ("single_family" | "multi_family" | "condo" | "townhouse")[];
  priceRange: { min: number; max: number };
  dealTypes: DealType[];
  minCashFlow?: number;
  minCapRate?: number;
  minHyperScore?: number;
  maxDaysOnMarket?: number;
  minBedrooms?: number;
  minSqft?: number;
}

export type DealType =
  | "below_market_value"
  | "cash_flow_play"
  | "appreciation_bet"
  | "value_add"
  | "distressed"
  | "price_reduction"
  | "motivated_seller";

export interface DealResult {
  property: CompProperty;
  dealType: DealType;
  hyperScore: number;
  estimatedDiscount: number; // % below market
  projectedCashFlow: number;
  projectedAppreciation: number; // 1yr
  urgency: "act_now" | "move_fast" | "standard" | "watch";
  keyReasons: string[];
  risks: string[];
}

// --- Alert System ---
export interface DealAlert {
  id: string;
  userId: string;
  criteria: DealCriteria;
  frequency: "instant" | "daily" | "weekly";
  channels: ("email" | "sms" | "push")[];
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
  matchCount: number;
}

// --- Full Analysis Response ---
export interface HyperAnalysis {
  property: CompProperty;
  financial: FinancialFundamentals;
  comps: CompsAnalysis;
  demographics: DemographicVelocity;
  economy: EconomicEngine;
  infrastructure: InfrastructureDevelopment;
  qualityOfLife: QualityOfLife;
  supplyDemand: SupplyDemandDynamics;
  macroRisk: MacroRiskFactors;
  hyperScore: HyperScore;
  appreciation: AppreciationPrediction;
  generatedAt: string;
  dataFreshness: Record<string, string>; // dimension -> last updated
}
