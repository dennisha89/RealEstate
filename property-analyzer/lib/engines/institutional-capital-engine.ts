// ============================================================
// Institutional Capital Radar
// Tracks when big money enters a market BEFORE prices move.
// LLC purchases, REIT deployment, PE fund formation, iBuyer
// activity, and corporate relocation signals.
// ============================================================

import type { TrendMetric } from "../types/market-intelligence";
import { buildTrendMetric, type TimeSeriesData } from "./demographic-engine";

// --- Types ---

export interface InstitutionalCapitalProfile {
  zipCode: string;
  llcPurchaseActivity: LLCPurchaseActivity;
  reitDeployment: REITDeployment[];
  privateEquityActivity: PEActivity;
  iBuyerActivity: IBuyerActivity;
  corporateRelocations: CorporateRelocation[];
  crowdfundingDeployment: CrowdfundingDeployment;
  institutionalSentiment: "aggressive_buying" | "accumulating" | "neutral" | "distributing" | "exiting";
  institutionalCapitalScore: number; // 0-100
  smartMoneySignals: SmartMoneySignal[];
}

export interface LLCPurchaseActivity {
  totalLLCPurchases: TrendMetric; // count of LLC/Corp purchases
  llcPurchasePctOfTotal: TrendMetric; // % of all sales to entities
  uniqueEntitiesBuying: number; // distinct LLCs active in last 90 days
  topBuyingEntities: EntityActivity[];
  bulkPurchases: { entity: string; count: number; totalVolume: number; dateRange: string }[];
  newEntitiesEntering: number; // LLCs buying here for first time (last 90 days)
  avgEntityHoldPeriod: number; // months - short = flip, long = hold
  entitySellingVsBuying: number; // ratio (>1 = net buying, <1 = net selling)
}

export interface EntityActivity {
  entityName: string;
  entityType: "llc" | "corp" | "trust" | "reit" | "fund" | "unknown";
  parentCompany?: string; // e.g., "Invitation Homes" behind 50 LLCs
  purchaseCount: number;
  totalVolume: number;
  avgPurchasePrice: number;
  propertyTypes: string[];
  firstPurchaseDate: string;
  mostRecentPurchase: string;
  estimatedAUM?: number;
  strategy: "buy_and_hold" | "flip" | "value_add" | "development" | "unknown";
}

export interface REITDeployment {
  reitName: string;
  ticker?: string;
  sector: string; // "SFR", "multifamily", "industrial", "retail", "office"
  activityInMarket: "entering" | "expanding" | "maintaining" | "reducing" | "exiting";
  propertiesOwned: number;
  recentAcquisitions: number; // last 12 months
  recentDispositions: number;
  capitalDeployed: number; // $ in last 12 months
  publicStatements?: string; // from earnings calls, press releases
  source: string; // "10-K", "earnings call", "press release"
}

export interface PEActivity {
  activeFundsTargetingMarket: number;
  totalFundCapitalRaised: number; // targeting this market
  recentFundFormations: { fundName: string; targetSize: number; strategy: string; filingDate: string }[];
  formDFilings: TrendMetric; // SEC Form D filings mentioning this metro
  dryPowder: number; // estimated uncommitted capital targeting market
}

export interface IBuyerActivity {
  activeBuyers: string[]; // "Opendoor", "Offerpad", etc.
  purchaseVolume: TrendMetric;
  resaleVolume: TrendMetric;
  avgHoldPeriod: number; // days
  avgMarkup: number; // % from purchase to resale
  marketShare: number; // % of total sales
  inventoryOnHand: number;
  pricingVsMarket: number; // % above or below market median
  signal: "entering" | "expanding" | "steady" | "reducing" | "exiting";
}

export interface CorporateRelocation {
  companyName: string;
  industry: string;
  relocationType: "headquarters" | "regional_office" | "distribution_center" | "manufacturing" | "tech_hub" | "research_lab";
  estimatedJobs: number;
  avgSalary: number;
  announcementDate: string;
  expectedMoveDate: string;
  incentivesReceived: number; // $ in tax breaks, grants
  estimatedHousingDemand: number; // new housing units needed
  estimatedRentalDemand: number;
  salaryToMedianIncomeRatio: number; // >1 = above-market salaries coming
  source: string;
}

export interface CrowdfundingDeployment {
  activePlatforms: string[]; // platforms with projects in this market
  totalRaised: TrendMetric; // $ raised for projects in this market
  activeProjects: number;
  avgProjectSize: number;
  projectTypes: { type: string; count: number; totalRaised: number }[];
  consensusSignal: boolean; // 3+ platforms deploying = consensus
}

export interface SmartMoneySignal {
  signal: string;
  strength: "strong" | "moderate" | "weak";
  source: string;
  date: string;
  implication: string;
  timeHorizon: string; // "3-6 months", "6-12 months", etc.
}

// --- Analysis Functions ---

/**
 * Detect institutional buying patterns that precede price appreciation
 */
export function detectInstitutionalPatterns(
  llcActivity: LLCPurchaseActivity,
  reitDeployments: REITDeployment[],
  peActivity: PEActivity,
  iBuyer: IBuyerActivity,
  corporateRelocations: CorporateRelocation[],
  crowdfunding: CrowdfundingDeployment
): SmartMoneySignal[] {
  const signals: SmartMoneySignal[] = [];

  // LLC surge detection
  if (llcActivity.llcPurchasePctOfTotal.trend === "accelerating" &&
      llcActivity.llcPurchasePctOfTotal.current > 20) {
    signals.push({
      signal: `Entity purchases at ${llcActivity.llcPurchasePctOfTotal.current.toFixed(1)}% of sales and accelerating`,
      strength: "strong",
      source: "County recorder data",
      date: new Date().toISOString().split("T")[0],
      implication: "Institutional investors are accumulating. Historically precedes 5-15% price appreciation within 12-18 months.",
      timeHorizon: "12-18 months",
    });
  }

  // New entities entering
  if (llcActivity.newEntitiesEntering > 5) {
    signals.push({
      signal: `${llcActivity.newEntitiesEntering} new investment entities entered this market in last 90 days`,
      strength: llcActivity.newEntitiesEntering > 10 ? "strong" : "moderate",
      source: "County recorder data",
      date: new Date().toISOString().split("T")[0],
      implication: "New institutional attention. Smart money is discovering this market.",
      timeHorizon: "6-12 months",
    });
  }

  // REIT expansion
  const expandingREITs = reitDeployments.filter(r => r.activityInMarket === "entering" || r.activityInMarket === "expanding");
  if (expandingREITs.length > 0) {
    signals.push({
      signal: `${expandingREITs.length} REIT(s) expanding into market: ${expandingREITs.map(r => r.reitName).join(", ")}`,
      strength: expandingREITs.length > 2 ? "strong" : "moderate",
      source: "SEC filings, earnings calls",
      date: new Date().toISOString().split("T")[0],
      implication: "REITs have 12-24 month research cycles. Their entry signals sustained demand conviction.",
      timeHorizon: "12-24 months",
    });
  }

  // REIT exiting (negative signal)
  const exitingREITs = reitDeployments.filter(r => r.activityInMarket === "reducing" || r.activityInMarket === "exiting");
  if (exitingREITs.length > 0) {
    signals.push({
      signal: `${exitingREITs.length} REIT(s) reducing/exiting: ${exitingREITs.map(r => r.reitName).join(", ")}`,
      strength: "moderate",
      source: "SEC filings, earnings calls",
      date: new Date().toISOString().split("T")[0],
      implication: "Institutional sellers see better risk-adjusted returns elsewhere. Potential headwind.",
      timeHorizon: "6-12 months",
    });
  }

  // PE dry powder
  if (peActivity.dryPowder > 50_000_000) {
    signals.push({
      signal: `$${(peActivity.dryPowder / 1_000_000).toFixed(0)}M in PE dry powder targeting this market`,
      strength: peActivity.dryPowder > 200_000_000 ? "strong" : "moderate",
      source: "SEC Form D filings",
      date: new Date().toISOString().split("T")[0],
      implication: "Uncommitted capital creates future demand. When deployed, absorbs inventory and pushes prices.",
      timeHorizon: "6-18 months",
    });
  }

  // iBuyer entry
  if (iBuyer.signal === "entering" || iBuyer.signal === "expanding") {
    signals.push({
      signal: `iBuyers ${iBuyer.signal}: ${iBuyer.activeBuyers.join(", ")} (${iBuyer.marketShare.toFixed(1)}% market share)`,
      strength: iBuyer.marketShare > 5 ? "strong" : "moderate",
      source: "MLS data, public records",
      date: new Date().toISOString().split("T")[0],
      implication: "iBuyers use sophisticated models to identify appreciating markets. Their entry validates upside.",
      timeHorizon: "3-12 months",
    });
  }

  // Corporate relocation impact
  const totalNewJobs = corporateRelocations.reduce((s, r) => s + r.estimatedJobs, 0);
  if (totalNewJobs > 500) {
    const topCompany = corporateRelocations.reduce((max, r) => r.estimatedJobs > max.estimatedJobs ? r : max, corporateRelocations[0]);
    signals.push({
      signal: `${totalNewJobs.toLocaleString()} new jobs announced: ${corporateRelocations.map(r => r.companyName).join(", ")}`,
      strength: totalNewJobs > 2000 ? "strong" : "moderate",
      source: "Press releases, state economic development filings",
      date: new Date().toISOString().split("T")[0],
      implication: `${topCompany.estimatedJobs} jobs at avg $${(topCompany.avgSalary / 1000).toFixed(0)}K = ~${topCompany.estimatedHousingDemand} new housing units demanded.`,
      timeHorizon: "12-36 months",
    });
  }

  // Crowdfunding consensus
  if (crowdfunding.consensusSignal) {
    signals.push({
      signal: `${crowdfunding.activePlatforms.length} crowdfunding platforms deploying capital (${crowdfunding.activePlatforms.join(", ")})`,
      strength: "moderate",
      source: "Crowdfunding platform data",
      date: new Date().toISOString().split("T")[0],
      implication: "Multiple platforms betting on same market = consensus institutional bullishness.",
      timeHorizon: "6-18 months",
    });
  }

  return signals;
}

/**
 * Calculate institutional capital score (0-100)
 */
export function scoreInstitutionalCapital(
  llcActivity: LLCPurchaseActivity,
  signals: SmartMoneySignal[]
): number {
  let score = 50;

  // LLC buying momentum
  if (llcActivity.entitySellingVsBuying > 1.5) score += 15;
  else if (llcActivity.entitySellingVsBuying > 1.0) score += 8;
  else if (llcActivity.entitySellingVsBuying < 0.7) score -= 15;

  // Signal count and strength
  const strongSignals = signals.filter(s => s.strength === "strong").length;
  const moderateSignals = signals.filter(s => s.strength === "moderate").length;
  score += strongSignals * 8 + moderateSignals * 4;

  // Negative signals
  const negativeSignals = signals.filter(s =>
    s.implication.toLowerCase().includes("headwind") ||
    s.implication.toLowerCase().includes("exiting") ||
    s.implication.toLowerCase().includes("reducing")
  ).length;
  score -= negativeSignals * 8;

  return Math.max(0, Math.min(100, score));
}

/**
 * Determine overall institutional sentiment
 */
export function determineInstitutionalSentiment(
  score: number,
  llcActivity: LLCPurchaseActivity
): InstitutionalCapitalProfile["institutionalSentiment"] {
  if (score >= 80 && llcActivity.entitySellingVsBuying > 1.5) return "aggressive_buying";
  if (score >= 65) return "accumulating";
  if (score >= 40) return "neutral";
  if (score >= 25) return "distributing";
  return "exiting";
}
