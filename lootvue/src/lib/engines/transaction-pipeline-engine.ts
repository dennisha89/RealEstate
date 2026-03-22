// ============================================================
// Transaction Pipeline Intelligence
// Tracks leading indicators of transaction activity:
// title insurance volume, foreclosure pipeline, probate filings,
// hard money lending, eviction rates, and property tax appeals.
// ============================================================

import type { TrendMetric } from "../types/market-intelligence";
import { buildTrendMetric, type TimeSeriesData } from "./demographic-engine";

// --- Types ---

export interface TransactionPipelineProfile {
  zipCode: string;
  titleInsurance: TitleInsuranceMetrics;
  foreclosurePipeline: ForeclosurePipeline;
  probateEstateActivity: ProbateActivity;
  hardMoneyLending: HardMoneyMetrics;
  evictionMetrics: EvictionMetrics;
  propertyTaxAppeals: TaxAppealMetrics;
  permitToCompletionVelocity: PermitVelocity;
  transactionPipelineScore: number; // 0-100 (higher = more deal flow coming)
  pipelineSignals: PipelineSignal[];
}

/** Title insurance orders precede closings by 30-60 days */
export interface TitleInsuranceMetrics {
  orderVolume: TrendMetric; // new title orders
  closingVolume: TrendMetric; // completed closings
  orderToCloseRatio: number; // >1 = pipeline building, <1 = pipeline draining
  avgDaysToClose: TrendMetric;
  commercialVsResidentialMix: { residential: number; commercial: number };
  refinanceOrderPct: TrendMetric;
  purchaseOrderPct: TrendMetric;
  cancelationRate: TrendMetric; // high = deals falling through
  signal: "pipeline_building" | "pipeline_stable" | "pipeline_draining";
}

/** Full foreclosure pipeline: NOD → Lis Pendens → Auction → REO */
export interface ForeclosurePipeline {
  noticeOfDefault: TrendMetric; // earliest stage
  lisPendens: TrendMetric;
  scheduledAuctions: TrendMetric;
  auctionSales: TrendMetric;
  reoInventory: TrendMetric; // bank-owned
  totalPipelineVolume: number;
  pipelineFlowRate: "accelerating" | "stable" | "decelerating";
  avgForeclosureTimeline: number; // days from NOD to auction
  estimatedDistressedInventory6Mo: number; // projected distressed supply in 6 months
  estimatedDistressedInventory12Mo: number;
  shortSales: TrendMetric;
  loanModifications: TrendMetric; // modifications reduce foreclosure supply
  forbearanceExits: {
    total: number;
    cured: number;
    modifiedToPerforming: number;
    delinquentAfterExit: number;
    inForeclosure: number;
  };
}

/** Probate/estate filings = inherited properties coming to market */
export interface ProbateActivity {
  newFilings: TrendMetric;
  estimatedPropertyValue: number; // total value of probate real estate
  avgTimeToSale: number; // months from filing to property sale
  estatesSoldBelowMarket: number; // count sold at discount
  avgDiscountToMarket: number; // % below market value
  propertiesStillHeldByEstate: number;
  probateAsPercentOfListings: TrendMetric;
}

/** Hard money / bridge loan activity = flip/rehab signal */
export interface HardMoneyMetrics {
  loanVolume: TrendMetric; // $ originated
  loanCount: TrendMetric;
  avgLoanAmount: TrendMetric;
  avgInterestRate: number;
  avgLTV: number;
  avgLoanTerm: number; // months
  defaultRate: TrendMetric;
  activeLenders: number;
  purposeBreakdown: {
    fix_and_flip: number;
    bridge: number;
    construction: number;
    rehab: number;
    other: number;
  };
  signal: "high_flip_activity" | "moderate" | "low_activity";
}

/** Eviction filings = rental market stress indicator */
export interface EvictionMetrics {
  filingRate: TrendMetric; // per 1000 rental units
  filingCount: TrendMetric;
  executedEvictions: TrendMetric;
  avgDaysToEviction: number;
  topReasons: { reason: string; pct: number }[];
  filingRateVsMetro: number; // % above or below metro average
  serialEvictionProperties: number; // properties with 3+ evictions in 2 years
  evictionMoratoriumActive: boolean;
  signal: "tenant_stress" | "stable" | "healthy_market";
}

/** Property tax appeal volume = valuation sentiment */
export interface TaxAppealMetrics {
  appealVolume: TrendMetric;
  appealRate: number; // % of properties appealing
  avgRequestedReduction: number; // %
  successRate: TrendMetric;
  avgGrantedReduction: number; // %
  totalAssessedValueReduction: number;
  signal: "owners_think_overvalued" | "normal_activity" | "owners_accept_valuations";
}

/** How fast permits become completions */
export interface PermitVelocity {
  avgPermitToStartDays: TrendMetric; // permit issued to construction start
  avgStartToCompletionDays: TrendMetric; // start to certificate of occupancy
  totalPipelineDays: TrendMetric; // permit to completion
  permitsExpiredUnbuilt: TrendMetric; // permits that expired without construction
  completionRate: number; // % of permits that result in completions
  bottleneck: "permitting" | "labor" | "materials" | "financing" | "none";
  supplyImplication: string;
}

export interface PipelineSignal {
  indicator: string;
  direction: "bullish" | "bearish" | "neutral";
  leadTime: string; // "30-60 days", "6-12 months"
  confidence: "high" | "medium" | "low";
  detail: string;
}

// --- Analysis Functions ---

/**
 * Generate pipeline signals from all transaction data
 */
export function generatePipelineSignals(pipeline: TransactionPipelineProfile): PipelineSignal[] {
  const signals: PipelineSignal[] = [];

  // Title insurance signals
  const title = pipeline.titleInsurance;
  if (title.signal === "pipeline_building") {
    signals.push({
      indicator: "Title insurance orders surging",
      direction: "bullish",
      leadTime: "30-60 days",
      confidence: "high",
      detail: `Order-to-close ratio at ${title.orderToCloseRatio.toFixed(2)} — transaction volume increase coming within 60 days`,
    });
  }
  if (title.cancelationRate.trend === "accelerating") {
    signals.push({
      indicator: "Title order cancellations rising",
      direction: "bearish",
      leadTime: "30-60 days",
      confidence: "medium",
      detail: "Deals falling through at higher rates — possible appraisal gaps, financing issues, or buyer remorse",
    });
  }

  // Foreclosure pipeline
  const fc = pipeline.foreclosurePipeline;
  if (fc.pipelineFlowRate === "accelerating") {
    signals.push({
      indicator: "Foreclosure pipeline accelerating",
      direction: "bearish",
      leadTime: "6-12 months",
      confidence: "high",
      detail: `Estimated ${fc.estimatedDistressedInventory6Mo} distressed properties hitting market in 6 months, ${fc.estimatedDistressedInventory12Mo} in 12 months`,
    });
  } else if (fc.pipelineFlowRate === "decelerating" && fc.totalPipelineVolume < 50) {
    signals.push({
      indicator: "Foreclosure pipeline nearly empty",
      direction: "bullish",
      leadTime: "6-12 months",
      confidence: "medium",
      detail: "Minimal distressed supply coming — removes downward price pressure",
    });
  }

  // Probate opportunities
  const probate = pipeline.probateEstateActivity;
  if (probate.avgDiscountToMarket > 10) {
    signals.push({
      indicator: `Probate properties selling at ${probate.avgDiscountToMarket.toFixed(0)}% below market`,
      direction: "bullish",
      leadTime: "0-6 months",
      confidence: "medium",
      detail: `${probate.propertiesStillHeldByEstate} estate properties pending sale — potential below-market acquisitions`,
    });
  }

  // Hard money activity
  const hm = pipeline.hardMoneyLending;
  if (hm.signal === "high_flip_activity") {
    signals.push({
      indicator: "High hard money lending volume",
      direction: "bullish",
      leadTime: "3-9 months",
      confidence: "medium",
      detail: "Active flip/rehab market indicates investor confidence in post-renovation values. Renovated inventory improves neighborhood.",
    });
  }

  // Eviction signals
  const eviction = pipeline.evictionMetrics;
  if (eviction.signal === "tenant_stress") {
    signals.push({
      indicator: "Eviction filings elevated",
      direction: "bearish",
      leadTime: "3-6 months",
      confidence: "medium",
      detail: `Eviction rate ${eviction.filingRateVsMetro > 0 ? eviction.filingRateVsMetro.toFixed(0) + "% above" : Math.abs(eviction.filingRateVsMetro).toFixed(0) + "% below"} metro average — rental market stress could increase vacancy`,
    });
  }

  // Tax appeal signals
  const tax = pipeline.propertyTaxAppeals;
  if (tax.signal === "owners_think_overvalued") {
    signals.push({
      indicator: "Property tax appeals surging",
      direction: "bearish",
      leadTime: "6-12 months",
      confidence: "low",
      detail: `${tax.appealRate.toFixed(1)}% of owners appealing assessments — potential overvaluation signal`,
    });
  }

  // Permit velocity
  const pv = pipeline.permitToCompletionVelocity;
  if (pv.completionRate < 60) {
    signals.push({
      indicator: `Only ${pv.completionRate.toFixed(0)}% of permits reaching completion`,
      direction: "bullish",
      leadTime: "12-24 months",
      confidence: "medium",
      detail: `Bottleneck: ${pv.bottleneck}. Expected supply not materializing — tightens market.`,
    });
  }

  return signals;
}

/**
 * Score overall transaction pipeline health
 */
export function scorePipeline(pipeline: TransactionPipelineProfile): number {
  let score = 50;

  // Title insurance (leading indicator)
  if (pipeline.titleInsurance.signal === "pipeline_building") score += 10;
  else if (pipeline.titleInsurance.signal === "pipeline_draining") score -= 10;

  // Foreclosure supply
  if (pipeline.foreclosurePipeline.pipelineFlowRate === "decelerating") score += 5;
  else if (pipeline.foreclosurePipeline.pipelineFlowRate === "accelerating") score -= 10;

  // Hard money activity (investor confidence)
  if (pipeline.hardMoneyLending.signal === "high_flip_activity") score += 8;

  // Eviction health
  if (pipeline.evictionMetrics.signal === "healthy_market") score += 5;
  else if (pipeline.evictionMetrics.signal === "tenant_stress") score -= 8;

  // Permit velocity (supply coming or not)
  if (pipeline.permitToCompletionVelocity.completionRate < 60) score += 5;

  return Math.max(0, Math.min(100, score));
}
